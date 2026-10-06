import { buildFoldAuthoringModelV50, ensureFoldAuthoringV50, rendererAuthoringV50, setFoldTimelineV50, setSequenceEnabledV50, edgeKeyV50 } from './foldAuthoringV50.js';
import { buildFoldTransformsV50 } from './threeArtworkProofV50.js';
import { panelPolygon, triangulatePolygon } from './threeArtworkProof.js';

export const V51_SEQUENCE_SCHEMA='boxstudio-v51-fold-sequence';
export const V51_PRODUCT_VERSION='V0.51';
export const V51_SEQUENCE_VERSION=1;

const clone=v=>structuredClone(v);
const num=(v,d=0)=>{const n=Number(v);return Number.isFinite(n)?n:d};
const clamp=(v,min,max)=>Math.min(max,Math.max(min,num(v,min)));
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const mul=(a,s)=>[a[0]*s,a[1]*s,a[2]*s];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const len=a=>Math.hypot(a[0],a[1],a[2]);
const applyM=(m,p)=>[m[0]*p[0]+m[1]*p[1]+m[2]*p[2]+m[3],m[4]*p[0]+m[5]*p[1]+m[6]*p[2]+m[7],m[8]*p[0]+m[9]*p[1]+m[10]*p[2]+m[11]];

function normalizeSteps(graph,oldSteps=[]){
  const oldMap=new Map((oldSteps||[]).map(x=>[x.key,Math.max(1,Math.round(num(x.step,1)))])),edges=graph?.edges||[];
  const raw=edges.map((edge,index)=>({key:edgeKeyV50(edge),step:oldMap.get(edgeKeyV50(edge))??index+1}));
  const unique=[...new Set(raw.map(x=>x.step))].sort((a,b)=>a-b),map=new Map(unique.map((value,index)=>[value,index+1]));
  return raw.map(x=>({...x,step:map.get(x.step)}));
}
function stepCountOf(steps=[]){return Math.max(0,...steps.map(x=>x.step||0))}

export function ensureFoldSequenceV51(state={},graph={}){
  const next=clone(state),v50=ensureFoldAuthoringV50(next,graph),old=next.foldSequenceV51||{},edgeSteps=normalizeSteps(graph,old.edgeSteps||[]),stepCount=stepCountOf(edgeSteps);
  next.foldAuthoringV50=v50.foldAuthoringV50;
  next.foldSequenceV51={schema:V51_SEQUENCE_SCHEMA,version:V51_SEQUENCE_VERSION,edgeSteps,currentStep:Math.round(clamp(old.currentStep??0,0,stepCount)),blockOnPenetration:Boolean(old.blockOnPenetration),collisionEnabled:old.collisionEnabled!==false,lastSource:old.lastSource||'init'};
  return next;
}

function normalizeAfterEdit(state,graph){const next=ensureFoldSequenceV51(state,graph),raw=next.foldSequenceV51.edgeSteps,unique=[...new Set(raw.map(x=>Math.max(1,Math.round(num(x.step,1)))))].sort((a,b)=>a-b),map=new Map(unique.map((value,index)=>[value,index+1]));raw.forEach(x=>x.step=map.get(Math.max(1,Math.round(num(x.step,1)))));next.foldSequenceV51.currentStep=Math.min(next.foldSequenceV51.currentStep,stepCountOf(raw));return next}
export function setEdgeStepV51(state,graph,key,step){const next=ensureFoldSequenceV51(state,graph),row=next.foldSequenceV51.edgeSteps.find(x=>x.key===key);if(row)row.step=Math.max(1,Math.round(num(step,row.step)));next.foldSequenceV51.lastSource='edge-step';return normalizeAfterEdit(next,graph)}
export function moveEdgeStepV51(state,graph,key,delta){const next=ensureFoldSequenceV51(state,graph),row=next.foldSequenceV51.edgeSteps.find(x=>x.key===key),count=stepCountOf(next.foldSequenceV51.edgeSteps);if(row)row.step=Math.max(1,Math.min(Math.max(1,count),row.step+(delta<0?-1:1)));next.foldSequenceV51.lastSource='edge-step-move';return normalizeAfterEdit(next,graph)}
export function splitEdgeStepV51(state,graph,key){const next=ensureFoldSequenceV51(state,graph),row=next.foldSequenceV51.edgeSteps.find(x=>x.key===key);if(!row)return next;const current=row.step;next.foldSequenceV51.edgeSteps.forEach(x=>{if(x.key!==key&&x.step>current)x.step+=1});row.step=current+1;next.foldSequenceV51.lastSource='edge-step-split';return normalizeAfterEdit(next,graph)}
export function mergeEdgeWithPreviousV51(state,graph,key){const next=ensureFoldSequenceV51(state,graph),row=next.foldSequenceV51.edgeSteps.find(x=>x.key===key);if(row&&row.step>1)row.step-=1;next.foldSequenceV51.lastSource='edge-step-merge';return normalizeAfterEdit(next,graph)}
export function setCollisionBlockingV51(state,graph,enabled){const next=ensureFoldSequenceV51(state,graph);next.foldSequenceV51.blockOnPenetration=Boolean(enabled);next.foldSequenceV51.lastSource='collision-policy';return next}
export function setCollisionEnabledV51(state,graph,enabled){const next=ensureFoldSequenceV51(state,graph);next.foldSequenceV51.collisionEnabled=Boolean(enabled);next.foldSequenceV51.lastSource='collision-enabled';return next}

export function buildFoldSequenceModelV51(state={},graph={},geo={}){
  const next=ensureFoldSequenceV51(state,graph),v50=buildFoldAuthoringModelV50(next,graph,geo),stepByKey=new Map(next.foldSequenceV51.edgeSteps.map(x=>[x.key,x.step])),stepCount=stepCountOf(next.foldSequenceV51.edgeSteps),timeline=v50.timeline,cursor=stepCount?timeline/100*stepCount:0;
  const edges=v50.edges.map(edge=>{const step=stepByKey.get(edge.key)||1,localProgress=v50.sequenceEnabled?clamp((cursor-(step-1))*100,0,100):null;return{...edge,step,localProgressV51:localProgress}});
  const steps=[];for(let step=1;step<=stepCount;step++){const members=edges.filter(edge=>edge.step===step);steps.push({step,label:`Step ${step}`,timeline:stepCount?step/stepCount*100:100,edgeKeys:members.map(x=>x.key),edges:members})}
  const keyframes=[{step:0,label:'Flat',timeline:0,edgeKeys:[]}].concat(steps.map(item=>({step:item.step,label:item.label,timeline:item.timeline,edgeKeys:item.edgeKeys})));
  return{schema:V51_SEQUENCE_SCHEMA,version:V51_SEQUENCE_VERSION,state:next,v50:{...v50,edges},edges,steps,keyframes,stepCount,currentStep:next.foldSequenceV51.currentStep,blockOnPenetration:next.foldSequenceV51.blockOnPenetration,collisionEnabled:next.foldSequenceV51.collisionEnabled};
}

export function timelineForStepV51(model,step){if(!model.stepCount)return 0;return clamp(Math.round(num(step,0)),0,model.stepCount)/model.stepCount*100}
export function setCurrentStepV51(state,graph,geo,step){let next=ensureFoldSequenceV51(state,graph),model=buildFoldSequenceModelV51(next,graph,geo),target=Math.round(clamp(step,0,model.stepCount));next.foldSequenceV51.currentStep=target;next.foldSequenceV51.lastSource='step-navigation';next=setSequenceEnabledV50(next,graph,true);next=setFoldTimelineV50(next,graph,timelineForStepV51(model,target),{enableSequence:true});next.foldSequenceV51=ensureFoldSequenceV51(next,graph).foldSequenceV51;next.foldSequenceV51.currentStep=target;next.foldSequenceV51.lastSource='step-navigation';return next}
export function stepFoldV51(state,graph,geo,delta=1){const model=buildFoldSequenceModelV51(state,graph,geo);return setCurrentStepV51(model.state,graph,geo,model.currentStep+(delta<0?-1:1))}

export function rendererAuthoringV51(model,collisionReport=null){const base=rendererAuthoringV50(model.v50),edgeProgress={};for(const edge of model.edges)edgeProgress[edge.key]=edge.localProgressV51??0;const penetrationPanels=new Set(),overlapPanels=new Set();for(const hit of collisionReport?.penetrations||[]){penetrationPanels.add(hit.a);penetrationPanels.add(hit.b)}for(const hit of collisionReport?.overlaps||[]){overlapPanels.add(hit.a);overlapPanels.add(hit.b)}return{...base,edgeProgress:model.v50.sequenceEnabled?edgeProgress:{},collisionPanels:[...penetrationPanels],overlapPanels:[...overlapPanels]}}

function trianglesForPanel(node,geo,transform){const panel=geo?.panelMap?.[node?.id]||geo?.panelMap?.[node?.artPanel];if(!panel)return null;const tri=triangulatePolygon(panelPolygon(panel)),points=tri.points.map(p=>applyM(transform,[p[0]-geo.width/2,-(p[1]-geo.height/2),0]));return{nodeId:node.id,panelId:node.artPanel||node.id,points,triangles:tri.triangles,aabb:aabb(points)}}
function aabb(points){const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),zs=points.map(p=>p[2]);return{min:[Math.min(...xs),Math.min(...ys),Math.min(...zs)],max:[Math.max(...xs),Math.max(...ys),Math.max(...zs)]}}
function aabbOverlap(a,b,eps=.05){return a.min[0]<=b.max[0]+eps&&a.max[0]>=b.min[0]-eps&&a.min[1]<=b.max[1]+eps&&a.max[1]>=b.min[1]-eps&&a.min[2]<=b.max[2]+eps&&a.max[2]>=b.min[2]-eps}
function normalOf(t){return cross(sub(t[1],t[0]),sub(t[2],t[0]))}
function segmentTriangle(p0,p1,t,eps=1e-6){const dir=sub(p1,p0),e1=sub(t[1],t[0]),e2=sub(t[2],t[0]),h=cross(dir,e2),det=dot(e1,h);if(Math.abs(det)<eps)return false;const inv=1/det,s=sub(p0,t[0]),u=inv*dot(s,h);if(u<=eps||u>=1-eps)return false;const q=cross(s,e1),v=inv*dot(dir,q);if(v<=eps||u+v>=1-eps)return false;const tt=inv*dot(e2,q);return tt>eps&&tt<1-eps}
function dropAxis(points,axis){return points.map(p=>axis===0?[p[1],p[2]]:axis===1?[p[0],p[2]]:[p[0],p[1]])}
function orient2(a,b,c){return(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])}
function properSeg2(a,b,c,d,eps=1e-7){const o1=orient2(a,b,c),o2=orient2(a,b,d),o3=orient2(c,d,a),o4=orient2(c,d,b);return o1*o2<-eps&&o3*o4<-eps}
function pointTri2(p,t,eps=1e-7){const a=orient2(t[0],t[1],p),b=orient2(t[1],t[2],p),c=orient2(t[2],t[0],p),pos=a>eps&&b>eps&&c>eps,neg=a<-eps&&b<-eps&&c<-eps;return pos||neg}
function coplanarOverlap(a,b){const n=normalOf(a),axis=Math.abs(n[0])>=Math.abs(n[1])&&Math.abs(n[0])>=Math.abs(n[2])?0:Math.abs(n[1])>=Math.abs(n[2])?1:2,A=dropAxis(a,axis),B=dropAxis(b,axis);if(A.some(p=>pointTri2(p,B))||B.some(p=>pointTri2(p,A)))return true;for(let i=0;i<3;i++)for(let j=0;j<3;j++)if(properSeg2(A[i],A[(i+1)%3],B[j],B[(j+1)%3]))return true;return false}
function triangleRelation(a,b,eps=1e-5){const na=normalOf(a),nb=normalOf(b),la=len(na),lb=len(nb);if(la<eps||lb<eps)return null;const parallel=len(cross(na,nb))/(la*lb)<1e-5,planeDist=Math.abs(dot(na,sub(b[0],a[0])))/la;if(parallel&&planeDist<.05)return coplanarOverlap(a,b)?'overlap':null;for(let i=0;i<3;i++){if(segmentTriangle(a[i],a[(i+1)%3],b))return'penetration';if(segmentTriangle(b[i],b[(i+1)%3],a))return'penetration'}return null}
function directAdjacency(graph){const set=new Set();for(const e of graph?.edges||[]){const a=e.from,b=e.to;set.add(a<b?`${a}|${b}`:`${b}|${a}`)}return set}

export function detectPanelCollisionsV51(graph,geo,transforms){const panels=[];for(const node of graph?.nodes||[]){const p=trianglesForPanel(node,geo,transforms.get(node.id));if(p)panels.push(p)}const adjacent=directAdjacency(graph),hits=[];for(let i=0;i<panels.length;i++)for(let j=i+1;j<panels.length;j++){const A=panels[i],B=panels[j],pair=A.nodeId<B.nodeId?`${A.nodeId}|${B.nodeId}`:`${B.nodeId}|${A.nodeId}`;if(adjacent.has(pair)||!aabbOverlap(A.aabb,B.aabb))continue;let relation=null;outer:for(const ta of A.triangles)for(const tb of B.triangles){relation=triangleRelation(ta.map(k=>A.points[k]),tb.map(k=>B.points[k]));if(relation==='penetration')break outer}if(relation)hits.push({type:relation,a:A.panelId,b:B.panelId,nodeA:A.nodeId,nodeB:B.nodeId})}return hits}

function modelAtTimeline(state,graph,geo,timeline,sequenceModel){let temp=setSequenceEnabledV50(state,graph,true);temp=setFoldTimelineV50(temp,graph,timeline,{enableSequence:true});const model=buildFoldSequenceModelV51({...temp,foldSequenceV51:sequenceModel.state.foldSequenceV51},graph,geo);model.v50.timeline=timeline;const count=Math.max(1,model.stepCount),cursor=timeline/100*count;model.edges=model.edges.map(edge=>({...edge,localProgressV51:clamp((cursor-(edge.step-1))*100,0,100)}));return model}
export function scanFoldSequenceV51(state={},graph={},geo={},options={}){const sequence=buildFoldSequenceModelV51(state,graph,geo);if(!sequence.collisionEnabled)return{schema:'boxstudio-v51-collision-report',version:1,enabled:false,samples:0,penetrations:[],overlaps:[],collisionPanels:[],overlapPanels:[]};const fractions=Array.isArray(options.fractions)&&options.fractions.length?options.fractions:[.25,.5,.75,1],timelineSet=new Set([0]);for(let i=0;i<sequence.stepCount;i++)for(const f of fractions)timelineSet.add(((i+clamp(f,0,1))/Math.max(1,sequence.stepCount))*100);const timelines=[...timelineSet].sort((a,b)=>a-b),map=new Map();for(const timeline of timelines){const model=modelAtTimeline(sequence.state,graph,geo,timeline,sequence),authoring=rendererAuthoringV51(model),transforms=buildFoldTransformsV50(graph,geo,100,{...authoring,explode:0});for(const hit of detectPanelCollisionsV51(graph,geo,transforms)){const ids=[hit.a,hit.b].sort(),key=`${hit.type}:${ids.join('|')}`,prev=map.get(key);if(prev){prev.occurrences++;prev.firstTimeline=Math.min(prev.firstTimeline,timeline);prev.lastTimeline=Math.max(prev.lastTimeline,timeline)}else map.set(key,{...hit,occurrences:1,firstTimeline:timeline,lastTimeline:timeline})}}
  const hits=[...map.values()],penetrations=hits.filter(x=>x.type==='penetration'),overlaps=hits.filter(x=>x.type==='overlap'),collisionPanels=[...new Set(penetrations.flatMap(x=>[x.a,x.b]))],overlapPanels=[...new Set(overlaps.flatMap(x=>[x.a,x.b]))];return{schema:'boxstudio-v51-collision-report',version:1,enabled:true,samples:timelines.length,timelines,penetrations,overlaps,collisionPanels,overlapPanels};
}

export function foldSequenceAcceptanceV51(state={},graph={},geo={},options={}){const model=buildFoldSequenceModelV51(state,graph,geo),issues=[],steps=model.state.foldSequenceV51.edgeSteps.map(x=>x.step),unique=[...new Set(steps)].sort((a,b)=>a-b);if(steps.length!==(graph.edges||[]).length)issues.push({severity:'error',code:'V51_STEP_EDGE_DRIFT',detail:'Fold step mapping must cover every FoldGraph edge.'});if(unique.some((v,i)=>v!==i+1))issues.push({severity:'error',code:'V51_STEP_GAP',detail:'Fold steps must stay contiguous.'});if(model.currentStep<0||model.currentStep>model.stepCount)issues.push({severity:'error',code:'V51_CURRENT_STEP_RANGE',detail:'Current fold step is outside the sequence.'});const collisions=options.skipCollision?{enabled:false,samples:0,penetrations:[],overlaps:[],collisionPanels:[],overlapPanels:[]}:scanFoldSequenceV51(model.state,graph,geo,options);for(const hit of collisions.penetrations)issues.push({severity:model.blockOnPenetration?'error':'warning',code:'V51_PANEL_PENETRATION',entityId:`${hit.a}|${hit.b}`,detail:`Panels ${hit.a} and ${hit.b} penetrate during the fold path (${hit.firstTimeline.toFixed(1)}–${hit.lastTimeline.toFixed(1)}%).`});for(const hit of collisions.overlaps)issues.push({severity:'warning',code:'V51_PANEL_OVERLAP',entityId:`${hit.a}|${hit.b}`,detail:`Panels ${hit.a} and ${hit.b} overlap/contact during folding; verify whether this is an intentional flap overlap.`});const errors=issues.filter(x=>x.severity==='error');return{schema:'boxstudio-v51-fold-sequence-acceptance',version:1,ok:errors.length===0,issues,errors,model,collisions,summary:{steps:model.stepCount,currentStep:model.currentStep,penetrations:collisions.penetrations.length,overlaps:collisions.overlaps.length,samples:collisions.samples,blocking:model.blockOnPenetration}}}
