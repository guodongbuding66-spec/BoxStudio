const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const waitFor=async(fn,label,timeout=18000)=>{const end=Date.now()+timeout;while(Date.now()<end){try{const v=fn();if(v)return v}catch{}await sleep(50)}throw new Error(`Timeout: ${label}`)};
const signal=async(kind,text)=>{try{await fetch(`/__v50_${kind}__`,{method:'POST',body:text})}catch{}};
const click=el=>el?.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
const input=(el,value)=>{el.value=String(value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))};
try{
  const api49=await waitFor(()=>window.BoxStudioV49,'V0.49 API');
  const api=await waitFor(()=>window.BoxStudioV50,'V0.50 API');
  await waitFor(()=>document.querySelector('.v50-authoring'),'V0.50 authoring panel');
  const canvas=await waitFor(()=>document.querySelector('#threeCanvas canvas.v50-proof-renderer'),'V0.50 renderer');
  const acceptance=api.getAcceptance();if(!acceptance.ok)throw new Error(`V0.50 acceptance failed: ${JSON.stringify(acceptance.errors)}`);
  if(document.querySelector('.three-page.v49-linked-page')?.dataset.v50Acceptance!=='pass')throw new Error('V0.50 page acceptance marker missing.');
  let model=api.getModel();if(model.edges.length<8)throw new Error(`Expected editable folds, got ${model.edges.length}`);
  const original=model.selectedEdge,angle=document.querySelector('[data-v50-angle]');input(angle,35);await waitFor(()=>api.getModel().selectedEdge?.angle===35,'edge angle edit');
  click(document.querySelector('[data-v50-flip]'));await waitFor(()=>api.getModel().selectedEdge?.angle===-35,'direction flip');
  model=api.getModel();const oldOrder=model.selectedEdge.order;click(document.querySelector('[data-v50-down]'));await waitFor(()=>api.getModel().selectedEdge.order===Math.min(oldOrder+1,model.edges.length),'fold order move');
  const timeline=document.querySelector('[data-v50-timeline]');input(timeline,50);await waitFor(()=>api.getModel().sequenceEnabled&&Math.round(api.getModel().timeline)===50,'sequence timeline');model=api.getModel();if(!model.edges.some(e=>e.localProgress===100)||!model.edges.some(e=>e.localProgress===0))throw new Error('Timeline did not resolve per-edge progress.');
  const explode=document.querySelector('[data-v50-explode]');input(explode,60);await waitFor(()=>Math.round(api.getModel().explode)===60,'exploded view');if(Math.abs(api.getProof().getAuthoring().explode-.6)>.001)throw new Error('Renderer did not receive explode state.');
  const dims=document.querySelector('[data-v50-dimensions]');dims.checked=false;dims.dispatchEvent(new Event('change',{bubbles:true}));await waitFor(()=>api.getProof().getAuthoring().dimensionsVisible===false,'dimension toggle off');dims.checked=true;dims.dispatchEvent(new Event('change',{bubbles:true}));await waitFor(()=>api.getProof().getAuthoring().dimensionsVisible===true,'dimension toggle on');if(!document.querySelector('[data-v50-panel-dimension]')?.textContent?.includes('mm'))throw new Error('Linked panel dimension label missing.');
  input(timeline,0);await waitFor(()=>Math.round(api.getModel().timeline)===0,'timeline reset');click(document.querySelector('[data-v50-play]'));await waitFor(()=>api.getModel().timeline>=99,'sequence playback',5000);
  api.getProof().fitView();const projected=api.getProof().getDebugState().projectedPanels,face=[...projected].reverse().find(p=>p.exterior)||projected.at(-1),before=api49.getState().linkedV49?.selectedPanelId,r=canvas.getBoundingClientRect(),x=r.left+face.points.reduce((n,p)=>n+p[0],0)/face.points.length,y=r.top+face.points.reduce((n,p)=>n+p[1],0)/face.points.length;canvas.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:x,clientY:y,pointerId:51,pointerType:'mouse',isPrimary:true,buttons:1}));canvas.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,clientX:x,clientY:y,pointerId:51,pointerType:'mouse',isPrimary:true,buttons:0}));await waitFor(()=>api49.getState().linkedV49?.selectedPanelId!==before||api49.getState().linkedV49?.lastSelectionSource==='api','V0.50 real 3D canvas selection');
  if(api.getProof().getDebugState().drawnPanels.length!==acceptance.model?.review?.graph?.nodes?.length&&api.getProof().getDebugState().drawnPanels.length<8)throw new Error('V0.50 renderer lost panels.');
  const isMobile=window.innerWidth<=500;if(isMobile&&document.documentElement.scrollWidth>window.innerWidth+4)throw new Error(`Mobile overflow ${document.documentElement.scrollWidth}>${window.innerWidth}`);
  const text=`PASS V0.50 fold angle/direction/order, sequence timeline, exploded view, dimensions, real canvas, mobile=${isMobile} edges=${api.getModel().edges.length}`;document.body.dataset.pass=text;await signal('pass',text);
}catch(error){const text=`FAIL ${error?.stack||error}`;document.body.dataset.fail=text;await signal('fail',text);throw error;}
