import { STORAGE_KEY, defaultState } from '../src/model.js';

const log=document.getElementById('v35E2ELog');
async function signal(path,key,value){try{await fetch(`${path}?${key}=${encodeURIComponent(value)}`,{cache:'no-store'})}catch(error){console.error('V0.35 E2E signal failed',error)}}
function requireEl(selector){const el=document.querySelector(selector);if(!el)throw new Error(`Missing ${selector}`);return el}
function saved(){return JSON.parse(localStorage.getItem(STORAGE_KEY)||'null')}
const tick=()=>new Promise(resolve=>setTimeout(resolve,120));

function renderedFacePoint(canvas){
  const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,data=ctx.getImageData(0,0,w,h).data;
  const bright=(x,y)=>{if(x<0||y<0||x>=w||y>=h)return false;const i=(Math.floor(y)*w+Math.floor(x))*4;return data[i]+data[i+1]+data[i+2]>430&&data[i+3]>200};
  for(let y=8;y<h-8;y+=4)for(let x=8;x<w-8;x+=4){if(bright(x,y)&&bright(x-4,y)&&bright(x+4,y)&&bright(x,y-4)&&bright(x,y+4))return{x,y}}
  return null;
}

await signal('/__v35_started__','detail','driver-loaded');
try{
  localStorage.clear();
  const seed=structuredClone(defaultState);seed.page='editor';seed.editorTab='3D';
  localStorage.setItem(STORAGE_KEY,JSON.stringify(seed));
  await import('../src/v35Ui.js');
  await Promise.resolve();await Promise.resolve();

  requireEl('#v35OpenReview').click();
  await tick();
  requireEl('#boxstudio-v35-review');requireEl('#v35DielineSvg');const proofCanvas=requireEl('#v35Proof canvas');
  if(document.querySelectorAll('[data-v35-panel]').length<4)throw new Error('2D review did not render expected dieline panels.');
  if(document.querySelectorAll('.v35-sequence>div').length<1)throw new Error('Fold dependency sequence did not render.');

  // Real 3D pointer hit: derive a click point from the pixels actually rendered as a paperboard face.
  const facePoint=renderedFacePoint(proofCanvas);if(!facePoint)throw new Error('Could not locate a rendered 3D paperboard face pixel.');
  const rect=proofCanvas.getBoundingClientRect(),clientX=rect.left+(facePoint.x/proofCanvas.width)*rect.width,clientY=rect.top+(facePoint.y/proofCanvas.height)*rect.height;
  proofCanvas.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX,clientY,pointerId:41,button:0,pointerType:'mouse'}));
  proofCanvas.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,clientX,clientY,pointerId:41,button:0,pointerType:'mouse'}));
  await tick();
  let state=saved();
  if(state.reviewV35?.lastSelectionSource!=='3d')throw new Error(`Rendered 3D face click did not synchronize selection at ${facePoint.x},${facePoint.y}.`);
  if(state.editorV33?.focusPanelId!==state.reviewV35?.selectedPanelId)throw new Error('3D face selection did not synchronize V0.33 2D panel focus.');

  // 2D panel selection must persist into the shared review model used by the 3D proof.
  requireEl('[data-v35-panel="back"]').dispatchEvent(new MouseEvent('click',{bubbles:true}));
  await tick();
  state=saved();if(state.reviewV35?.selectedPanelId!=='back')throw new Error('2D panel selection did not persist.');
  if(state.reviewV35?.lastSelectionSource!=='2d')throw new Error('2D selection source was not recorded.');
  if(state.editorV33?.focusPanelId!=='back')throw new Error('2D panel selection did not synchronize V0.33 panel focus.');

  // Select a real element, edit exact geometry, and require live revision + persistence.
  requireEl('[data-v35-element="origin"]').dispatchEvent(new MouseEvent('click',{bubbles:true}));
  await tick();
  const x=requireEl('[data-v35-prop="x"]');x.value='84.5';x.dispatchEvent(new Event('change',{bubbles:true}));
  await tick();
  state=saved();
  const origin=state.elements.find(item=>item.id==='origin');
  if(origin?.x!==84.5)throw new Error(`Exact 2D edit did not persist: ${origin?.x}`);
  if(!(state.reviewV35?.liveRevision>0))throw new Error('2D edit did not increment live 3D revision.');
  requireEl('#v35Proof canvas');

  // Material is engineering state, not a visual-only dropdown.
  const material=requireEl('#v35Material');material.value='corrugated-kraft';material.dispatchEvent(new Event('change',{bubbles:true}));
  await tick();state=saved();if(state.structure.materialId!=='corrugated-kraft')throw new Error('Material selection did not persist.');
  const flute=requireEl('#v35Flute');if(flute.disabled)throw new Error('Corrugated material did not expose flute choices.');flute.value='B';flute.dispatchEvent(new Event('change',{bubbles:true}));
  await tick();state=saved();if(state.structure.flute!=='B')throw new Error('Flute selection did not persist.');
  const thickness=requireEl('#v35Thickness');thickness.value='2.35';thickness.dispatchEvent(new Event('change',{bubbles:true}));
  await tick();state=saved();if(Number(state.structure.thickness)!==2.35)throw new Error('Thickness override did not persist.');

  // Fold range updates the same project state and the active proof controller.
  const fold=requireEl('#v35Fold');fold.value='37';fold.dispatchEvent(new Event('input',{bubbles:true}));
  await tick();state=saved();if(state.foldProgress!==37)throw new Error('Fold progress did not persist.');
  if(requireEl('#v35FoldLabel').textContent.trim()!=='37%')throw new Error('Fold label did not update.');

  if(!document.body.textContent.includes('Graph-derived review sequence, not a factory machine program.'))throw new Error('Fold-order boundary disclosure is missing.');
  const detail=`PASS v35 bidirectional panel=${state.reviewV35.selectedPanelId} revision=${state.reviewV35.liveRevision} material=${state.structure.materialId} fold=${state.foldProgress}`;
  document.body.dataset.v35E2e='pass';log.textContent=detail;await signal('/__v35_pass__','detail',detail);
}catch(error){const message=String(error?.stack||error);document.body.dataset.v35E2e='fail';log.textContent=`FAIL ${message}`;console.error(error);await signal('/__v35_fail__','message',message)}
