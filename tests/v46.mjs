import assert from 'node:assert/strict';
import { defaultState } from '../src/model.js';
import { dielineDocumentFromStateV38 } from '../src/dielineCadV38.js';
import { mixedContinuityDiagnosticsV46, setMixedContinuityV46, applyLiveMixedContinuityV46, applyCornerBatchV46, removeCornerFeatureV46, switchCornerFeatureV46, createEqualRadiusConstraintV46, updateEqualRadiusGroupV46, validateV46ConstraintState } from '../src/curveConstraintsV46.js';
import { runCadTopology3dAcceptanceV46 } from '../src/acceptanceV46.js';
import { runPreflightV46 } from '../src/preflightV46.js';

const shell=(nodes,edges,template='v46-test')=>({schema:'boxstudio-dieline-v38',version:1,width:60,height:60,template,nodes,edges,panels:[],zones:{bleed:[],safe:[],glue:[]},settings:{bleedMm:0,safeMm:0},metadata:{}});

const lineArc=shell(
  [{id:'l',x:-10,y:0},{id:'m',x:0,y:0},{id:'a',x:10,y:10}],
  [{id:'line',a:'l',b:'m',lineType:'CUT',curve:'line'},{id:'arc',a:'m',b:'a',lineType:'CUT',curve:'arc',arc:{rx:8,ry:8,rotation:0,largeArc:false,sweep:false}}],
  'line-arc'
);
const la=setMixedContinuityV46(lineArc,'m','g1',{driverEdgeId:'line'});assert.ok(la.diagnostics.tangentErrorDeg<1e-4,`Line↔Arc tangent error ${la.diagnostics.tangentErrorDeg}`);assert.ok(Math.abs(la.doc.edges.find(e=>e.id==='arc').arc.rx-10)<1e-5,'Line-driven Arc must solve the exact tangent circle radius');
let laBroken=structuredClone(la.doc);laBroken.nodes.find(n=>n.id==='l').y=2;const laLive=applyLiveMixedContinuityV46(laBroken,'line');assert.equal(laLive.applied.length,1);assert.ok(mixedContinuityDiagnosticsV46(laLive.doc,'m').tangentErrorDeg<1e-4,'Live Line↔Arc solve must restore G1');

const arcCubic=shell(
  [{id:'m',x:0,y:0},{id:'a',x:10,y:10},{id:'c',x:-12,y:0}],
  [{id:'arc',a:'m',b:'a',lineType:'CUT',curve:'arc',arc:{rx:10,ry:10,rotation:0,largeArc:false,sweep:true}},{id:'cubic',a:'m',b:'c',lineType:'CUT',curve:'cubic',c1:{x:-3,y:3},c2:{x:-9,y:-2}}],
  'arc-cubic'
);
const ac=setMixedContinuityV46(arcCubic,'m','g1',{driverEdgeId:'arc'});assert.ok(ac.diagnostics.tangentErrorDeg<1e-4,`Arc↔Cubic G1 error ${ac.diagnostics.tangentErrorDeg}`);

const cubicLine=shell(
  [{id:'m',x:0,y:0},{id:'c',x:12,y:0},{id:'l',x:-10,y:-4}],
  [{id:'cubic',a:'m',b:'c',lineType:'CUT',curve:'cubic',c1:{x:3,y:4},c2:{x:9,y:1}},{id:'line',a:'m',b:'l',lineType:'CUT',curve:'line'}],
  'cubic-line'
);
const cl=setMixedContinuityV46(cubicLine,'m','g1',{driverEdgeId:'cubic'});assert.ok(cl.diagnostics.tangentErrorDeg<1e-4,`Cubic↔Line G1 error ${cl.diagnostics.tangentErrorDeg}`);
const sharedLine=shell(
  [{id:'m',x:0,y:0},{id:'c',x:12,y:0},{id:'l',x:-10,y:-4},{id:'x',x:-16,y:-8}],
  [{id:'cubic',a:'m',b:'c',lineType:'CUT',curve:'cubic',c1:{x:3,y:4},c2:{x:9,y:1}},{id:'line',a:'m',b:'l',lineType:'CUT',curve:'line'},{id:'branch',a:'l',b:'x',lineType:'CUT',curve:'line'}],
  'cubic-line-shared-target'
);
assert.throws(()=>setMixedContinuityV46(sharedLine,'m','g1',{driverEdgeId:'cubic'}),error=>error?.code==='V46_LINE_TARGET_SHARED_ENDPOINT','Mixed G1 must fail closed instead of moving a shared far Line endpoint');

const rect=shell(
  [{id:'n1',x:0,y:0},{id:'n2',x:20,y:0},{id:'n3',x:20,y:20},{id:'n4',x:0,y:20}],
  [{id:'e1',a:'n1',b:'n2',lineType:'CUT',curve:'line'},{id:'e2',a:'n2',b:'n3',lineType:'CUT',curve:'line'},{id:'e3',a:'n3',b:'n4',lineType:'CUT',curve:'line'},{id:'e4',a:'n4',b:'n1',lineType:'CUT',curve:'line'}],
  'batch-corners'
);
const batch=applyCornerBatchV46(rect,['n1','n2','n3','n4'],{mode:'fillet',valueMm:2});assert.equal(batch.applied.length,4);assert.equal(batch.doc.edges.filter(e=>e.v46Corner).length,4,'All four adjacent corners must be composable V0.46 features');assert.equal(validateV46ConstraintState(batch.doc).ok,true);
const first=batch.applied[0].connectorEdgeId,removed=removeCornerFeatureV46(batch.doc,first);assert.equal(removed.doc.nodes.some(n=>n.id==='n1'),true,'Removing one batch feature must restore only its source node');assert.equal(removed.doc.edges.filter(e=>e.v46Corner).length,3,'Neighbor corner features must survive an independent remove');assert.equal(validateV46ConstraintState(removed.doc).ok,true);
const switchId=removed.doc.edges.find(e=>e.v46Corner)?.id;let switched;try{switched=switchCornerFeatureV46(removed.doc,switchId,'chamfer')}catch(error){const target=removed.doc.edges.find(e=>e.id===switchId),sourceNodeId=target?.v46Corner?.sourceNode?.id;console.error('V46_SWITCH_DIAGNOSTIC',JSON.stringify({switchId,target,sourceNodeId,incidentAtSource:removed.doc.edges.filter(e=>e.a===sourceNodeId||e.b===sourceNodeId),nodes:removed.doc.nodes},null,2));throw error}const switchedEdge=switched.doc.edges.find(e=>e.id===switched.connectorEdgeId);assert.equal(switchedEdge.v45Corner.mode,'chamfer');assert.equal(switchedEdge.curve,'line');

const fillets=batch.doc.edges.filter(e=>e.v45Corner?.mode==='fillet').slice(0,3).map(e=>e.id),eq=createEqualRadiusConstraintV46(batch.doc,fillets,{radiusMm:3});assert.equal(eq.edgeIds.length,3);assert.ok(eq.edgeIds.every(id=>Math.abs(eq.doc.edges.find(e=>e.id===id).v45Corner.valueMm-3)<1e-8));const eq4=updateEqualRadiusGroupV46(eq.doc,eq.groupId,4);assert.ok(eq4.edgeIds.every(id=>Math.abs(eq4.doc.edges.find(e=>e.id===id).v45Corner.valueMm-4)<1e-8),'Equal-radius group edit must propagate to every Fillet');assert.equal(validateV46ConstraintState(eq4.doc).ok,true);
const eqRemoved=removeCornerFeatureV46(eq4.doc,eq4.edgeIds[0]),remainingGroup=eqRemoved.doc.constraintsV46?.equalRadiusGroups?.find(g=>g.id===eq4.groupId);assert.equal(remainingGroup?.edgeIds.length,2,'Removing an equal-radius member must immediately prune its membership');const eqChamfer=switchCornerFeatureV46(eqRemoved.doc,remainingGroup.edgeIds[0],'chamfer');assert.equal((eqChamfer.doc.constraintsV46?.equalRadiusGroups||[]).some(g=>g.id===eq4.groupId),false,'Switching a member to Chamfer must drop an undersized equal-radius group');assert.equal(validateV46ConstraintState(eqChamfer.doc).ok,true);

let restored=structuredClone(batch.doc);for(const id of batch.applied.map(x=>x.connectorEdgeId)){const current=restored.edges.find(e=>e.id===id);if(current?.v45Corner)restored=removeCornerFeatureV46(restored,id).doc}assert.deepEqual(restored.nodes.slice().sort((a,b)=>a.id.localeCompare(b.id)),rect.nodes.slice().sort((a,b)=>a.id.localeCompare(b.id)),'Removing all batch features must recover original nodes');assert.deepEqual(restored.edges.slice().sort((a,b)=>a.id.localeCompare(b.id)),rect.edges.slice().sort((a,b)=>a.id.localeCompare(b.id)),'Removing all batch features must recover original line topology');

const state=structuredClone(defaultState),defaultDoc=dielineDocumentFromStateV38(state),acceptance=runCadTopology3dAcceptanceV46(state,{doc:defaultDoc});assert.equal(acceptance.schema,'boxstudio-acceptance-v46');assert.ok(acceptance.summary.panels>0,'Acceptance must rebuild semantic topology panels');assert.ok(acceptance.stats?.panels>0,'Acceptance must build the 3D fold graph');assert.equal(acceptance.errors.filter(x=>x.stage==='3d').length,0,'2D→Topology→3D identity must not drift');
const preflight=runPreflightV46(state,{doc:defaultDoc});assert.equal(preflight.schema,'boxstudio-preflight-v46');assert.ok(preflight.checks.some(x=>x.code==='V46_3D_FOLDGRAPH_CONSISTENT'&&x.severity==='pass'));

console.log(`BoxStudio V0.46 passed: Line↔Arc=${la.diagnostics.tangentErrorDeg.toExponential(2)}° Arc↔Cubic=${ac.diagnostics.tangentErrorDeg.toExponential(2)}° Cubic↔Line=${cl.diagnostics.tangentErrorDeg.toExponential(2)}° batch=${batch.applied.length} equalR=${eq4.radiusMm} lifecycle=clean 3D=${acceptance.stats.panels}/${acceptance.stats.hinges}`);
