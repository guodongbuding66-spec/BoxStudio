import assert from 'node:assert/strict';
import { defaultState } from '../src/model.js';
import {
  V38_DIELINE_SCHEMA,dielineDocumentFromStateV38,moveNodeV38,setEdgeLineTypeV38,setEdgeCurveV38,setCubicHandlesV38,
  insertNodeOnEdgeV38,deleteNodeV38,buildProductionZonesV38,validateDielineDocumentV38,geometryFromDielineDocumentV38
} from '../src/dielineCadV38.js';
import { buildDielineSvgV38,buildDxfV38,buildDielinePdfV38,exportSummaryV38 } from '../src/productionExportV38.js';
import { runPreflightV38,productionGateV38 } from '../src/preflightV38.js';
import { readFile } from 'node:fs/promises';

const base=dielineDocumentFromStateV38(structuredClone(defaultState));
assert.equal(base.schema,V38_DIELINE_SCHEMA);assert.ok(base.nodes.length>4);assert.ok(base.edges.length>4);assert.ok(base.panels.length>0);assert.ok(base.zones.bleed.length>0);assert.ok(base.zones.safe.length>0);
const deterministic=dielineDocumentFromStateV38(structuredClone(defaultState));assert.deepEqual(deterministic,base,'Dieline conversion must be deterministic.');

const first=base.nodes[0],moved=moveNodeV38(base,first.id,{x:first.x+2.5,y:first.y+1.25});assert.equal(moved.nodes.find(n=>n.id===first.id).x,first.x+2.5);assert.equal(base.nodes.find(n=>n.id===first.id).x,first.x,'Source document must stay immutable by convention.');
const firstEdge=base.edges[0],crease=setEdgeLineTypeV38(base,firstEdge.id,'CREASE');assert.equal(crease.edges.find(e=>e.id===firstEdge.id).lineType,'CREASE');assert.throws(()=>setEdgeLineTypeV38(base,firstEdge.id,'LASER'));

let simple={schema:V38_DIELINE_SCHEMA,version:1,width:100,height:60,template:'test',nodes:[{id:'n1',x:10,y:10},{id:'n2',x:90,y:10},{id:'n3',x:90,y:50},{id:'n4',x:10,y:50}],edges:[{id:'e1',a:'n1',b:'n2',lineType:'CUT',curve:'line'},{id:'e2',a:'n2',b:'n3',lineType:'CUT',curve:'line'},{id:'e3',a:'n3',b:'n4',lineType:'CUT',curve:'line'},{id:'e4',a:'n4',b:'n1',lineType:'CUT',curve:'line'}],panels:[{id:'front',label:'FRONT',kind:'panel',x:10,y:10,w:80,h:40}],zones:{bleed:[],safe:[],glue:[]},settings:{bleedMm:3,safeMm:5},metadata:{}};
simple=buildProductionZonesV38(simple,{bleed:3,safe:5});let report=validateDielineDocumentV38(simple);assert.equal(report.ok,true);assert.equal(report.errors.length,0);assert.equal(report.stats.cut,4);
const inserted=insertNodeOnEdgeV38(simple,'e1',.25);assert.equal(inserted.doc.nodes.length,5);assert.equal(inserted.doc.edges.length,5);const mid=inserted.doc.nodes.find(n=>n.id===inserted.nodeId);assert.equal(mid.x,30);assert.equal(mid.y,10);const deleted=deleteNodeV38(inserted.doc,inserted.nodeId);assert.equal(deleted.nodes.length,4);assert.equal(deleted.edges.length,4);

let cubic=setEdgeCurveV38(simple,'e1','cubic',{c1:{x:25,y:0},c2:{x:75,y:20}});cubic=setCubicHandlesV38(cubic,'e1',{c1:{x:20,y:2},c2:{x:80,y:18}});assert.equal(cubic.edges.find(e=>e.id==='e1').curve,'cubic');const cubicSplit=insertNodeOnEdgeV38(cubic,'e1',.5);assert.equal(cubicSplit.doc.edges.filter(e=>e.curve==='cubic').length,2);assert.throws(()=>deleteNodeV38(cubicSplit.doc,cubicSplit.nodeId),e=>e?.code==='CURVE_MERGE_UNSUPPORTED');
const arc=setEdgeCurveV38(simple,'e1','arc',{rx:40,ry:20,sweep:true});assert.equal(arc.edges.find(e=>e.id==='e1').arc.sweep,true);assert.throws(()=>insertNodeOnEdgeV38(arc,'e1',.5),e=>e?.code==='ARC_SPLIT_UNSUPPORTED');

const broken=structuredClone(simple);broken.edges.push({id:'missing',a:'n1',b:'404',lineType:'CUT',curve:'line'});report=validateDielineDocumentV38(broken);assert.equal(report.ok,false);assert.ok(report.errors.some(x=>x.code==='NODE_REFERENCE_MISSING'));
const crossing={...structuredClone(simple),nodes:[{id:'a',x:0,y:0},{id:'b',x:10,y:10},{id:'c',x:0,y:10},{id:'d',x:10,y:0}],edges:[{id:'x1',a:'a',b:'b',lineType:'CUT',curve:'line'},{id:'x2',a:'c',b:'d',lineType:'CUT',curve:'line'}],panels:[],zones:{bleed:[],safe:[],glue:[]}};report=validateDielineDocumentV38(crossing);assert.equal(report.ok,false);assert.ok(report.errors.some(x=>x.code==='CUT_INTERSECTION'));
const duplicate=structuredClone(simple);duplicate.edges.push({id:'dup',a:'n1',b:'n2',lineType:'CUT',curve:'line'});assert.ok(validateDielineDocumentV38(duplicate).warnings.some(x=>x.code==='EDGE_DUPLICATE'));

const svg=buildDielineSvgV38(cubic);assert.match(svg,/width="100\.000mm"/);assert.match(svg,/data-spot-name="CutContour"/);assert.match(svg,/ C 20\.000 2\.000 80\.000 18\.000 90\.000 10\.000/);assert.match(svg,/layer-BLEED/);
const dxf=buildDxfV38(cubic);assert.match(dxf,/\$INSUNITS\n70\n4/);for(const layer of ['CUT','CREASE','PERF','GLUE','BLEED','SAFE'])assert.ok(dxf.includes(`2\n${layer}\n`),`DXF layer ${layer} missing`);assert.ok((dxf.match(/0\nLINE\n/g)||[]).length>=4);
const pdf=buildDielinePdfV38(cubic),pdfText=new TextDecoder().decode(pdf);assert.ok(pdf.length>500);assert.match(pdfText,/%PDF-1\.7/);assert.match(pdfText,/\/MediaBox \[0 0 283\.465 170\.079\]/);assert.match(pdfText,/\/CutContour/);assert.match(pdfText,/\/Crease/);
const summary=exportSummaryV38(cubic);assert.equal(summary.widthMm,100);assert.equal(summary.cut,4);
const roundtrip=geometryFromDielineDocumentV38(cubic);assert.equal(roundtrip.cutCurves.length,1);assert.equal(roundtrip.cutLines.length,3);

const state=structuredClone(defaultState),preflight=runPreflightV38(state);assert.equal(preflight.schema,'boxstudio-preflight-v38');assert.ok(preflight.checks.length>10);assert.equal(preflight.summary.total,preflight.checks.length);const forced=structuredClone(base);forced.edges.push({id:'bad-v38',a:base.nodes[0].id,b:'missing-node',lineType:'CUT',curve:'line'});const gate=productionGateV38(state,{doc:forced});assert.equal(gate.ok,false);assert.ok(gate.blockingCodes.includes('NODE_REFERENCE_MISSING'));

const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));assert.equal(pkg.version,'0.38.0');assert.equal(pkg.scripts['test:v38'],'node tests/v38.mjs');
console.log('BoxStudio V0.38 semantic dieline CAD, preflight, SVG/DXF/PDF tests passed');
