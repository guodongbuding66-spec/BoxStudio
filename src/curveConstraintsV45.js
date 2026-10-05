import { setNodeContinuityV44, continuityDiagnosticsV44, curveLengthV44 } from './curveEditingV44.js';

const EPS=1e-9;
const clone=v=>structuredClone(v);
const finite=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const round=(v,p=6)=>{const m=10**p;return Math.round(finite(v)*m)/m};
const point=(x,y)=>({x:round(x),y:round(y)});
const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y});
const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y});
const mul=(v,s)=>({x:v.x*s,y:v.y*s});
const length=v=>Math.hypot(v.x,v.y);
const unit=v=>{const d=length(v);if(d<=EPS)throw Object.assign(new Error('Zero-length direction cannot be constrained.'),{code:'V45_ZERO_DIRECTION'});return{x:v.x/d,y:v.y/d}};
const dot=(a,b)=>a.x*b.x+a.y*b.y;
const cross=(a,b)=>a.x*b.y-a.y*b.x;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const nodeById=(doc,id)=>(doc?.nodes||[]).find(n=>n.id===id)||null;
const edgeById=(doc,id)=>(doc?.edges||[]).find(e=>e.id===id)||null;
const nextId=(items,prefix)=>{let i=1;const ids=new Set((items||[]).map(x=>x.id));while(ids.has(`${prefix}${i}`))i++;return`${prefix}${i}`};

function samePoint(a,b,tol=1e-6){return!!a&&!!b&&Math.hypot(a.x-b.x,a.y-b.y)<=tol}
function incidentEdges(doc,nodeId){return(doc?.edges||[]).filter(e=>e.a===nodeId||e.b===nodeId)}
function edgeOuterNode(doc,edge,nodeId){if(edge.a===nodeId)return nodeById(doc,edge.b);if(edge.b===nodeId)return nodeById(doc,edge.a);return null}
function updateEdgeEndpoint(edge,oldNodeId,newNodeId){if(edge.a===oldNodeId)edge.a=newNodeId;else if(edge.b===oldNodeId)edge.b=newNodeId;else throw new Error(`Edge ${edge.id} is not incident to ${oldNodeId}.`)}
function sourceCornerSnapshot(doc,node,edges){return{node:clone(node),edges:edges.map(clone),outerNodes:edges.map(e=>clone(edgeOuterNode(doc,e,node.id)))}}

export function applyLiveContinuityV45(doc,changedEdgeId,{preferChangedDriver=true}={}){
  let next=clone(doc),changed=edgeById(next,changedEdgeId);if(!changed||changed.curve!=='cubic')return{doc:next,applied:[]};
  const candidates=[changed.a,changed.b],applied=[];
  for(const nodeId of candidates){
    const node=nodeById(next,nodeId),mode=node?.continuityV44;if(!node||!['g1','c1','g2'].includes(mode))continue;
    const cubics=incidentEdges(next,nodeId).filter(e=>e.curve==='cubic');if(cubics.length!==2)continue;
    const driverId=preferChangedDriver&&cubics.some(e=>e.id===changedEdgeId)?changedEdgeId:(node.continuityDriverV44&&cubics.some(e=>e.id===node.continuityDriverV44)?node.continuityDriverV44:cubics[0].id);
    next=setNodeContinuityV44(next,nodeId,mode,{driverEdgeId:driverId});
    applied.push({nodeId,mode,driverEdgeId:driverId,diagnostics:continuityDiagnosticsV44(next,nodeId)});
    changed=edgeById(next,changedEdgeId)||changed;
  }
  return{doc:next,applied};
}

export function setCubicHandleLengthV45(doc,edgeId,which,lengthMm,{applyContinuity=true}={}){
  const target=Math.max(.001,finite(lengthMm)),next=clone(doc),edge=edgeById(next,edgeId);if(!edge)throw new Error(`Dieline edge not found: ${edgeId}`);if(edge.curve!=='cubic')throw Object.assign(new Error('Handle-length constraint requires a Cubic edge.'),{code:'V45_HANDLE_NOT_CUBIC'});if(!['c1','c2'].includes(which))throw new Error(`Unsupported Cubic handle: ${which}`);
  const endpoint=nodeById(next,which==='c1'?edge.a:edge.b),handle=edge[which];if(!endpoint||!handle)throw new Error('Cubic endpoint or handle is missing.');const direction=unit(sub(handle,endpoint));edge[which]=point(endpoint.x+direction.x*target,endpoint.y+direction.y*target);
  if(!applyContinuity)return next;return applyLiveContinuityV45(next,edgeId).doc;
}

export function setCircularArcRadiusV45(doc,edgeId,radiusMm){
  const radius=Math.max(.001,finite(radiusMm)),next=clone(doc),edge=edgeById(next,edgeId);if(!edge)throw new Error(`Dieline edge not found: ${edgeId}`);if(edge.curve!=='arc')throw Object.assign(new Error('Radius constraint requires an Arc edge.'),{code:'V45_RADIUS_NOT_ARC'});const a=nodeById(next,edge.a),b=nodeById(next,edge.b);if(!a||!b)throw new Error('Arc endpoint is missing.');const chord=Math.hypot(b.x-a.x,b.y-a.y);if(radius+1e-6<chord/2)throw Object.assign(new Error(`Radius ${radius.toFixed(3)} mm is smaller than half the ${chord.toFixed(3)} mm chord.`),{code:'V45_RADIUS_BELOW_HALF_CHORD'});edge.arc={...(edge.arc||{}),rx:round(radius),ry:round(radius)};return next;
}

export function curveDimensionDiagnosticsV45(doc,edgeId){
  const edge=edgeById(doc,edgeId);if(!edge)throw new Error(`Dieline edge not found: ${edgeId}`);const a=nodeById(doc,edge.a),b=nodeById(doc,edge.b);if(!a||!b)throw new Error('Curve endpoint is missing.');const chord=Math.hypot(b.x-a.x,b.y-a.y),pathLength=curveLengthV44(doc,edgeId,{steps:128}),base={edgeId,curve:edge.curve||'line',chordLength:chord,pathLength};
  if(edge.curve==='cubic')return{...base,c1Length:Math.hypot(edge.c1.x-a.x,edge.c1.y-a.y),c2Length:Math.hypot(edge.c2.x-b.x,edge.c2.y-b.y)};
  if(edge.curve==='arc')return{...base,rx:finite(edge.arc?.rx),ry:finite(edge.arc?.ry),rotation:finite(edge.arc?.rotation),circular:Math.abs(finite(edge.arc?.rx)-finite(edge.arc?.ry))<=1e-6};
  return base;
}

export function cornerOperationEligibilityV45(doc,nodeId){
  const node=nodeById(doc,nodeId);if(!node)return{ok:false,code:'V45_CORNER_NODE_MISSING',detail:'Corner node does not exist.'};const incident=incidentEdges(doc,nodeId);if(incident.length!==2)return{ok:false,code:'V45_CORNER_DEGREE',detail:'Fillet/Chamfer requires a degree-2 corner.'};if(incident.some(e=>e.lineType!=='CUT'||(e.curve||'line')!=='line'))return{ok:false,code:'V45_CORNER_REQUIRES_CUT_LINES',detail:'Fillet/Chamfer currently requires two straight CUT edges.'};const outer=incident.map(e=>edgeOuterNode(doc,e,nodeId));if(outer.some(x=>!x))return{ok:false,code:'V45_CORNER_ENDPOINT_MISSING',detail:'Corner edge endpoint is missing.'};const vectors=outer.map(x=>sub(x,node)),lens=vectors.map(length);if(lens.some(x=>x<=1e-6))return{ok:false,code:'V45_CORNER_DEGENERATE',detail:'Corner contains a degenerate edge.'};const u=vectors.map(unit),theta=Math.acos(clamp(dot(u[0],u[1]),-1,1));if(theta<1e-4||Math.PI-theta<1e-4)return{ok:false,code:'V45_CORNER_ANGLE_INVALID',detail:'Corner angle is too close to 0° or 180°.'};return{ok:true,node,edges:incident,outer,vectors,u,lens,theta,angleDeg:theta*180/Math.PI};
}

export function applyCornerOperationV45(doc,nodeId,{mode='fillet',valueMm=5}={}){
  const eligibility=cornerOperationEligibilityV45(doc,nodeId);if(!eligibility.ok)throw Object.assign(new Error(eligibility.detail),{code:eligibility.code});if(!['fillet','chamfer'].includes(mode))throw new Error(`Unsupported corner operation: ${mode}`);const value=Math.max(.001,finite(valueMm)),{node,edges,outer,u,lens,theta}=eligibility;
  const setback=mode==='fillet'?value/Math.tan(theta/2):value;if(!Number.isFinite(setback)||setback<=0)throw Object.assign(new Error('Corner setback is invalid.'),{code:'V45_CORNER_SETBACK_INVALID'});if(setback>=Math.min(...lens)-.001)throw Object.assign(new Error(`Corner operation needs ${setback.toFixed(3)} mm setback but the shortest incident edge is ${Math.min(...lens).toFixed(3)} mm.`),{code:'V45_CORNER_TOO_LARGE'});
  const next=clone(doc),current=nodeById(next,nodeId),currentEdges=edges.map(e=>edgeById(next,e.id)),snapshot=sourceCornerSnapshot(doc,node,edges),newNodeIds=[nextId(next.nodes,'n')];const tempNodes=[...next.nodes,{id:newNodeIds[0]}];newNodeIds.push(nextId(tempNodes,'n'));
  const tangentPoints=u.map((dir,i)=>point(current.x+dir.x*setback,current.y+dir.y*setback));const newNodes=tangentPoints.map((p,i)=>({id:newNodeIds[i],...p,v45CornerNode:true}));next.nodes.push(...newNodes);currentEdges.forEach((edge,i)=>updateEdgeEndpoint(edge,nodeId,newNodeIds[i]));next.nodes=next.nodes.filter(x=>x.id!==nodeId);
  const connectorId=nextId(next.edges,'e'),metadata={mode,valueMm:round(value),setbackMm:round(setback),sourceNodeId:nodeId,source:snapshot};let connector;
  if(mode==='chamfer')connector={id:connectorId,a:newNodeIds[0],b:newNodeIds[1],lineType:'CUT',curve:'line',v45Corner:metadata};
  else{
    const bisector=unit(add(u[0],u[1])),centerDistance=value/Math.sin(theta/2),center=add(node,mul(bisector,centerDistance)),v1=sub(tangentPoints[0],center),v2=sub(tangentPoints[1],center),sweep=cross(v1,v2)>0;connector={id:connectorId,a:newNodeIds[0],b:newNodeIds[1],lineType:'CUT',curve:'arc',arc:{rx:round(value),ry:round(value),rotation:0,largeArc:false,sweep},v45Corner:{...metadata,center:point(center.x,center.y)}};
  }
  next.edges.push(connector);return{doc:next,connectorEdgeId:connectorId,newNodeIds,mode,valueMm:value,setbackMm:setback};
}

export function validateV45ConstraintState(doc,{tangentToleranceDeg=.05,c1SpeedTolerance=.002,g2CurvatureTolerance=1e-5}={}){
  const issues=[];
  for(const node of doc?.nodes||[]){const mode=node.continuityV44;if(!['g1','c1','g2'].includes(mode))continue;const d=continuityDiagnosticsV44(doc,node.id);if(!d.eligible){issues.push({severity:'error',code:'V45_CONTINUITY_TOPOLOGY_INVALID',entityId:node.id,detail:`${mode.toUpperCase()} node no longer has two Cubic edges.`});continue}if(d.tangentErrorDeg>tangentToleranceDeg)issues.push({severity:'error',code:'V45_G1_BROKEN',entityId:node.id,detail:`Tangent error ${d.tangentErrorDeg.toFixed(4)}° exceeds ${tangentToleranceDeg}°.`});if(['c1','g2'].includes(mode)&&Math.abs((d.speedRatio??1)-1)>c1SpeedTolerance&&mode==='c1')issues.push({severity:'error',code:'V45_C1_BROKEN',entityId:node.id,detail:`C1 speed ratio ${(d.speedRatio??0).toFixed(6)} is outside tolerance.`});if(mode==='g2'&&d.curvatureDelta>g2CurvatureTolerance)issues.push({severity:'error',code:'V45_G2_BROKEN',entityId:node.id,detail:`G2 curvature delta ${d.curvatureDelta.toExponential(3)} exceeds tolerance.`})}
  for(const edge of doc?.edges||[]){if(!edge.v45Corner)continue;if(edge.lineType!=='CUT')issues.push({severity:'error',code:'V45_CORNER_NOT_CUT',entityId:edge.id,detail:'Fillet/Chamfer connector must remain CUT.'});if(edge.v45Corner.mode==='fillet'){if(edge.curve!=='arc'||finite(edge.arc?.rx)<=0||finite(edge.arc?.ry)<=0)issues.push({severity:'error',code:'V45_FILLET_ARC_INVALID',entityId:edge.id,detail:'Fillet connector is not a valid native Arc.'});else{const a=nodeById(doc,edge.a),b=nodeById(doc,edge.b),chord=a&&b?Math.hypot(b.x-a.x,b.y-a.y):Infinity;if(finite(edge.arc.rx)+1e-6<chord/2)issues.push({severity:'error',code:'V45_FILLET_RADIUS_INVALID',entityId:edge.id,detail:'Fillet radius is smaller than half its chord.'})}}if(edge.v45Corner.mode==='chamfer'&&edge.curve!=='line')issues.push({severity:'error',code:'V45_CHAMFER_NOT_LINE',entityId:edge.id,detail:'Chamfer connector must remain a Line.'})}
  return{ok:issues.every(x=>x.severity!=='error'),issues};
}

export const V45_CONSTRAINTS_VERSION='V0.45';
