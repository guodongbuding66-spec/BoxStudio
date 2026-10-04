import { STORAGE_KEY, defaultState } from './model.js';
import { normalizeVariables } from './variables.js';
import { rowToVariables, autoMapHeaders, safeBatchFileName } from './batch.js';
import { buildAcceptedProductionPdfV31, v31ProductionGate } from './productionAcceptanceV31.js';
import { downloadBytes } from './export.js';
import { activeProductionJob, approvalGate, recordProductionExport, upsertProductionJob } from './productionJobs.js';
import { canProductionAction, normalizeProductionRole } from './permissions.js';

const BLOCK_ID='boxstudio-v31-acceptance';
const clone=v=>structuredClone(v);
let lastReport=null;

function readState(){
  try{
    const p=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
    return p?{...clone(defaultState),...p,batch:{...defaultState.batch,...(p.batch||{})},exportOptions:{...defaultState.exportOptions,...(p.exportOptions||{})}}:clone(defaultState);
  }catch{return clone(defaultState)}
}
function writeState(s){s.savedAt=new Date().toISOString();localStorage.setItem(STORAGE_KEY,JSON.stringify(s));}
function safe(v='boxstudio'){return String(v||'boxstudio').trim().replace(/[\\/:*?"<>|\s]+/g,'-').replace(/^-+|-+$/g,'')||'boxstudio';}
function esc(v=''){return String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function downloadAccepted(state,{approved=false}={}){
  const {bytes,report}=buildAcceptedProductionPdfV31(state);
  const suffix=approved?'approved-v31':'v31-accepted';
  downloadBytes(`${safe(state.variables?.sku||'boxstudio')}-${suffix}.pdf`,bytes,'application/pdf');
  lastReport=report;
  return {bytes,report};
}
function approvedGate(state){
  const job=activeProductionJob(state),role=normalizeProductionRole(state.productionRole||'operator'),approval=job?approvalGate(state,job):{ok:false,reason:'No active production job.'};
  if(!approval.ok)return{ok:false,reason:approval.reason||'Revision is not approved.',job,role};
  if(!canProductionAction(role,'export-approved'))return{ok:false,reason:'Current role cannot export approved production files.',job,role};
  return{ok:true,job,role};
}
async function acceptedBatchZip(state){
  const b=state.batch||{};if(!b.rows?.length)throw new Error('请先导入 Excel / CSV。');
  if(!globalThis.JSZip)throw new Error('JSZip 未加载。');
  const zip=new globalThis.JSZip(),mapping=b.mapping||autoMapHeaders(b.columns||[]),manifest=[];
  for(let i=0;i<b.rows.length;i++){
    const page=clone(state);
    page.variables=normalizeVariables(rowToVariables(b.rows[i],b.columns||[],mapping,state.variables||{}));
    const {bytes,report}=buildAcceptedProductionPdfV31(page);
    const fileName=safeBatchFileName(page.variables,i,'pdf');
    zip.file(fileName,bytes);
    manifest.push({index:i,fileName,sku:page.variables?.sku||'',geometryMaxErrorMm:report.geometry.maxErrorMm,digital:report.digital.results.map(x=>({id:x.id,type:x.type,barcode:x.decoded?.barcode,qr:x.decoded?.qr,barcodeOk:x.barcodeOk,qrOk:x.qrOk}))});
  }
  zip.file('boxstudio-v31-acceptance.json',JSON.stringify({version:'0.31',required:true,toleranceMm:.2,files:manifest},null,2));
  const bytes=await zip.generateAsync({type:'uint8array',compression:'DEFLATE',compressionOptions:{level:6}});
  downloadBytes('boxstudio-batch-v31-accepted.zip',bytes,'application/zip');
  return manifest;
}
function reportHtml(report){
  if(!report)return'<div class="v31-note">尚未运行 Required Check。导出时会强制自动运行；失败不会生成 Production PDF。</div>';
  const geo=report.geometry,digital=report.digital;
  return `<div class="v31-result ${report.ok?'good':'bad'}"><b>${report.ok?'PASS':'BLOCKED'}</b><span>Geometry max ${Number.isFinite(geo.maxErrorMm)?geo.maxErrorMm.toFixed(4):'∞'} mm / limit ${geo.toleranceMm.toFixed(1)} mm</span><span>Digital ${digital.results.filter(x=>x.ok).length}/${digital.results.length}</span></div>
  <div class="v31-checks">${geo.checks.slice(0,12).map(x=>`<div class="${x.ok?'pass':'fail'}"><b>${x.ok?'✓':'×'} ${esc(x.id)}</b><span>${esc(x.detail)}${Number.isFinite(x.errorMm)?` · ${x.errorMm.toFixed(4)} mm`:''}</span></div>`).join('')}${digital.results.map(x=>`<div class="${x.ok?'pass':'fail'}"><b>${x.ok?'✓':'×'} ${esc(x.id)} Digital Decode</b><span>${x.ok?`${esc(x.type)} · barcode=${esc(x.decoded.barcode)} · QR=${esc(x.decoded.qr)}`:esc(x.error||x.stage||'decode failed')}</span></div>`).join('')}</div>`;
}
function render(block){
  const host=block.querySelector('#v31Host');if(!host)return;
  const state=readState(),gate=v31ProductionGate(state),ap=approvedGate(state);
  if(gate.report)lastReport=gate.report;
  host.innerHTML=`<div class="v31-stats"><span>Required Check: ${gate.ok?'PASS':'BLOCKED'}</span><span>Tolerance ≤ 0.2 mm</span><span>PDF raster decode required</span><span>Fail-closed</span></div>
  <div class="v31-actions"><button id="v31Check">Run Required Check</button><button id="v31Export" class="primary" ${gate.ok?'':'disabled'}>Export Accepted Production PDF</button><button id="v31Approved" ${gate.ok&&ap.ok?'':'disabled'}>Export Approved V0.31 PDF</button><button id="v31Batch" ${state.batch?.rows?.length?'':'disabled'}>Accepted Batch PDF ZIP</button></div>
  ${!gate.ok?`<div class="v31-warning">${esc(gate.reason)}</div>`:''}${!ap.ok?`<div class="v31-note">Approved export: ${esc(ap.reason)}</div>`:''}
  ${reportHtml(lastReport)}
  <div class="v31-note"><b>V0.31 policy:</b> Barcode/QR is decoded from the final Production PDF raster, not from the encoder object. Preview/PDF geometry is measured independently from PDF coordinates. Any unsupported object rotation is a hard block, not a warning. Legacy PDF and V0.27 worker-output buttons are disabled to prevent bypass.</div>`;
  host.querySelector('#v31Check')?.addEventListener('click',()=>{const g=v31ProductionGate(readState());lastReport=g.report||null;if(!g.ok&&g.reason)alert(g.reason);render(block);});
  host.querySelector('#v31Export')?.addEventListener('click',()=>{try{downloadAccepted(readState());render(block)}catch(err){alert(err?.message||err);render(block)}});
  host.querySelector('#v31Approved')?.addEventListener('click',()=>{try{const s=readState(),g=approvedGate(s);if(!g.ok)throw new Error(g.reason);const {report}=downloadAccepted(s,{approved:true});const fileName=`${safe(s.variables?.sku||'production')}-approved-v31.pdf`,updated=recordProductionExport(g.job,{actor:String(s.productionActor||'local-user'),role:g.role,format:'pdf',fileName,serializer:'v0.31-accepted-native-cubic-production',acceptance:{version:'0.31',geometryMaxErrorMm:report.geometry.maxErrorMm,digitalPassed:report.digital.ok}});writeState(upsertProductionJob(s,updated));render(block);}catch(err){alert(err?.message||err);render(block)}});
  host.querySelector('#v31Batch')?.addEventListener('click',async()=>{const btn=host.querySelector('#v31Batch');try{btn.disabled=true;btn.textContent='Checking every row…';const manifest=await acceptedBatchZip(readState());alert(`V0.31 batch PASS: ${manifest.length} PDF(s) decoded and geometry-checked.`);}catch(err){alert(`V0.31 batch blocked: ${err?.message||err}`);}finally{render(block);}});
}
function overrideLegacyOutputs(){
  const one=document.querySelector('#exportPdf');if(one){one.textContent='Production PDF · V0.31 Required Check';one.onclick=()=>{try{downloadAccepted(readState())}catch(err){alert(`Production PDF blocked: ${err?.message||err}`)}};}
  for(const id of ['batchPdf','batchCombinedPdf','v27BatchStart','v27BatchRestart','v27BatchZip']){const b=document.getElementById(id);if(b){b.disabled=true;b.title='V0.31 Required Check forbids this legacy PDF path. Use Accepted Batch PDF ZIP.';}}
  const raw=document.getElementById('v27Pdf');if(raw){raw.textContent='Export V0.31 Accepted Production PDF';raw.onclick=()=>{try{downloadAccepted(readState())}catch(err){alert(err?.message||err)}};}
  const approved=document.getElementById('v27Approved');if(approved){const s=readState(),g=approvedGate(s),a=v31ProductionGate(s);approved.textContent='Export Approved V0.31 PDF';approved.disabled=!(g.ok&&a.ok);approved.onclick=()=>{try{const n=readState(),gate=approvedGate(n);if(!gate.ok)throw new Error(gate.reason);downloadAccepted(n,{approved:true});}catch(err){alert(err?.message||err)}};}
}
function install(){
  if(document.getElementById(BLOCK_ID))return;
  const scroll=document.querySelector('#boxstudio-profile-manager .profile-manager-scroll');if(!scroll)return;
  const block=document.createElement('div');block.id=BLOCK_ID;block.className='profile-section v31-tools';block.innerHTML=`<div class="v31-title"><div><h3>V0.31 Production Acceptance</h3><p>Barcode/QR Digital Decode Required Check · Preview/PDF geometry ≤ 0.2 mm</p></div><span>V0.31</span></div><div id="v31Host"></div>`;scroll.prepend(block);render(block);
}
function updateVersion(){const v=document.querySelector('.brand small');if(v)v.textContent='V0.31';document.title='BoxStudio V0.31';}
let scheduled=false;function sync(){if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;updateVersion();install();overrideLegacyOutputs();});}
const observer=new MutationObserver(sync);observer.observe(document.documentElement,{childList:true,subtree:true});sync();
