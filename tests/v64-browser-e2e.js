const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const waitFor=async(fn,label,timeout=45000)=>{const end=Date.now()+timeout;while(Date.now()<end){try{const v=fn();if(v)return v}catch{}await sleep(50)}throw new Error(`Timeout: ${label}`)};
const signal=async(kind,text)=>{try{await fetch(`/__v64_${kind}__`,{method:'POST',body:text})}catch{}};
const activeStage=()=>document.querySelector('[data-v63-stagebar] [data-v63-stage].active')?.dataset.v63Stage;
try{
  const api=await waitFor(()=>window.BoxStudioV64,'V0.64 API',30000),runtime=await waitFor(()=>window.BoxStudioUiRuntimeV64,'V0.64 runtime');
  await waitFor(()=>document.querySelector('[data-v63-stagebar]'),'unified stagebar');
  await waitFor(()=>document.querySelector('[data-v63-inspector]'),'context inspector');
  await waitFor(()=>document.querySelector('[data-v64-version]'),'V0.64 version badge');
  if(document.body.dataset.v64Acceptance!=='pass')throw new Error('V0.64 acceptance failed.');
  const stats=runtime.stats();if(stats.observerCount!==1)throw new Error(`Expected one shared observer, got ${stats.observerCount}`);for(const name of ['v58','v59','v60','v61','v62','v63','v64'])if(!stats.registered.includes(name))throw new Error(`Shared runtime missing ${name}`);
  for(const selector of ['.v58-quicknav','[data-v58-context]','[data-v59-guided]','[data-v60-artwork-callout]'])if(document.querySelector(selector))throw new Error(`Retired surface still mounted: ${selector}`);
  await waitFor(()=>document.querySelector('[data-v61-studio]'),'Artwork Workspace');await waitFor(()=>document.querySelector('[data-v62-readiness]'),'Print Readiness');await waitFor(()=>document.querySelector('#v60ArtworkFile'),'image input');
  const imageTool=document.querySelector('.toolbar [data-tool="image"]');if(!imageTool||imageTool.disabled)throw new Error('Image tool regressed.');let imageClicks=0;const fileInput=document.querySelector('#v60ArtworkFile');fileInput.addEventListener('click',e=>{imageClicks++;e.preventDefault()},{once:true});imageTool.click();if(imageClicks!==1)throw new Error('Image tool no longer hands off to V0.60.');
  const advanced=await waitFor(()=>document.querySelector('[data-v64-production]'),'advanced production access');api.setAdvanced(false);advanced.click();if(document.body.dataset.v58Advanced!=='true')throw new Error('Advanced production access was not preserved.');advanced.click();if(document.body.dataset.v58Advanced!=='false')throw new Error('Advanced production toggle did not close.');
  const idle0=runtime.stats().flushes;await sleep(350);const idleDelta=runtime.stats().flushes-idle0;if(idleDelta>12)throw new Error(`Shared runtime appears unstable at idle: +${idleDelta} flushes`);
  document.querySelector('[data-v63-stage="Marks"]')?.click();await waitFor(()=>activeStage()==='Marks','Marks stage');await waitFor(()=>document.querySelector('[data-v58-marks-studio]'),'Shipping Mark Studio');if(document.querySelector('[data-v59-guided]'))throw new Error('Guided rail returned in Marks.');
  document.querySelector('[data-v63-stage="3D"]')?.click();await waitFor(()=>activeStage()==='3D','3D stage');await waitFor(()=>document.querySelector('#threeCanvas'),'3D canvas');
  document.querySelector('[data-v63-stage="Preflight"]')?.click();await waitFor(()=>activeStage()==='Preflight','Preflight stage');
  document.querySelector('[data-v63-stage="Export"]')?.click();await waitFor(()=>activeStage()==='Export','Export stage');await waitFor(()=>document.querySelector('#exportPdf'),'Production PDF action');
  document.querySelector('[data-v63-stage="Design"]')?.click();await waitFor(()=>activeStage()==='Design','Artwork return');await waitFor(()=>document.querySelector('[data-v61-studio].v63-consolidated-artwork'),'consolidated Artwork Workspace return');
  const isMobile=window.innerWidth<=500;if(isMobile&&document.documentElement.scrollWidth>window.innerWidth+4)throw new Error(`Mobile overflow ${document.documentElement.scrollWidth}>${window.innerWidth}`);
  const final=runtime.stats(),text=`PASS V0.64 retired legacy nav/callout + one shared V58-V64 observer + preserved Marks/Image/3D/Preflight/Export, mobile=${isMobile} registered=${final.registeredCount} flushes=${final.flushes} mutations=${final.mutationBatches}`;document.body.dataset.pass=text;await signal('pass',text);
}catch(error){const text=`FAIL ${error?.stack||error}`;document.body.dataset.fail=text;await signal('fail',text);throw error;}
