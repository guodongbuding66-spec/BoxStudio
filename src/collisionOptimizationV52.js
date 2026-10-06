import { ensureFoldSequenceV51, buildFoldSequenceModelV51, scanFoldSequenceV51 } from './foldSequenceV51.js';
import { setFoldTimelineV50, setSequenceEnabledV50 } from './foldAuthoringV50.js';

export const V52_OPT_SCHEMA='boxstudio-v52-collision-optimization';
export const V52_PRODUCT_VERSION='V0.52';
export const V52_OPT_VERSION=1;

const clone=v=>structuredClone(v);
const num=(v,d=0)=>{const n=Number(v);return Number.isFinite(n)?n:d};
const clamp=(v,min,max)=>Math.min(max,Math.max(min,num(v,min)));
const hitKey=hit=>`${hit?.type||'hit'}:${[hit?.a||'',hit?.b||''].sort().join('|')}`;

export function collisionScoreV52(report={},weights={}){
  const penetrationWeight=Math.max(1,num(weights.penetration,1_000_000));
  const overlapWeight=Math.max(0,num(weights.overlap,1_000));
  const durationWeight=Math.max(0,num(weights.duration,1));
  const penetrations=report?.penetrations||[],overlaps=report?.overlaps||[];
  const duration=[...penetrations,...overlaps].reduce((sum,hit)=>sum+Math.max(0,num(hit.lastTimeline)-num(hit.firstTimeline)),0);
  return penetrations.length*penetrationWeight+overlaps.length*overlapWeight+duration*durationWeight;
}

export function collisionEventsV52(report={}){
  const all=[...(report?.penetrations||[]),...(report?.overlaps||[])];
  return all.map((hit,index)=>({id:hitKey(hit),index,type:hit.type,a:hit.a,b:hit.b,firstTimeline:clamp(hit.firstTimeline,0,100),lastTimeline:clamp(hit.lastTimeline,0,100),occurrences:Math.max(1,Math.round(num(hit.occurrences,1)))})).sort((a,b)=>a.firstTimeline-b.firstTimeline||a.type.localeCompare(b.type)||a.id.localeCompare(b.id));
}

export function locateCollisionV52(report={},eventId=null,stepCount=0){
  const events=collisionEventsV52(report),event=events.find(x=>x.id===eventId)||events[0]||null;
  if(!event)return null;
  const count=Math.max(0,Math.round(num(stepCount,0))),timeline=event.firstTimeline,raw=count?timeline/100*count:0;
  const completed=Math.min(count,Math.max(0,Math.floor(raw+1e-9))),activeStep=count?Math.min(count,Math.max(1,Math.floor(raw)+1)):0;
  return{...event,timeline,completedStep:completed,activeStep,withinStep:count?clamp(raw-Math.floor(raw),0,1):0,panels:[event.a,event.b]};
}

export function stateAtTimelineV52(state={},graph={},geo={},timeline=0){
  let next=ensureFoldSequenceV51(state,graph),model=buildFoldSequenceModelV51(next,graph,geo),t=clamp(timeline,0,100);
  next=setSequenceEnabledV50(next,graph,true);
  next=setFoldTimelineV50(next,graph,t,{enableSequence:true});
  next=ensureFoldSequenceV51(next,graph);
  const completed=model.stepCount?Math.min(model.stepCount,Math.floor(t/100*model.stepCount+1e-9)):0;
  next.foldSequenceV51.currentStep=completed;
  next.foldSequenceV51.lastSource='v52-collision-jump';
  return next;
}

export function collisionHighlightV52(report={},activeEventId=null){
  const penetrationPanels=new Set(),overlapPanels=new Set();
  for(const hit of report?.penetrations||[]){penetrationPanels.add(hit.a);penetrationPanels.add(hit.b)}
  for(const hit of report?.overlaps||[]){overlapPanels.add(hit.a);overlapPanels.add(hit.b)}
  const active=collisionEventsV52(report).find(x=>x.id===activeEventId)||null;
  return{penetrationPanels:[...penetrationPanels],overlapPanels:[...overlapPanels],activePanels:active?[active.a,active.b]:[],activeEvent:active};
}

function uniqueStepOrder(model){return Array.from({length:model.stepCount},(_,i)=>i+1)}
function reorderState(state,graph,order){
  const next=ensureFoldSequenceV51(state,graph),position=new Map(order.map((oldStep,index)=>[oldStep,index+1]));
  next.foldSequenceV51.edgeSteps=next.foldSequenceV51.edgeSteps.map(row=>({...row,step:position.get(row.step)||row.step}));
  next.foldSequenceV51.currentStep=0;
  next.foldSequenceV51.lastSource='v52-optimizer';
  return ensureFoldSequenceV51(next,graph);
}
function orderKey(order){return order.join(',')}
function adjacentOrders(base=[]){const out=[];for(let i=0;i<base.length-1;i++){const next=[...base];[next[i],next[i+1]]=[next[i+1],next[i]];out.push(next)}return out}

export function evaluateSequenceOrderV52(state,graph,geo,order,{scanOptions={},weights={}}={}){
  const candidate=reorderState(state,graph,order),report=scanFoldSequenceV51(candidate,graph,geo,scanOptions),score=collisionScoreV52(report,weights);
  return{schema:V52_OPT_SCHEMA,version:V52_OPT_VERSION,order:[...order],state:candidate,report,score,penetrations:report.penetrations?.length||0,overlaps:report.overlaps?.length||0,samples:report.samples||0};
}

export function suggestSequenceV52(state={},graph={},geo={},options={}){
  const baseState=ensureFoldSequenceV51(state,graph),model=buildFoldSequenceModelV51(baseState,graph,geo),baseOrder=uniqueStepOrder(model),maxPasses=Math.max(1,Math.min(4,Math.round(num(options.maxPasses,2)))),limit=Math.max(1,Math.min(8,Math.round(num(options.limit,3)))),seen=new Map();
  const evaluate=order=>{const key=orderKey(order);if(!seen.has(key))seen.set(key,evaluateSequenceOrderV52(baseState,graph,geo,order,options));return seen.get(key)};
  const baseline=evaluate(baseOrder);let frontier=[baseOrder],best=baseline;
  for(let pass=0;pass<maxPasses;pass++){
    const next=[];for(const order of frontier)for(const candidate of adjacentOrders(order)){const result=evaluate(candidate);next.push(candidate);if(result.score<best.score)best=result}
    if(!next.length)break;
    const ranked=next.map(order=>evaluate(order)).sort((a,b)=>a.score-b.score||a.penetrations-b.penetrations||a.overlaps-b.overlaps);
    frontier=ranked.slice(0,Math.min(4,ranked.length)).map(x=>x.order);
    if(ranked[0]?.score>=best.score&&pass>0)break;
  }
  const suggestions=[...seen.values()].filter(x=>orderKey(x.order)!==orderKey(baseOrder)).sort((a,b)=>a.score-b.score||a.penetrations-b.penetrations||a.overlaps-b.overlaps).slice(0,limit).map((x,index)=>({...x,rank:index+1,improvement:baseline.score-x.score,improved:x.score<baseline.score}));
  return{schema:V52_OPT_SCHEMA,version:V52_OPT_VERSION,baseline:{order:baseline.order,score:baseline.score,penetrations:baseline.penetrations,overlaps:baseline.overlaps,samples:baseline.samples,report:baseline.report},best:{order:best.order,score:best.score,penetrations:best.penetrations,overlaps:best.overlaps,samples:best.samples,report:best.report},suggestions,evaluated:seen.size,stepCount:model.stepCount};
}

export function applySequenceSuggestionV52(state={},graph={},suggestion={}){
  if(!Array.isArray(suggestion?.order))return ensureFoldSequenceV51(state,graph);
  return reorderState(state,graph,suggestion.order);
}

export function collisionOptimizationAcceptanceV52(state={},graph={},geo={}){
  const sequence=ensureFoldSequenceV51(state,graph),model=buildFoldSequenceModelV51(sequence,graph,geo),report=scanFoldSequenceV51(sequence,graph,geo),optimizer=suggestSequenceV52(sequence,graph,geo,{limit:2,maxPasses:1}),issues=[];
  const expected=Array.from({length:model.stepCount},(_,i)=>i+1).join(',');
  if(!optimizer.baseline.order||optimizer.baseline.order.join(',')!==expected)issues.push({severity:'error',code:'V52_BASE_ORDER_INVALID',detail:'Baseline Step order is not contiguous.'});
  for(const suggestion of optimizer.suggestions){if(new Set(suggestion.order).size!==model.stepCount)issues.push({severity:'error',code:'V52_SUGGESTION_DUPLICATE_STEP',detail:'Optimizer suggestion must be a Step permutation.'});if(suggestion.score<0)issues.push({severity:'error',code:'V52_SCORE_INVALID',detail:'Collision score cannot be negative.'})}
  const highlights=collisionHighlightV52(report),events=collisionEventsV52(report);if(events.length&&highlights.penetrationPanels.length+highlights.overlapPanels.length===0)issues.push({severity:'error',code:'V52_HIGHLIGHT_EMPTY',detail:'Collision events must resolve to visible panel highlights.'});
  const errors=issues.filter(x=>x.severity==='error');return{schema:'boxstudio-v52-collision-optimization-acceptance',version:1,ok:errors.length===0,issues,errors,report,optimizer,summary:{events:events.length,penetrations:report.penetrations?.length||0,overlaps:report.overlaps?.length||0,evaluated:optimizer.evaluated,stepCount:model.stepCount}};
}
