import {setUiVersion} from './uiVersion.js';
import { STORAGE_KEY, defaultState } from './model.js';
import { markEditorPanels, panelForMarkEditor, markElementsForPanel, setMarkPosition, nudgeMark, rotateMark, alignMarkToPanel, duplicateMark, deleteMark, moveMarkToPanel } from './markLayout.js';
import { createProductionJob, submitProductionJob, approveProductionJob, rejectProductionJob, reviseProductionJob, approvalGate, upsertProductionJob, deleteProductionJob, activeProductionJob } from './productionJobs.js';
import { buildProductionPdf, downloadBytes } from './export.js';

const BLOCK_ID='boxstudio-v13-tools';
function clone(value){return structuredClone(value);}
function esc(value=''){return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function readState(){
  try{
    const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
    return parsed?{...clone(defaultState),...parsed,batch:{...defaultState.batch,...(parsed.batch||{})}}:clone(defaultState);
  }catch{return clone(defaultState)}
}
function writeState(state){state.savedAt=new Date().toISOString();localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
function safeName(value='production'){return String(value||'production').trim().replace(/[\\/:*?"<>|\s]+/g,'-').replace(/^-+|-+$/g,'')||'production';}
function statusClass(status='draft'){return `v13-status v13-status-${String(status).replace(/[^a-z-]/g,'')}`;}
function currentActor(block){return block.querySelector('#v13Actor')?.value?.trim()||'local-user';}
function noteFor(action){const value=prompt(`${action} note (optional)`,'');return value==null?null:value;}

function markLabel(element){
  if(element.type==='text'||element.type==='notice') return element.id||'text';
  if(element.type==='barcode-qr-group') return 'Barcode + QR';
  if(element.type==='icon') return element.icon||element.id||'icon';
  return element.id||element.type||'mark';
}

function renderMarkEditor(block){
  const host=block.querySelector('#v13MarkEditor');if(!host)return;
  const state=readState(),panels=markEditorPanels(state);
  const selectedElement=(state.elements||[]).find(element=>element.id===state.selectedId&&element.group==='marks');
  const preferred=state.markEditorPanelId||selectedElement?.panelId||panels[0]?.id;
  const panel=panels.find(item=>item.id===preferred)||panels[0];
  if(!panel){host.innerHTML='<div class="profile-empty">No editable panel found.</div>';return;}
  const marks=markElementsForPanel(state,panel.id),selected=marks.find(element=>element.id===state.selectedId)||marks[0]||null;
  const safe=Math.max(0,Number(state.structure?.safe)||0),safeW=Math.max(0,panel.w-safe*2),safeH=Math.max(0,panel.h-safe*2);
  const font=Math.max(7,Math.min(18,panel.h*.05));
  host.innerHTML=`<div class="v13-toolbar"><label>Panel<select id="v13PanelSelect">${panels.map(item=>`<option value="${esc(item.id)}" ${item.id===panel.id?'selected':''}>${esc(item.label||item.id)} · ${Math.round(item.w)}×${Math.round(item.h)} mm</option>`).join('')}</select></label><span>${marks.length} mark(s)</span></div>
    <div class="v13-canvas-wrap"><svg id="v13MarkSvg" class="v13-mark-canvas" viewBox="0 0 ${panel.w} ${panel.h}" preserveAspectRatio="xMidYMid meet"><rect x="0" y="0" width="${panel.w}" height="${panel.h}" class="v13-panel-bg"/><rect x="${safe}" y="${safe}" width="${safeW}" height="${safeH}" class="v13-safe-box"/>${marks.map(element=>`<g data-mark-id="${esc(element.id)}" class="v13-mark-node ${selected?.id===element.id?'selected':''}"><rect x="${Number(element.x)||0}" y="${Number(element.y)||0}" width="${Math.max(2,Number(element.w)||4)}" height="${Math.max(2,Number(element.h)||4)}" rx="2"/><text x="${(Number(element.x)||0)+4}" y="${(Number(element.y)||0)+font}" font-size="${font}">${esc(markLabel(element))}</text></g>`).join('')}</svg></div>
    <div class="v13-selected">${selected?`<b>${esc(selected.id)}</b><span>${esc(selected.type)} · x ${Number(selected.x||0).toFixed(1)} · y ${Number(selected.y||0).toFixed(1)} · ${Number(selected.w||0).toFixed(1)}×${Number(selected.h||0).toFixed(1)} mm · r ${Number(selected.r||0)}°</span>`:'<span>Select or insert a mark on this panel.</span>'}</div>
    <div class="v13-actions v13-grid-actions"><button data-v13-nudge="-1,0" ${selected?'':'disabled'}>← 1</button><button data-v13-nudge="1,0" ${selected?'':'disabled'}>1 →</button><button data-v13-nudge="0,-1" ${selected?'':'disabled'}>↑ 1</button><button data-v13-nudge="0,1" ${selected?'':'disabled'}>1 ↓</button><button data-v13-align="left" ${selected?'':'disabled'}>Left</button><button data-v13-align="center-x" ${selected?'':'disabled'}>Center X</button><button data-v13-align="right" ${selected?'':'disabled'}>Right</button><button data-v13-align="top" ${selected?'':'disabled'}>Top</button><button data-v13-align="center-y" ${selected?'':'disabled'}>Center Y</button><button data-v13-align="bottom" ${selected?'':'disabled'}>Bottom</button><button data-v13-rotate="-90" ${selected?'':'disabled'}>↶ 90°</button><button data-v13-rotate="90" ${selected?'':'disabled'}>90° ↷</button><button id="v13DuplicateMark" ${selected?'':'disabled'}>Duplicate</button><button id="v13DeleteMark" class="danger" ${selected?'':'disabled'}>Delete</button></div>
    <p class="v13-footnote">可直接拖动对象；移动和对齐会经过 Panel 边界约束。绿色虚线为 Safe Area，仅用于布局提示。</p>`;

  host.querySelector('#v13PanelSelect').onchange=event=>{const next=readState();next.markEditorPanelId=event.target.value;writeState(next);renderMarkEditor(block);};
  host.querySelectorAll('[data-v13-nudge]').forEach(button=>button.onclick=()=>{if(!selected)return;const [dx,dy]=button.dataset.v13Nudge.split(',').map(Number);writeState(nudgeMark(readState(),selected.id,dx,dy,{snap:1}));renderMarkEditor(block);});
  host.querySelectorAll('[data-v13-align]').forEach(button=>button.onclick=()=>{if(!selected)return;writeState(alignMarkToPanel(readState(),selected.id,button.dataset.v13Align,{safeArea:true,snap:1}));renderMarkEditor(block);});
  host.querySelectorAll('[data-v13-rotate]').forEach(button=>button.onclick=()=>{if(!selected)return;writeState(rotateMark(readState(),selected.id,Number(button.dataset.v13Rotate)));renderMarkEditor(block);});
  const duplicate=host.querySelector('#v13DuplicateMark');if(duplicate)duplicate.onclick=()=>{if(!selected)return;writeState(duplicateMark(readState(),selected.id));renderMarkEditor(block);};
  const remove=host.querySelector('#v13DeleteMark');if(remove)remove.onclick=()=>{if(!selected||!confirm(`Delete mark ${selected.id}?`))return;writeState(deleteMark(readState(),selected.id));renderMarkEditor(block);};

  const svg=host.querySelector('#v13MarkSvg');let drag=null;
  svg?.addEventListener('pointerdown',event=>{
    const node=event.target.closest?.('[data-mark-id]');if(!node)return;
    const id=node.dataset.markId,current=readState(),element=(current.elements||[]).find(item=>item.id===id);if(!element)return;
    current.selectedId=id;current.markEditorPanelId=panel.id;writeState(current);
    const rect=svg.getBoundingClientRect();drag={id,node,startClientX:event.clientX,startClientY:event.clientY,startX:Number(element.x||0),startY:Number(element.y||0),scaleX:panel.w/Math.max(1,rect.width),scaleY:panel.h/Math.max(1,rect.height),dx:0,dy:0};
    svg.setPointerCapture?.(event.pointerId);event.preventDefault();
  });
  svg?.addEventListener('pointermove',event=>{if(!drag)return;drag.dx=(event.clientX-drag.startClientX)*drag.scaleX;drag.dy=(event.clientY-drag.startClientY)*drag.scaleY;drag.node.setAttribute('transform',`translate(${drag.dx} ${drag.dy})`);});
  const finishDrag=event=>{if(!drag)return;try{writeState(setMarkPosition(readState(),drag.id,drag.startX+drag.dx,drag.startY+drag.dy,{snap:1}));}catch(err){alert(err?.message||err)}drag=null;renderMarkEditor(block);};
  svg?.addEventListener('pointerup',finishDrag);svg?.addEventListener('pointercancel',finishDrag);
}

function jobCard(job,active){
  const latest=(job.audit||[]).slice(-3).reverse();
  return `<div class="v13-job ${active?'active':''}" data-job-id="${esc(job.id)}"><div class="v13-job-head"><div><strong>${esc(job.label)}</strong><small>${esc(job.id)} · r${job.revision||1}</small></div><span class="${statusClass(job.status)}">${esc(job.status)}</span></div><div class="v13-job-meta">SKU ${esc(job.project?.sku||'—')} · Preflight ${job.preflight?.errorCount||0}E / ${job.preflight?.warningCount||0}W · ${esc(job.fingerprint||'')}</div><div class="v13-audit">${latest.map(entry=>`<span><b>${esc(entry.action)}</b> · ${esc(entry.actor)} · ${new Date(entry.at).toLocaleString()}</span>`).join('')||'<span>No audit events.</span>'}</div><button type="button" data-v13-activate-job="${esc(job.id)}">${active?'Active':'Activate'}</button></div>`;
}

function renderProduction(block){
  const host=block.querySelector('#v13Production');if(!host)return;
  const state=readState(),jobs=Array.isArray(state.productionJobs)?state.productionJobs:[],active=activeProductionJob(state),gate=approvalGate(state,active);
  host.innerHTML=`<div class="v13-toolbar"><label>Actor<input id="v13Actor" value="${esc(state.productionActor||'local-user')}" placeholder="operator / approver"></label><span>${jobs.length} job(s)</span></div>
    <div class="v13-actions"><button id="v13CreateJob">Create Snapshot</button><button id="v13SubmitJob" ${active?'':'disabled'}>Submit</button><button id="v13ApproveJob" ${active?'':'disabled'}>Approve</button><button id="v13RejectJob" ${active?'':'disabled'}>Reject</button><button id="v13ReviseJob" ${active?'':'disabled'}>New Revision</button><button id="v13ApprovedPdf" ${gate.ok?'':'disabled'}>Approved Production PDF</button><button id="v13DeleteJob" class="danger" ${active?'':'disabled'}>Delete</button></div>
    <div class="v13-gate ${gate.ok?'ok':'blocked'}"><b>Production Gate</b><span>${esc(gate.reason)}</span></div>
    <div class="v13-job-list">${jobs.length?jobs.slice().reverse().map(job=>jobCard(job,job.id===state.activeProductionJobId)).join(''):'<div class="profile-empty">No production job snapshots yet.</div>'}</div>
    <p class="v13-footnote">审批记录保存在当前浏览器项目中。只有 Approved 且 fingerprint 与当前结构/唛头完全一致时，V0.13 的 Approved Production PDF 按钮才会放行。</p>`;
  host.querySelector('#v13Actor').onchange=event=>{const next=readState();next.productionActor=event.target.value.trim()||'local-user';writeState(next);};
  host.querySelectorAll('[data-v13-activate-job]').forEach(button=>button.onclick=()=>{const next=readState();next.activeProductionJobId=button.dataset.v13ActivateJob;writeState(next);renderProduction(block);});
  host.querySelector('#v13CreateJob').onclick=()=>{const current=readState(),label=prompt('Production job label',`${current.projectName||'BoxStudio'} · ${current.variables?.sku||'No SKU'}`);if(label==null)return;const job=createProductionJob(current,{label,actor:currentActor(host)});writeState(upsertProductionJob(current,job));renderProduction(block);};
  host.querySelector('#v13SubmitJob').onclick=()=>{if(!active)return;const note=noteFor('Submit');if(note==null)return;try{writeState(upsertProductionJob(readState(),submitProductionJob(active,{actor:currentActor(host),note})));renderProduction(block);}catch(err){alert(err?.message||err)}};
  host.querySelector('#v13ApproveJob').onclick=()=>{if(!active)return;const note=noteFor('Approve');if(note==null)return;try{writeState(upsertProductionJob(readState(),approveProductionJob(active,{actor:currentActor(host),note})));renderProduction(block);}catch(err){alert(err?.message||err)}};
  host.querySelector('#v13RejectJob').onclick=()=>{if(!active)return;const note=noteFor('Reject');if(note==null)return;try{writeState(upsertProductionJob(readState(),rejectProductionJob(active,{actor:currentActor(host),note})));renderProduction(block);}catch(err){alert(err?.message||err)}};
  host.querySelector('#v13ReviseJob').onclick=()=>{if(!active)return;const note=noteFor('New revision');if(note==null)return;try{const current=readState(),updated=reviseProductionJob(active,current,{actor:currentActor(host),note});writeState(upsertProductionJob(current,updated));renderProduction(block);}catch(err){alert(err?.message||err)}};
  host.querySelector('#v13ApprovedPdf').onclick=()=>{const current=readState(),job=activeProductionJob(current),result=approvalGate(current,job);if(!result.ok){alert(result.reason);return;}try{const bytes=buildProductionPdf(current),sku=safeName(current.variables?.sku||'production'),name=`${sku}-approved-r${job.revision}.pdf`;downloadBytes(name,bytes,'application/pdf');}catch(err){alert(err?.message||err)}};
  host.querySelector('#v13DeleteJob').onclick=()=>{if(!active||!confirm(`Delete production job ${active.label}?`))return;writeState(deleteProductionJob(readState(),active.id));renderProduction(block);};
}

function install(){
  const scroll=document.querySelector('#boxstudio-profile-manager .profile-manager-scroll');
  if(!scroll||document.getElementById(BLOCK_ID)) return;
  const block=document.createElement('div');block.id=BLOCK_ID;block.className='profile-section v13-tools';block.innerHTML=`<div class="v13-title"><div><h3>V0.13 Production Workspace</h3><p>独立唛头布局画布 + Production Job / Approval / Audit。</p></div><span>V0.13</span></div><div class="v13-subsection"><div class="v13-subhead"><b>Mark Layout Editor</b><span>Panel-local mm canvas</span></div><div id="v13MarkEditor"></div></div><div class="v13-subsection"><div class="v13-subhead"><b>Production Jobs</b><span>Snapshot · Submit · Approve · Audit</span></div><div id="v13Production"></div></div>`;scroll.appendChild(block);renderMarkEditor(block);renderProduction(block);
}
function updateVersionLabel(){setUiVersion('V0.13')}
const observer=new MutationObserver(()=>{updateVersionLabel();install();});observer.observe(document.documentElement,{childList:true,subtree:true});updateVersionLabel();install();
