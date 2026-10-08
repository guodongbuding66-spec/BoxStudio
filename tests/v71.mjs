import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import validator from 'gltf-validator';
import {generateGeometry,defaultsForTemplate} from '../src/geometry.js';
import {defaultState} from '../src/model.js';
import {actionableTemplatesV47,prepareTemplateStateV47} from '../src/productExperienceV47.js';
import {V71_TEMPLATE_CATALOG} from '../src/parametricTemplatesV71.js';
import {buildFoldGraph} from '../src/foldgraph.js';
import {buildFoldDiagnosticsV35} from '../src/threeReviewV35.js';
import {buildFoldTransformsV50} from '../src/threeArtworkProofV50.js';
import {buildStructuralTopologyV39} from '../src/structuralTopologyV39.js';
import {foldedMeshesV71,encodeGlbV71} from '../src/threeExportV71.js';
import {DESIGN_PRESETS_V71,createArtworkProjectV71} from '../src/designTemplatesV71.js';
import {sceneSettingsV71} from '../src/scene3dV71.js';
import {buildProductionPdf} from '../src/export.js';
let checks=0;const check=(condition,label)=>{assert.ok(condition,label);checks++;};
mkdirSync('artifacts/v71',{recursive:true});
check(actionableTemplatesV47().length===20,'Twenty distinct executable structures');
const signatures=new Set();
for(const t of V71_TEMPLATE_CATALOG){
 const s=prepareTemplateStateV47(defaultState,t.id),g=generateGeometry(s.structure),f=buildFoldGraph(g);check(s.elements.length===0,t.id+' starts with an editable clean artboard');
 check(f.nodes.length===g.panels.length,t.id+' preserves every panel');check(f.edges.length===f.nodes.length-g.components.length,t.id+' has one physical tree per component');
 check(f.edges.every(e=>e.hinge&&!e.hinge.fallback),t.id+' uses physical hinges');check(buildFoldDiagnosticsV35(f).unreached.length===0,t.id+' reaches all components');
 const topology=buildStructuralTopologyV39(s);check(topology.ok,t.id+' CUT/CREASE topology '+JSON.stringify(topology.errors));check(topology.graph.unreached.length===0,t.id+' CAD topology reaches every separate component');
 check(g.panels.every(p=>p.x>=0&&p.y>=0&&p.w>0&&p.h>0&&p.x+p.w<=g.width+.001&&p.y+p.h<=g.height+.001),t.id+' panel bounds');
 for(let i=0;i<g.panels.length;i++)for(let j=i+1;j<g.panels.length;j++){const a=g.panels[i],b=g.panels[j],overlapX=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x),overlapY=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);check(overlapX<.001||overlapY<.001,t.id+' unfolded panels do not intersect '+a.id+'/'+b.id);}
 signatures.add(JSON.stringify([g.panels.map(p=>[p.id,p.x,p.y,p.w,p.h]),g.cutLines]));
 const flat=buildFoldTransformsV50(f,g,0),closed=buildFoldTransformsV50(f,g,100);check([...flat.values()].every(m=>m.every((v,i)=>Math.abs(v-([0,5,10,15].includes(i)?1:0))<1e-6)),t.id+' starts as its exact dieline');check([...closed.values()].every(m=>m.every(Number.isFinite)),t.id+' assembled transforms are finite');
 const meshes=foldedMeshesV71(s,g,f),bytes=encodeGlbV71(meshes,{thicknessMm:g.manufacturing.T}),report=await validator.validateBytes(bytes,{uri:t.id+'.glb'});check(report.issues.numErrors===0,t.id+' Khronos GLB validation '+JSON.stringify(report.issues.messages));writeFileSync('artifacts/v71/'+t.id+'.glb',bytes);
 const pdf=buildProductionPdf(s);check(pdf.length>1000,t.id+' native production PDF');writeFileSync('artifacts/v71/'+t.id+'.pdf',pdf);
 for(const mode of ['internal','external','manufacturing'])for(const size of [{length:25,width:20,height:15},{length:520,width:320,height:85},{length:90,width:45,height:160}]){const p=generateGeometry({...defaultsForTemplate(t.id),...size,sizeType:mode,thickness:1.2}),graph=buildFoldGraph(p);check(p.dimensionSet.mode===mode,t.id+' dimensional mode');check(p.panels.every(q=>q.w>0&&q.h>0),t.id+' positive geometry');check(graph.edges.every(e=>e.hinge&&!e.hinge.fallback),t.id+' parameterized physical hinges');}
}
check(signatures.size===12,'Twelve new structures have distinct actual geometry');
// Validate a texture-bearing file with the independent Khronos validator.
const sample=prepareTemplateStateV47(defaultState,'drawer-box'),geo=generateGeometry(sample.structure),graph=buildFoldGraph(geo),mesh=foldedMeshesV71(sample,geo,graph),png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLttAAAAABJRU5ErkJggg==','base64')),textures=new Map(mesh.panels.map(p=>[p.nodeId,png])),glb=encodeGlbV71(mesh,{textures,thicknessMm:.5}),validation=await validator.validateBytes(glb);check(validation.issues.numErrors===0,'Embedded PNG texture GLB validates '+JSON.stringify(validation.issues.messages));writeFileSync('artifacts/v71/textured.glb',glb);writeFileSync('artifacts/v71/khronos-report.json',JSON.stringify(validation,null,2));
const dv=new DataView(glb.buffer),json=JSON.parse(new TextDecoder().decode(glb.slice(20,20+dv.getUint32(12,true))));check(dv.getUint32(8,true)===glb.length,'GLB length header matches bytes');check(json.images.length===geo.panels.length,'Every panel has an embedded image');check(json.nodes.length===geo.panels.length,'Every component is exported');check(!json.buffers[0].uri,'GLB has no external file dependencies');
const original=JSON.stringify(defaultState);for(const p of DESIGN_PRESETS_V71){for(const templateId of ['straight-tuck-end','lid-base-box','glued-tray']){const design=createArtworkProjectV71(defaultState,p.id,{templateId}),g=generateGeometry(design.structure);check(design.elements.every(e=>g.panelMap[e.panelId]),p.id+' binds to real panels');check(design.elements.some(e=>e.type==='production-polygon'),p.id+' has actual editable artwork');check(design.elements.filter(e=>e.type==='text').every(e=>e.x>=0&&e.y>=0&&e.x+e.w<=g.panelMap[e.panelId].w+.01&&e.y+e.h<=g.panelMap[e.panelId].h+.01),p.id+' text stays on face');}}
check(JSON.stringify(defaultState)===original,'Creating a template does not mutate the original project');
const scene=sceneSettingsV71({preset:'transparent',zoom:999,pitch:9,contrast:-1});check(scene.background===null&&scene.zoom===3&&scene.pitch===1.5&&scene.contrast===.5,'Scene controls clamp invalid values');
writeFileSync('artifacts/v71/model-results.json',JSON.stringify({status:'PASS',checks,engines:20,designPresets:8,khronosErrors:validation.issues.numErrors}));console.log(`PASS V0.71: ${checks} geometry, topology, assembly, artwork and independent GLB assertions`);
