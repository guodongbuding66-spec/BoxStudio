import { cubicPointV43, svgArcCenterV43 } from './curvedGeometryV43.js';

const EPS=1e-9;
const clone=v=>structuredClone(v);
const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const round=(v,p=6)=>{const m=10**p;return Math.round(n(v)*m)/m};
const pt=(x,y)=>({x:round(x),y:round(y)});
const len=v=>Math.hypot(v.x,v.y);
const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y});
const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y});
const mul=(v,s)=>({x:v.x*s,y:v.y*s});
const unit=v=>{const d=len(v);return d>EPS?{x:v.x/d,y:v.y/d}:{x:0,y:0}};
const dot=(a,b)=>a.x*b.x+a.y*b.y;
const cross=(a,b)=>a.x*b.y-a.y*b.x;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const nearly=(a,b,t=.001)=>Math.abs(n(a)-n(b))<=t;
const pointNear=(a,b,t=.001)=>!!a&&!!b&&nearly(a.x,b.x,t)&&nearly(a.y,b.y,t);
const edgeById=(doc,id)=>(doc?.edges||[]).find(e=>e.id===id)||null;
const nodeById=(doc,id)=>(doc?.nodes||[]).find(x=>x.id===id)||null;
const nextId=(items,prefix)=>{let i=1;const ids=new Set((items||[]).map(x=>x.id));while(ids.has(`${prefix}${i}`))i++;return`${prefix}${i}`};

function splitLine(a,b,t){return pt(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t)}
function splitCubic(a,c1,c2,b,t){
  const p01=splitLine(a,c1,t),p12=splitLine(c1,c2,t),p23=splitLine(c2,b,t),p012=splitLine(p01,p12,t),p123=splitLine(p12,p23,t),p=splitLine(p012,p123,t);
  return{p,left:{c1:p01,c2:p012},right:{c1:p123,c2:p23}};
}
function ellipsePoint(center,theta){const ct=Math.cos(theta),st=Math.sin(theta),cp=Math.cos(center.phi),sp=Math.sin(center.phi);return pt(center.cx+cp*center.rx*ct-sp*center.ry*st,center.cy+sp*center.rx*ct+cp*center.ry*st)}
function rawArc(edge,a,b){return{type:'A',x1:a.x,y1:a.y,...edge.arc,largeArc:edge.arc?.largeArc?1:0,sweep:edge.arc?.sweep?1:0,x2:b.x,y2:b.y}}
function splitArc(edge,a,b,t){
  const center=svgArcCenterV43(rawArc(edge,a,b));if(!center)throw Object.assign(new Error(`Arc ${edge.id} cannot resolve for split.`),{code:'V44_ARC_SPLIT_INVALID'});
  const delta1=center.delta*t,delta2=center.delta*(1-t),p=ellipsePoint(center,center.theta1+delta1),arcFor=delta=>({rx:round(center.rx),ry:round(center.ry),rotation:round(center.rotation),largeArc:Math.abs(delta)>Math.PI+1e-9,sweep:center.sweep});
  return{p,left:{arc:arcFor(delta1)},right:{arc:arcFor(delta2)}};
}
function splitSnapshot(source,t){
  const edge=source.edge,a=source.a,b=source.b;if(edge.curve==='cubic')return splitCubic(a,edge.c1,edge.c2,b,t);if(edge.curve==='arc')return splitArc(edge,a,b,t);return{p:splitLine(a,b,t)};
}
function geometryMatches(edge,expected,side,tol){
  if(edge.curve!==expected.curve||edge.lineType!==expected.lineType)return false;
  if(edge.curve==='cubic')return pointNear(edge.c1,side==='left'?expected.split.left.c1:expected.split.right.c1,tol)&&pointNear(edge.c2,side==='left'?expected.split.left.c2:expected.split.right.c2,tol);
  if(edge.curve==='arc'){const got=edge.arc||{},want=side==='left'?expected.split.left.arc:expected.split.right.arc;return nearly(got.rx,want.rx,tol)&&nearly(got.ry,want.ry,tol)&&nearly(got.rotation,want.rotation,tol)&&Boolean(got.largeArc)===Boolean(want.largeArc)&&Boolean(got.sweep)===Boolean(want.sweep)}
  return true;
}
function sourceRecord(edge,a,b){return{edge:clone(edge),a:pt(a.x,a.y),b:pt(b.x,b.y)}}

export function splitEdgeV44(doc,edgeId,t=.5){
  const ratio=clamp(n(t,.5),.000001,.999999),next=clone(doc),index=next.edges.findIndex(e=>e.id===edgeId);if(index<0)throw new Error(`Dieline edge not found: ${edgeId}`);
  const edge=next.edges[index],a=nodeById(next,edge.a),b=nodeById(next,edge.b);if(!a||!b)throw new Error('Dieline edge has missing node.');
  const source=sourceRecord(edge,a,b),split=splitSnapshot(source,ratio),nodeId=nextId(next.nodes,'n'),mid={id:nodeId,...split.p,v44SplitNode:true};next.nodes.push(mid);
  const e1=nextId(next.edges,'e'),temp=[...next.edges,{id:e1}],e2=nextId(temp,'e'),token=`${edge.id}:${nodeId}:${round(ratio,6)}`;
  const provenance={token,t:round(ratio,9),source};
  const left={...clone(edge),id:e1,b:nodeId,v44Split:{...clone(provenance),side:'left'}},right={...clone(edge),id:e2,a:nodeId,v44Split:{...clone(provenance),side:'right'}};
  if(edge.curve==='cubic'){left.c1=split.left.c1;left.c2=split.left.c2;right.c1=split.right.c1;right.c2=split.right.c2}
  if(edge.curve==='arc'){left.arc=split.left.arc;right.arc=split.right.arc}
  next.edges.splice(index,1,left,right);return{doc:next,nodeId,edgeIds:[left.id,right.id],curve:edge.curve||'line',t:ratio};
}

export function canMergeSplitNodeV44(doc,nodeId,{tolerance=.002}={}){
  const node=nodeById(doc,nodeId),incident=(doc?.edges||[]).filter(e=>e.a===nodeId||e.b===nodeId);if(!node||incident.length!==2)return{ok:false,code:'V44_MERGE_DEGREE',detail:'Split merge requires a degree-2 node.'};
  const [e1,e2]=incident,p1=e1.v44Split,p2=e2.v44Split;if(!p1||!p2||p1.token!==p2.token||p1.side===p2.side)return{ok:false,code:'V44_MERGE_PROVENANCE',detail:'The two edges do not share reversible split provenance.'};
  const left=p1.side==='left'?e1:e2,right=p1.side==='right'?e1:e2,p=left.v44Split,source=p.source,expected={curve:source.edge.curve||'line',lineType:source.edge.lineType,split:splitSnapshot(source,p.t)};
  const a=nodeById(doc,source.edge.a),b=nodeById(doc,source.edge.b);if(!a||!b||!pointNear(a,source.a,tolerance)||!pointNear(b,source.b,tolerance))return{ok:false,code:'V44_MERGE_ENDPOINT_CHANGED',detail:'Original split endpoints changed after the split.'};
  if(!pointNear(node,expected.split.p,tolerance))return{ok:false,code:'V44_MERGE_NODE_CHANGED',detail:'The inserted split node moved after the split.'};
  if(left.a!==source.edge.a||right.b!==source.edge.b||left.b!==nodeId||right.a!==nodeId)return{ok:false,code:'V44_MERGE_TOPOLOGY_CHANGED',detail:'Split edge topology changed after the split.'};
  if(!geometryMatches(left,expected,'left',tolerance)||!geometryMatches(right,expected,'right',tolerance))return{ok:false,code:'V44_MERGE_GEOMETRY_CHANGED',detail:'Curve handles or arc parameters changed after the split.'};
  return{ok:true,leftId:left.id,rightId:right.id,source:clone(source),token:p.token};
}

export function mergeSplitNodeV44(doc,nodeId,options={}){
  const verdict=canMergeSplitNodeV44(doc,nodeId,options);if(!verdict.ok)throw Object.assign(new Error(verdict.detail),{code:verdict.code});
  const next=clone(doc),drop=new Set([verdict.leftId,verdict.rightId]),restored=clone(verdict.source.edge);if(next.edges.some(e=>e.id===restored.id&&!drop.has(e.id)))restored.id=nextId(next.edges.filter(e=>!drop.has(e.id)),'e');
  next.edges=next.edges.filter(e=>!drop.has(e.id));next.edges.push(restored);next.nodes=next.nodes.filter(x=>x.id!==nodeId);return{doc:next,edgeId:restored.id};
}

function cubicAtNode(doc,edge,nodeId){
  if(!edge||edge.curve!=='cubic')return null;const node=nodeById(doc,nodeId);if(!node)return null;
  if(edge.a===nodeId)return{edge,node,near:edge.c1,far:edge.c2,outer:nodeById(doc,edge.b),nearKey:'c1',farKey:'c2',away:sub(edge.c1,node),orientation:'out'};
  if(edge.b===nodeId)return{edge,node,near:edge.c2,far:edge.c1,outer:nodeById(doc,edge.a),nearKey:'c2',farKey:'c1',away:sub(edge.c2,node),orientation:'in'};
  return null;
}
function setHandle(edge,key,value){edge[key]=pt(value.x,value.y)}
function orientedIncoming(info){return{p0:info.outer,c1:info.far,c2:info.near,p3:info.node}}
function orientedOutgoing(info){return{p0:info.node,c1:info.near,c2:info.far,p3:info.outer}}
function cubicCurvatureAtEnd(c){const d1=mul(sub(c.p3,c.c2),3),d2=mul(add(sub(c.p3,mul(c.c2,2)),c.c1),6),den=Math.pow(len(d1),3);return den>EPS?cross(d1,d2)/den:0}
function cubicCurvatureAtStart(c){const d1=mul(sub(c.c1,c.p0),3),d2=mul(add(sub(c.p0,mul(c.c1,2)),c.c2),6),den=Math.pow(len(d1),3);return den>EPS?cross(d1,d2)/den:0}

export function continuityDiagnosticsV44(doc,nodeId){
  const incident=(doc?.edges||[]).filter(e=>e.a===nodeId||e.b===nodeId),cubics=incident.map(e=>cubicAtNode(doc,e,nodeId)).filter(Boolean);if(cubics.length!==2)return{eligible:false,degree:incident.length,cubicEdges:cubics.length,tangentErrorDeg:null,speedRatio:null,curvatureDelta:null};
  const [a,b]=cubics,ua=unit(a.away),ub=unit(b.away),cos=clamp(-dot(ua,ub),-1,1),tangentErrorDeg=Math.acos(cos)*180/Math.PI,ha=len(a.away),hb=len(b.away),incoming=orientedIncoming(a),outgoing=orientedOutgoing(b),ka=cubicCurvatureAtEnd(incoming),kb=cubicCurvatureAtStart(outgoing);
  return{eligible:true,degree:incident.length,cubicEdges:2,edgeIds:[a.edge.id,b.edge.id],tangentErrorDeg,speedRatio:hb>EPS?ha/hb:null,curvatureIn:ka,curvatureOut:kb,curvatureDelta:Math.abs(ka-kb),mode:nodeById(doc,nodeId)?.continuityV44||'corner'};
}

export function setNodeContinuityV44(doc,nodeId,mode='g1',{driverEdgeId=null}={}){
  const next=clone(doc),node=nodeById(next,nodeId),incident=next.edges.filter(e=>e.a===nodeId||e.b===nodeId),cubics=incident.map(e=>cubicAtNode(next,e,nodeId)).filter(Boolean);if(!node)throw new Error(`Dieline node not found: ${nodeId}`);if(mode==='corner'){node.continuityV44='corner';return next}if(!['g1','c1','g2'].includes(mode))throw new Error(`Unsupported continuity mode: ${mode}`);if(cubics.length!==2)throw Object.assign(new Error('G1/C1/G2 continuity requires exactly two incident cubic edges.'),{code:'V44_CONTINUITY_REQUIRES_TWO_CUBICS'});
  let driver=cubics.find(x=>x.edge.id===driverEdgeId)||cubics[0],other=cubics.find(x=>x.edge.id!==driver.edge.id);const dv=driver.away,dl=len(dv);if(dl<EPS)throw Object.assign(new Error('Driver cubic handle is collapsed onto the node.'),{code:'V44_CONTINUITY_DRIVER_COLLAPSED'});
  const u=unit(mul(dv,-1)),otherLen=Math.max(EPS,len(other.away)),targetLen=mode==='c1'?dl:otherLen,targetNear=add(node,mul(u,targetLen));setHandle(other.edge,other.nearKey,targetNear);
  if(mode==='g2'){
    driver=cubicAtNode(next,driver.edge,nodeId);other=cubicAtNode(next,other.edge,nodeId);const incoming=orientedIncoming(driver),targetK=cubicCurvatureAtEnd(incoming),h=Math.max(EPS,len(other.away)),normal={x:-u.y,y:u.x},farRel=sub(other.far,node),parallel=dot(farRel,u),targetCross=1.5*targetK*h*h,targetFar=add(node,add(mul(u,parallel),mul(normal,targetCross)));setHandle(other.edge,other.farKey,targetFar);
  }
  node.continuityV44=mode;node.continuityDriverV44=driver.edge.id;return next;
}

function sampleEdge(doc,edge,steps=64){
  const a=nodeById(doc,edge.a),b=nodeById(doc,edge.b);if(!a||!b)return[];if(edge.curve==='cubic'){const c={x1:a.x,y1:a.y,c1x:edge.c1.x,c1y:edge.c1.y,c2x:edge.c2.x,c2y:edge.c2.y,x2:b.x,y2:b.y},out=[];for(let i=0;i<=steps;i++)out.push(cubicPointV43(c,i/steps));return out}
  if(edge.curve==='arc'){const center=svgArcCenterV43(rawArc(edge,a,b));if(!center)return[a,b];const out=[];for(let i=0;i<=steps;i++)out.push(ellipsePoint(center,center.theta1+center.delta*i/steps));return out}
  return[a,b];
}
export function curveLengthV44(doc,edgeId,{steps=64}={}){const edge=edgeById(doc,edgeId);if(!edge)throw new Error(`Dieline edge not found: ${edgeId}`);const pts=sampleEdge(doc,edge,Math.max(8,Math.round(n(steps,64))));let total=0;for(let i=1;i<pts.length;i++)total+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);return total}

export function curveEditingDiagnosticsV44(doc){
  const splitNodes=(doc?.nodes||[]).filter(x=>x.v44SplitNode),continuityNodes=(doc?.nodes||[]).filter(x=>x.continuityV44&&x.continuityV44!=='corner'),mergeable=splitNodes.filter(x=>canMergeSplitNodeV44(doc,x.id).ok).length,continuity=continuityNodes.map(x=>({nodeId:x.id,...continuityDiagnosticsV44(doc,x.id)}));return{splitNodes:splitNodes.length,mergeable,continuityNodes:continuityNodes.length,continuity};
}
