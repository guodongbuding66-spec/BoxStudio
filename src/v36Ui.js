import { STORAGE_KEY, defaultState } from './model.js';
import { createHostedApiV36, V36_ENDPOINT_STORAGE_KEY } from './hostedClientV36.js';

const esc=(value='')=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const clone=value=>structuredClone(value);
const slug=value=>String(value||'project').trim().toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'')||'project';
let host=null,observer=null,session=null,projects=[],selectedProject=null,revisions=[],auditEvents=[],errorText='',busy=false,refreshEpoch=0,apiClient=null,apiEndpoint='';

function endpoint(){try{return localStorage.getItem(V36_ENDPOINT_STORAGE_KEY)||'/api/v1'}catch{return'/api/v1'}}
function setEndpoint(value){const next=String(value||'/api/v1').trim()||'/api/v1';try{localStorage.setItem(V36_ENDPOINT_STORAGE_KEY,next)}catch{}apiClient=null;apiEndpoint='';return next}
function api(){const current=endpoint();if(!apiClient||apiEndpoint!==current){apiEndpoint=current;apiClient=createHostedApiV36({baseUrl:current});}return apiClient}
function readProjectState(){try{const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');return raw?{...clone(defaultState),...raw,structure:{...defaultState.structure,...(raw.structure||{})},variables:{...defaultState.variables,...(raw.variables||{})}}:clone(defaultState)}catch{return clone(defaultState)}}
function writeProjectIdentity(id,revision){const current=readProjectState();current.projectId=id;current.projectRemoteRevision=Number(revision)||0;current.savedAt=new Date().toISOString();localStorage.setItem(STORAGE_KEY,JSON.stringify(current))}
function roleCan(action){const role=session?.user?.role||'viewer',map={operator:['sync','submit'],approver:['approve','reject'],admin:['sync','submit','approve','reject']};return Boolean(map[role]?.includes(action))}
function statusBadge(status='draft'){return`<span class="v36-badge ${esc(status)}">${esc(status)}</span>`}
function setError(error){errorText=String(error?.message||error||'');}

async function refresh({projectId=null}={}){
  if(!host)return;const epoch=++refreshEpoch;busy=true;render();const client=api();
  try{
    const nextSession=await client.session(),list=await client.listProjects(),nextProjects=list.projects||[],target=projectId||selectedProject?.id||readProjectState().projectId||nextProjects[0]?.id||null;let nextProject=null,nextRevisions=[],nextAudit=[];
    if(target&&nextProjects.some(item=>item.id===target)){nextProject=await client.getProject(target);const rev=await client.listRevisions(target),aud=await client.audit({projectId:target});nextRevisions=rev.revisions||[];nextAudit=aud.events||[];}
    if(epoch!==refreshEpoch||!host)return;session=nextSession;projects=nextProjects;selectedProject=nextProject;revisions=nextRevisions;auditEvents=nextAudit;errorText='';
  }catch(error){if(epoch!==refreshEpoch||!host)return;if(error?.status===401){session=null;projects=[];selectedProject=null;revisions=[];auditEvents=[];}else setError(error);}
  finally{if(epoch===refreshEpoch&&host){busy=false;render();}}
}

async function login(email,password){refreshEpoch++;busy=true;render();try{await api().login(email,password);errorText='';await refresh();}catch(error){setError(error);busy=false;render();}}
async function logout(){refreshEpoch++;busy=true;render();try{await api().logout()}catch{}session=null;projects=[];selectedProject=null;revisions=[];auditEvents=[];busy=false;render();}
async function selectProject(id){await refresh({projectId:id})}
async function syncCurrent(){
  const current=readProjectState(),id=current.projectId||slug(current.projectName||current.variables?.sku||'boxstudio-project'),client=api();busy=true;render();
  try{
    const list=await client.listProjects(),exists=(list.projects||[]).find(item=>item.id===id);let result;
    if(exists){result=await client.createRevision(id,{state:current,expectedRevision:exists.currentRevision,reason:'Browser sync from BoxStudio V0.36'});writeProjectIdentity(id,result.revision);}else{const created=await client.createProject({id,name:current.projectName||id,state:current,reason:'Initial browser sync from BoxStudio V0.36'});writeProjectIdentity(id,created.currentRevision);}
    errorText='';await refresh({projectId:id});
  }catch(error){setError(error);busy=false;render();}
}
async function workflow(action,revision){const client=api(),reason=host?.querySelector('#v36Reason')?.value||'';busy=true;render();try{if(action==='submit')await client.submitRevision(selectedProject.id,revision,reason);if(action==='approve')await client.approveRevision(selectedProject.id,revision,reason);if(action==='reject')await client.rejectRevision(selectedProject.id,revision,reason);errorText='';await refresh({projectId:selectedProject.id});}catch(error){setError(error);busy=false;render();}}

function renderLogin(){return`<div class="v36-card"><h3>Sign in</h3><p class="v36-muted">Roles come from the hosted server. There is no client-side role selector.</p><label class="v36-field"><span>Email</span><input id="v36Email" autocomplete="username"></label><label class="v36-field"><span>Password</span><input id="v36Password" type="password" autocomplete="current-password"></label><button class="primary" id="v36Login" ${busy?'disabled':''}>Sign in</button></div>`}
function renderSide(){if(!session)return renderLogin();return`<div class="v36-card v36-user"><div><b>${esc(session.user.name)}</b><div class="v36-muted">${esc(session.user.email)}</div></div><span class="v36-badge">${esc(session.user.role)}</span></div><div class="v36-row"><button class="primary" id="v36Sync" ${busy||!roleCan('sync')?'disabled':''}>Sync current project</button><button id="v36Logout">Logout</button></div><h4>Hosted projects</h4>${projects.map(item=>`<button class="v36-project ${item.id===selectedProject?.id?'active':''}" data-v36-project="${esc(item.id)}"><b>${esc(item.name)}</b><div class="v36-muted">r${item.currentRevision} · ${esc(item.currentStatus)}</div></button>`).join('')||'<p class="v36-muted">No hosted projects yet.</p>'}`}
function revisionActions(item){const status=item.workflow?.status||'draft',r=item.revision;let buttons='';if(status==='draft'&&roleCan('submit'))buttons+=`<button data-v36-action="submit" data-v36-revision="${r}">Submit</button>`;if(status==='submitted'&&roleCan('approve'))buttons+=`<button class="primary" data-v36-action="approve" data-v36-revision="${r}">Approve</button>`;if(status==='submitted'&&roleCan('reject'))buttons+=`<button class="danger" data-v36-action="reject" data-v36-revision="${r}">Reject</button>`;return buttons||'<span class="v36-muted">No action</span>'}
function renderMain(){if(!session)return`<div class="v36-card"><h3>Hosted workflow</h3><p class="v36-muted">Sign in to access server-authoritative projects, immutable revisions and audit history.</p></div>`;if(!selectedProject)return`<div class="v36-card"><h3>No project selected</h3><p class="v36-muted">Sync the current browser project to create the first hosted immutable revision.</p></div>`;return`<div class="v36-card"><div class="v36-row"><h3 style="margin-right:auto">${esc(selectedProject.name)}</h3>${statusBadge(selectedProject.currentStatus)}<span class="v36-muted">Current r${selectedProject.currentRevision}</span></div><label class="v36-field"><span>Workflow note / rejection reason</span><input id="v36Reason" placeholder="Reason is mandatory for rejection"></label><div>${revisions.map(item=>`<div class="v36-revision"><b>r${item.revision}</b>${statusBadge(item.workflow?.status)}<span class="v36-hash" title="${esc(item.snapshotHash)}">${esc(item.snapshotHash)}</span><span class="v36-row">${revisionActions(item)}</span></div>`).join('')}</div></div><div class="v36-card"><h4>Append-only audit</h4>${auditEvents.map(event=>`<div class="v36-audit"><b>#${event.seq}</b><span>${esc(event.action)}</span><span>${esc(event.actorId)}</span><span>${esc(event.reason||event.hash.slice(0,16))}</span></div>`).join('')||'<p class="v36-muted">No audit events.</p>'}</div>`}

function bind(){if(!host)return;const close=host.querySelector('#v36Close');if(close)close.onclick=closeHosted;const endpointInput=host.querySelector('#v36Endpoint');if(endpointInput)endpointInput.onchange=event=>{refreshEpoch++;setEndpoint(event.target.value);session=null;projects=[];selectedProject=null;revisions=[];auditEvents=[];refresh()};const loginButton=host.querySelector('#v36Login');if(loginButton)loginButton.onclick=()=>login(host.querySelector('#v36Email').value,host.querySelector('#v36Password').value);const logoutButton=host.querySelector('#v36Logout');if(logoutButton)logoutButton.onclick=logout;const sync=host.querySelector('#v36Sync');if(sync)sync.onclick=syncCurrent;host.querySelectorAll('[data-v36-project]').forEach(button=>button.onclick=()=>selectProject(button.dataset.v36Project));host.querySelectorAll('[data-v36-action]').forEach(button=>button.onclick=()=>workflow(button.dataset.v36Action,Number(button.dataset.v36Revision)));}
function render(){if(!host)return;host.innerHTML=`<div class="v36-shell"><header class="v36-top"><b>BOXSTUDIO</b><span>Hosted Workflow · V0.36</span><label class="v36-row"><span>API</span><input id="v36Endpoint" value="${esc(endpoint())}" style="width:220px"></label><span class="spacer"></span><button id="v36Close">Close</button></header><div class="v36-body"><aside class="v36-side">${renderSide()}${errorText?`<div class="v36-card v36-error">${esc(errorText)}</div>`:''}${busy?'<p class="v36-muted">Working…</p>':''}</aside><main class="v36-main">${renderMain()}</main></div></div>`;bind();}
function openHosted(){if(host)return;host=document.createElement('div');host.id='boxstudio-v36-hosted';document.body.appendChild(host);render();refresh();}
function closeHosted(){refreshEpoch++;host?.remove();host=null;injectLauncher();}
function injectLauncher(){const topbar=document.querySelector('.topbar');if(!topbar||document.querySelector('#v36OpenHosted'))return;const button=document.createElement('button');button.id='v36OpenHosted';button.className='v36-launcher';button.textContent='Hosted';button.onclick=openHosted;const exportButton=topbar.querySelector('#quickExport');if(exportButton)topbar.insertBefore(button,exportButton);else topbar.appendChild(button);}
observer=new MutationObserver(injectLauncher);observer.observe(document.documentElement,{childList:true,subtree:true});injectLauncher();

export {openHosted,closeHosted};
