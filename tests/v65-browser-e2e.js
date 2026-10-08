const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const waitFor=async(fn,label,timeout=50000)=>{const end=Date.now()+timeout;while(Date.now()<end){try{const v=fn();if(v)return v}catch{}await sleep(50)}throw new Error(`Timeout: ${label}`)};
const signal=async(kind,text)=>{try{await fetch(`/__v65_${kind}__`,{method:'POST',body:text})}catch{}};
const activeStage=()=>document.querySelector('[data-v63-stagebar] [data-v63-stage].active')?.dataset.v63Stage;
try{
  const api=await waitFor(()=>window.BoxStudioV65,'V0.65 API',30000),runtime=await waitFor(()=>window.BoxStudioUiRuntimeV64,'shared runtime');
  await waitFor(()=>document.querySelector('[data-v65-version]'),'V0.65 badge');
  await waitFor(()=>document.querySelector('[data-v63-stagebar]'),'unified stagebar');
  if(document.body.dataset.v65Acceptance!=='pass')throw new Error(`V0.65 acceptance=${document.body.dataset.v65Acceptance}`);
  let stats=runtime.stats();if(stats.observerCount!==1)throw new Error(`Expected one observer, got ${stats.observerCount}`);for(const name of ['v55','v56','v57','v58','v59','v60','v61','v62','v63','v64','v65'])if(!stats.registered.includes(name))throw new Error(`Runtime missing ${name}`);
  await waitFor(()=>document.querySelector('[data-v61-studio]'),'Artwork Workspace');await waitFor(()=>document.querySelector('[data-v62-readiness]'),'Print Readiness');
  document.querySelector('[data-v63-stage="3D"]')?.click();await waitFor(()=>activeStage()==='3D','3D stage');await waitFor(()=>document.querySelector('#threeCanvas'),'3D canvas');
  await waitFor(()=>document.querySelector('[data-v55-manufacturing]'),'manufacturing intelligence');await waitFor(()=>document.querySelector('[data-v56-factory]'),'factory capability');await waitFor(()=>document.querySelector('[data-v57-routing]'),'factory routing');
  const v55=await waitFor(()=>window.BoxStudioV55,'V55 API'),b=v55.setFactoryThickness(1.8);if(!b?.profiles?.length)throw new Error('V55 recalculation failed');
  const v56=await waitFor(()=>window.BoxStudioV56,'V56 API');const created=v56.createProfile();if(!created||created.builtIn)throw new Error('V56 custom profile creation failed');v56.updateSelected({name:'V65 Browser Factory'});if(v56.getSelectedProfile()?.name!=='V65 Browser Factory')throw new Error('V56 profile update failed');
  const v57=await waitFor(()=>window.BoxStudioV57,'V57 API');v57.setJob({jobId:'V65-E2E',quantity:2500,targetLeadDays:12,preferMode:'any'});const route=v57.route();if(!route?.candidates?.length)throw new Error('V57 routing produced no candidates');
  const adv=await waitFor(()=>document.querySelector('[data-v64-production]'),'advanced production');window.BoxStudioV64.setAdvanced(false);adv.click();if(document.body.dataset.v58Advanced!=='true')throw new Error('Advanced chain did not open');
  document.querySelector('[data-v63-stage="Marks"]')?.click();await waitFor(()=>activeStage()==='Marks','Marks');await waitFor(()=>document.querySelector('[data-v58-marks-studio]'),'Shipping Mark Studio');
  document.querySelector('[data-v63-stage="Preflight"]')?.click();await waitFor(()=>activeStage()==='Preflight','Preflight');
  document.querySelector('[data-v63-stage="Export"]')?.click();await waitFor(()=>activeStage()==='Export','Export');await waitFor(()=>document.querySelector('#exportPdf'),'PDF export');
  document.querySelector('[data-v63-stage="Design"]')?.click();await waitFor(()=>activeStage()==='Design','Artwork');await waitFor(()=>document.querySelector('[data-v61-studio]'),'Artwork return');
  const idle0=runtime.stats().flushes;await sleep(400);const idleDelta=runtime.stats().flushes-idle0;if(idleDelta>14)throw new Error(`Runtime unstable at idle +${idleDelta}`);
  const isMobile=window.innerWidth<=500;if(isMobile&&document.documentElement.scrollWidth>window.innerWidth+4)throw new Error(`Mobile overflow ${document.documentElement.scrollWidth}>${window.innerWidth}`);
  stats=runtime.stats();if(stats.errors.length)throw new Error(`Runtime errors: ${JSON.stringify(stats.errors)}`);
  const text=`PASS V0.65 one shared V55-V65 observer + manufacturing/factory/routing + Artwork/Marks/3D/Preflight/Export, mobile=${isMobile} registered=${stats.registeredCount} flushes=${stats.flushes} mutations=${stats.mutationBatches}`;document.body.dataset.pass=text;await signal('pass',text);
}catch(error){const text=`FAIL ${error?.stack||error}`;document.body.dataset.fail=text;await signal('fail',text);throw error;}
