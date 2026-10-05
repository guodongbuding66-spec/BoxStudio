const frame=document.getElementById('appFrame'),win=frame.contentWindow,doc=frame.contentDocument;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function waitFor(fn,label,timeout=12000){const end=Date.now()+timeout;while(Date.now()<end){try{const v=fn();if(v)return v}catch{}await sleep(50)}throw new Error(`Timed out: ${label}`)}
function assert(ok,msg){if(!ok)throw new Error(msg)}
async function signal(path,detail){await fetch(`${path}?${path.includes('fail')?'message':'detail'}=${encodeURIComponent(detail)}`).catch(()=>{})}
try{
  await waitFor(()=>win.BoxStudioV40?.freeAccess,'BoxStudioV40 bootstrap');
  const shell=await waitFor(()=>doc.querySelector('.workspace.v40-shell'),'V0.40 editor shell');
  assert(doc.title==='BoxStudio V0.40','title was not upgraded to V0.40');
  assert(doc.body.dataset.v40Free==='true','free-access marker missing');
  assert(doc.body.dataset.v40ApprovalRequired==='false','approval must not gate default workflow');
  assert(shell.querySelector('.v40-mode-panel'),'left mode panel missing');
  assert(shell.querySelector('.v40-rightdeck'),'right 3D/inspector deck missing');
  assert(doc.querySelector('.v40-top-controls [data-v40-view="split"]'),'Split control missing');
  const hosted=doc.querySelector('#v36OpenHosted');if(hosted)assert(win.getComputedStyle(hosted).display==='none','Hosted/RBAC launcher must not be in default editor flow');

  doc.querySelector('.v40-top-controls [data-v40-action="preflight"]').click();
  await waitFor(()=>doc.querySelector('.tabbar [data-tab="Preflight"]')?.classList.contains('active'),'Preflight tab');
  assert(doc.body.innerText.includes('Quality check')||doc.body.innerText.includes('Preflight'),'Preflight did not render');
  doc.querySelector('.v40-top-controls [data-v40-action="export"]').click();
  await waitFor(()=>doc.querySelector('.tabbar [data-tab="Export"]')?.classList.contains('active'),'Export tab');
  await waitFor(()=>doc.querySelector('[data-v40-production-pdf]'),'free production export control');
  assert(doc.querySelector('.v40-mode-panel').innerText.includes('No paywall'),'free export policy is not visible');

  doc.querySelector('.tabbar [data-tab="Structure"]').click();
  const length=await waitFor(()=>doc.querySelector('[data-v40-structure="length"]'),'V0.40 structure mirror');
  const before=Number(length.value),after=before+7.5;length.value=String(after);length.dispatchEvent(new Event('change',{bubbles:true}));
  await waitFor(()=>{try{return Math.abs(JSON.parse(localStorage.getItem('boxstudio-v08-state')||'{}').structure?.length-after)<0.001}catch{return false}},'mirrored structure persistence');

  const cad=await waitFor(()=>doc.querySelector('[data-v40-open-cad]'),'Dieline CAD launcher');cad.click();
  await waitFor(()=>doc.querySelector('#boxstudio-v38-cad'),'Dieline CAD open');
  doc.querySelector('#boxstudio-v38-cad [data-v38-action="close"]').click();
  await waitFor(()=>!doc.querySelector('#boxstudio-v38-cad'),'Dieline CAD close');

  doc.querySelector('.v40-top-controls [data-v40-view="split"]').click();
  await waitFor(()=>doc.querySelector('#boxstudio-v35-review'),'2D/3D review open');
  doc.querySelector('#boxstudio-v35-review #v35Close').click();
  await waitFor(()=>!doc.querySelector('#boxstudio-v35-review'),'2D/3D review close');

  const detail=`PASS free=true approval=false shell=4-zone structure=${before}->${after} cad=ok split=ok export=anonymous`;
  document.getElementById('log').textContent=detail;document.body.dataset.v40E2e='pass';await signal('/__v40_pass__',detail);
}catch(error){const detail=`FAIL ${error?.stack||error}`;document.getElementById('log').textContent=detail;document.body.dataset.v40E2e='fail';await signal('/__v40_fail__',detail);throw error}
