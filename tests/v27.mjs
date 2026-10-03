import assert from 'node:assert/strict';
import { defaultState } from '../src/model.js';
import { generateGeometry } from '../src/geometry.js';
import { parseSvgMark } from '../src/svgMark.js';
import { createCrossPanelArtwork } from '../src/crossPanelArtwork.js';
import { ensureBezierClipState, setClipNodeHandlePresetV25 } from '../src/clipPathV25.js';
import { buildProductionPdfV27, productionPdfV27Diagnostics } from '../src/productionPdfV27.js';
import { buildWorkerPdfTaskV27 } from '../src/batchWorkerCore.js';
import { createBatchRunContextV27, batchRunCompatibilityV27, captureBatchBaseStateV27 } from '../src/batchRunV27.js';
import { liveTranslationAssistV27, liveRotationAssistV27 } from '../src/liveAssistV27.js';
import { createProductionJob, submitProductionJob, approveProductionJob, approvalGate } from '../src/productionJobs.js';

const svg=`<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#ff0000"/><stop offset="100%" stop-color="#0000ff" stop-opacity=".45"/></linearGradient></defs><rect x="0" y="0" width="100" height="60" fill="url(#g)"/></svg>`;
const mark=parseSvgMark(svg,{name:'V27 Native Cubic Production'}),state=structuredClone(defaultState),geo=generateGeometry(state.structure),front=geo.panelMap.front;
let cross=createCrossPanelArtwork(mark,{id:'v27-cross',x:front.x+40,y:front.y+60,width:180,height:108,rotation:0});state.elements.push(cross);let s=ensureBezierClipState(state,'v27-cross',{inset:.08});s=setClipNodeHandlePresetV25(s,'v27-cross',0,{length:.18,angleDeg:20});
const pdf=buildProductionPdfV27(s),text=new TextDecoder().decode(pdf),diag=productionPdfV27Diagnostics(s);
assert.ok(text.startsWith('%PDF-1.7'));
assert.ok(text.includes('/Separation /CutContour'),'production dieline spot separation should remain');
assert.ok(text.includes('/ShadingType 2'),'native gradient should remain');
assert.ok(text.includes('/SMask'),'varying alpha soft mask should remain');
assert.ok(/\s-?\d+\.\d{4}\s-?\d+\.\d{4}\s-?\d+\.\d{4}\s-?\d+\.\d{4}\s-?\d+\.\d{4}\s-?\d+\.\d{4}\sc/.test(text),'integrated production PDF should emit native cubic c operators');
assert.ok(text.includes('W n'),'integrated production PDF should apply clipping');
assert.equal(diag.serializer,'v0.27-native-cubic-production');
assert.equal(diag.nativeCubicProduction,true);
assert.ok(diag.nativeCubicClipObjects>=1);

const batchState=structuredClone(s);batchState.batch.rows=[{sku:'BATCH-V27-001'}];const context=createBatchRunContextV27(batchState);assert.equal(context.serializer,'v0.27-native-cubic-production');assert.equal(context.baseState.batchPipeline,'v27-native-cubic');assert.equal(context.baseState.exportOptions.nativeCubicClip,true);const fakeQueue={context};assert.equal(batchRunCompatibilityV27(batchState,fakeQueue).ok,true);const changed=structuredClone(batchState);changed.batch.rows[0].sku='CHANGED';assert.equal(batchRunCompatibilityV27(changed,fakeQueue).ok,false);
const workerBase=captureBatchBaseStateV27(batchState),workerResult=buildWorkerPdfTaskV27(workerBase,batchState.batch.rows[0],0,{assets:{}});assert.equal(workerResult.ok,true,workerResult.error||'V0.27 worker task should succeed');assert.equal(workerResult.serializer,'v0.27-native-cubic-production');assert.ok(workerResult.nativeCubicClipObjects>=1);const workerText=new TextDecoder().decode(workerResult.bytes);assert.ok(/\sc\b/.test(workerText),'worker production PDF should include native cubic operator');

const guideState={structure:structuredClone(defaultState.structure),elements:[{id:'moving',type:'cross-panel-artwork',x:10,y:20,w:20,h:20,r:0},{id:'label',type:'text',panelId:'front',x:10,y:10,w:50,h:10,fontSize:10,template:'Label'}],userGuides:[{id:'g1',axis:'x',value:31,label:'Guide',locked:false}],crossPanelEdit:{}};const guideGeo=generateGeometry(guideState.structure),live=liveTranslationAssistV27(guideState,['moving'],0,0,guideGeo,{enabled:true,userGuides:true,userToleranceMm:2,textBaselines:false});assert.ok(Math.abs(live.dx-1)<1e-9);assert.ok(live.guides.some(g=>g.kind==='user-guide'));
const baselineState=structuredClone(guideState);baselineState.userGuides=[];const baseline=baselineState.elements.find(e=>e.id==='label'),panel=guideGeo.panelMap.front,baselineY=panel.y+baseline.y+baseline.fontSize*1.15;baselineState.elements.find(e=>e.id==='moving').y=baselineY+2;const liveBaseline=liveTranslationAssistV27(baselineState,['moving'],0,0,guideGeo,{enabled:true,userGuides:false,textBaselines:true,baselineToleranceMm:3});assert.ok(Math.abs(liveBaseline.dy+2)<1e-9);assert.ok(liveBaseline.guides.some(g=>g.kind==='text-baseline'));
const rotationState={elements:[{id:'moving',type:'cross-panel-artwork',r:0},{id:'target',type:'cross-panel-artwork',r:30}]};const rot=liveRotationAssistV27(rotationState,'moving',32,{enabled:true,toleranceDeg:3,step:15});assert.equal(rot.angle,30);assert.ok(rot.guides.some(g=>g.kind==='rotation-match'));

let job=createProductionJob(defaultState,{actor:'tester',role:'operator'});job=submitProductionJob(job,{actor:'tester',role:'operator'});job=approveProductionJob(job,{actor:'approver',role:'approver'});assert.equal(approvalGate(defaultState,job).ok,true);const downgraded=structuredClone(defaultState);downgraded.exportOptions.productionSerializer='v0.26-native-production';assert.equal(approvalGate(downgraded,job).ok,false,'serializer identity must be part of the approved production fingerprint');

console.log('BoxStudio V0.27 tests passed');
