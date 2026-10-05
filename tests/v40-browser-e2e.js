const log=document.querySelector('#v40E2ELog');
const out=[];const write=s=>{out.push(s);if(log)log.textContent=out.join('\n')};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function signal(kind,detail){try{await fetch(`/__v40_${kind}__?${kind==='fail'?'message':'detail'}=${encodeURIComponent(detail)}`)}catch{}}
async function waitFor(fn,label,limit=200){for(let i=0;i<limit;i++){const v=fn();if(v)return v;await sleep(25)}throw new Error(`Timeout waiting for ${label}`)}
(async()=>{
  try{
    await signal('started','V0.40 browser driver started');
    await waitFor(()=>window.BoxStudioV40,'BoxStudioV40 API');
    const policy=window.BoxStudioV40.accessPolicy();if(policy.price!==0||policy.requiresLogin||policy.requiresApproval)throw new Error(`Free policy mismatch: ${JSON.stringify(policy)}`);
    await waitFor(()=>document.querySelector('.v40-free-badge'),'free badge');
    if(document.title!=='BoxStudio V0.40')throw new Error(`Shell title regressed to ${document.title}`);
    if(document.querySelector('.brand small')?.textContent!=='V0.40')throw new Error(`Brand version regressed to ${document.querySelector('.brand small')?.textContent}`);
    if(document.querySelector('#v36OpenHosted'))throw new Error('Hosted approval launcher must not be present in the default V0.40 product shell.');
    const steps=[...document.querySelectorAll('.v40-step')];if(steps.length<6)throw new Error('Guided template→size→design→3D→preflight→export flow is incomplete.');

    steps[1].click();
    await waitFor(()=>document.querySelector('[data-tab="Structure"]'),'Structure tab');
    const structureTab=document.querySelector('[data-tab="Structure"]');if(!structureTab.classList.contains('active'))structureTab.click();
    const open=await waitFor(()=>document.querySelector('#v38OpenCad'),'Dieline CAD launcher');open.click();
    await waitFor(()=>document.querySelector('#boxstudio-v38-cad'),'Dieline CAD');

    const generate=await waitFor(()=>document.querySelector('#v40GenerateOffsets'),'Generate offsets button');generate.click();
    await waitFor(()=>document.body.dataset.v40Production,'offset result');
    if(document.body.dataset.v40Production!=='pass')throw new Error(`V0.40 production offset gate is ${document.body.dataset.v40Production}`);
    const bleed=document.querySelectorAll('#v38Canvas .v40-zone.bleed').length,safe=document.querySelectorAll('#v38Canvas .v40-zone.safe').length;if(!bleed||!safe||bleed!==safe)throw new Error(`Offset preview mismatch bleed=${bleed} safe=${safe}`);

    const join=document.querySelector('#v40Join');join.value='round';join.dispatchEvent(new Event('change',{bubbles:true}));await sleep(30);const report=window.BoxStudioV40.getLastReport();if(!report?.ok||report.zones.bleed[0]?.join!=='round')throw new Error('Round join did not persist through the production offset workflow.');
    const result=window.BoxStudioV40.buildProductionPdf();if(!result.ok||!result.bytes||result.bytes.length<1000)throw new Error(`Production PDF failed bytes=${result.bytes?.length||0}`);
    const text=new TextDecoder().decode(result.bytes);if(!text.includes('%PDF-1.7')||!text.includes('/CutContour'))throw new Error('Production PDF lost mature PDF/spot-dieline output.');
    const detail=`PASS free=${policy.price} approval=${policy.requiresApproval} shell=V0.40 guided=2→CAD bleed=${bleed} safe=${safe} join=round pdf=${result.bytes.length}`;write(detail);document.body.dataset.v40E2e='pass';await signal('pass',detail);
  }catch(error){const message=`FAIL ${error?.stack||error}`;write(message);document.body.dataset.v40E2e='fail';await signal('fail',message)}
})();
