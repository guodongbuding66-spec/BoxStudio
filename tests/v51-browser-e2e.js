const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const waitFor=async(fn,label,timeout=22000)=>{const end=Date.now()+timeout;while(Date.now()<end){try{const v=fn();if(v)return v}catch{}await sleep(50)}throw new Error(`Timeout: ${label}`)};
const signal=async(kind,text)=>{try{await fetch(`/__v51_${kind}__`,{method:'POST',body:text})}catch{}};
const click=el=>el?.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
try{
  const api=await waitFor(()=>window.BoxStudioV51,'V0.51 API');
  const v50=await waitFor(()=>window.BoxStudioV50,'V0.50 API');
  await waitFor(()=>document.querySelector('[data-v51-sequence]'),'V0.51 sequence panel');
  await waitFor(()=>document.querySelector('#threeCanvas canvas'),'V0.51 canvas');
  let accept=api.getAcceptance({skipCollision:true});if(!accept.ok)throw new Error(`V0.51 structural acceptance failed: ${JSON.stringify(accept.errors)}`);
  let m=api.getModel();if(m.stepCount<2||m.keyframes.length!==m.stepCount+1)throw new Error('Keyframe model invalid.');
  const first=m.edges[0],second=m.edges[1];v50.selectEdge(second.key);await sleep(80);api.setSelectedEdgeStep(1);m=api.getModel();if(m.steps[0].edgeKeys.length<2)throw new Error('Step grouping failed.');
  const step1=await waitFor(()=>document.querySelector('[data-v51-keyframe="1"]'),'Step 1 keyframe');click(step1);await waitFor(()=>api.getModel().currentStep===1,'Step 1 navigation');
  click(document.querySelector('[data-v51-next]'));await waitFor(()=>api.getModel().currentStep===2,'next step');click(document.querySelector('[data-v51-prev]'));await waitFor(()=>api.getModel().currentStep===1,'previous step');
  v50.selectEdge(second.key);await sleep(60);click(document.querySelector('[data-v51-split]'));await sleep(80);m=api.getModel();if(m.edges.find(e=>e.key===first.key).step===m.edges.find(e=>e.key===second.key).step)throw new Error('Split step failed.');click(document.querySelector('[data-v51-merge]'));await sleep(80);m=api.getModel();if(m.edges.find(e=>e.key===first.key).step!==m.edges.find(e=>e.key===second.key).step)throw new Error('Merge step failed.');
  const report=api.scanCollisions();if(!(report.samples>m.stepCount))throw new Error('Collision scan did not sample intermediate fold positions.');if(!Array.isArray(report.penetrations)||!Array.isArray(report.overlaps))throw new Error('Collision report arrays missing.');
  const badge=document.querySelector('[data-v51-collision-badge]');if(!badge?.textContent?.includes('samples'))throw new Error('Collision badge did not update.');
  api.setBlocking(true);if(!api.getModel().blockOnPenetration)throw new Error('Collision blocking policy did not persist.');
  api.setStep(0);await waitFor(()=>api.getModel().currentStep===0,'reset to flat');click(document.querySelector('[data-v51-play]'));await waitFor(()=>api.getModel().currentStep===api.getModel().stepCount,'step playback complete',7000);
  const canvas=document.querySelector('#threeCanvas canvas'),r=canvas.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;canvas.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:x,clientY:y,pointerId:71,pointerType:'mouse',isPrimary:true,buttons:1}));canvas.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,clientX:x,clientY:y,pointerId:71,pointerType:'mouse',isPrimary:true,buttons:0}));await sleep(100);
  click(document.querySelector('[data-tab="Preflight"]'));const preflight=await waitFor(()=>document.querySelector('.v51-preflight'),'V0.51 Preflight collision check');if(!preflight.textContent.includes('Fold Sequence Collision Check'))throw new Error('V0.51 Preflight injection missing.');if(!document.querySelector('[data-v51-score]'))throw new Error('V0.51 Preflight score badge missing.');
  const isMobile=window.innerWidth<=500;if(isMobile&&document.documentElement.scrollWidth>window.innerWidth+4)throw new Error(`Mobile overflow ${document.documentElement.scrollWidth}>${window.innerWidth}`);
  const text=`PASS V0.51 keyframes/step grouping, single-step playback, path collision scan, Preflight integration, mobile=${isMobile} steps=${m.stepCount} samples=${report.samples}`;document.body.dataset.pass=text;await signal('pass',text);
}catch(error){const text=`FAIL ${error?.stack||error}`;document.body.dataset.fail=text;await signal('fail',text);throw error;}
