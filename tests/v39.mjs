import assert from 'node:assert/strict';
import { defaultState } from '../src/model.js';
import { generateGeometry } from '../src/geometry.js';
import { buildFoldGraph } from '../src/foldgraph.js';
import { dielineDocumentFromStateV38, moveNodeV38 } from '../src/dielineCadV38.js';
import { buildStructuralTopologyV39, reconcileArtworkToTopologyV39, topologyProductionGateV39, V39_TOPOLOGY_SCHEMA } from '../src/structuralTopologyV39.js';
import { buildProductionContextV39, buildProductionPdfV39, productionStateFromTopologyV39, V39_PRODUCTION_SCHEMA } from '../src/productionPdfV39.js';
import { buildProductionPdfV27 } from '../src/productionPdfV27.js';
import { readFile } from 'node:fs/promises';

const clone=v=>structuredClone(v);
const PT=72/25.4;

function simpleDoc(){return{
  schema:'boxstudio-dieline-v38',version:1,width:100,height:50,template:'side-seal-rsc',
  nodes:[
    {id:'n1',x:0,y:0},{id:'n2',x:50,y:0},{id:'n3',x:100,y:0},
    {id:'n4',x:0,y:50},{id:'n5',x:50,y:50},{id:'n6',x:100,y:50},
  ],
  edges:[
    {id:'top-a',a:'n1',b:'n2',lineType:'CUT',curve:'line'},{id:'top-b',a:'n2',b:'n3',lineType:'CUT',curve:'line'},
    {id:'right',a:'n3',b:'n6',lineType:'CUT',curve:'line'},{id:'bottom-b',a:'n6',b:'n5',lineType:'CUT',curve:'line'},
    {id:'bottom-a',a:'n5',b:'n4',lineType:'CUT',curve:'line'},{id:'left',a:'n4',b:'n1',lineType:'CUT',curve:'line'},
    {id:'fold',a:'n2',b:'n5',lineType:'CREASE',curve:'line'},
  ],
  panels:[
    {id:'front',label:'FRONT',kind:'panel',role:'front',x:0,y:0,w:50,h:50},
    {id:'back',label:'BACK',kind:'panel',role:'back',x:50,y:0,w:50,h:50},
  ],zones:{bleed:[],safe:[],glue:[]},settings:{bleedMm:3,safeMm:5},metadata:{},
}}

// 1. Real default RSC must planarize long crease intersections and rebuild bounded faces.
const defaultStateCopy=clone(defaultState),defaultDoc=dielineDocumentFromStateV38(defaultStateCopy),defaultTopology=buildStructuralTopologyV39(defaultStateCopy,{doc:defaultDoc});
assert.equal(defaultTopology.schema,V39_TOPOLOGY_SCHEMA);assert.equal(defaultTopology.ok,true,JSON.stringify(defaultTopology.errors));
assert.ok(defaultTopology.stats.planarSegments>defaultTopology.stats.sampledSegments,'T-junction/crossing planarization should split default RSC segments.');
assert.ok(defaultTopology.stats.faces>=13,`Expected at least 13 RSC faces, got ${defaultTopology.stats.faces}`);
for(const id of ['front','back','left','right','top-front','bottom-front'])assert.ok(defaultTopology.panelMap[id],`Rebuilt default topology lost panel ${id}`);
assert.ok(defaultTopology.graph.edges.length>=11,'Default RSC fold tree should retain real fold adjacency.');
assert.ok(defaultTopology.graph.edges.every(e=>e.hinge&&Number.isFinite(e.hinge.x1)&&Number.isFinite(e.hinge.x2)),'Every traversed fold needs a physical hinge.');

// 2. Moving the shared crease nodes must rebuild both panel geometry and fold hinge from edited coordinates.
let edited=simpleDoc();edited=moveNodeV38(edited,'n2',{x:60,y:0});edited=moveNodeV38(edited,'n5',{x:60,y:50});
const minimal=clone(defaultState);minimal.elements=[{id:'proof-shape',type:'shape',group:'marks',panelId:'back',x:5,y:5,w:10,h:10,r:0}];minimal.hiddenGroups={};minimal.lockedGroups={};
const topology=buildStructuralTopologyV39(minimal,{doc:edited});
assert.equal(topology.ok,true,JSON.stringify(topology.errors));assert.equal(topology.stats.faces,2);assert.equal(topology.stats.foldLinks,1);
assert.equal(topology.panelMap.front.w,60);assert.equal(topology.panelMap.back.x,60);assert.equal(topology.panelMap.back.w,40);
assert.equal(topology.graph.root,'front');assert.equal(topology.graph.edges.length,1);assert.equal(topology.graph.edges[0].to,'back');
assert.equal(topology.graph.edges[0].hinge.x1,60);assert.equal(topology.graph.edges[0].hinge.x2,60);

// 3. Artwork must remain panel-local and resolve through the rebuilt geometry proxy.
const reconciliation=reconcileArtworkToTopologyV39(minimal,topology);assert.equal(reconciliation.ok,true);assert.equal(reconciliation.orphaned.length,0);
const proxy=productionStateFromTopologyV39(minimal,topology);assert.equal(proxy.state.structure.template,'imported');
const proxyGeo=generateGeometry(proxy.state.structure);assert.equal(proxyGeo.panelMap.front.w,60);assert.equal(proxyGeo.panelMap.back.x,60);assert.equal(proxyGeo.panelMap.back.w,40);
const proxyGraph=buildFoldGraph(proxyGeo);assert.equal(proxyGraph.root,'front');assert.equal(proxyGraph.edges.length,1);assert.equal(proxyGraph.edges[0].hinge.x1,60);

// 4. Edited topology must reach the existing full Production PDF renderer without weakening production preflight.
const gate=topologyProductionGateV39(minimal,topology);assert.equal(gate.ok,true,JSON.stringify(gate.errors));
const editedPdf=buildProductionPdfV27(proxy.state),editedText=new TextDecoder().decode(editedPdf);assert.ok(editedPdf.length>1000);assert.match(editedText,/%PDF-1\.7/);assert.match(editedText,/\/CutContour/);assert.match(editedText,/\/Crease/);
const editedFoldX=(60*PT).toFixed(4),backShapeX=(65*PT).toFixed(4);assert.ok(editedText.includes(editedFoldX),`Edited crease x=60mm (${editedFoldX}pt) not present in Production PDF.`);assert.ok(editedText.includes(backShapeX),`Back-panel artwork x=65mm (${backShapeX}pt) not remapped through rebuilt panel origin.`);

// 5. The V0.39 wrapper itself must keep all production mark/preflight rules active on a real valid project.
const defaultContext=buildProductionContextV39(defaultStateCopy,{doc:defaultDoc});assert.equal(defaultContext.schema,V39_PRODUCTION_SCHEMA);assert.equal(defaultContext.ok,true,JSON.stringify(defaultContext.errors));assert.ok(defaultContext.summary.panels>=13);
const pdf=buildProductionPdfV39(defaultStateCopy,{doc:defaultDoc}),text=new TextDecoder().decode(pdf);assert.ok(pdf.length>1000);assert.match(text,/%PDF-1\.7/);assert.match(text,/\/CutContour/);assert.match(text,/\/Crease/);

// 6. A deliberately incomplete mark fixture remains blocked by V0.39 production Preflight.
const incompleteContext=buildProductionContextV39(minimal,{doc:edited});assert.equal(incompleteContext.ok,false);assert.ok(incompleteContext.errors.some(x=>['rule.package.notice','rule.crn.bindings','rule.barcodeQr.missing','LEGACY_BARCODE_QR_GROUP'].includes(x.code)));
assert.throws(()=>buildProductionPdfV39(minimal,{doc:edited}),e=>e?.code==='V39_PRODUCTION_BLOCKED');

// 7. Broken topology and removed panel identity fail closed instead of silently nearest-remapping.
const broken=simpleDoc();broken.edges=broken.edges.filter(e=>e.id!=='right');const brokenTopology=buildStructuralTopologyV39(minimal,{doc:broken});assert.equal(brokenTopology.ok,false);assert.ok(brokenTopology.errors.some(x=>x.code==='PANEL_REMAP_REQUIRED'||x.code==='TOPOLOGY_NO_PANELS'));
const orphanState=clone(minimal);orphanState.elements.push({id:'orphan',type:'shape',group:'marks',panelId:'deleted-panel',x:0,y:0,w:5,h:5,r:0});const orphanGate=topologyProductionGateV39(orphanState,topology);assert.equal(orphanGate.ok,false);assert.ok(orphanGate.errors.some(x=>x.code==='ARTWORK_PANEL_ORPHAN'));

const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));const [,minor]=String(pkg.version).split('.').map(Number);assert.ok(minor>=39,`V0.39 regression requires product version >=0.39, got ${pkg.version}`);assert.equal(pkg.scripts['test:v39'],'node tests/v39.mjs');
console.log(`BoxStudio V0.39 unified topology + full Production PDF passed: defaultFaces=${defaultTopology.stats.faces}, editedFaces=${topology.stats.faces}, editedPdf=${editedPdf.length}, gatedPdf=${pdf.length}`);
