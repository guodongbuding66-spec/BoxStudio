import { buildFoldGraph } from './foldgraph.js';
import { generateGeometry } from './geometry.js';
import { resolveMaterialV32, MATERIAL_PRESETS_V32, FLUTE_PRESETS_V32 } from './materialsV32.js';
import { ensureEditorV33, panelFocusV33, setSelectionV33, updatePrimaryElementV33 } from './editorCoreV33.js';

const clone=value=>structuredClone(value);
const num=(value,fallback=0)=>{const n=Number(value);return Number.isFinite(n)?n:fallback};
const unique=values=>Array.from(new Set(values));

export const V35_REVIEW_SCHEMA='boxstudio-v35-review';
export const V35_REVIEW_VERSION=1;

export const MATERIAL_VISUALS_V35=Object.freeze({
  'white-fiber':Object.freeze({face:'#f1efe8',edge:'#c9c2b4',fiber:'#ddd7ca',label:'White fiber'}),
  'coated-white':Object.freeze({face:'#f8f8f4',edge:'#c7c7c0',fiber:'#e7e7df',label:'Coated white'}),
  kraft:Object.freeze({face:'#c9a46c',edge:'#8d6c45',fiber:'#b98f58',label:'Kraft fiber'}),
  'grey-fiber':Object.freeze({face:'#a9aaa5',edge:'#74756f',fiber:'#92938d',label:'Grey fiber'}),
});

export function resolveMaterialVisualV35(structure={}){
  const material=resolveMaterialV32(structure),visual=MATERIAL_VISUALS_V35[material.appearance]||MATERIAL_VISUALS_V35['white-fiber'];
  return Object.freeze({
    ...material,
    ...visual,
    edgePreviewPx:Math.max(1,Math.min(8,material.thicknessMm*1.35)),
    label:`${material.name}${material.flute?` · ${material.flute} flute`:''} · ${material.thicknessMm.toFixed(2)} mm`,
  });
}

export function materialCatalogV35(){
  return MATERIAL_PRESETS_V32.map(material=>({
    ...material,
    flutes:material.category==='corrugated'?Object.values(FLUTE_PRESETS_V32).map(x=>({id:x.id,label:x.label,thicknessMm:x.thicknessMm})):[],
  }));
}

function edgeDirection(angle){if(angle>0)return'positive';if(angle<0)return'negative';return'flat'}

export function buildFoldDiagnosticsV35(graph={}){
  const nodes=new Set((graph.nodes||[]).map(node=>node.id)),parents=new Map(),children=new Map(),issues=[];
  for(const edge of graph.edges||[]){
    if(!nodes.has(edge.from)||!nodes.has(edge.to))issues.push({severity:'error',code:'EDGE_NODE_MISSING',edge:`${edge.from}->${edge.to}`,detail:'Fold edge references a missing panel.'});
    if(!children.has(edge.from))children.set(edge.from,[]);children.get(edge.from).push(edge);
    if(!parents.has(edge.to))parents.set(edge.to,[]);parents.get(edge.to).push(edge.from);
    if(!edge.hinge)issues.push({severity:'error',code:'HINGE_MISSING',edge:`${edge.from}->${edge.to}`,detail:'Fold edge has no physical hinge.'});
    else if(edge.hinge.fallback)issues.push({severity:'warning',code:'HINGE_FALLBACK',edge:`${edge.from}->${edge.to}`,detail:'Fold edge uses inferred fallback hinge geometry.'});
    const angle=num(edge.angle);if(Math.abs(angle)<.001)issues.push({severity:'warning',code:'ANGLE_ZERO',edge:`${edge.from}->${edge.to}`,detail:'Fold angle is 0°.'});
    if(Math.abs(angle)>180.001)issues.push({severity:'error',code:'ANGLE_RANGE',edge:`${edge.from}->${edge.to}`,detail:`Fold angle ${angle}° exceeds ±180°.`});
  }
  for(const [id,list] of parents)if(list.length>1)issues.push({severity:'error',code:'MULTIPLE_PARENTS',panelId:id,detail:`Panel has multiple fold parents: ${unique(list).join(', ')}.`});
  if(graph.root&&!nodes.has(graph.root))issues.push({severity:'error',code:'ROOT_MISSING',detail:`Fold root ${graph.root} is missing.`});

  const sequence=[],seen=new Set(),active=new Set();let cycle=false;
  const visit=(id,depth=0)=>{
    if(active.has(id)){cycle=true;issues.push({severity:'error',code:'CYCLE',panelId:id,detail:'Fold graph contains a cycle.'});return}
    if(seen.has(id))return;seen.add(id);active.add(id);
    const outgoing=children.get(id)||[];
    for(const edge of outgoing){
      sequence.push({step:sequence.length+1,depth,from:edge.from,to:edge.to,label:edge.label||`${edge.from}/${edge.to}`,angle:num(edge.angle),direction:edgeDirection(num(edge.angle)),hinge:edge.hinge||null,fallback:Boolean(edge.hinge?.fallback)});
      visit(edge.to,depth+1);
    }
    active.delete(id);
  };
  if(graph.root)visit(graph.root,0);
  const unreached=(graph.nodes||[]).map(node=>node.id).filter(id=>!seen.has(id));
  if(unreached.length)issues.push({severity:'warning',code:'UNREACHED',detail:`Panels outside fold traversal: ${unreached.join(', ')}.`,panels:unreached});
  return{
    ok:!issues.some(issue=>issue.severity==='error'),
    root:graph.root||null,
    sequence,
    issues,
    cycle,
    unreached,
    positive:sequence.filter(item=>item.direction==='positive').length,
    negative:sequence.filter(item=>item.direction==='negative').length,
    fallbackHinges:sequence.filter(item=>item.fallback).length,
  };
}

export function ensureReviewStateV35(state={}){
  let next=ensureEditorV33(clone(state));const geo=generateGeometry(next.structure||{}),graph=buildFoldGraph(geo),valid=new Set((graph.nodes||[]).map(node=>node.artPanel||node.id)),old=next.reviewV35||{};
  const first=(graph.nodes||[]).find(node=>valid.has(node.artPanel||node.id)),selected=valid.has(old.selectedPanelId)?old.selectedPanelId:(valid.has(next.editorV33?.focusPanelId)?next.editorV33.focusPanelId:(first?.artPanel||first?.id||null));
  next.reviewV35={schema:V35_REVIEW_SCHEMA,version:V35_REVIEW_VERSION,selectedPanelId:selected,selectedElementId:old.selectedElementId||null,splitRatio:Math.max(.28,Math.min(.72,num(old.splitRatio,.5))),syncEnabled:old.syncEnabled!==false,lastSelectionSource:old.lastSelectionSource||'init',liveRevision:Math.max(0,Math.floor(num(old.liveRevision,0)))};
  return next;
}

export function selectReviewPanelV35(state,panelId,{source='2d'}={}){
  let next=ensureReviewStateV35(state),geo=generateGeometry(next.structure||{});if(!geo.panelMap?.[panelId])return next;
  next.reviewV35.selectedPanelId=panelId;next.reviewV35.lastSelectionSource=source;next.markEditorPanelId=panelId;
  const focused=panelFocusV33(next,panelId);next=focused.state;
  const panelElement=(next.elements||[]).find(element=>element.panelId===panelId&&element.id===next.reviewV35.selectedElementId);
  if(panelElement)next=setSelectionV33(next,[panelElement.id],{primary:panelElement.id});
  return next;
}

export function selectReviewElementV35(state,elementId,{source='2d'}={}){
  let next=ensureReviewStateV35(state),element=(next.elements||[]).find(item=>item.id===elementId);if(!element)return next;
  next=selectReviewPanelV35(next,element.panelId,{source});next.reviewV35.selectedElementId=elementId;next=setSelectionV33(next,[elementId],{primary:elementId});return next;
}

export function patchReviewElementV35(state,patch={}){
  let next=ensureReviewStateV35(state),id=next.reviewV35.selectedElementId||next.selectedId;if(!id)return next;
  next=setSelectionV33(next,[id],{primary:id});
  const allowed=new Set(['x','y','w','h','r','fontSize','template','barcodeValue','qrValue','bold']);const clean={};for(const [key,value] of Object.entries(patch))if(allowed.has(key))clean[key]=value;
  next=updatePrimaryElementV33(next,clean);next.reviewV35.selectedElementId=id;next.reviewV35.liveRevision++;return next;
}

export function setReviewMaterialV35(state,patch={}){
  const next=ensureReviewStateV35(state);next.structure={...(next.structure||{})};
  for(const key of ['materialId','flute','thickness'])if(patch[key]!==undefined)next.structure[key]=patch[key];
  next.reviewV35.liveRevision++;return next;
}

export function setReviewFoldProgressV35(state,value){const next=ensureReviewStateV35(state);next.foldProgress=Math.max(0,Math.min(100,num(value,100)));return next}

export function buildReviewModelV35(state={}){
  const next=ensureReviewStateV35(state),geo=generateGeometry(next.structure||{}),graph=buildFoldGraph(geo),diagnostics=buildFoldDiagnosticsV35(graph),material=resolveMaterialVisualV35(next.structure||{}),selectedPanelId=next.reviewV35.selectedPanelId;
  const selectedPanel=geo.panelMap?.[selectedPanelId]||null,panelElements=(next.elements||[]).filter(element=>element.panelId===selectedPanelId&&!element.hidden),selectedElement=panelElements.find(element=>element.id===next.reviewV35.selectedElementId)||null;
  return{state:next,geo,graph,diagnostics,material,selectedPanelId,selectedPanel,panelElements,selectedElement,stats:{panels:graph.nodes?.length||0,hinges:graph.edges?.length||0,elements:panelElements.length,liveRevision:next.reviewV35.liveRevision}};
}
