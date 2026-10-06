const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const waitFor=async(fn,label,timeout=18000)=>{const end=Date.now()+timeout;while(Date.now()<end){try{const v=fn();if(v)return v}catch{}await sleep(50)}throw new Error(`Timeout: ${label}`)};
const signal=async(kind,text)=>{try{await fetch(`/__v49_${kind}__`,{method:'POST',body:text})}catch{}};
const click=el=>el?.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
try{
  const api=await waitFor(()=>window.BoxStudioV49,'V0.49 API');
  const grid=await waitFor(()=>document.querySelector('.v49-linked-grid'),'linked grid');
  await waitFor(()=>document.querySelector('#threeCanvas canvas'),'linked 3D canvas');
  const acceptance=api.getAcceptance();if(!acceptance.ok)throw new Error(`V0.49 acceptance failed: ${JSON.stringify(acceptance.errors)}`);
  const listButtons=await waitFor(()=>document.querySelectorAll('[data-v49-list-panel]').length>1&&document.querySelectorAll('[data-v49-list-panel]'),'panel list');
  const target=listButtons[1].dataset.v49ListPanel;click(listButtons[1]);
  await waitFor(()=>api.getState().linkedV49?.selectedPanelId===target,'2D selection sync');
  let state=api.getState();if(state.reviewV35?.selectedPanelId!==target||state.linkedV49?.lastSelectionSource!=='2d')throw new Error('2D panel selection did not synchronize review state.');
  const canvas=document.querySelector('#threeCanvas canvas'),r=canvas.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
  canvas.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:x,clientY:y,pointerId:41,pointerType:'mouse',isPrimary:true,buttons:1}));
  canvas.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,clientX:x,clientY:y,pointerId:41,pointerType:'mouse',isPrimary:true,buttons:0}));
  await waitFor(()=>api.getState().linkedV49?.lastSelectionSource==='3d','real canvas 3D selection');
  state=api.getState();if(state.reviewV35?.selectedPanelId!==state.linkedV49?.selectedPanelId)throw new Error('3D selection and 2D review selection drifted.');
  const half=document.querySelector('[data-v49-fold-preset="50"]');click(half);await waitFor(()=>api.getState().foldProgress===50,'50 percent fold preset');
  const play=document.querySelector('[data-v49-play]');click(play);await waitFor(()=>api.getState().foldProgress===0,'fold animation to flat',4000);
  if(document.querySelector('[data-v49-fold-label]')?.textContent!=='0%')throw new Error('Fold label did not track animation.');
  if(!document.querySelector('.v49-map-svg .panel-hit.selected'))throw new Error('2D selected panel highlight missing.');
  if(!document.querySelector('[data-v49-selected-badge]')?.textContent?.trim())throw new Error('Selected panel badge missing.');
  const isMobile=window.innerWidth<=500;if(isMobile&&document.documentElement.scrollWidth>window.innerWidth+4)throw new Error(`Mobile overflow ${document.documentElement.scrollWidth}>${window.innerWidth}`);
  const text=`PASS V0.49 bidirectional 2D↔3D selection, real canvas hit, fold presets/animation, mobile=${isMobile} panels=${acceptance.summary.panels}`;document.body.dataset.pass=text;await signal('pass',text);
}catch(error){const text=`FAIL ${error?.stack||error}`;document.body.dataset.fail=text;await signal('fail',text);throw error;}
