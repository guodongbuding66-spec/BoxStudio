import { STORAGE_KEY, defaultState } from './model.js';
import { applyMasterTemplate } from './masterTemplates.js';
import { buildBatchStates, summarizeBatchPreflight } from './batchTemplates.js';
import { buildProductionPdf, buildMultiPagePdf, downloadBytes } from './export.js';
import { safeBatchFileName } from './batch.js';

const BLOCK_ID = 'boxstudio-v11-batch-master';

function readState(){
  try{
    const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
    return parsed?{...structuredClone(defaultState),...parsed,batch:{...defaultState.batch,...(parsed.batch||{})}}:structuredClone(defaultState);
  }catch{return structuredClone(defaultState)}
}
function writeState(state){state.savedAt=new Date().toISOString();localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
function esc(value=''){return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}

function renderSummary(host, summary){
  const failures=summary.results.filter(r=>!r.ok).slice(0,8);
  host.innerHTML=`<div class="v11-batch-summary ${summary.failed?'has-errors':'ok'}"><b>${summary.passed}/${summary.total} rows passed</b><span>${summary.failed} failed · ${summary.warnings} warnings</span>${failures.length?`<div class="v11-batch-failures">${failures.map(r=>`<div><strong>${esc(r.sku||`Row ${r.index+1}`)}</strong><span>${r.errors.map(e=>esc(e.title)).join(' · ')}</span></div>`).join('')}</div>`:''}</div>`;
}

async function exportPdfZip(state){
  if(!state.batch?.rows?.length) throw new Error('请先导入 Excel / CSV。');
  if(!globalThis.JSZip) throw new Error('JSZip 未加载。');
  const pages=buildBatchStates(state);
  const zip=new globalThis.JSZip();
  pages.forEach((page,index)=>zip.file(safeBatchFileName(page.variables,index,'pdf'),buildProductionPdf(page)));
  const bytes=await zip.generateAsync({type:'uint8array',compression:'DEFLATE',compressionOptions:{level:6}});
  downloadBytes('boxstudio-master-batch-pdf.zip',bytes,'application/zip');
}

function install(){
  if(document.getElementById(BLOCK_ID)) return;
  const section=[...document.querySelectorAll('.panel-section')].find(el=>el.querySelector('h3')?.textContent?.trim()==='Batch Marks');
  if(!section) return;
  const state=readState();
  const masters=Array.isArray(state.masterTemplates)?state.masterTemplates:[];
  const block=document.createElement('div');
  block.id=BLOCK_ID;
  block.className='v11-batch-master';
  block.innerHTML=`<div class="v11-batch-head"><b>Batch Master Template</b><span>V0.11</span></div>
    <select id="v11BatchMaster"><option value="">Current project / no master</option>${masters.map(m=>`<option value="${esc(m.id)}" ${state.batch?.masterTemplateId===m.id?'selected':''}>${esc(m.label)} · r${m.revision||1}</option>`).join('')}</select>
    <div class="v11-batch-actions"><button type="button" id="v11ApplyMaster" ${masters.length?'':'disabled'}>Apply Master to Project</button><button type="button" id="v11BatchPreflight">Preflight All Rows</button></div>
    <div class="v11-batch-actions"><button type="button" id="v11BatchCombined">Master Combined PDF</button><button type="button" id="v11BatchPdfZip">Master PDF ZIP</button></div>
    <div id="v11BatchSummary"></div>
    <p>选择 Master 后，V0.11 批量管线先套用结构/唛头/导出规则，再写入每行 SKU、重量、CRN、Package No. 等订单变量。</p>`;
  section.appendChild(block);

  const select=block.querySelector('#v11BatchMaster');
  select.onchange=()=>{const next=readState();next.batch={...defaultState.batch,...(next.batch||{}),masterTemplateId:select.value};writeState(next);};

  block.querySelector('#v11ApplyMaster').onclick=()=>{
    try{
      const current=readState();
      const id=select.value;
      const master=(current.masterTemplates||[]).find(item=>item.id===id);
      if(!master) throw new Error('请选择一个 Master Template。');
      const next=applyMasterTemplate(current,master,{preserveVariables:true});
      next.masterTemplates=current.masterTemplates||[];
      next.customCustomerProfiles={...(current.customCustomerProfiles||{}),...(next.customCustomerProfiles||{})};
      next.customPackagingRules={...(current.customPackagingRules||{}),...(next.customPackagingRules||{})};
      next.customMarkTemplates={...(current.customMarkTemplates||{}),...(next.customMarkTemplates||{})};
      next.batch={...current.batch,masterTemplateId:id};
      writeState(next);location.reload();
    }catch(err){alert(err?.message||err)}
  };

  block.querySelector('#v11BatchPreflight').onclick=()=>{
    try{const latest=readState();renderSummary(block.querySelector('#v11BatchSummary'),summarizeBatchPreflight(latest));}
    catch(err){alert(`Batch preflight failed: ${err?.message||err}`)}
  };

  block.querySelector('#v11BatchCombined').onclick=()=>{
    try{
      const latest=readState();
      if(!latest.batch?.rows?.length) throw new Error('请先导入 Excel / CSV。');
      const summary=summarizeBatchPreflight(latest);renderSummary(block.querySelector('#v11BatchSummary'),summary);
      if(summary.failed && !confirm(`${summary.failed} 行存在 Preflight error，仍然导出吗？`)) return;
      const pages=buildBatchStates(latest);
      downloadBytes('boxstudio-master-batch-combined.pdf',buildMultiPagePdf(pages),'application/pdf');
    }catch(err){alert(`Combined PDF export failed: ${err?.message||err}`)}
  };

  block.querySelector('#v11BatchPdfZip').onclick=async()=>{
    try{
      const latest=readState();
      const summary=summarizeBatchPreflight(latest);renderSummary(block.querySelector('#v11BatchSummary'),summary);
      if(summary.failed && !confirm(`${summary.failed} 行存在 Preflight error，仍然导出吗？`)) return;
      await exportPdfZip(latest);
    }catch(err){alert(`Batch PDF ZIP failed: ${err?.message||err}`)}
  };
}

const observer=new MutationObserver(install);
observer.observe(document.documentElement,{childList:true,subtree:true});
install();
