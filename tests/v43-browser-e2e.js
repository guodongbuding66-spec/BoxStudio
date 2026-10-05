import { STORAGE_KEY } from '../src/model.js';
import { generateGeometry } from '../src/geometry.js';
import { openDielineCadV38, getDielineDocumentV38 } from '../src/v38Ui.js';
import { buildDielineSvgV38, buildDxfV38, buildDielinePdfV38 } from '../src/productionExportV38.js';
import { runPreflightV43 } from '../src/preflightV43.js';
import { buildStructuralTopologyV39 } from '../src/structuralTopologyEngineV39.js';

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const waitFor=async(fn,label,timeout=18000)=>{const end=Date.now()+timeout;while(Date.now()<end){try{const v=fn();if(v)return v}catch{}await sleep(60)}throw new Error(`Timeout: ${label}`)};
const signal=async(kind,text)=>{try{await fetch(`/__v43_${kind}__`,{method:'POST',body:text})}catch{}};
const state=()=>JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
const stage=()=>Number(sessionStorage.getItem('boxstudio-v43-stage')||0);
const setStage=n=>sessionStorage.setItem('boxstudio-v43-stage',String(n));
const click=node=>node.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));

try{
  await waitFor(()=>window.BoxStudioV43,'V0.43 API');
  await waitFor(()=>document.querySelector('.workspace'),'workspace');
  const currentStage=stage();
  if(currentStage===0){
    if(!window.BoxStudioV43.nativeCurves||!window.BoxStudioV43.dxfNativeArcSpline||!window.BoxStudioV43.pdfNativeCubic)throw new Error('V0.43 native curve capabilities missing.');
    window.BoxStudioV41.openTemplateCenter();
    const overlay=await waitFor(()=>document.querySelector('#boxstudio-v41-templates'),'Template Center');
    const search=overlay.querySelector('[data-v41-search]');search.value='0427';search.dispatchEvent(new Event('input',{bubbles:true}));
    const card=await waitFor(()=>overlay.querySelector('[data-v41-template="fefco-0427"]'),'0427 template');
    const detail=await waitFor(()=>card.querySelector('.v42-card-detail'),'Template Detail');detail.click();
    const detailHost=await waitFor(()=>document.querySelector('#boxstudio-v42-detail'),'Template Detail modal');
    setStage(1);detailHost.querySelector('[data-v42-use]').click();
  }else if(currentStage===1){
    const s=state();if(s.structure.template!=='fefco-0427')throw new Error(`Template mismatch: ${s.structure.template}`);
    const generator=await waitFor(()=>document.querySelector('[data-v41-generator]'),'Generator');
    const advanced=await waitFor(()=>generator.querySelector('.v42-advanced:not(.v42-disabled)'),'Advanced Structure');
    await waitFor(()=>advanced.querySelector('.v43-native-badge'),'V0.43 native radius control');
    const values={flapTaper:8,notch:6,shoulder:10,relief:4,cornerRadius:8};for(const [key,value] of Object.entries(values)){const input=advanced.querySelector(`[data-v42-advanced="${key}"]`);if(!input)throw new Error(`Missing ${key}`);input.value=String(value)}
    setStage(2);generator.querySelector('[data-v41-apply]').click();
  }else if(currentStage===2){
    const s=state(),g=generateGeometry(s.structure);if(g.advancedV43?.cornerRadiusMode!=='production-native-cubic')throw new Error(`Native radius mode missing: ${g.advancedV43?.cornerRadiusMode}`);if((g.cutCurves||[]).length<2)throw new Error('Generated CUT curves missing.');
    openDielineCadV38();const cad=await waitFor(()=>document.querySelector('#boxstudio-v38-cad'),'Dieline CAD');
    let doc=getDielineDocumentV38(),cubic=doc.edges.find(e=>e.lineType==='CUT'&&e.curve==='cubic');if(!cubic)throw new Error('Generated cubic edge did not reach Dieline CAD.');
    const cubicPath=await waitFor(()=>cad.querySelector(`[data-v38-edge="${cubic.id}"]`),'cubic CAD path');if(!/\bC\b/.test(cubicPath.getAttribute('d')||''))throw new Error('CAD canvas did not render cubic path.');
    click(cubicPath);await waitFor(()=>cad.querySelector('[data-v38-curve="arc"]'),'Arc conversion');cad.querySelector('[data-v38-curve="arc"]').click();
    let rx=await waitFor(()=>document.querySelector('#boxstudio-v38-cad [data-v38-arc="rx"]'),'Arc RX');rx.value='10';rx.dispatchEvent(new Event('change',{bubbles:true}));
    let ry=await waitFor(()=>document.querySelector('#boxstudio-v38-cad [data-v38-arc="ry"]'),'Arc RY');ry.value='10';ry.dispatchEvent(new Event('change',{bubbles:true}));
    const advancedArc=await waitFor(()=>document.querySelector('#boxstudio-v38-cad .v43-arc-advanced'),'V0.43 Arc Inspector');const rotation=advancedArc.querySelector('[data-v43-arc="rotation"]');rotation.value='15';rotation.dispatchEvent(new Event('change',{bubbles:true}));
    await waitFor(()=>document.querySelector('#boxstudio-v38-cad .v43-arc-advanced'),'Arc Inspector after persistence');doc=getDielineDocumentV38();const edited=doc.edges.find(e=>e.id===cubic.id);if(edited?.curve!=='arc'||Number(edited.arc?.rotation)!==15)throw new Error('Arc advanced parameters did not persist.');
    const svg=buildDielineSvgV38(doc),dxf=buildDxfV38(doc),pdf=new TextDecoder().decode(buildDielinePdfV38(doc));if(!svg.includes('data-curve="arc"')||!svg.includes('data-curve="cubic"'))throw new Error('SVG did not preserve Arc + Cubic entities.');if(!dxf.includes('\nARC\n')||!dxf.includes('\nSPLINE\n'))throw new Error('DXF did not preserve ARC + SPLINE.');if(!/\sc\s/.test(pdf))throw new Error('PDF did not preserve cubic vector operator.');
    const preflight=runPreflightV43(s,{doc});if(preflight.errors.some(x=>x.code==='V43_RADIUS_NOT_NATIVE'||x.code==='V43_CURVE_RECORD_INVALID'||x.code==='V43_ARC_INVALID'))throw new Error(`V0.43 preflight native-curve error: ${preflight.errors.map(x=>x.code).join(',')}`);
    const topology=buildStructuralTopologyV39(s,{doc,curveSteps:24,tolerance:.01,minArea:.1});if(!(topology.stats.faces>0))throw new Error('Topology did not rebuild panels from native curves.');
    const text=`PASS template=${s.structure.template} mode=${g.advancedV43.cornerRadiusMode} cubics=${g.cutCurves.length} dxf=ARC+SPLINE pdf=C faces=${topology.stats.faces} nativeEdges=${preflight.nativeEdges} arcRotation=${edited.arc.rotation}`;document.body.dataset.pass=text;sessionStorage.setItem('boxstudio-v43-stage','done');await signal('pass',text);
  }else if(sessionStorage.getItem('boxstudio-v43-stage')!=='done')throw new Error(`Unexpected V0.43 E2E stage ${currentStage}`);
}catch(error){const text=`FAIL stage=${sessionStorage.getItem('boxstudio-v43-stage')} ${error?.stack||error}`;document.body.dataset.fail=text;await signal('fail',text);throw error;}
