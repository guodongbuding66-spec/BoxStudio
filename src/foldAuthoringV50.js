export const V50_FOLD_SCHEMA='boxstudio-v50-fold-authoring';
export const V50_PRODUCT_VERSION='V0.50';
export const V50_FOLD_VERSION=1;

const clone=value=>structuredClone(value);
const num=(value,fallback=0)=>{const n=Number(value);return Number.isFinite(n)?n:fallback};
const clamp=(value,min,max)=>Math.min(max,Math.max(min,num(value,min)));
export const edgeKeyV50=edge=>`${edge?.from||''}->${edge?.to||''}`;

function normalizedEdges(graph,old=[]){
  const oldMap=new Map((old||[]).map(item=>[item.key,item]));
  const seeded=(graph?.edges||[]).map((edge,index)=>{const key=edgeKeyV50(edge),prev=oldMap.get(key)||{};return{key,from:edge.from,to:edge.to,label:edge.label||key,angle:clamp(prev.angle??edge.angle??90,-180,180),order:Math.max(1,Math.round(num(prev.order,index+1))),enabled:prev.enabled!==false,hinge:Boolean(edge.hinge),graphIndex:index}});
  const ordered=[...seeded].sort((a,b)=>a.order-b.order||a.graphIndex-b.graphIndex);
  ordered.forEach((item,index)=>item.order=index+1);
  const byKey=new Map(ordered.map(item=>[item.key,item.order]));
  return seeded.map(item=>({...item,order:byKey.get(item.key)}));
}

function firstEdgeForPanel(edges,panelId){return edges.find(edge=>edge.from===panelId||edge.to===panelId)?.key||edges[0]?.key||null}

export function ensureFoldAuthoringV50(state={},graph={}){
  const next=clone(state),old=next.foldAuthoringV50||{},edges=normalizedEdges(graph,old.edges||[]),keys=new Set(edges.map(edge=>edge.key)),panelId=next.linkedV49?.selectedPanelId||next.reviewV35?.selectedPanelId||null;
  const selectedEdgeKey=keys.has(old.selectedEdgeKey)?old.selectedEdgeKey:firstEdgeForPanel(edges,panelId);
  next.foldAuthoringV50={schema:V50_FOLD_SCHEMA,version:V50_FOLD_VERSION,selectedEdgeKey,edges,timeline:clamp(old.timeline??100,0,100),explode:clamp(old.explode??0,0,100),dimensionsVisible:old.dimensionsVisible!==false,sequenceEnabled:Boolean(old.sequenceEnabled),lastSource:old.lastSource||'init'};
  return next;
}

export function selectFoldEdgeV50(state,graph,key,{source='edge-list'}={}){const next=ensureFoldAuthoringV50(state,graph);if(next.foldAuthoringV50.edges.some(edge=>edge.key===key)){next.foldAuthoringV50.selectedEdgeKey=key;next.foldAuthoringV50.lastSource=source}return next}

export function setFoldEdgeAngleV50(state,graph,key,angle){const next=ensureFoldAuthoringV50(state,graph),edge=next.foldAuthoringV50.edges.find(item=>item.key===key);if(edge)edge.angle=clamp(angle,-180,180);return next}
export function flipFoldDirectionV50(state,graph,key){const next=ensureFoldAuthoringV50(state,graph),edge=next.foldAuthoringV50.edges.find(item=>item.key===key);if(edge)edge.angle=Math.abs(edge.angle)<.001?-90:-edge.angle;return next}

export function moveFoldEdgeV50(state,graph,key,delta=1){
  const next=ensureFoldAuthoringV50(state,graph),ordered=[...next.foldAuthoringV50.edges].sort((a,b)=>a.order-b.order),index=ordered.findIndex(item=>item.key===key);if(index<0)return next;
  const target=Math.max(0,Math.min(ordered.length-1,index+(delta<0?-1:1)));if(target===index)return next;
  const [item]=ordered.splice(index,1);ordered.splice(target,0,item);ordered.forEach((edge,i)=>edge.order=i+1);const orderMap=new Map(ordered.map(edge=>[edge.key,edge.order]));next.foldAuthoringV50.edges.forEach(edge=>edge.order=orderMap.get(edge.key));return next;
}

export function setFoldTimelineV50(state,graph,value,{enableSequence=true}={}){const next=ensureFoldAuthoringV50(state,graph);next.foldAuthoringV50.timeline=clamp(value,0,100);if(enableSequence)next.foldAuthoringV50.sequenceEnabled=true;next.foldAuthoringV50.lastSource='timeline';return next}
export function setSequenceEnabledV50(state,graph,enabled){const next=ensureFoldAuthoringV50(state,graph);next.foldAuthoringV50.sequenceEnabled=Boolean(enabled);next.foldAuthoringV50.lastSource='sequence-toggle';return next}
export function setExplodeV50(state,graph,value){const next=ensureFoldAuthoringV50(state,graph);next.foldAuthoringV50.explode=clamp(value,0,100);next.foldAuthoringV50.lastSource='explode';return next}
export function setDimensionsVisibleV50(state,graph,visible){const next=ensureFoldAuthoringV50(state,graph);next.foldAuthoringV50.dimensionsVisible=Boolean(visible);next.foldAuthoringV50.lastSource='dimensions';return next}

function panelBounds(panel={}){if(Array.isArray(panel.points)&&panel.points.length>=3){const xs=panel.points.map(p=>num(p?.[0])),ys=panel.points.map(p=>num(p?.[1]));const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);return{x:minX,y:minY,w:maxX-minX,h:maxY-minY}}return{x:num(panel.x),y:num(panel.y),w:Math.max(0,num(panel.w)),h:Math.max(0,num(panel.h))}}
function hingeLength(hinge){return hinge?Math.hypot(num(hinge.x2)-num(hinge.x1),num(hinge.y2)-num(hinge.y1)):0}

export function buildFoldAuthoringModelV50(state={},graph={},geo={}){
  const next=ensureFoldAuthoringV50(state,graph),authoring=next.foldAuthoringV50,ordered=[...authoring.edges].sort((a,b)=>a.order-b.order),count=Math.max(1,ordered.length),cursor=authoring.timeline/100*count,graphByKey=new Map((graph.edges||[]).map(edge=>[edgeKeyV50(edge),edge]));
  const edges=ordered.map((edge,index)=>{const graphEdge=graphByKey.get(edge.key),localProgress=authoring.sequenceEnabled?clamp((cursor-index)*100,0,100):null;return{...edge,localProgress,hingeLength:hingeLength(graphEdge?.hinge),fallback:Boolean(graphEdge?.hinge?.fallback)}});
  const selectedEdge=edges.find(edge=>edge.key===authoring.selectedEdgeKey)||edges[0]||null,panelId=next.linkedV49?.selectedPanelId||next.reviewV35?.selectedPanelId||null,panel=geo?.panelMap?.[panelId]||null;
  return{schema:V50_FOLD_SCHEMA,version:V50_FOLD_VERSION,state:next,edges,selectedEdge,panelId,panelBounds:panel?panelBounds(panel):null,sequenceEnabled:authoring.sequenceEnabled,timeline:authoring.timeline,explode:authoring.explode,dimensionsVisible:authoring.dimensionsVisible,stats:{edges:edges.length,completed:edges.filter(edge=>edge.localProgress===100).length,partial:edges.filter(edge=>edge.localProgress>0&&edge.localProgress<100).length}};
}

export function rendererAuthoringV50(model){return{edgeAngles:Object.fromEntries((model.edges||[]).map(edge=>[edge.key,edge.angle])),edgeProgress:model.sequenceEnabled?Object.fromEntries((model.edges||[]).map(edge=>[edge.key,edge.localProgress??0])):{},explode:clamp(model.explode,0,100)/100,dimensionsVisible:model.dimensionsVisible!==false,selectedEdgeKey:model.selectedEdge?.key||null}}

export function foldAuthoringAcceptanceV50(state={},graph={},geo={}){
  const model=buildFoldAuthoringModelV50(state,graph,geo),issues=[],keys=new Set((graph.edges||[]).map(edgeKeyV50)),orders=model.edges.map(edge=>edge.order),orderSet=new Set(orders);
  if(model.edges.length!==(graph.edges||[]).length)issues.push({severity:'error',code:'V50_EDGE_COUNT_DRIFT',detail:'Fold authoring edge count does not match FoldGraph.'});
  for(const edge of model.edges){if(!keys.has(edge.key))issues.push({severity:'error',code:'V50_EDGE_ORPHAN',entityId:edge.key,detail:'Fold authoring references an edge that is not in FoldGraph.'});if(!Number.isFinite(edge.angle)||edge.angle<-180||edge.angle>180)issues.push({severity:'error',code:'V50_ANGLE_RANGE',entityId:edge.key,detail:'Fold angle must be within ±180°.'});if(!edge.hinge)issues.push({severity:'error',code:'V50_HINGE_REQUIRED',entityId:edge.key,detail:'Editable folds require physical hinge geometry.'})}
  if(orderSet.size!==orders.length||[...orders].sort((a,b)=>a-b).some((value,index)=>value!==index+1))issues.push({severity:'error',code:'V50_ORDER_INVALID',detail:'Fold sequence order must be unique and contiguous.'});
  if(model.selectedEdge&&!keys.has(model.selectedEdge.key))issues.push({severity:'error',code:'V50_SELECTION_ORPHAN',detail:'Selected fold edge is not present in FoldGraph.'});
  if(model.timeline<0||model.timeline>100)issues.push({severity:'error',code:'V50_TIMELINE_RANGE',detail:'Timeline must stay between 0 and 100.'});
  if(model.explode<0||model.explode>100)issues.push({severity:'error',code:'V50_EXPLODE_RANGE',detail:'Explode amount must stay between 0 and 100.'});
  const errors=issues.filter(issue=>issue.severity==='error');return{schema:'boxstudio-v50-fold-authoring-acceptance',version:1,ok:errors.length===0,issues,errors,model,summary:{edges:model.stats.edges,timeline:model.timeline,explode:model.explode,sequenceEnabled:model.sequenceEnabled,selectedEdge:model.selectedEdge?.key||null}};
}
