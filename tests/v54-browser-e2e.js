const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const waitFor=async(fn,label,timeout=45000)=>{const end=Date.now()+timeout;while(Date.now()<end){try{const v=fn();if(v)return v}catch{}await sleep(50)}throw new Error(`Timeout: ${label}`)};
const signal=async(kind,text)=>{try{await fetch(`/__v54_${kind}__`,{method:'POST',body:text})}catch{}};
const sig=()=>JSON.stringify({steps:window.BoxStudioV51.getState().foldSequenceV51.edgeSteps.map(x=>[x.key,x.step]),angles:window.BoxStudioV50.getState().foldAuthoringV50.edges.map(x=>[x.key,x.angle])});
try{
  const api=await waitFor(()=>window.BoxStudioV54,'V0.54 API',30000);await waitFor(()=>document.querySelector('[data-v54-assistant]'),'V0.54 panel');
  const original=sig(),proof=window.BoxStudioV52.getProof();
  const bundle=api.generate();if(bundle.plans.length!==3)throw new Error('Expected Safe/Balanced/Aggressive plans.');if(bundle.plans.map(x=>x.profile.id).join(',')!=='safe,balanced,aggressive')throw new Error('Plan profile order invalid.');if(bundle.plans.find(x=>x.profile.id==='safe').actions.some(a=>a.risk==='geometry'))throw new Error('Safe plan contains geometry-changing action.');
  if(!document.querySelector('[data-v54-plan="safe"]')||!document.querySelector('[data-v54-plan="balanced"]')||!document.querySelector('[data-v54-plan="aggressive"]'))throw new Error('Plan cards missing.');
  api.previewPlan('safe');await waitFor(()=>api.getPreview()?.profile?.id==='safe','safe plan preview');if(sig()!==original)throw new Error('Preview mutated runtime state.');const previewDebug=proof.getDebugState();if(!previewDebug.authoring)throw new Error('Preview did not update proof authoring.');
  api.restore();await sleep(50);if(sig()!==original)throw new Error('Restore changed project state.');
  api.previewPlan('aggressive');await waitFor(()=>api.getPreview()?.profile?.id==='aggressive','aggressive plan preview');if(sig()!==original)throw new Error('Aggressive preview mutated runtime state.');api.restore();
  const changed=bundle.plans.find(p=>p.changed);if(!changed)throw new Error('Expected at least one changed repair plan.');if(!api.applyPlan(changed.profile.id))throw new Error('Repair plan apply returned false.');await waitFor(()=>sig()!==original,'live repair plan apply');const applied=sig();if(applied===original)throw new Error('Apply did not change runtime state.');if(!api.getUndoSnapshot())throw new Error('Undo snapshot missing after plan apply.');
  if(!api.undo())throw new Error('Undo returned false.');await waitFor(()=>sig()===original,'repair plan undo');if(sig()!==original)throw new Error('Undo did not restore original state.');
  const isMobile=window.innerWidth<=500;if(isMobile&&document.documentElement.scrollWidth>window.innerWidth+4)throw new Error(`Mobile overflow ${document.documentElement.scrollWidth}>${window.innerWidth}`);
  const text=`PASS V0.54 global repair plans, Safe/Balanced/Aggressive preview isolation, confirmed apply and undo, mobile=${isMobile} evaluated=${bundle.evaluated}`;document.body.dataset.pass=text;await signal('pass',text);
}catch(error){const text=`FAIL ${error?.stack||error}`;document.body.dataset.fail=text;await signal('fail',text);throw error;}
