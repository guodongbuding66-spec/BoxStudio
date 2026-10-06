import { buildReviewModelV35, ensureReviewStateV35, selectReviewPanelV35, setReviewFoldProgressV35 } from './threeReviewV35.js';

export const V49_LINKED_SCHEMA='boxstudio-v49-linked-workspace';
export const V49_PRODUCT_VERSION='V0.49';
export const V49_FOLD_PRESETS=Object.freeze([
  {id:'flat',label:'展开',progress:0},
  {id:'quarter',label:'25%',progress:25},
  {id:'half',label:'半折',progress:50},
  {id:'three-quarter',label:'75%',progress:75},
  {id:'closed',label:'成型',progress:100},
]);

const clone=value=>structuredClone(value);
const num=(value,fallback=0)=>{const n=Number(value);return Number.isFinite(n)?n:fallback};
const panelIdForNode=node=>node?.artPanel||node?.id||null;
function panelBounds(panel={}){
  if(Array.isArray(panel.points)&&panel.points.length>=3){const xs=panel.points.map(p=>num(p?.[0])),ys=panel.points.map(p=>num(p?.[1]));const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);return{x:minX,y:minY,w:maxX-minX,h:maxY-minY}}
  return{x:num(panel.x),y:num(panel.y),w:Math.max(0,num(panel.w)),h:Math.max(0,num(panel.h))};
}

export function ensureLinkedWorkspaceV49(state={}){
  let next=ensureReviewStateV35(clone(state));
  const model=buildReviewModelV35(next),ids=(model.graph.nodes||[]).map(panelIdForNode).filter(Boolean),old=next.linkedV49||{};
  const selected=ids.includes(next.reviewV35?.selectedPanelId)?next.reviewV35.selectedPanelId:(ids.includes(old.selectedPanelId)?old.selectedPanelId:(ids[0]||null));
  if(selected&&selected!==next.reviewV35?.selectedPanelId)next=selectReviewPanelV35(next,selected,{source:'v49-init'});
  next.linkedV49={schema:V49_LINKED_SCHEMA,version:1,selectedPanelId:selected,lastSelectionSource:old.lastSelectionSource||next.reviewV35?.lastSelectionSource||'init',syncEnabled:old.syncEnabled!==false,lastFoldProgress:Math.max(0,Math.min(100,num(next.foldProgress,100)))};
  return next;
}

export function selectLinkedPanelV49(state,panelId,{source='2d'}={}){
  let next=ensureLinkedWorkspaceV49(state),before=next.reviewV35?.selectedPanelId;
  next=selectReviewPanelV35(next,panelId,{source});
  next=ensureLinkedWorkspaceV49(next);
  next.linkedV49.selectedPanelId=next.reviewV35?.selectedPanelId||before||null;
  next.linkedV49.lastSelectionSource=source;
  return next;
}

export function setLinkedFoldProgressV49(state,value){
  let next=setReviewFoldProgressV35(ensureLinkedWorkspaceV49(state),value);next=ensureLinkedWorkspaceV49(next);next.linkedV49.lastFoldProgress=next.foldProgress;return next;
}

export function buildLinkedWorkspaceModelV49(state={}){
  const next=ensureLinkedWorkspaceV49(state),review=buildReviewModelV35(next),edges=review.graph.edges||[],elements=next.elements||[],records=[];
  for(const node of review.graph.nodes||[]){
    const panelId=panelIdForNode(node),panel=review.geo.panelMap?.[node.id]||review.geo.panelMap?.[panelId];if(!panel)continue;
    const incoming=edges.filter(e=>e.to===node.id),outgoing=edges.filter(e=>e.from===node.id),bounds=panelBounds(panel);
    records.push({nodeId:node.id,panelId,label:node.label||panel.label||panelId,role:panel.role||panel.kind||node.kind||'panel',kind:panel.kind||node.kind||'panel',bounds,selected:panelId===next.linkedV49.selectedPanelId,artworkCount:elements.filter(el=>el.panelId===panelId&&!el.hidden).length,incoming:incoming.map(e=>({from:e.from,angle:num(e.angle),hasHinge:Boolean(e.hinge)})),outgoing:outgoing.map(e=>({to:e.to,angle:num(e.angle),hasHinge:Boolean(e.hinge)})),hinges:incoming.length+outgoing.length});
  }
  const selected=records.find(r=>r.selected)||records[0]||null;
  return{schema:V49_LINKED_SCHEMA,version:1,state:next,review,records,selected,foldProgress:next.foldProgress,stats:{panels:records.length,semanticPanels:(review.geo.panels||[]).length,hinges:edges.length,artwork:records.reduce((sum,r)=>sum+r.artworkCount,0)}};
}

export function linkedWorkspaceAcceptanceV49(state={}){
  const model=buildLinkedWorkspaceModelV49(state),issues=[],graphIds=(model.review.graph.nodes||[]).map(panelIdForNode),recordIds=model.records.map(r=>r.panelId),semanticIds=(model.review.geo.panels||[]).map(p=>p.id),unique=new Set(recordIds),graphSet=new Set(graphIds),recordSet=new Set(recordIds);
  if(model.records.length!==graphIds.length)issues.push({severity:'error',code:'V49_PANEL_MAPPING_DRIFT',detail:`3D graph has ${graphIds.length} panels but linked workspace mapped ${model.records.length}.`});
  if(unique.size!==recordIds.length)issues.push({severity:'error',code:'V49_DUPLICATE_PANEL_ID',detail:'Linked workspace contains duplicate panel identities.'});
  for(const id of graphIds)if(!recordSet.has(id))issues.push({severity:'error',code:'V49_PANEL_UNMAPPED',entityId:id,detail:`3D panel ${id} has no linked 2D panel.`});
  for(const id of semanticIds){if(!graphSet.has(id))issues.push({severity:'error',code:'V49_SEMANTIC_PANEL_MISSING_3D',entityId:id,detail:`Semantic 2D panel ${id} is missing from the 3D FoldGraph.`});if(!recordSet.has(id))issues.push({severity:'error',code:'V49_SEMANTIC_PANEL_MISSING_LINK',entityId:id,detail:`Semantic 2D panel ${id} is missing from the linked workspace.`})}
  for(const id of graphIds)if(semanticIds.length&&!semanticIds.includes(id))issues.push({severity:'error',code:'V49_3D_PANEL_NOT_SEMANTIC',entityId:id,detail:`3D panel ${id} does not correspond to a current semantic 2D panel.`});
  const selected=model.state.linkedV49?.selectedPanelId;
  if(selected&&!recordSet.has(selected))issues.push({severity:'error',code:'V49_SELECTION_ORPHAN',entityId:selected,detail:'Selected panel is not present in the linked 2D/3D panel set.'});
  if(selected!==model.state.reviewV35?.selectedPanelId)issues.push({severity:'error',code:'V49_SELECTION_DESYNC',detail:'V0.49 selection and V0.35 review selection are not synchronized.'});
  if(num(model.foldProgress)<0||num(model.foldProgress)>100)issues.push({severity:'error',code:'V49_FOLD_RANGE',detail:'Fold progress must stay between 0 and 100.'});
  if((model.review.graph.edges||[]).some(e=>!e.hinge))issues.push({severity:'error',code:'V49_HINGE_REQUIRED',detail:'All linked fold edges must have physical hinge geometry.'});
  if((model.review.graph.unreached||[]).length)issues.push({severity:'error',code:'V49_UNREACHED_3D_PANEL',detail:`Fold traversal cannot reach: ${model.review.graph.unreached.join(', ')}.`});
  const errors=issues.filter(x=>x.severity==='error');
  return{schema:'boxstudio-v49-linked-acceptance',version:1,ok:errors.length===0,issues,errors,model,summary:{panels:model.stats.panels,semanticPanels:model.stats.semanticPanels,hinges:model.stats.hinges,artwork:model.stats.artwork,selected:selected||null,foldProgress:model.foldProgress}};
}

export function cycleLinkedPanelV49(state,direction=1){
  const model=buildLinkedWorkspaceModelV49(state),ids=model.records.map(r=>r.panelId);if(!ids.length)return model.state;const current=Math.max(0,ids.indexOf(model.state.linkedV49.selectedPanelId)),next=(current+(direction<0?-1:1)+ids.length)%ids.length;return selectLinkedPanelV49(model.state,ids[next],{source:'navigator'});
}
