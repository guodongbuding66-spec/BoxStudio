import { STORAGE_KEY, defaultState } from './model.js';
import { buildBatchState } from './batchTemplates.js';
import { runPreflight } from './preflight.js';
import { buildProductionPdf, downloadBytes } from './export.js';
import { safeBatchFileName } from './batch.js';
import { createBatchJobQueue, claimNextJob, completeJob, failJob, requestQueueCancel, finalizeQueueCancel, requestQueuePause, finalizeQueuePause, resumeQueue, queueProgress } from './jobQueue.js';
import { createWorkspaceBundle, serializeWorkspaceBundle, parseWorkspaceBundle, applyWorkspaceBundle } from './profileBundles.js';
import { getMarkAssetCatalog, createMarkAssetFromElement, saveCustomMarkAsset, deleteCustomMarkAsset, insertMarkAsset } from './markAssets.js';
import { listPackagingRuleRevisions, restorePackagingRuleRevision } from './rules.js';

const PROFILE_BLOCK_ID='boxstudio-v12-profile-tools';
const QUEUE_BLOCK_ID='boxstudio-v12-batch-queue';
let queueRunToken=0;
let queueWorkerActive=false;

function readState(){
  try{
    const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
    return parsed?{...structuredClone(defaultState),...parsed,batch:{...defaultState.batch,...(parsed.batch||{})}}:structuredClone(defaultState);
  }catch{return structuredClone(defaultState)}
}
function writeState(state){state.savedAt=new Date().toISOString();localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
function esc(value=''){return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function downloadText(name,text){const blob=new Blob([text],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),500);}
function yieldUi(ms=0){return new Promise(resolve=>setTimeout(resolve,ms));}

function installProfileTools(){
  const scroll=document.querySelector('#boxstudio-profile-manager .profile-manager-scroll');
  if(!scroll||document.getElementById(PROFILE_BLOCK_ID)) return;
  const state=readState(),assets=getMarkAssetCatalog(state),customRules=Object.values(state.customPackagingRules||{});
  const selected=(state.elements||[]).find(element=>element.id===state.selectedId);
  const block=document.createElement('div');
  block.id=PROFILE_BLOCK_ID;
  block.className='profile-section v12-tools';
  block.innerHTML=`<div class="v12-title"><div><h3>V0.12 Workspace Tools</h3><p>Profile Bundle、Mark Asset Library、Packaging Rule History。</p></div><span>V0.12</span></div>
    <div class="v12-subsection"><b>Workspace Bundle</b><p>一次性迁移自定义 Customer / Rule / Mark Template / Mark Asset / Master Template。</p><div class="v12-actions"><button type="button" id="v12ExportBundle">Export Bundle</button><label class="profile-file">Import Bundle<input id="v12ImportBundle" type="file" accept="application/json,.json"></label></div></div>
    <div class="v12-subsection"><b>Mark Asset Library</b><p>把当前选中的唛头元素保存成可重复插入的素材。当前选择：${selected?`<strong>${esc(selected.id)}</strong>`:'none'}</p><div class="v12-actions"><button type="button" id="v12SaveAsset" ${selected?.group==='marks'?'':'disabled'}>Save Selected as Asset</button></div><div class="v12-asset-grid">${Object.values(assets).map(asset=>`<div class="v12-asset"><span><b>${esc(asset.label)}</b><small>${asset.builtIn?'Built-in':'Custom'}</small></span><div><button type="button" data-v12-insert-asset="${esc(asset.id)}">Insert</button>${asset.builtIn?'':`<button type="button" class="danger" data-v12-delete-asset="${esc(asset.id)}">Delete</button>`}</div></div>`).join('')}</div></div>
    <div class="v12-subsection"><b>Packaging Rule History</b><p>保存同 ID 的自定义规则会自动建立新 revision；旧版本可恢复为新的当前版本。</p><div class="v12-rule-history">${customRules.length?customRules.map(rule=>{const revisions=listPackagingRuleRevisions(rule);return `<div class="v12-rule"><div><strong>${esc(rule.label)}</strong><span>${esc(rule.id)} · r${rule.revision||1}</span></div><div class="v12-revisions">${revisions.filter(r=>!r.current).slice(0,5).map(r=>`<button type="button" data-v12-restore-rule="${esc(rule.id)}" data-v12-revision="${r.revision}">Restore r${r.revision}</button>`).join('')||'<small>No archived revisions</small>'}</div></div>`}).join(''):'<div class="profile-empty">No custom packaging rules yet.</div>'}</div></div>`;
  scroll.appendChild(block);

  block.querySelector('#v12ExportBundle').onclick=()=>{
    const bundle=createWorkspaceBundle(readState(),{label:`BoxStudio Workspace ${new Date().toISOString().slice(0,10)}`});
    downloadText('boxstudio-workspace-bundle.json',serializeWorkspaceBundle(bundle));
  };
  block.querySelector('#v12ImportBundle').onchange=async event=>{
    const file=event.target.files?.[0];if(!file)return;
    try{
      const bundle=parseWorkspaceBundle(await file.text());
      if(!confirm('Import this BoxStudio workspace bundle and replace matching custom IDs?')) return;
      const next=applyWorkspaceBundle(readState(),bundle,{strategy:'replace',applyActive:true});writeState(next);location.reload();
    }catch(err){alert(`Bundle import failed: ${err?.message||err}`)}
  };
  block.querySelector('#v12SaveAsset').onclick=()=>{
    try{
      const current=readState(),element=(current.elements||[]).find(item=>item.id===current.selectedId);if(!element)throw new Error('Select a mark element first.');
      const label=prompt('Mark Asset name',element.id||element.type||'Mark Asset');if(label==null)return;
      const asset=createMarkAssetFromElement(element,{label});writeState(saveCustomMarkAsset(current,asset));location.reload();
    }catch(err){alert(err?.message||err)}
  };
  block.querySelectorAll('[data-v12-insert-asset]').forEach(button=>button.onclick=()=>{try{writeState(insertMarkAsset(readState(),button.dataset.v12InsertAsset));location.reload();}catch(err){alert(err?.message||err)}});
  block.querySelectorAll('[data-v12-delete-asset]').forEach(button=>button.onclick=()=>{if(!confirm('Delete this custom mark asset?'))return;try{writeState(deleteCustomMarkAsset(readState(),button.dataset.v12DeleteAsset));location.reload();}catch(err){alert(err?.message||err)}});
  block.querySelectorAll('[data-v12-restore-rule]').forEach(button=>button.onclick=()=>{if(!confirm(`Restore packaging rule revision ${button.dataset.v12Revision}? A new revision will be created.`))return;try{writeState(restorePackagingRuleRevision(readState(),button.dataset.v12RestoreRule,Number(button.dataset.v12Revision)));location.reload();}catch(err){alert(err?.message||err)}});
}

function renderQueueStatus(block,queue){
  const p=queueProgress(queue||{items:[]}),bar=block.querySelector('.v12-progress-bar'),text=block.querySelector('.v12-progress-text'),cancel=block.querySelector('#v12CancelQueue'),pause=block.querySelector('#v12PauseQueue'),resume=block.querySelector('#v12ResumeQueue');
  if(bar)bar.style.width=`${p.percent}%`;
  if(text)text.textContent=`${p.percent}% · ${p.completed} completed · ${p.failed} failed · ${p.pending} pending${queue?.status?` · ${queue.status}`:''}`;
  const active=queue&&['ready','running','pausing','paused','cancelling'].includes(queue.status);
  if(cancel)cancel.disabled=!active;
  if(pause)pause.disabled=!queue||!['ready','running'].includes(queue.status)||Boolean(queue.pauseRequested);
  if(resume)resume.disabled=!queue||!['pausing','paused'].includes(queue.status)&&!queue.pauseRequested;
}

async function waitWhilePaused(block,token){
  while(token===queueRunToken){
    let state=readState(),queue=state.batch?.queue;
    if(!queue) return 'stale';
    if(queue.cancelRequested) return 'cancel';
    if(!queue.pauseRequested) return 'resume';
    if(queue.status!=='paused'){
      queue=finalizeQueuePause(queue);state.batch={...state.batch,queue};writeState(state);renderQueueStatus(block,queue);
    }
    await yieldUi(120);
  }
  return 'stale';
}

async function runPdfQueue(block){
  const token=++queueRunToken;
  let state=readState();
  if(!state.batch?.rows?.length){alert('请先导入 Excel / CSV。');return;}
  if(!globalThis.JSZip){alert('JSZip 未加载。');return;}
  let queue=createBatchJobQueue(state.batch.rows,{kind:'pdf-zip',masterTemplateId:state.batch.masterTemplateId||null});
  state.batch={...state.batch,queue};writeState(state);renderQueueStatus(block,queue);
  const zip=new globalThis.JSZip();
  queueWorkerActive=true;
  try{
    while(token===queueRunToken){
      state=readState();queue=state.batch.queue;
      if(queue?.cancelRequested){queue=finalizeQueueCancel(queue);state.batch.queue=queue;writeState(state);renderQueueStatus(block,queue);break;}
      if(queue?.pauseRequested){
        const result=await waitWhilePaused(block,token);
        if(result==='cancel') continue;
        if(result==='stale') break;
        state=readState();queue=state.batch.queue;renderQueueStatus(block,queue);continue;
      }
      const claimed=claimNextJob(queue);queue=claimed.queue;state.batch.queue=queue;writeState(state);renderQueueStatus(block,queue);
      if(!claimed.item) break;
      const index=claimed.item.index,row=state.batch.rows[index];
      try{
        const page=buildBatchState(state,row);
        const errors=runPreflight(page).filter(check=>check.severity==='error');
        if(errors.length) queue=failJob(queue,index,errors.map(error=>error.title).join('; '));
        else{
          const fileName=safeBatchFileName(page.variables,index,'pdf');
          zip.file(fileName,buildProductionPdf(page));
          queue=completeJob(queue,index,{fileName});
        }
      }catch(err){queue=failJob(queue,index,err?.message||String(err));}
      state=readState();state.batch={...state.batch,queue};writeState(state);renderQueueStatus(block,queue);await yieldUi();
    }
    if(token!==queueRunToken)return;
    state=readState();queue=state.batch.queue;const p=queueProgress(queue);
    if(p.completed){const bytes=await zip.generateAsync({type:'uint8array',compression:'DEFLATE',compressionOptions:{level:6}});downloadBytes(queue.status==='cancelled'?'boxstudio-batch-partial.pdf.zip':'boxstudio-batch-queue.pdf.zip',bytes,'application/zip');}
    renderQueueStatus(block,queue);
  }finally{ if(token===queueRunToken)queueWorkerActive=false; }
}

function installBatchQueue(){
  if(document.getElementById(QUEUE_BLOCK_ID))return;
  const section=[...document.querySelectorAll('.panel-section')].find(el=>el.querySelector('h3')?.textContent?.trim()==='Batch Marks');
  if(!section)return;
  const state=readState(),block=document.createElement('div');
  block.id=QUEUE_BLOCK_ID;block.className='v12-batch-queue';
  block.innerHTML=`<div class="v12-title"><div><b>Large Batch Queue</b><p>逐行生成 PDF，行与行之间让出主线程；V0.13 增加同页面会话内 Pause / Resume。</p></div><span>V0.13 worker</span></div><div class="v12-progress"><i class="v12-progress-bar"></i></div><div class="v12-progress-text">No queue started.</div><div class="v12-actions"><button type="button" id="v12StartQueue">Start / Restart PDF Queue</button><button type="button" id="v12PauseQueue" disabled>Pause</button><button type="button" id="v12ResumeQueue" disabled>Resume</button><button type="button" id="v12CancelQueue" disabled>Cancel</button></div><p class="v12-footnote">Pause / Resume 在当前页面会话内保留已生成 ZIP 数据；页面刷新后请 Restart。Cancel 会在当前行完成后停止，并仅导出真实完成的 partial ZIP。</p>`;
  section.appendChild(block);renderQueueStatus(block,state.batch?.queue);
  block.querySelector('#v12StartQueue').onclick=()=>runPdfQueue(block);
  block.querySelector('#v12PauseQueue').onclick=()=>{const current=readState();if(!current.batch?.queue)return;current.batch.queue=requestQueuePause(current.batch.queue);writeState(current);renderQueueStatus(block,current.batch.queue);};
  block.querySelector('#v12ResumeQueue').onclick=()=>{const current=readState();if(!current.batch?.queue)return;if(!queueWorkerActive){alert('当前页面没有活动 Batch Worker。刷新页面后请使用 Start / Restart 重新生成。');return;}current.batch.queue=resumeQueue(current.batch.queue);writeState(current);renderQueueStatus(block,current.batch.queue);};
  block.querySelector('#v12CancelQueue').onclick=()=>{const current=readState();if(!current.batch?.queue)return;current.batch.queue=requestQueueCancel(current.batch.queue);writeState(current);renderQueueStatus(block,current.batch.queue);};
}

function updateVersionLabel(){const version=document.querySelector('.brand small');if(version)version.textContent='V0.13';}
const observer=new MutationObserver(()=>{updateVersionLabel();installProfileTools();installBatchQueue();});
observer.observe(document.documentElement,{childList:true,subtree:true});
updateVersionLabel();installProfileTools();installBatchQueue();