import { ensureFoldSequenceV51, buildFoldSequenceModelV51, scanFoldSequenceV51, setEdgeStepV51, splitEdgeStepV51 } from './foldSequenceV51.js';
import { setFoldEdgeAngleV50, flipFoldDirectionV50, edgeKeyV50 } from './foldAuthoringV50.js';
import { collisionEventsV52, collisionScoreV52, locateCollisionV52 } from './collisionOptimizationV52.js';

export const V53_REPAIR_SCHEMA='boxstudio-v53-collision-repair';
export const V53_PRODUCT_VERSION='V0.53';
export const V53_REPAIR_VERSION=1;

const clone=v=>structuredClone(v);
const num=(v,d=0)=>{const n=Number(v);return Number.isFinite(n)?n:d};
const clamp=(v,min,max)=>Math.min(max,Math.max(min,num(v,min)));
const eventKey=e=>e?.id||`${e?.type||'hit'}:${[e?.a||'',e?.b||''].sort().join('|')}`;

function movingEdgeForPanel(graph,panelId){
  const incoming=(graph?.edges||[]).find(edge=>edge.to===panelId&&edge.hinge);
  if(incoming)return incoming;
  return (graph?.edges||[]).find(edge=>(edge.from===panelId||edge.to===panelId)&&edge.hinge)||null;
}
function modelEdge(state,graph,geo,key){return buildFoldSequenceModelV51(state,graph,geo).edges.find(edge=>edge.key===key)||null}
function normalizeAngle(angle){const sign=num(angle,90)<0?-1:1;return sign*Math.max(10,Math.min(180,Math.abs(num(angle,90))))}
function riskPenalty(type){return type==='sequence'?0:type==='split'?50:type==='angle'?20_000:type==='direction'?35_000:5_000}
function uniqueRows(rows=[]){const seen=new Set();return rows.filter(row=>{const key=`${row.kind}|${row.edgeKey||''}|${row.targetStep||''}|${row.angle??''}`;if(seen.has(key))return false;seen.add(key);return true})}
function swapStepState(state,graph,geo,edgeKey,delta){
  const base=ensureFoldSequenceV51(state,graph),m=buildFoldSequenceModelV51(base,graph,geo),edge=m.edges.find(x=>x.key===edgeKey);if(!edge)return base;
  const target=clamp(edge.step+(delta<0?-1:1),1,m.stepCount);if(target===edge.step)return base;
  const next=clone(base);for(const row of next.foldSequenceV51.edgeSteps){if(row.step===edge.step)row.step=target;else if(row.step===target)row.step=edge.step}next.foldSequenceV51.currentStep=0;next.foldSequenceV51.lastSource='v53-step-swap';return ensureFoldSequenceV51(next,graph);
}
function buildRawRepairs(state,graph,geo,event){
  const m=buildFoldSequenceModelV51(state,graph,geo),rows=[];
  for(const panel of [event.a,event.b]){
    const edge=movingEdgeForPanel(graph,panel);if(!edge)continue;const key=edgeKeyV50(edge),current=modelEdge(state,graph,geo,key);if(!current)continue;
    if(current.step<m.stepCount)rows.push({kind:'sequence',action:'delay',edgeKey:key,panel,targetStep:current.step+1,title:`延后 ${panel}`,detail:`将 ${current.label||key} 从 Step ${current.step} 延后一个阶段。`,risk:'low',mutate:s=>swapStepState(s,graph,geo,key,1)});
    if(current.step>1)rows.push({kind:'sequence',action:'advance',edgeKey:key,panel,targetStep:current.step-1,title:`提前 ${panel}`,detail:`将 ${current.label||key} 从 Step ${current.step} 提前一个阶段。`,risk:'low',mutate:s=>swapStepState(s,graph,geo,key,-1)});
    const peers=m.edges.filter(x=>x.step===current.step);if(peers.length>1)rows.push({kind:'split',action:'split',edgeKey:key,panel,targetStep:current.step+1,title:`拆分 ${panel} 的同步折叠`,detail:`把 ${current.label||key} 从共享 Step ${current.step} 拆出，避免多个面同时进入冲突区域。`,risk:'low',mutate:s=>splitEdgeStepV51(s,graph,key)});
    const authored=state?.foldAuthoringV50?.edges?.find(x=>x.key===key)||current,angle=num(authored?.angle,edge.angle||90),trim=normalizeAngle(angle)*(Math.abs(angle)>35?(Math.abs(angle)-15)/Math.abs(angle):.7);
    rows.push({kind:'angle',action:'angle',edgeKey:key,panel,angle:Math.round(trim),title:`减小 ${panel} 折叠角`,detail:`试算 ${current.label||key}：${Math.round(angle)}° → ${Math.round(trim)}°。会改变最终成型几何。`,risk:'geometry',mutate:s=>setFoldEdgeAngleV50(s,graph,key,trim)});
    rows.push({kind:'direction',action:'flip',edgeKey:key,panel,angle:-angle,title:`翻转 ${panel} 折叠方向`,detail:`试算 ${current.label||key} 的折叠方向翻转。会改变最终成型几何。`,risk:'geometry',mutate:s=>flipFoldDirectionV50(s,graph,key)});
  }
  return uniqueRows(rows);
}
function affectedEventStillPresent(report,event){return collisionEventsV52(report).some(x=>x.id===eventKey(event))}
function evaluateRepair(baseState,graph,geo,event,row,baselineScore,options={}){
  let trial=row.mutate(clone(baseState));trial=ensureFoldSequenceV51(trial,graph);trial.foldSequenceV51.currentStep=0;
  const report=scanFoldSequenceV51(trial,graph,geo,options.scanOptions||{}),collisionScore=collisionScoreV52(report,options.weights||{}),penalty=riskPenalty(row.kind),score=collisionScore+penalty,removed=!affectedEventStillPresent(report,event);
  const baselineReport=options.baselineReport||scanFoldSequenceV51(baseState,graph,geo,options.scanOptions||{}),baselinePen=baselineReport.penetrations?.length||0,baselineOverlap=baselineReport.overlaps?.length||0,penetrations=report.penetrations?.length||0,overlaps=report.overlaps?.length||0;
  return{schema:V53_REPAIR_SCHEMA,version:V53_REPAIR_VERSION,id:`${eventKey(event)}:${row.kind}:${row.edgeKey}:${row.action}`,eventId:eventKey(event),kind:row.kind,action:row.action,title:row.title,detail:row.detail,risk:row.risk,edgeKey:row.edgeKey,panel:row.panel,targetStep:row.targetStep??null,angle:row.angle??null,state:trial,report,collisionScore,score,penalty,removedTargetEvent:removed,penetrations,overlaps,deltaPenetrations:penetrations-baselinePen,deltaOverlaps:overlaps-baselineOverlap,improvement:baselineScore-score,improved:score<baselineScore};
}

export function buildCollisionRepairsV53(state={},graph={},geo={},report={},eventId=null,options={}){
  const base=ensureFoldSequenceV51(state,graph),events=collisionEventsV52(report),event=events.find(x=>x.id===eventId)||events[0]||null;if(!event)return{schema:V53_REPAIR_SCHEMA,version:V53_REPAIR_VERSION,event:null,baseline:null,repairs:[],evaluated:0};
  const baselineScore=collisionScoreV52(report,options.weights||{}),raw=buildRawRepairs(base,graph,geo,event),repairs=raw.map(row=>evaluateRepair(base,graph,geo,event,row,baselineScore,{...options,baselineReport:report})).sort((a,b)=>Number(b.removedTargetEvent)-Number(a.removedTargetEvent)||a.penetrations-b.penetrations||a.score-b.score||Number(a.risk==='geometry')-Number(b.risk==='geometry'));
  repairs.forEach((repair,index)=>repair.rank=index+1);
  const location=locateCollisionV52(report,event.id,buildFoldSequenceModelV51(base,graph,geo).stepCount);
  return{schema:V53_REPAIR_SCHEMA,version:V53_REPAIR_VERSION,event,location,baseline:{score:baselineScore,collisionScore:baselineScore,penetrations:report.penetrations?.length||0,overlaps:report.overlaps?.length||0,report},repairs:repairs.slice(0,Math.max(1,Math.min(10,Math.round(num(options.limit,6))))),evaluated:repairs.length};
}

export function previewRepairV53(assistant={},repairId=null){const repair=(assistant.repairs||[]).find(x=>x.id===repairId)||assistant.repairs?.[0]||null;return repair?{schema:'boxstudio-v53-repair-preview',version:1,event:assistant.event,baseline:assistant.baseline,repair,changed:true}:null}
export function applyRepairV53(state={},graph={},repair=null){if(!repair?.state)return ensureFoldSequenceV51(state,graph);const next=ensureFoldSequenceV51(clone(repair.state),graph);next.foldSequenceV51.currentStep=0;next.foldSequenceV51.lastSource='v53-repair-apply';if(next.foldAuthoringV50)next.foldAuthoringV50.lastSource='v53-repair-apply';return next}

export function collisionRepairAcceptanceV53(state={},graph={},geo={},report={}){
  const assistant=buildCollisionRepairsV53(state,graph,geo,report,null,{limit:6}),issues=[];
  if(assistant.event&&!assistant.repairs.length)issues.push({severity:'error',code:'V53_REPAIR_EMPTY',detail:'A collision event must produce at least one repair candidate.'});
  for(const repair of assistant.repairs){if(!Number.isFinite(repair.score)||repair.score<0)issues.push({severity:'error',code:'V53_SCORE_INVALID',entityId:repair.id,detail:'Repair score must be finite and non-negative.'});if(repair.risk==='geometry'&&repair.penalty<=0)issues.push({severity:'error',code:'V53_GEOMETRY_RISK_UNPENALIZED',entityId:repair.id,detail:'Geometry-changing repairs require an explicit ranking penalty.'});if(!repair.state?.foldSequenceV51)issues.push({severity:'error',code:'V53_STATE_MISSING',entityId:repair.id,detail:'Repair candidate must carry an isolated trial state.'})}
  const errors=issues.filter(x=>x.severity==='error');return{schema:'boxstudio-v53-collision-repair-acceptance',version:1,ok:errors.length===0,issues,errors,assistant,summary:{event:assistant.event?.id||null,repairs:assistant.repairs.length,evaluated:assistant.evaluated,improved:assistant.repairs.filter(x=>x.improved).length,removedTarget:assistant.repairs.filter(x=>x.removedTargetEvent).length}};
}
