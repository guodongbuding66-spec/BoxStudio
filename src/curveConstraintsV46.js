import { svgArcCenterV43 } from './curvedGeometryV43.js';
import { applyCornerOperationV45, restoreCornerFeatureV45, validateV45ConstraintState } from './curveConstraintsV45.js';

const EPS=1e-9;
const clone=v=>structuredClone(v);
const finite=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const round=(v,p=6)=>{const m=10**p;return Math.round(finite(v)*m)/m};
const point=(x,y)=>({x:round(x),y:round(y)});
const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y});
const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y});
const mul=(v,s)=>({x:v.x*s,y:v.y*s});
const length=v=>Math.hypot(v.x,v.y);
const dot=(a,b)=>a.x*b.x+a.y*b.y;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const unit=v=>{const d=length(v);if(d<=EPS)throw Object.assign(new Error('Zero-length direction cannot be constrained.'),{code:'V46_ZERO_DIRECTION'});return{x:v.x/d,y:v.y/d}};
const nodeById=(doc,id)=>(doc?.nodes||[]).find(n=>n.id===id)||null;
const edgeById=(doc,id)=>(doc?.edges||[]).find(e=>e.id===id)||null;
const incidentEdges=(doc,nodeId)=>(doc?.edges||[]).filter(e=>e.a===nodeId||e.b===nodeId);
const edgeKind=e=>e?.curve||'line';
const edgeOuterId=(edge,nodeId)=>edge?.a===nodeId?edge.b:edge?.b===nodeId?edge.a:null;
const edgeOuterNode=(doc,edge,nodeId)=>nodeById(doc,edgeOuterId(edge,nodeId));
const pairKey=edges=>edges.map(edgeKind).sort().join('-');
const MIXED_PAIRS=new Set(['arc-line','arc-cubic','cubic-line']);
const angleDeg=(a,b)=>Math.acos(clamp(dot(unit(a),unit(b)),-1,1))*180/Math.PI;

function arcRaw(doc,edge,arcOverride=null){
  const a=nodeById(doc,edge.a),b=nodeById(doc,edge.b);if(!a||!b)return null;
  const arc={...(edge.arc||{}),...(arcOverride||{})};
  return{x1:a.x,y1:a.y,x2:b.x,y2:b.y,rx:finite(arc.rx),ry:finite(arc.ry),rotation:finite(arc.rotation),largeArc:Boolean(arc.largeArc),sweep:Boolean(arc.sweep)};
}
function ellipseDerivative(center,theta){const ct=Math.cos(theta),st=Math.sin(theta),cp=Math.cos(center.phi),sp=Math.sin(center.phi);return{x:-cp*center.rx*st-sp*center.ry*ct,y:-sp*center.rx*st+cp*center.ry*ct}}
function arcAwayTangent(doc,edge,nodeId,arcOverride=null){
  const center=svgArcCenterV43(arcRaw(doc,edge,arcOverride));if(!center)throw Object.assign(new Error(`Arc ${edge.id} cannot resolve its SVG center.`),{code:'V46_ARC_CENTER_INVALID'});
  if(edge.a===nodeId)return unit(ellipseDerivative(center,center.theta1));
  if(edge.b===nodeId)return unit(mul(ellipseDerivative(center,center.theta1+center.delta),-1));
  throw Object.assign(new Error(`Arc ${edge.id} is not incident to node ${nodeId}.`),{code:'V46_EDGE_NOT_INCIDENT'});
}
export function edgeAwayTangentV46(doc,edgeId,nodeId){
  const edge=edgeById(doc,edgeId),node=nodeById(doc,nodeId);if(!edge||!node)throw Object.assign(new Error('Mixed-curve tangent entity is missing.'),{code:'V46_ENTITY_MISSING'});
  if(edge.a!==nodeId&&edge.b!==nodeId)throw Object.assign(new Error(`Edge ${edgeId} is not incident to ${nodeId}.`),{code:'V46_EDGE_NOT_INCIDENT'});
  if(edgeKind(edge)==='line'){const outer=edgeOuterNode(doc,edge,nodeId);if(!outer)throw Object.assign(new Error('Line outer endpoint is missing.'),{code:'V46_ENDPOINT_MISSING'});return unit(sub(outer,node))}
  if(edgeKind(edge)==='cubic'){const h=edge.a===nodeId?edge.c1:edge.c2;if(!h)throw Object.assign(new Error('Cubic tangent handle is missing.'),{code:'V46_CUBIC_HANDLE_MISSING'});return unit(sub(h,node))}
  if(edgeKind(edge)==='arc')return arcAwayTangent(doc,edge,nodeId);
  throw Object.assign(new Error(`Unsupported edge curve: ${edgeKind(edge)}`),{code:'V46_UNSUPPORTED_CURVE'});
}

export function mixedContinuityEligibilityV46(doc,nodeId){
  const node=nodeById(doc,nodeId);if(!node)return{ok:false,code:'V46_NODE_MISSING',detail:'Constraint node does not exist.'};
  const edges=incidentEdges(doc,nodeId);if(edges.length!==2)return{ok:false,code:'V46_MIXED_DEGREE',detail:'Mixed-curve G1 requires exactly two incident edges.'};
  const key=pairKey(edges);if(!MIXED_PAIRS.has(key))return{ok:false,code:'V46_MIXED_PAIR_UNSUPPORTED',detail:`Unsupported mixed-curve pair: ${key}.`};
  const arc=edges.find(e=>edgeKind(e)==='arc');if(arc&&Math.abs(finite(arc.arc?.rx)-finite(arc.arc?.ry))>1e-6)return{ok:false,code:'V46_MIXED_ARC_NOT_CIRCULAR',detail:'Mixed-curve tangent solving currently requires a circular Arc.'};
  if(arc&&(!(finite(arc.arc?.rx)>EPS)||!svgArcCenterV43(arcRaw(doc,arc))))return{ok:false,code:'V46_MIXED_ARC_INVALID',detail:'Arc geometry is invalid.'};
  const cubic=edges.find(e=>edgeKind(e)==='cubic');if(cubic&&(!cubic.c1||!cubic.c2))return{ok:false,code:'V46_MIXED_CUBIC_INVALID',detail:'Cubic tangent handles are missing.'};
  return{ok:true,node,edges,key};
}

export function mixedContinuityDiagnosticsV46(doc,nodeId){
  const eligibility=mixedContinuityEligibilityV46(doc,nodeId);if(!eligibility.ok)return{eligible:false,...eligibility};
  const [a,b]=eligibility.edges,t1=edgeAwayTangentV46(doc,a.id,nodeId),t2=edgeAwayTangentV46(doc,b.id,nodeId),error=angleDeg(t1,mul(t2,-1));
  return{eligible:true,nodeId,pair:eligibility.key,edgeIds:[a.id,b.id],tangentErrorDeg:error,stored:clone(eligibility.node.continuityV46||null)};
}

function circularArcForDesiredTangent(doc,edge,nodeId,desiredAway){
  const node=nodeById(doc,nodeId),outer=edgeOuterNode(doc,edge,nodeId),t=unit(desiredAway);if(!node||!outer)throw Object.assign(new Error('Arc endpoint is missing.'),{code:'V46_ENDPOINT_MISSING'});
  const q=sub(outer,node),normal={x:-t.y,y:t.x},den=2*dot(q,normal);if(Math.abs(den)<1e-7)throw Object.assign(new Error('No finite circular Arc can satisfy this tangent with the fixed opposite endpoint.'),{code:'V46_ARC_TANGENT_DEGENERATE'});
  const signed=Math.pow(length(q),2)/den,center=add(node,mul(normal,signed)),radius=Math.abs(signed);if(!Number.isFinite(radius)||radius<=EPS)throw Object.assign(new Error('Solved Arc radius is invalid.'),{code:'V46_ARC_RADIUS_INVALID'});
  let best=null;
  for(const largeArc of [false,true])for(const sweep of [false,true]){
    const candidate={rx:radius,ry:radius,rotation:0,largeArc,sweep};
    let resolved,tan;try{resolved=svgArcCenterV43(arcRaw(doc,edge,candidate));tan=arcAwayTangent(doc,edge,nodeId,candidate)}catch{continue}
    if(!resolved)continue;const centerError=Math.hypot(resolved.cx-center.x,resolved.cy-center.y)/Math.max(1,radius),tangentError=angleDeg(tan,t),score=centerError*1000+tangentError;
    if(!best||score<best.score)best={candidate,resolved,tangentError,centerError,score};
  }
  if(!best||best.tangentError>.01||best.centerError>1e-4)throw Object.assign(new Error('Unable to encode the solved tangent circle as a native SVG Arc.'),{code:'V46_ARC_ENCODING_FAILED'});
  return{arc:{rx:round(radius),ry:round(radius),rotation:0,largeArc:best.candidate.largeArc,sweep:best.candidate.sweep},center:point(center.x,center.y),radius};
}

function solveTargetFromDriver(next,nodeId,driver,target){
  const node=nodeById(next,nodeId),driverAway=edgeAwayTangentV46(next,driver.id,nodeId),desired=mul(driverAway,-1),kind=edgeKind(target);
  if(kind==='cubic'){
    const which=target.a===nodeId?'c1':'c2',h=target[which],handleLength=Math.max(.001,length(sub(h,node))),d=unit(desired);target[which]=point(node.x+d.x*handleLength,node.y+d.y*handleLength);return{targetEdgeId:target.id,kind,changed:'handle'};
  }
  if(kind==='line'){
    const outerId=edgeOuterId(target,nodeId),outer=nodeById(next,outerId);if(!outer)throw Object.assign(new Error('Line outer endpoint is missing.'),{code:'V46_ENDPOINT_MISSING'});const lineLength=Math.max(.001,length(sub(outer,node))),d=unit(desired);outer.x=round(node.x+d.x*lineLength);outer.y=round(node.y+d.y*lineLength);return{targetEdgeId:target.id,kind,changed:'outer-node',outerNodeId:outer.id};
  }
  if(kind==='arc'){
    if(target.v45Corner)throw Object.assign(new Error('Native Fillet arcs are managed by the Corner Feature solver; edit the feature radius instead.'),{code:'V46_CORNER_ARC_MANAGED'});
    const solved=circularArcForDesiredTangent(next,target,nodeId,desired);target.arc={...(target.arc||{}),...solved.arc};return{targetEdgeId:target.id,kind,changed:'arc-radius-and-flags',radius:solved.radius,center:solved.center};
  }
  throw Object.assign(new Error(`Unsupported target curve: ${kind}`),{code:'V46_UNSUPPORTED_CURVE'});
}

export function setMixedContinuityV46(doc,nodeId,mode='g1',{driverEdgeId=null}={}){
  if(!['g1','tangent'].includes(String(mode).toLowerCase()))throw Object.assign(new Error(`Unsupported mixed continuity mode: ${mode}`),{code:'V46_MIXED_MODE_UNSUPPORTED'});
  const next=clone(doc),eligibility=mixedContinuityEligibilityV46(next,nodeId);if(!eligibility.ok)throw Object.assign(new Error(eligibility.detail),{code:eligibility.code});
  const driver=driverEdgeId?eligibility.edges.find(e=>e.id===driverEdgeId):eligibility.edges[0];if(!driver)throw Object.assign(new Error(`Driver edge ${driverEdgeId} is not part of node ${nodeId}.`),{code:'V46_DRIVER_INVALID'});const target=eligibility.edges.find(e=>e.id!==driver.id),change=solveTargetFromDriver(next,nodeId,driver,target),node=nodeById(next,nodeId);
  node.continuityV46={mode:'g1',pair:eligibility.key,edgeIds:eligibility.edges.map(e=>e.id),driverEdgeId:driver.id,version:1};
  return{doc:next,nodeId,driverEdgeId:driver.id,targetEdgeId:target.id,change,diagnostics:mixedContinuityDiagnosticsV46(next,nodeId)};
}

export function clearMixedContinuityV46(doc,nodeId){const next=clone(doc),node=nodeById(next,nodeId);if(node)delete node.continuityV46;return next}

export function applyLiveMixedContinuityV46(doc,changedEdgeId){
  let next=clone(doc),changed=edgeById(next,changedEdgeId);if(!changed)return{doc:next,applied:[]};const applied=[];
  for(const nodeId of [changed.a,changed.b]){
    const node=nodeById(next,nodeId),stored=node?.continuityV46;if(!stored||stored.mode!=='g1'||!stored.edgeIds?.includes(changedEdgeId))continue;
    const eligibility=mixedContinuityEligibilityV46(next,nodeId);if(!eligibility.ok)continue;if(!stored.edgeIds.every(id=>eligibility.edges.some(e=>e.id===id)))continue;
    const result=setMixedContinuityV46(next,nodeId,'g1',{driverEdgeId:changedEdgeId});next=result.doc;applied.push({nodeId,driverEdgeId:changedEdgeId,targetEdgeId:result.targetEdgeId,diagnostics:result.diagnostics});changed=edgeById(next,changedEdgeId)||changed;
  }
  return{doc:next,applied};
}

function annotateV46Corner(sourceDoc,nodeId,result){
  const node=nodeById(sourceDoc,nodeId),sourceEdges=incidentEdges(sourceDoc,nodeId),next=result.doc,connector=edgeById(next,result.connectorEdgeId);if(!node||sourceEdges.length!==2||!connector)return result;
  connector.v46Corner={version:1,sourceNode:clone(node),endpoints:sourceEdges.map((edge,i)=>({edgeId:edge.id,endpoint:edge.a===nodeId?'a':'b',originalNodeId:nodeId,tangentNodeId:result.newNodeIds[i]}))};
  return{...result,doc:next};
}
export function applyCornerFeatureV46(doc,nodeId,options={}){return annotateV46Corner(doc,nodeId,applyCornerOperationV45(doc,nodeId,options))}

export function removeCornerFeatureV46(doc,connectorEdgeId){
  const connector=edgeById(doc,connectorEdgeId);if(!connector?.v45Corner)throw Object.assign(new Error('Selected edge is not a corner feature.'),{code:'V46_CORNER_FEATURE_MISSING'});
  const provenance=connector.v46Corner;if(!provenance?.sourceNode||!Array.isArray(provenance.endpoints)){
    const legacy=restoreCornerFeatureV45(doc,connectorEdgeId);return{...legacy,removedEdgeId:connectorEdgeId,legacy:true};
  }
  const next=clone(doc),feature=edgeById(next,connectorEdgeId),tangentIds=[feature.a,feature.b];
  for(const record of provenance.endpoints){const edge=edgeById(next,record.edgeId);if(!edge)throw Object.assign(new Error(`Corner source edge ${record.edgeId} no longer exists.`),{code:'V46_CORNER_SOURCE_MISSING'});if(edge[record.endpoint]!==record.tangentNodeId)throw Object.assign(new Error(`Corner source endpoint ${record.edgeId}.${record.endpoint} changed after feature creation.`),{code:'V46_CORNER_ENDPOINT_EDITED'});edge[record.endpoint]=record.originalNodeId}
  next.edges=next.edges.filter(e=>e.id!==connectorEdgeId);for(const tangentId of tangentIds){if(!incidentEdges(next,tangentId).length)next.nodes=next.nodes.filter(n=>n.id!==tangentId)}if(!nodeById(next,provenance.sourceNode.id))next.nodes.push(clone(provenance.sourceNode));
  return{doc:next,nodeId:provenance.sourceNode.id,removedEdgeId:connectorEdgeId,restoredFeature:clone(feature.v45Corner),legacy:false};
}
export const restoreCornerFeatureV46=removeCornerFeatureV46;

export function updateCornerFeatureV46(doc,connectorEdgeId,{mode=null,valueMm=null}={}){
  const connector=edgeById(doc,connectorEdgeId),feature=connector?.v45Corner;if(!feature)throw Object.assign(new Error('Selected edge is not a corner feature.'),{code:'V46_CORNER_FEATURE_MISSING'});const removed=removeCornerFeatureV46(doc,connectorEdgeId),result=applyCornerFeatureV46(removed.doc,removed.nodeId,{mode:mode||feature.mode,valueMm:valueMm==null?feature.valueMm:valueMm});return{...result,previousEdgeId:connectorEdgeId,restoredNodeId:removed.nodeId};
}
export function switchCornerFeatureV46(doc,connectorEdgeId,mode){if(!['fillet','chamfer'].includes(mode))throw Object.assign(new Error(`Unsupported corner feature mode: ${mode}`),{code:'V46_CORNER_MODE_INVALID'});return updateCornerFeatureV46(doc,connectorEdgeId,{mode})}

export function applyCornerBatchV46(doc,nodeIds,{mode='fillet',valueMm=5,skipInvalid=false}={}){
  const unique=[...new Set((nodeIds||[]).filter(Boolean))];if(!unique.length)throw Object.assign(new Error('Select at least one corner node.'),{code:'V46_BATCH_EMPTY'});let next=clone(doc);const applied=[],failed=[];
  for(const nodeId of unique){try{const result=applyCornerFeatureV46(next,nodeId,{mode,valueMm});next=result.doc;applied.push({nodeId,connectorEdgeId:result.connectorEdgeId,valueMm:result.valueMm,mode})}catch(error){failed.push({nodeId,code:error?.code||'V46_BATCH_FAILED',detail:error?.message||String(error)});if(!skipInvalid)throw Object.assign(new Error(`Batch corner operation failed at ${nodeId}: ${error?.message||error}`),{code:'V46_BATCH_ATOMIC_FAILURE',nodeId,causeCode:error?.code,failed})}}
  return{doc:next,mode,valueMm:finite(valueMm),applied,failed};
}

function constraintRoot(doc){doc.constraintsV46=doc.constraintsV46||{};doc.constraintsV46.equalRadiusGroups=Array.isArray(doc.constraintsV46.equalRadiusGroups)?doc.constraintsV46.equalRadiusGroups:[];return doc.constraintsV46}
function nextGroupId(groups){let i=1,ids=new Set(groups.map(g=>g.id));while(ids.has(`eqr${i}`))i++;return`eqr${i}`}
function filletEdge(doc,id){const e=edgeById(doc,id);return e?.v45Corner?.mode==='fillet'?e:null}
export function createEqualRadiusConstraintV46(doc,edgeIds,{radiusMm=null,groupId=null}={}){
  let next=clone(doc),ids=[...new Set((edgeIds||[]).filter(Boolean))];if(ids.length<2)throw Object.assign(new Error('Equal-radius constraint requires at least two Fillet features.'),{code:'V46_EQUAL_RADIUS_NEEDS_TWO'});for(const id of ids)if(!filletEdge(next,id))throw Object.assign(new Error(`Edge ${id} is not a Fillet feature.`),{code:'V46_EQUAL_RADIUS_NOT_FILLET',edgeId:id});
  const radius=radiusMm==null?finite(filletEdge(next,ids[0]).v45Corner.valueMm):Math.max(.001,finite(radiusMm));const replacements=new Map();
  for(let i=0;i<ids.length;i++){const currentId=replacements.get(ids[i])||ids[i],result=updateCornerFeatureV46(next,currentId,{mode:'fillet',valueMm:radius});next=result.doc;replacements.set(ids[i],result.connectorEdgeId)}
  ids=ids.map(id=>replacements.get(id)||id);const root=constraintRoot(next),id=groupId||nextGroupId(root.equalRadiusGroups);root.equalRadiusGroups=root.equalRadiusGroups.filter(g=>g.id!==id);root.equalRadiusGroups.push({id,edgeIds:ids,radiusMm:round(radius),version:1});return{doc:next,groupId:id,edgeIds:ids,radiusMm:radius,replacements:Object.fromEntries(replacements)};
}
export function removeEqualRadiusConstraintV46(doc,groupId){const next=clone(doc),root=constraintRoot(next);root.equalRadiusGroups=root.equalRadiusGroups.filter(g=>g.id!==groupId);return next}
export function updateEqualRadiusGroupV46(doc,groupId,radiusMm){
  const source=doc?.constraintsV46?.equalRadiusGroups?.find(g=>g.id===groupId);if(!source)throw Object.assign(new Error(`Equal-radius group ${groupId} does not exist.`),{code:'V46_EQUAL_RADIUS_GROUP_MISSING'});let next=clone(doc),group=constraintRoot(next).equalRadiusGroups.find(g=>g.id===groupId),radius=Math.max(.001,finite(radiusMm)),newIds=[];
  for(const edgeId of [...group.edgeIds]){const result=updateCornerFeatureV46(next,edgeId,{mode:'fillet',valueMm:radius});next=result.doc;newIds.push(result.connectorEdgeId);const current=constraintRoot(next).equalRadiusGroups.find(g=>g.id===groupId);if(current)current.edgeIds=current.edgeIds.map(id=>id===edgeId?result.connectorEdgeId:id)}
  group=constraintRoot(next).equalRadiusGroups.find(g=>g.id===groupId);if(group){group.edgeIds=newIds;group.radiusMm=round(radius)}return{doc:next,groupId,edgeIds:newIds,radiusMm:radius};
}
export function setFilletRadiusV46(doc,edgeId,radiusMm,{propagateEqual=true}={}){
  const group=(doc?.constraintsV46?.equalRadiusGroups||[]).find(g=>g.edgeIds?.includes(edgeId));if(propagateEqual&&group)return updateEqualRadiusGroupV46(doc,group.id,radiusMm);
  const result=updateCornerFeatureV46(doc,edgeId,{mode:'fillet',valueMm:radiusMm});return{doc:result.doc,edgeId:result.connectorEdgeId,radiusMm:finite(radiusMm),previousEdgeId:edgeId};
}

export function validateV46ConstraintState(doc,{tangentToleranceDeg=.05,equalRadiusTolerance=.001,...v45Options}={}){
  const base=validateV45ConstraintState(doc,v45Options),issues=[...base.issues];
  for(const node of doc?.nodes||[]){if(node.continuityV46?.mode!=='g1')continue;const d=mixedContinuityDiagnosticsV46(doc,node.id);if(!d.eligible)issues.push({severity:'error',code:'V46_MIXED_TOPOLOGY_INVALID',entityId:node.id,detail:d.detail||'Stored mixed-curve constraint is no longer eligible.'});else if(d.tangentErrorDeg>tangentToleranceDeg)issues.push({severity:'error',code:'V46_MIXED_G1_BROKEN',entityId:node.id,detail:`Mixed-curve tangent error ${d.tangentErrorDeg.toFixed(4)}° exceeds ${tangentToleranceDeg}°.`})}
  for(const group of doc?.constraintsV46?.equalRadiusGroups||[]){if(!Array.isArray(group.edgeIds)||group.edgeIds.length<2){issues.push({severity:'error',code:'V46_EQUAL_RADIUS_GROUP_INVALID',entityId:group.id,detail:'Equal-radius group must contain at least two Fillet edges.'});continue}const radii=[];for(const id of group.edgeIds){const e=filletEdge(doc,id);if(!e)issues.push({severity:'error',code:'V46_EQUAL_RADIUS_MEMBER_INVALID',entityId:id,detail:`Equal-radius member ${id} is missing or not a Fillet.`});else radii.push(finite(e.v45Corner.valueMm))}if(radii.length>1&&Math.max(...radii)-Math.min(...radii)>equalRadiusTolerance)issues.push({severity:'error',code:'V46_EQUAL_RADIUS_BROKEN',entityId:group.id,detail:`Fillet radii differ by ${(Math.max(...radii)-Math.min(...radii)).toFixed(4)} mm.`})}
  for(const edge of doc?.edges||[]){if(!edge.v46Corner)continue;const p=edge.v46Corner;if(!p.sourceNode||!Array.isArray(p.endpoints)||p.endpoints.length!==2)issues.push({severity:'error',code:'V46_CORNER_PROVENANCE_INVALID',entityId:edge.id,detail:'V0.46 endpoint-level corner provenance is incomplete.'})}
  return{ok:issues.every(x=>x.severity!=='error'),issues};
}

export const V46_CONSTRAINTS_VERSION='V0.46';
