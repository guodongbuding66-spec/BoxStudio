import { STORAGE_KEY } from '../src/model.js';
import { openDielineCadV38, closeCad } from '../src/v38Ui.js';
import { setNodeContinuityV44, continuityDiagnosticsV44 } from '../src/curveEditingV44.js';
import { buildDielineSvgV38, buildDxfV38, buildDielinePdfV38 } from '../src/productionExportV38.js';

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const waitFor=async(fn,label,timeout=18000)=>{const end=Date.now()+timeout;while(Date.now()<end){try{const v=fn();if(v)return v}catch{}await sleep(50)}throw new Error(`Timeout: ${label}`)};
const signal=async(kind,text)=>{try{await fetch(`/__v45_${kind}__`,{method:'POST',body:text})}catch{}};
const click=node=>node?.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
const readState=()=>JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
const writeDoc=doc=>{const state=readState();state.dielineV38=doc;state.savedAt=new Date().toISOString();localStorage.setItem(STORAGE_KEY,JSON.stringify(state))};

try{
  await waitFor(()=>window.BoxStudioV45,'V0.45 API');
  if(!window.BoxStudioV45.liveContinuity||!window.BoxStudioV45.filletChamfer||!window.BoxStudioV45.dimensionConstraints)throw new Error('V0.45 capabilities missing.');

  const continuityBase={schema:'boxstudio-dieline-v38',version:1,width:40,height:30,template:'v45-live-browser',nodes:[{id:'a',x:0,y:0},{id:'m',x:10,y:0},{id:'b',x:20,y:0}],edges:[{id:'e1',a:'a',b:'m',lineType:'CUT',curve:'cubic',c1:{x:3,y:4},c2:{x:8,y:2}},{id:'e2',a:'m',b:'b',lineType:'CUT',curve:'cubic',c1:{x:12,y:-1},c2:{x:17,y:-3}}],panels:[],zones:{bleed:[],safe:[],glue:[]},settings:{bleedMm:0,safeMm:0},metadata:{}};
  const constrained=setNodeContinuityV44(continuityBase,'m','g2',{driverEdgeId:'e1'});writeDoc(constrained);openDielineCadV38();
  let cad=await waitFor(()=>document.querySelector('#boxstudio-v38-cad'),'CAD open');click(await waitFor(()=>cad.querySelector('[data-v38-edge="e1"]'),'cubic e1'));
  let c2y=await waitFor(()=>document.querySelector('#boxstudio-v38-cad [data-v38-handle="c2y"]'),'C2 Y field');c2y.value='4.25';c2y.dispatchEvent(new Event('change',{bubbles:true}));
  await waitFor(()=>{const d=continuityDiagnosticsV44(readState().dielineV38,'m');return d.eligible&&d.tangentErrorDeg<1e-3&&d.curvatureDelta<1e-5?d:null},'live G2 restore');
  const liveDiag=continuityDiagnosticsV44(readState().dielineV38,'m');
  cad=await waitFor(()=>document.querySelector('#boxstudio-v38-cad'),'CAD after live reopen');click(await waitFor(()=>cad.querySelector('[data-v38-edge="e1"]'),'e1 after live reopen'));
  const handleLength=await waitFor(()=>document.querySelector('#boxstudio-v38-cad [data-v45-handle-length="c1"]'),'V0.45 handle dimension');handleLength.value='6.5';handleLength.dispatchEvent(new Event('change',{bubbles:true}));
  await waitFor(()=>{try{return Math.abs(window.BoxStudioV45.curveDimensions(readState().dielineV38,'e1').c1Length-6.5)<1e-3}catch{return false}},'handle length persistence');

  closeCad();const cornerDoc={schema:'boxstudio-dieline-v38',version:1,width:30,height:30,template:'v45-corner-browser',nodes:[{id:'n1',x:0,y:0},{id:'n2',x:20,y:0},{id:'n3',x:20,y:20},{id:'n4',x:0,y:20}],edges:[{id:'e1',a:'n1',b:'n2',lineType:'CUT',curve:'line'},{id:'e2',a:'n2',b:'n3',lineType:'CUT',curve:'line'},{id:'e3',a:'n3',b:'n4',lineType:'CUT',curve:'line'},{id:'e4',a:'n4',b:'n1',lineType:'CUT',curve:'line'}],panels:[],zones:{bleed:[],safe:[],glue:[]},settings:{bleedMm:0,safeMm:0},metadata:{}};writeDoc(cornerDoc);openDielineCadV38();cad=await waitFor(()=>document.querySelector('#boxstudio-v38-cad'),'corner CAD');click(await waitFor(()=>cad.querySelector('[data-v38-node="n1"]'),'corner n1'));
  const cornerTools=await waitFor(()=>document.querySelector('#boxstudio-v38-cad .v45-corner-tools'),'Fillet/Chamfer tools');cornerTools.querySelector('[data-v45-corner-value]').value='5';click(cornerTools.querySelector('[data-v45-corner-apply]'));
  const fillet=await waitFor(()=>readState().dielineV38.edges.find(e=>e.v45Corner?.mode==='fillet'),'native fillet edge');if(fillet.curve!=='arc'||fillet.arc.rx!==5||fillet.arc.ry!==5)throw new Error('Fillet did not create native R5 Arc.');
  const doc=readState().dielineV38,svg=buildDielineSvgV38(doc),dxf=buildDxfV38(doc),pdf=new TextDecoder().decode(buildDielinePdfV38(doc));if(!/\sA\s/.test(svg))throw new Error('SVG lost native fillet Arc.');if(!/\nARC\n/.test(dxf))throw new Error('DXF lost native fillet ARC.');if(!/\sc\s/.test(pdf))throw new Error('PDF lost native fillet curve.');
  await waitFor(()=>document.querySelector('#boxstudio-v38-cad [data-v45-radius]'),'radius constraint field');const radius=document.querySelector('#boxstudio-v38-cad [data-v45-radius]');radius.value='6';radius.dispatchEvent(new Event('change',{bubbles:true}));
  await waitFor(()=>readState().dielineV38.edges.find(e=>e.v45Corner?.mode==='fillet')?.arc?.rx===6,'radius R6 persistence');
  const report=window.BoxStudioV45.runPreflight(readState(),{doc:readState().dielineV38});if(report.errors.some(x=>String(x.code).startsWith('V45_')))throw new Error(`V0.45 preflight errors: ${report.errors.map(x=>x.code).join(',')}`);
  const text=`PASS liveG2=${liveDiag.curvatureDelta.toExponential(2)} handle=6.500 fillet=R6 svg=A dxf=ARC pdf=C v45Fillets=${report.v45.fillets}`;document.body.dataset.pass=text;await signal('pass',text);
}catch(error){const text=`FAIL ${error?.stack||error}`;document.body.dataset.fail=text;await signal('fail',text);throw error;}
