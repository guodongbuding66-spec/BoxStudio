const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const waitFor=async(fn,label,timeout=45000)=>{const end=Date.now()+timeout;while(Date.now()<end){try{const v=fn();if(v)return v}catch{}await sleep(50)}throw new Error(`Timeout: ${label}`)};
const signal=async(kind,text)=>{try{await fetch(`/__v62_${kind}__`,{method:'POST',body:text})}catch{}};
try{
  const api=await waitFor(()=>window.BoxStudioV62,'V0.62 API',30000);
  await waitFor(()=>document.querySelector('[data-v62-readiness]'),'Print Readiness');
  const guide=await waitFor(()=>document.querySelector('#designSvg [data-v62-guides]'),'guide overlay');
  if(document.body.dataset.v62Acceptance!=='pass')throw new Error('V0.62 acceptance failed.');
  if(!guide.querySelector('.v62-safe-zone')||!guide.querySelector('.v62-bleed-zone'))throw new Error('Default safe/bleed overlays missing.');
  const model=api.getGuideModel();if(!model.counts.panels||model.safeMm<=0||model.bleedMm<=0)throw new Error('Guide model missing production dimensions.');
  const seam=api.getSeamSummary();if(!Number.isFinite(seam.total)||!Number.isFinite(seam.warnings))throw new Error('Seam continuity summary invalid.');

  api.setGuide('safe',false);
  await waitFor(()=>!document.querySelector('#designSvg [data-v62-guides] .v62-safe-zone'),'safe guide disabled');
  if(api.getPrefs().safe!==false)throw new Error('Guide preference did not persist.');

  api.setGuide('cut',true);api.setGuide('crease',true);api.setGuide('panels',true);
  await waitFor(()=>document.querySelector('#designSvg [data-v62-guides] .v62-cut-line'),'CUT overlay');
  await waitFor(()=>document.querySelector('#designSvg [data-v62-guides] .v62-crease-line'),'CREASE overlay');
  await waitFor(()=>document.querySelector('#designSvg [data-v62-guides] .v62-panel-boundary'),'panel boundary overlay');
  if(!document.querySelector('[data-v62-open3d]')||!document.querySelector('[data-v62-open-export]'))throw new Error('3D/Preflight handoff missing.');

  api.setGuide('safe',true);
  await waitFor(()=>document.querySelector('#designSvg [data-v62-guides] .v62-safe-zone'),'safe guide restored');
  const isMobile=window.innerWidth<=500;if(isMobile&&document.documentElement.scrollWidth>window.innerWidth+4)throw new Error(`Mobile overflow ${document.documentElement.scrollWidth}>${window.innerWidth}`);
  const prefs=api.getPrefs(),text=`PASS V0.62 print guides + safe/bleed/panel/CUT/CREASE overlays + seam status + 3D/Preflight handoff, mobile=${isMobile} panels=${model.counts.panels} safe=${model.safeMm} bleed=${model.bleedMm} prefs=${JSON.stringify(prefs)}`;
  document.body.dataset.pass=text;await signal('pass',text);
}catch(error){const text=`FAIL ${error?.stack||error}`;document.body.dataset.fail=text;await signal('fail',text);throw error;}
