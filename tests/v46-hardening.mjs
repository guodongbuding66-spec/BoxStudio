import assert from 'node:assert/strict';
import { setMixedContinuityV46, applyCornerBatchV46, createEqualRadiusConstraintV46, removeCornerFeatureV46, switchCornerFeatureV46, updateEqualRadiusGroupV46, validateV46ConstraintState } from '../src/curveConstraintsV46.js';

const shell=(nodes,edges,template='v46-hardening')=>({schema:'boxstudio-dieline-v38',version:1,width:80,height:80,template,nodes,edges,panels:[],zones:{bleed:[],safe:[],glue:[]},settings:{bleedMm:0,safeMm:0},metadata:{}});
const rect=()=>shell(
  [{id:'n1',x:0,y:0},{id:'n2',x:30,y:0},{id:'n3',x:30,y:30},{id:'n4',x:0,y:30}],
  [{id:'e1',a:'n1',b:'n2',lineType:'CUT',curve:'line'},{id:'e2',a:'n2',b:'n3',lineType:'CUT',curve:'line'},{id:'e3',a:'n3',b:'n4',lineType:'CUT',curve:'line'},{id:'e4',a:'n4',b:'n1',lineType:'CUT',curve:'line'}]
);

// Mixed G1 must never rotate a line by moving a shared outer topology node.
const sharedOuter=shell(
  [{id:'m',x:0,y:0},{id:'c',x:12,y:0},{id:'l',x:-10,y:-4},{id:'x',x:-18,y:-4}],
  [{id:'cubic',a:'m',b:'c',lineType:'CUT',curve:'cubic',c1:{x:3,y:4},c2:{x:9,y:1}},{id:'line',a:'m',b:'l',lineType:'CUT',curve:'line'},{id:'shared',a:'l',b:'x',lineType:'CUT',curve:'line'}],
  'mixed-shared-outer'
);
assert.throws(()=>setMixedContinuityV46(sharedOuter,'m','g1',{driverEdgeId:'cubic'}),e=>e?.code==='V46_LINE_TARGET_OUTER_SHARED');

// Four adjacent Chamfers must compose and restore losslessly.
const chamfers=applyCornerBatchV46(rect(),['n1','n2','n3','n4'],{mode:'chamfer',valueMm:3});
assert.equal(chamfers.applied.length,4);assert.ok(chamfers.applied.every(x=>chamfers.doc.edges.find(e=>e.id===x.connectorEdgeId)?.curve==='line'));assert.equal(validateV46ConstraintState(chamfers.doc).ok,true);
let restored=structuredClone(chamfers.doc);for(const feature of chamfers.applied){if(restored.edges.some(e=>e.id===feature.connectorEdgeId))restored=removeCornerFeatureV46(restored,feature.connectorEdgeId).doc}
assert.deepEqual(restored.nodes.slice().sort((a,b)=>a.id.localeCompare(b.id)),rect().nodes.slice().sort((a,b)=>a.id.localeCompare(b.id)));
assert.deepEqual(restored.edges.slice().sort((a,b)=>a.id.localeCompare(b.id)),rect().edges.slice().sort((a,b)=>a.id.localeCompare(b.id)));

// Equal-radius membership must clean itself when a feature is removed or converted to Chamfer.
const fillets=applyCornerBatchV46(rect(),['n1','n2','n3','n4'],{mode:'fillet',valueMm:2});
const seedIds=fillets.applied.slice(0,3).map(x=>x.connectorEdgeId),eq=createEqualRadiusConstraintV46(fillets.doc,seedIds,{radiusMm:3});
assert.equal(eq.edgeIds.length,3);assert.equal(eq.doc.constraintsV46.equalRadiusGroups.length,1);
const removed=removeCornerFeatureV46(eq.doc,eq.edgeIds[0]);
let group=removed.doc.constraintsV46.equalRadiusGroups[0];assert.equal(group.edgeIds.length,2);assert.ok(!group.edgeIds.includes(eq.edgeIds[0]));assert.equal(validateV46ConstraintState(removed.doc).ok,true);
const survivor=group.edgeIds[0],switched=switchCornerFeatureV46(removed.doc,survivor,'chamfer');assert.equal(switched.doc.edges.find(e=>e.id===switched.connectorEdgeId)?.v45Corner?.mode,'chamfer');assert.equal(switched.doc.constraintsV46.equalRadiusGroups.length,0,'Two-member equal-radius group must dissolve after one member leaves.');assert.equal(validateV46ConstraintState(switched.doc).ok,true);

// Repeated equal-radius edits must remap connector IDs without stale references.
let cyc=applyCornerBatchV46(rect(),['n1','n2','n3'],{mode:'fillet',valueMm:2}).doc;let ids=cyc.edges.filter(e=>e.v45Corner?.mode==='fillet').map(e=>e.id);let made=createEqualRadiusConstraintV46(cyc,ids,{radiusMm:2.5});cyc=made.doc;let groupId=made.groupId;
for(const radius of [3,4,1.5,5,2.25,3.75]){const step=updateEqualRadiusGroupV46(cyc,groupId,radius);cyc=step.doc;const g=cyc.constraintsV46.equalRadiusGroups.find(x=>x.id===groupId);assert.ok(g);assert.equal(g.edgeIds.length,3);assert.ok(g.edgeIds.every(id=>Math.abs(cyc.edges.find(e=>e.id===id)?.v45Corner?.valueMm-radius)<1e-8));assert.equal(validateV46ConstraintState(cyc).ok,true)}

console.log('BoxStudio V0.46 hardening passed: shared-line fail-closed, batch chamfer restore, equal-radius lifecycle and repeated remap.');
