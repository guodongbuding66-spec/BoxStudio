import { ensureFoldSequenceV51, scanFoldSequenceV51 } from './foldSequenceV51.js';
import { collisionEventsV52, collisionScoreV52 } from './collisionOptimizationV52.js';
import { buildCollisionRepairsV53 } from './collisionRepairV53.js';

export const V54_PLAN_SCHEMA='boxstudio-v54-repair-plan';
export const V54_PRODUCT_VERSION='V0.54';
export const V54_PLAN_VERSION=1;

const clone=v=>structuredClone(v);
const num=(v,d=0)=>{const n=Number(v);return Number.isFinite(n)?n:d};
const stateSig=state=>JSON.stringify({steps:(state?.foldSequenceV51?.edgeSteps||[]).map(x=>[x.key,x.step]),angles:(state?.foldAuthoringV50?.edges||[]).map(x=>[x.key,Math.round(num(x.angle)*1000)/1000])});
const reportScore=(report,weights={})=>collisionScoreV52(report,weights);
const profileDefs={
  safe:{id:'safe',label:'Safe',risk:'low',maxDepth:3,beamWidth:4,allow:new Set(['sequence','split']),riskCost:0},
  balanced:{id:'balanced',label:'Balanced',risk:'medium',maxDepth:3,beamWidth:5,allow:new Set(['sequence','split','angle']),riskCost:8_000},
  aggressive:{id:'aggressive',label:'Aggressive',risk:'high',maxDepth:4,beamWidth:6,allow:new Set(['sequence','split','angle','direction']),riskCost:18_000}
};

function metrics(report,weights={}){return{penetrations:report?.penetrations?.length||0,overlaps:report?.overlaps?.length||0,samples:report?.samples||0,collisionScore:reportScore(report,weights)}}
function severityTuple(report){return[report?.penetrations?.length||0,report?.overlaps?.length||0,reportScore(report)]}
function betterReport(a,b){const A=severityTuple(a),B=severityTuple(b);for(let i=0;i<A.length;i++){if(A[i]!==B[i])return A[i]<B[i]}return false}
function riskCount(actions=[]){return actions.filter(a=>a.risk==='geometry').length}
function planScore(report,actions,profile,weights={}){return reportScore(report,weights)+riskCount(actions)*profile.riskCost+actions.length*25}
function eventPriority(events=[]){return [...events].sort((a,b)=>Number(b.type==='penetration')-Number(a.type==='penetration')||a.firstTimeline-b.firstTimeline)[0]||null}
function compactAction(repair){return{id:repair.id,kind:repair.kind,action:repair.action,title:repair.title,detail:repair.detail,risk:repair.risk,edgeKey:repair.edgeKey,panel:repair.panel,targetStep:repair.targetStep,angle:repair.angle,removedTargetEvent:repair.removedTargetEvent}}
function dedupeNodes(nodes=[]){const map=new Map();for(const node of nodes){const key=stateSig(node.state),prev=map.get(key);if(!prev||node.planScore<prev.planScore)map.set(key,node)}return [...map.values()]}

export function searchRepairPlanV54(state={},graph={},geo={},profileId='safe',options={}){
  const profile=profileDefs[profileId]||profileDefs.safe,base=ensureFoldSequenceV51(state,graph),weights=options.weights||{},baselineReport=options.baselineReport||scanFoldSequenceV51(base,graph,geo,options.scanOptions||{}),baselineMetrics=metrics(baselineReport,weights),maxDepth=Math.max(1,Math.min(5,Math.round(num(options.maxDepth,profile.maxDepth)))),beamWidth=Math.max(2,Math.min(8,Math.round(num(options.beamWidth,profile.beamWidth))));
  let frontier=[{state:base,report:baselineReport,actions:[],planScore:planScore(baselineReport,[],profile,weights)}],best=frontier[0],evaluated=1,seen=new Set([stateSig(base)]);
  for(let depth=0;depth<maxDepth;depth++){
    const expanded=[];
    for(const node of frontier){
      const events=collisionEventsV52(node.report),event=eventPriority(events);if(!event){expanded.push(node);continue}
      const assistant=buildCollisionRepairsV53(node.state,graph,geo,node.report,event.id,{limit:10,weights,scanOptions:options.scanOptions||{}});
      for(const repair of assistant.repairs||[]){
        if(!profile.allow.has(repair.kind))continue;
        const nextState=ensureFoldSequenceV51(clone(repair.state),graph),sig=stateSig(nextState);if(seen.has(sig))continue;seen.add(sig);
        const nextReport=repair.report||scanFoldSequenceV51(nextState,graph,geo,options.scanOptions||{}),actions=[...node.actions,compactAction(repair)],score=planScore(nextReport,actions,profile,weights),child={state:nextState,report:nextReport,actions,planScore:score};evaluated++;expanded.push(child);
        if(betterReport(nextReport,best.report)||(severityTuple(nextReport).join('|')===severityTuple(best.report).join('|')&&score<best.planScore))best=child;
      }
    }
    if(!expanded.length)break;
    frontier=dedupeNodes(expanded).sort((a,b)=>{const A=severityTuple(a.report),B=severityTuple(b.report);return A[0]-B[0]||A[1]-B[1]||a.planScore-b.planScore}).slice(0,beamWidth);
    if((best.report.penetrations?.length||0)===0&&(best.report.overlaps?.length||0)===0)break;
  }
  const after=metrics(best.report,weights),improvement=baselineMetrics.collisionScore-after.collisionScore,changed=stateSig(best.state)!==stateSig(base);
  return{schema:V54_PLAN_SCHEMA,version:V54_PLAN_VERSION,profile:{id:profile.id,label:profile.label,risk:profile.risk},baseline:{...baselineMetrics,report:baselineReport},after:{...after,report:best.report},state:best.state,actions:best.actions,evaluated,changed,improvement,improved:betterReport(best.report,baselineReport)||after.collisionScore<baselineMetrics.collisionScore,cleared:(after.penetrations===0&&after.overlaps===0)};
}

export function buildRepairPlansV54(state={},graph={},geo={},report=null,options={}){
  const baseline=report||scanFoldSequenceV51(ensureFoldSequenceV51(state,graph),graph,geo,options.scanOptions||{}),profiles=['safe','balanced','aggressive'],plans=profiles.map(id=>searchRepairPlanV54(state,graph,geo,id,{...options,baselineReport:baseline}));
  return{schema:V54_PLAN_SCHEMA,version:V54_PLAN_VERSION,baseline:metrics(baseline,options.weights||{}),plans,evaluated:plans.reduce((sum,p)=>sum+p.evaluated,0)};
}

export function previewRepairPlanV54(bundle={},profileId='safe'){const plan=(bundle.plans||[]).find(p=>p.profile.id===profileId)||bundle.plans?.[0]||null;return plan?{schema:'boxstudio-v54-plan-preview',version:1,profile:plan.profile,plan,state:clone(plan.state),report:clone(plan.after.report),committed:false}:null}
export function applyRepairPlanV54(state={},graph={},plan=null){if(!plan?.state)return ensureFoldSequenceV51(state,graph);const next=ensureFoldSequenceV51(clone(plan.state),graph);next.foldSequenceV51.currentStep=0;next.foldSequenceV51.lastSource='v54-repair-plan-apply';if(next.foldAuthoringV50)next.foldAuthoringV50.lastSource='v54-repair-plan-apply';return next}
export function revertRepairPlanV54(snapshot={},graph={}){const next=ensureFoldSequenceV51(clone(snapshot),graph);next.foldSequenceV51.currentStep=0;next.foldSequenceV51.lastSource='v54-repair-plan-revert';if(next.foldAuthoringV50)next.foldAuthoringV50.lastSource='v54-repair-plan-revert';return next}

export function repairPlanAcceptanceV54(state={},graph={},geo={},report=null){const bundle=buildRepairPlansV54(state,graph,geo,report,{maxDepth:2,beamWidth:3}),issues=[];
  if(bundle.plans.length!==3)issues.push({severity:'error',code:'V54_PROFILE_COUNT',detail:'Safe, Balanced and Aggressive plans are required.'});
  for(const plan of bundle.plans){if(!plan.state?.foldSequenceV51)issues.push({severity:'error',code:'V54_PLAN_STATE_MISSING',entityId:plan.profile.id,detail:'Repair plan must carry isolated state.'});if(plan.profile.id==='safe'&&plan.actions.some(a=>a.risk==='geometry'))issues.push({severity:'error',code:'V54_SAFE_GEOMETRY_MUTATION',detail:'Safe profile cannot change fold geometry.'});if(!Number.isFinite(plan.after.collisionScore))issues.push({severity:'error',code:'V54_SCORE_INVALID',entityId:plan.profile.id,detail:'Plan collision score must be finite.'})}
  const errors=issues.filter(x=>x.severity==='error');return{schema:'boxstudio-v54-repair-plan-acceptance',version:1,ok:errors.length===0,issues,errors,bundle,summary:{plans:bundle.plans.length,evaluated:bundle.evaluated,improved:bundle.plans.filter(p=>p.improved).length,cleared:bundle.plans.filter(p=>p.cleared).length}};
}
