import { STORAGE_KEY } from '../src/model.js';
import { openDielineCadV38, closeCad } from '../src/v38Ui.js';
import { mixedContinuityDiagnosticsV46 } from '../src/curveConstraintsV46.js';

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const waitFor=async(fn,label,timeout=18000)=>{const end=Date.now()+timeout;while(Date.now()<end){try{const v=fn();if(v)return v}catch{}await sleep(50)}throw new Error(`Timeout: ${label}`)};
const signal=async(kind,text)=>{try{await fetch(`/__v46_${kind}__`,{method:'POST',body:text})}catch{}};
const click=node=>node?.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
const shiftClick=node=>{node?.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,view:window,shiftKey:true,pointerId:7,pointerType:'mouse'}));node?.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window,shiftKey:true}))};
const readState=()=>JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
const writeDoc=doc=>{const state=readState();state.dielineV38=doc;state.savedAt=new Date().toISOString();localStorage.setItem(STORAGE_KEY,JSON.stringify(state))};
const shell=(nodes,edges,template)=>({schema:'boxstudio-dieline-v38',version:1,width:60,height:60,template,nodes,edges,panels:[],zones:{bleed:[],safe:[],glue:[]},settings:{bleedMm:0,safeMm:0},metadata:{}});

try{
  await waitFor(()=>window.BoxStudioV46,'V0.46 API');
  const caps=window.BoxStudioV46;
  for(const key of ['mixedCurveG1','cornerSwitch','cornerRestoreRemove','batchCorners','equalRadius','canvasRadiusDrag','cadTopology3dAcceptance'])if(!caps[key])throw new Error(`V0.46 capability missing: ${key}`);

  const mixedDoc=shell(
    [{id:'l',x:-10,y:0},{id:'m',x:0,y:0},{id:'a',x:10,y:10}],
    [{id:'line',a:'l',b:'m',lineType:'CUT',curve:'line'},{id:'arc',a:'m',b:'a',lineType:'CUT',curve:'arc',arc:{rx:8,ry:8,rotation:0,largeArc:false,sweep:false}}],
    'v46-mixed-browser'
  );
  writeDoc(mixedDoc);openDielineCadV38();let cad=await waitFor(()=>document.querySelector('#boxstudio-v38-cad'),'mixed CAD');click(await waitFor(()=>cad.querySelector('[data-v38-node="m"]'),'mixed node m'));
  const mixedTools=await waitFor(()=>document.querySelector('#boxstudio-v38-cad .v46-mixed-tools'),'mixed G1 tools');const driver=mixedTools.querySelector('[data-v46-driver]');driver.value='line';click(mixedTools.querySelector('[data-v46-g1]'));
  const mixedSolved=await waitFor(()=>{const doc=readState().dielineV38,d=mixedContinuityDiagnosticsV46(doc,'m');return doc.nodes.find(n=>n.id==='m')?.continuityV46?.mode==='g1'&&d.eligible&&d.tangentErrorDeg<1e-3?{doc,d}:null},'mixed Line↔Arc G1 solve');
  if(Math.abs(mixedSolved.doc.edges.find(e=>e.id==='arc').arc.rx-10)>.001)throw new Error('Line↔Arc UI did not solve the expected tangent radius.');

  closeCad();const rect=shell(
    [{id:'n1',x:0,y:0},{id:'n2',x:20,y:0},{id:'n3',x:20,y:20},{id:'n4',x:0,y:20}],
    [{id:'e1',a:'n1',b:'n2',lineType:'CUT',curve:'line'},{id:'e2',a:'n2',b:'n3',lineType:'CUT',curve:'line'},{id:'e3',a:'n3',b:'n4',lineType:'CUT',curve:'line'},{id:'e4',a:'n4',b:'n1',lineType:'CUT',curve:'line'}],
    'v46-corner-browser'
  );
  writeDoc(rect);openDielineCadV38();cad=await waitFor(()=>document.querySelector('#boxstudio-v38-cad'),'corner CAD');
  click(await waitFor(()=>cad.querySelector('[data-v38-node="n1"]'),'n1'));await waitFor(()=>document.querySelector('.v46-corner-tools'),'V0.46 corner tools');
  for(const id of ['n2','n3','n4']){cad=await waitFor(()=>document.querySelector('#boxstudio-v38-cad'),'CAD for batch selection');shiftClick(await waitFor(()=>cad.querySelector(`[data-v38-node="${id}"]`),`batch ${id}`));await sleep(30)}
  cad=await waitFor(()=>document.querySelector('#boxstudio-v38-cad'),'CAD before batch apply');click(await waitFor(()=>cad.querySelector('[data-v38-node="n1"]'),'n1 final selection'));
  const cornerTools=await waitFor(()=>document.querySelector('.v46-corner-tools'),'corner tools after batch selection');const batchButton=await waitFor(()=>cornerTools.querySelector('[data-v46-corner-batch]:not([disabled])'),'batch apply button');const value=cornerTools.querySelector('[data-v46-corner-value]');value.value='2';click(batchButton);
  const batchDoc=await waitFor(()=>{const d=readState().dielineV38;return d.edges.filter(e=>e.v46Corner?.sourceNode).length===4?d:null},'four adjacent V0.46 Fillets');
  if(batchDoc.edges.some(e=>e.v46Corner&&e.v46Corner.version<2))throw new Error('Adjacent corner features did not use collision-safe provenance.');

  cad=await waitFor(()=>document.querySelector('#boxstudio-v38-cad'),'CAD after batch');let fillets=readState().dielineV38.edges.filter(e=>e.v45Corner?.mode==='fillet');click(await waitFor(()=>cad.querySelector(`[data-v38-edge="${fillets[0].id}"]`),'first fillet edge'));
  await waitFor(()=>document.querySelector('.v46-feature-tools'),'feature tools');await waitFor(()=>document.querySelector(`.v46-radius-overlay [data-v46-radius-handle="${fillets[0].id}"]`),'canvas radius drag handle');

  for(const edge of fillets.slice(1,3)){cad=await waitFor(()=>document.querySelector('#boxstudio-v38-cad'),'CAD equal-radius selection');shiftClick(await waitFor(()=>cad.querySelector(`[data-v38-edge="${edge.id}"]`),`equal radius ${edge.id}`));await sleep(30)}
  cad=await waitFor(()=>document.querySelector('#boxstudio-v38-cad'),'CAD restore first fillet');click(await waitFor(()=>cad.querySelector(`[data-v38-edge="${fillets[0].id}"]`),'first fillet final'));
  let featureTools=await waitFor(()=>document.querySelector('.v46-feature-tools'),'feature tools equal-radius');const eqButton=await waitFor(()=>featureTools.querySelector('[data-v46-equal-radius]:not([disabled])'),'equal radius button');featureTools.querySelector('[data-v46-feature-value]').value='3';click(eqButton);
  const equalDoc=await waitFor(()=>{const d=readState().dielineV38,g=d.constraintsV46?.equalRadiusGroups?.[0];if(!g||g.edgeIds.length<3)return null;return g.edgeIds.every(id=>Math.abs(d.edges.find(e=>e.id===id)?.v45Corner?.valueMm-3)<1e-6)?d:null},'equal radius group');
  const equalGroup=equalDoc.constraintsV46.equalRadiusGroups[0];

  const switchId=equalGroup.edgeIds[0];cad=await waitFor(()=>document.querySelector('#boxstudio-v38-cad'),'CAD before switch');click(await waitFor(()=>cad.querySelector(`[data-v38-edge="${switchId}"]`),'switch feature edge'));featureTools=await waitFor(()=>document.querySelector('.v46-feature-tools'),'feature tools switch');const mode=featureTools.querySelector('[data-v46-feature-mode]');mode.value='chamfer';click(featureTools.querySelector('[data-v46-feature-update]'));
  const chamfer=await waitFor(()=>readState().dielineV38.edges.find(e=>e.id===switchId&&e.v45Corner?.mode==='chamfer'),'Fillet→Chamfer switch');if(chamfer.curve!=='line')throw new Error('Fillet→Chamfer UI did not create a native line.');

  cad=await waitFor(()=>document.querySelector('#boxstudio-v38-cad'),'CAD before restore');click(await waitFor(()=>cad.querySelector(`[data-v38-edge="${switchId}"]`),'chamfer feature'));featureTools=await waitFor(()=>document.querySelector('.v46-feature-tools'),'feature tools restore');click(featureTools.querySelector('[data-v46-feature-remove]'));
  await waitFor(()=>{const d=readState().dielineV38;return !d.edges.some(e=>e.id===switchId)&&d.nodes.some(n=>n.id==='n1')},'Corner Feature Restore/Remove');

  const report=window.BoxStudioV46.runPreflight(readState(),{doc:readState().dielineV38});if(report.errors.some(x=>String(x.code).startsWith('V46_')))throw new Error(`V0.46 preflight errors: ${report.errors.map(x=>x.code).join(',')}`);
  const text=`PASS mixed=${mixedSolved.d.tangentErrorDeg.toExponential(2)} batch=4 equalR=3 switch=chamfer restore=ok radiusHandle=mounted 3D=${report.acceptance?.summary?.threePanels||0}/${report.acceptance?.summary?.threeHinges||0}`;document.body.dataset.pass=text;await signal('pass',text);
}catch(error){const text=`FAIL ${error?.stack||error}`;document.body.dataset.fail=text;await signal('fail',text);throw error;}
