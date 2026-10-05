const frame=document.querySelector('#realBoxStudio'),log=document.querySelector('#v40IndexLog');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const write=s=>{if(log)log.textContent=s};
async function signal(kind,detail){try{await fetch(`/__v40_index_${kind}__?${kind==='fail'?'message':'detail'}=${encodeURIComponent(detail)}`)}catch{}}
async function waitFor(fn,label,limit=240){for(let i=0;i<limit;i++){const v=fn();if(v)return v;await sleep(25)}throw new Error(`Timeout waiting for ${label}`)}
(async()=>{
  try{
    await signal('started','V0.40 actual index driver started');
    await waitFor(()=>frame.contentDocument?.querySelector('.app'),'actual app shell');
    const w=frame.contentWindow,d=frame.contentDocument;
    await waitFor(()=>w.BoxStudioV40,'actual BoxStudioV40');
    await waitFor(()=>d.querySelector('.v40-free-badge'),'actual free badge');
    if(d.title!=='BoxStudio V0.40')throw new Error(`Actual index title is ${d.title}`);
    if(d.querySelector('.brand small')?.textContent!=='V0.40')throw new Error(`Actual brand version is ${d.querySelector('.brand small')?.textContent}`);
    if(d.querySelector('#v36OpenHosted')||d.querySelector('#boxstudio-v36-hosted'))throw new Error('Actual default index exposed Hosted approval UI.');
    if(d.querySelectorAll('.v40-step').length!==6)throw new Error(`Actual flow steps=${d.querySelectorAll('.v40-step').length}`);

    d.querySelector('[data-nav="templates"]').click();
    await waitFor(()=>d.querySelector('#v32TemplateCenter'),'Template Center on actual index');
    const cards=d.querySelectorAll('#v32TemplateCenter [data-template-id]').length;if(cards<5)throw new Error(`Actual template cards=${cards}`);
    const search=d.querySelector('#v32TemplateSearch');search.value='0427';search.dispatchEvent(new Event('input',{bubbles:true}));await sleep(20);const filtered=d.querySelectorAll('#v32TemplateCenter [data-template-id]').length;if(filtered!==1)throw new Error(`Template search expected 1, got ${filtered}`);

    const step2=[...d.querySelectorAll('.v40-step')][1];step2.click();
    await waitFor(()=>d.querySelector('[data-tab="Structure"]'),'actual Structure tab');
    await waitFor(()=>d.querySelector('#v38OpenCad'),'actual CAD launcher');
    if(d.querySelector('[data-tab="Marks"]')==null)throw new Error('Actual editor lost Marks tab.');
    const detail=`PASS actual-index version=V0.40 free=1 approval=0 templates=${cards} filtered=${filtered}`;write(detail);document.body.dataset.v40IndexE2e='pass';await signal('pass',detail);
  }catch(error){const message=`FAIL ${error?.stack||error}`;write(message);document.body.dataset.v40IndexE2e='fail';await signal('fail',message)}
})();
