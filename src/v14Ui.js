import {setUiVersion} from './uiVersion.js';
import { STORAGE_KEY, defaultState } from './model.js';
import { buildBatchState } from './batchTemplates.js';
import { runPreflight } from './preflight.js';
import { buildProductionPdf, downloadBytes } from './export.js';
import { safeBatchFileName } from './batch.js';
import { createIndexedDbArtifactStore, createMemoryArtifactStore } from './artifactStore.js';
import { preparePersistentQueue, queueWithClaim, queueWithComplete, queueWithFailure, pausePersistentQueue, finalizePersistentPause, resumePersistentQueue, cancelPersistentQueue, finalizePersistentCancel, persistentQueueProgress, persistentQueueState } from './persistentBatch.js';
import { createLocalProjectLibrary, createProjectEnvelope, reviseProjectEnvelope, serializeProjectEnvelope, parseProjectEnvelope, applyProjectEnvelope, createRestProjectStore } from './projectStore.js';
import { productionRoleOptions, canProductionAction, normalizeProductionRole } from './permissions.js';
import { createProductionJob, submitProductionJob, approveProductionJob, rejectProductionJob, reviseProductionJob, approvalGate, upsertProductionJob, deleteProductionJob, activeProductionJob } from './productionJobs.js';

const BLOCK_ID='boxstudio-v14-tools';
let runToken=0;
const artifactStore=globalThis.indexedDB?createIndexedDbArtifactStore():createMemoryArtifactStore();

function clone(value){return structuredClone(value);}
function esc(value=''){return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function readState(){try{const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');return parsed?{...clone(defaultState),...parsed,batch:{...defaultState.batch,...(parsed.batch||{})}}:clone(defaultState);}catch{return clone(defaultState)}}
function writeState(state){state.savedAt=new Date().toISOString();localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
function yieldUi(){return new Promise(resolve=>setTimeout(resolve,0));}
function note(action){const value=prompt(`${action} note (optional)`,'');return value==null?null:value;}
function actor(state){return String(state.productionActor||'local-user').trim()||'local-user';}
function role(state){return normalizeProductionRole(state.productionRole||'operator');}
function safeName(value='project'){return String(value||'project').trim().replace(/[\\/:*?"<>|\s]+/g,'-').replace(/^-+|-+$/g,'')||'project';}
function downloadText(name,text){const blob=new Blob([text],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),800);}

async function queueSnapshot(){const state=readState(),queue=state.batch?.queue,artifacts=queue?.id?await artifactStore.list(queue.id):[];return {state,queue,artifacts};}
function queueText(progress,queue){return `${progress.percent}% · ${progress.completed} completed · ${progress.failed} failed · ${progress.pending} pending · ${progress.artifactCount} persisted · ${Math.round(progress.bytes/1024)} KB${queue?.status?` · ${queue.status}`:''}`;}
async function renderPersistentBatch(block){
  const host=block.querySelector('#v14Batch');if(!host)return;const {state,queue,artifacts}=await queueSnapshot(),p=persistentQueueProgress(queue||{items:[]},artifacts);
  host.innerHTML=`<div class="v14-actions"><button id="v14BatchStart">${queue?.kind==='persistent-pdf-zip'?'Resume / Reconcile':'Start Persistent Queue'}</button><button id="v14BatchRestart">Restart</button><button id="v14BatchPause" ${queue&&!p.done?'':'disabled'}>Pause</button><button id="v14BatchCancel" ${queue&&!p.done?'':'disabled'}>Cancel</button><button id="v14BatchZip" ${p.artifactCount?'':'disabled'}>Export Recovered ZIP</button><button id="v14BatchClear" class="danger" ${queue?'':'disabled'}>Clear Cache</button></div><div class="v14-progress"><i style="width:${p.percent}%"></i></div><div class="v14-mono">${esc(queueText(p,queue))}</div><p>PDF 二进制写入 IndexedDB。刷新页面后，已完成文件仍可恢复；队列元数据继续保存在项目状态。</p>`;
  host.querySelector('#v14BatchStart').onclick=()=>runPersistentBatch(block,false);
  host.querySelector('#v14BatchRestart').onclick=()=>runPersistentBatch(block,true);
  host.querySelector('#v14BatchPause').onclick=()=>{const current=readState();if(!current.batch?.queue)return;current.batch.queue=pausePersistentQueue(current.batch.queue);writeState(current);renderPersistentBatch(block);};
  host.querySelector('#v14BatchCancel').onclick=()=>{const current=readState();if(!current.batch?.queue)return;current.batch.queue=cancelPersistentQueue(current.batch.queue);writeState(current);renderPersistentBatch(block);};
  host.querySelector('#v14BatchZip').onclick=()=>exportPersistentZip(block);
  host.querySelector('#v14BatchClear').onclick=async()=>{const current=readState(),q=current.batch?.queue;if(!q||!confirm('Clear persisted PDFs and reset the persistent queue?'))return;await artifactStore.clearQueue(q.id);current.batch.queue=null;writeState(current);renderPersistentBatch(block);};
}
async function runPersistentBatch(block,restart=false){
  const token=++runToken;let state=readState();if(!state.batch?.rows?.length){alert('请先导入 Excel / CSV。');return;}
  if(restart&&state.batch?.queue?.id) await artifactStore.clearQueue(state.batch.queue.id);
  let artifacts=state.batch?.queue?.id?await artifactStore.list(state.batch.queue.id):[];
  let queue=preparePersistentQueue(state,artifacts,{restart,kind:'persistent-pdf-zip'});if(queue.status==='paused')queue=resumePersistentQueue(queue);state=persistentQueueState(state,queue);writeState(state);await renderPersistentBatch(block);
  while(token===runToken){
    state=readState();queue=state.batch.queue;artifacts=await artifactStore.list(queue.id);queue=preparePersistentQueue(state,artifacts,{kind:'persistent-pdf-zip'});
    if(queue.cancelRequested){queue=finalizePersistentCancel(queue);writeState(persistentQueueState(state,queue));break;}
    if(queue.pauseRequested){queue=finalizePersistentPause(queue);writeState(persistentQueueState(state,queue));break;}
    const claimed=queueWithClaim(queue);queue=claimed.queue;writeState(persistentQueueState(state,queue));if(!claimed.item)break;
    const index=claimed.item.index,row=state.batch.rows[index];
    try{
      const page=buildBatchState(state,row),errors=runPreflight(page).filter(check=>check.severity==='error');
      if(errors.length) queue=queueWithFailure(queue,index,errors.map(item=>item.title).join('; '));
      else{
        const fileName=safeBatchFileName(page.variables,index,'pdf'),bytes=buildProductionPdf(page);
        await artifactStore.put({queueId:queue.id,index,fileName,mime:'application/pdf',bytes,fingerprint:`${page.variables?.sku||''}:${page.variables?.crn||''}:${index}`});
        queue=queueWithComplete(queue,index,fileName);
      }
    }catch(error){queue=queueWithFailure(queue,index,error?.message||String(error));}
    state=readState();writeState(persistentQueueState(state,queue));await renderPersistentBatch(block);await yieldUi();
  }
  await renderPersistentBatch(block);
}
async function exportPersistentZip(block){
  const {queue,artifacts}=await queueSnapshot();if(!queue||!artifacts.length)return;if(!globalThis.JSZip){alert('JSZip 未加载。');return;}
  const zip=new globalThis.JSZip();for(const artifact of artifacts)zip.file(artifact.fileName,artifact.bytes);zip.file('boxstudio-artifacts.json',JSON.stringify({queueId:queue.id,status:queue.status,files:artifacts.map(a=>({index:a.index,fileName:a.fileName,byteLength:a.byteLength,fingerprint:a.fingerprint}))},null,2));
  const bytes=await zip.generateAsync({type:'uint8array',compression:'DEFLATE',compressionOptions:{level:6}});downloadBytes(`boxstudio-${safeName(queue.id)}-recovered.zip`,bytes,'application/zip');await renderPersistentBatch(block);
}

function jobCard(job,active){const latest=(job.audit||[]).slice(-2).reverse();return `<div class="v14-job ${active?'active':''}"><div><b>${esc(job.label)}</b><span>${esc(job.status)} · r${job.revision}</span></div><small>${esc(job.project?.sku||'—')} · ${job.preflight?.errorCount||0}E/${job.preflight?.warningCount||0}W · ${esc(job.fingerprint||'')}</small>${latest.map(item=>`<small>${esc(item.action)} · ${esc(item.actor)} · ${esc(item.role||'legacy')}</small>`).join('')}<button data-v14-job="${esc(job.id)}">${active?'Active':'Activate'}</button></div>`;}
function renderRoleProduction(block){
  const host=block.querySelector('#v14Production');if(!host)return;const state=readState(),currentRole=role(state),jobs=state.productionJobs||[],active=activeProductionJob(state),gate=approvalGate(state,active),options=productionRoleOptions();
  const can=action=>canProductionAction(currentRole,action);
  host.innerHTML=`<div class="v14-rolebar"><label>Actor<input id="v14Actor" value="${esc(actor(state))}"></label><label>Role<select id="v14Role">${options.map(item=>`<option value="${item.id}" ${item.id===currentRole?'selected':''}>${item.label}</option>`).join('')}</select></label><span>${esc(options.find(item=>item.id===currentRole)?.actions.join(' · ')||'')}</span></div><div class="v14-actions"><button id="v14Create" ${can('create')?'':'disabled'}>Create Snapshot</button><button id="v14Submit" ${active&&can('submit')?'':'disabled'}>Submit</button><button id="v14Approve" ${active&&can('approve')?'':'disabled'}>Approve</button><button id="v14Reject" ${active&&can('reject')?'':'disabled'}>Reject</button><button id="v14Revise" ${active&&can('revise')?'':'disabled'}>New Revision</button><button id="v14ApprovedPdf" ${active&&gate.ok&&can('export-approved')?'':'disabled'}>Approved PDF</button><button id="v14Delete" class="danger" ${active&&can('delete')?'':'disabled'}>Delete</button></div><div class="v14-gate ${gate.ok?'ok':'blocked'}">${esc(gate.reason)}</div><div class="v14-jobs">${jobs.length?jobs.slice().reverse().map(job=>jobCard(job,job.id===state.activeProductionJobId)).join(''):'<div class="profile-empty">No production jobs.</div>'}</div><p>权限在动作函数层和 UI 层同时检查。V0.14 仍是本地角色模型，不是登录身份认证系统。</p>`;
  host.querySelector('#v14Actor').onchange=e=>{const next=readState();next.productionActor=e.target.value.trim()||'local-user';writeState(next);renderRoleProduction(block);};
  host.querySelector('#v14Role').onchange=e=>{const next=readState();next.productionRole=e.target.value;writeState(next);renderRoleProduction(block);};
  host.querySelectorAll('[data-v14-job]').forEach(btn=>btn.onclick=()=>{const next=readState();next.activeProductionJobId=btn.dataset.v14Job;writeState(next);renderRoleProduction(block);});
  const act=()=>{const s=readState();return {state:s,job:activeProductionJob(s),actor:actor(s),role:role(s)};};
  host.querySelector('#v14Create').onclick=()=>{const a=act(),label=prompt('Production job label',`${a.state.projectName||'BoxStudio'} · ${a.state.variables?.sku||'No SKU'}`);if(label==null)return;try{writeState(upsertProductionJob(a.state,createProductionJob(a.state,{label,actor:a.actor,role:a.role})));renderRoleProduction(block);}catch(e){alert(e.message)}};
  host.querySelector('#v14Submit').onclick=()=>{const a=act(),n=note('Submit');if(n==null)return;try{writeState(upsertProductionJob(a.state,submitProductionJob(a.job,{actor:a.actor,role:a.role,note:n})));renderRoleProduction(block);}catch(e){alert(e.message)}};
  host.querySelector('#v14Approve').onclick=()=>{const a=act(),n=note('Approve');if(n==null)return;try{writeState(upsertProductionJob(a.state,approveProductionJob(a.job,{actor:a.actor,role:a.role,note:n})));renderRoleProduction(block);}catch(e){alert(e.message)}};
  host.querySelector('#v14Reject').onclick=()=>{const a=act(),n=note('Reject');if(n==null)return;try{writeState(upsertProductionJob(a.state,rejectProductionJob(a.job,{actor:a.actor,role:a.role,note:n})));renderRoleProduction(block);}catch(e){alert(e.message)}};
  host.querySelector('#v14Revise').onclick=()=>{const a=act(),n=note('New revision');if(n==null)return;try{writeState(upsertProductionJob(a.state,reviseProductionJob(a.job,a.state,{actor:a.actor,role:a.role,note:n})));renderRoleProduction(block);}catch(e){alert(e.message)}};
  host.querySelector('#v14ApprovedPdf').onclick=()=>{const a=act(),g=approvalGate(a.state,a.job);if(!canProductionAction(a.role,'export-approved')||!g.ok){alert(g.reason);return;}downloadBytes(`${safeName(a.state.variables?.sku)}-approved-r${a.job.revision}.pdf`,buildProductionPdf(a.state),'application/pdf');};
  host.querySelector('#v14Delete').onclick=()=>{const a=act();if(!confirm(`Delete ${a.job?.label||'job'}?`))return;try{writeState(deleteProductionJob(a.state,a.job.id,{role:a.role}));renderRoleProduction(block);}catch(e){alert(e.message)}};
}

function renderProjectStore(block){
  const host=block.querySelector('#v14Projects');if(!host)return;const state=readState(),library=createLocalProjectLibrary(localStorage),items=library.list(),endpoint=state.remoteProjectEndpoint||'',projectId=state.projectId||safeName(state.projectName||'boxstudio-project');
  host.innerHTML=`<div class="v14-actions"><button id="v14SaveLocal">Save Local Snapshot</button><label class="profile-file">Import Project<input id="v14ImportProject" type="file" accept="application/json,.json"></label><button id="v14ExportProject">Export Project JSON</button></div><div class="v14-projects">${items.map(item=>`<div><span><b>${esc(item.label)}</b><small>${esc(item.id)} · r${item.revision}</small></span><span><button data-v14-load="${esc(item.id)}">Load</button><button class="danger" data-v14-remove="${esc(item.id)}">Delete</button></span></div>`).join('')||'<div class="profile-empty">No local project snapshots.</div>'}</div><div class="v14-remote"><label>REST Endpoint<input id="v14Endpoint" value="${esc(endpoint)}" placeholder="https://your-api.example.com/boxstudio"></label><label>Project ID<input id="v14RemoteId" value="${esc(projectId)}"></label><div class="v14-actions"><button id="v14PushRemote">Push</button><button id="v14PullRemote">Pull</button></div><small>接口契约：GET /projects、GET/PUT/DELETE /projects/:id。仓库当前不包含服务端实现；需要你自己的 CORS-compatible API。</small></div>`;
  host.querySelector('#v14SaveLocal').onclick=()=>{const current=readState(),lib=createLocalProjectLibrary(localStorage),existing=current.projectId?lib.load(current.projectId):null,envelope=existing?reviseProjectEnvelope(existing,current,{updatedBy:actor(current)}):createProjectEnvelope(current,{id:projectId,updatedBy:actor(current)});lib.save(envelope);current.projectId=envelope.id;current.projectRemoteRevision=envelope.revision;writeState(current);renderProjectStore(block);};
  host.querySelector('#v14ExportProject').onclick=()=>{const current=readState(),lib=createLocalProjectLibrary(localStorage),existing=current.projectId?lib.load(current.projectId):null,envelope=existing?reviseProjectEnvelope(existing,current,{updatedBy:actor(current)}):createProjectEnvelope(current,{id:projectId,updatedBy:actor(current)});downloadText(`${safeName(envelope.id)}.boxstudio.json`,serializeProjectEnvelope(envelope));};
  host.querySelector('#v14ImportProject').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{const envelope=parseProjectEnvelope(await file.text()),next=applyProjectEnvelope(readState(),envelope);writeState(next);location.reload();}catch(err){alert(err.message)}};
  host.querySelectorAll('[data-v14-load]').forEach(btn=>btn.onclick=()=>{const envelope=createLocalProjectLibrary(localStorage).load(btn.dataset.v14Load);if(!envelope)return;writeState(applyProjectEnvelope(readState(),envelope));location.reload();});
  host.querySelectorAll('[data-v14-remove]').forEach(btn=>btn.onclick=()=>{if(confirm('Delete local project snapshot?')){createLocalProjectLibrary(localStorage).remove(btn.dataset.v14Remove);renderProjectStore(block);}});
  const remoteConfig=()=>({endpoint:host.querySelector('#v14Endpoint').value.trim(),id:host.querySelector('#v14RemoteId').value.trim()});
  host.querySelector('#v14Endpoint').onchange=e=>{const next=readState();next.remoteProjectEndpoint=e.target.value.trim();writeState(next);};
  host.querySelector('#v14RemoteId').onchange=e=>{const next=readState();next.projectId=e.target.value.trim();writeState(next);};
  host.querySelector('#v14PushRemote').onclick=async()=>{try{const current=readState(),cfg=remoteConfig();if(!cfg.id)throw new Error('Project ID is required.');const store=createRestProjectStore({baseUrl:cfg.endpoint}),revision=Math.max(1,Number(current.projectRemoteRevision||0)+1),envelope=createProjectEnvelope(current,{id:cfg.id,revision,parentRevision:revision>1?revision-1:null,updatedBy:actor(current)}),saved=await store.save(envelope,{expectedRevision:current.projectRemoteRevision||null});current.projectId=saved.id;current.projectRemoteRevision=saved.revision;current.remoteProjectEndpoint=cfg.endpoint;current.lastRemoteSyncAt=new Date().toISOString();writeState(current);alert(`Remote push complete: ${saved.id} r${saved.revision}`);renderProjectStore(block);}catch(err){alert(err.message)}};
  host.querySelector('#v14PullRemote').onclick=async()=>{try{const current=readState(),cfg=remoteConfig();if(!cfg.id)throw new Error('Project ID is required.');const store=createRestProjectStore({baseUrl:cfg.endpoint}),envelope=await store.load(cfg.id),next=applyProjectEnvelope(current,envelope);next.remoteProjectEndpoint=cfg.endpoint;next.lastRemoteSyncAt=new Date().toISOString();writeState(next);location.reload();}catch(err){alert(err.message)}};
}

function hideLegacyPanels(){document.getElementById('boxstudio-v12-batch-queue')?.setAttribute('hidden','');const legacy=document.querySelector('#v13Production')?.closest('.v13-subsection');if(legacy)legacy.setAttribute('hidden','');}
function install(){
  hideLegacyPanels();const scroll=document.querySelector('#boxstudio-profile-manager .profile-manager-scroll');if(!scroll||document.getElementById(BLOCK_ID))return;
  const block=document.createElement('div');block.id=BLOCK_ID;block.className='profile-section v14-tools';block.innerHTML=`<div class="v14-title"><div><h3>V0.14 Persistent Production</h3><p>Recoverable batch artifacts · role-gated approval · local/REST project persistence.</p></div><span>V0.14</span></div><section><h4>Persistent Batch Artifacts</h4><div id="v14Batch"></div></section><section><h4>Production Roles & Approval</h4><div id="v14Production"></div></section><section><h4>Project Persistence</h4><div id="v14Projects"></div></section>`;scroll.appendChild(block);renderPersistentBatch(block);renderRoleProduction(block);renderProjectStore(block);
}
function updateVersionLabel(){setUiVersion('V0.14')}
const observer=new MutationObserver(()=>{updateVersionLabel();hideLegacyPanels();install();});observer.observe(document.documentElement,{childList:true,subtree:true});updateVersionLabel();install();
