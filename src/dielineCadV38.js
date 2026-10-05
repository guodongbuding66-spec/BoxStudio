import { generateGeometry } from './geometry.js';

export const V38_DIELINE_SCHEMA='boxstudio-dieline-v38';
export const V38_LINE_TYPES=Object.freeze(['CUT','CREASE','PERF','GLUE','PANEL','BLEED','SAFE']);
const TYPE_SET=new Set(V38_LINE_TYPES);
const clone=value=>structuredClone(value);
const finite=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const round=(v,p=6)=>{const m=10**p;return Math.round(finite(v)*m)/m};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const point=(x=0,y=0)=>({x:round(x),y:round(y)});

function edgeKind(kind='CUT'){const value=String(kind||'CUT').toUpperCase();return TYPE_SET.has(value)?value:'CUT'}
function pointKey(x,y,tol=.001){const t=Math.max(1e-9,finite(tol,.001));return`${Math.round(finite(x)/t)}:${Math.round(finite(y)/t)}`}
function panelRecord(panel){
  const out={id:String(panel?.id||''),label:String(panel?.label||panel?.id||''),kind:String(panel?.kind||'panel'),role:String(panel?.role||''),parent:panel?.parent??null};
  if(Array.isArray(panel?.points)&&panel.points.length>=3)out.points=panel.points.map(p=>[finite(p[0]),finite(p[1])]);
  else Object.assign(out,{x:finite(panel?.x),y:finite(panel?.y),w:Math.max(0,finite(panel?.w)),h:Math.max(0,finite(panel?.h))});
  return out;
}

function lineArrays(geo){return[
  ['CUT',geo.cutLines||[]],['CREASE',geo.creaseLines||[]],['PERF',geo.perfLines||[]],['GLUE',geo.glueLines||[]]
]}
function curveArrays(geo){return[
  ['CUT',geo.cutCurves||[]],['CREASE',geo.creaseCurves||[]],['PERF',geo.perfCurves||[]],['GLUE',geo.glueCurves||[]]
]}

export function dielineDocumentFromGeometryV38(geo,{tolerance=.001}={}){
  if(!geo)throw new Error('V0.38 dieline document requires geometry.');
  const nodes=[],edges=[],byPoint=new Map();let nodeSeq=0,edgeSeq=0;
  const nodeId=(x,y)=>{const key=pointKey(x,y,tolerance);let id=byPoint.get(key);if(id)return id;id=`n${++nodeSeq}`;nodes.push({id,...point(x,y)});byPoint.set(key,id);return id};
  const pushEdge=(kind,raw,curve='line')=>{
    const a=nodeId(raw.x1,raw.y1),b=nodeId(raw.x2,raw.y2),edge={id:`e${++edgeSeq}`,a,b,lineType:edgeKind(kind),curve};
    if(curve==='cubic')Object.assign(edge,{c1:point(raw.c1x,raw.c1y),c2:point(raw.c2x,raw.c2y)});
    else if(curve==='arc')edge.arc={rx:Math.max(.001,Math.abs(finite(raw.rx,1))),ry:Math.max(.001,Math.abs(finite(raw.ry,1))),rotation:finite(raw.rotation),largeArc:Boolean(raw.largeArc),sweep:Boolean(raw.sweep)};
    edges.push(edge);
  };
  for(const [kind,lines] of lineArrays(geo))for(const raw of lines)pushEdge(kind,raw,'line');
  for(const [kind,curves] of curveArrays(geo))for(const raw of curves){
    if(raw.type==='C')pushEdge(kind,raw,'cubic');
    else if(raw.type==='Q'){
      const x1=finite(raw.x1),y1=finite(raw.y1),x2=finite(raw.x2),y2=finite(raw.y2),cx=finite(raw.cx),cy=finite(raw.cy);
      pushEdge(kind,{...raw,c1x:x1+2/3*(cx-x1),c1y:y1+2/3*(cy-y1),c2x:x2+2/3*(cx-x2),c2y:y2+2/3*(cy-y2)},'cubic');
    }else if(raw.type==='A')pushEdge(kind,raw,'arc');
    else pushEdge(kind,raw,'line');
  }
  const panels=(geo.panels||[...(geo.bodyPanels||[]),...(geo.flapPanels||[])]).filter(Boolean).map(panelRecord);
  const doc={schema:V38_DIELINE_SCHEMA,version:1,width:Math.max(1,finite(geo.width,100)),height:Math.max(1,finite(geo.height,100)),template:String(geo.template||geo.structure?.template||'unknown'),nodes,edges,panels,zones:{bleed:[],safe:[],glue:[]},settings:{bleedMm:Math.max(0,finite(geo.structure?.bleed,3)),safeMm:Math.max(0,finite(geo.structure?.safe,5))},metadata:{sourceValidationState:geo.validationState||null,documentTitle:geo.documentTitle||'',engineeringNotes:clone(geo.engineeringNotes||[])}};
  return buildProductionZonesV38(doc,{bleed:doc.settings.bleedMm,safe:doc.settings.safeMm});
}

export function dielineDocumentFromStateV38(state,options={}){return dielineDocumentFromGeometryV38(generateGeometry(state?.structure||{}),options)}
export function cloneDielineDocumentV38(doc){return clone(doc)}
export function nodeByIdV38(doc,id){return(doc?.nodes||[]).find(n=>n.id===id)||null}
export function edgeByIdV38(doc,id){return(doc?.edges||[]).find(e=>e.id===id)||null}

export function moveNodeV38(doc,nodeId,{x,y}={}){
  const next=clone(doc),node=nodeByIdV38(next,nodeId);if(!node)throw new Error(`Dieline node not found: ${nodeId}`);node.x=round(x??node.x);node.y=round(y??node.y);return next;
}
export function setEdgeLineTypeV38(doc,edgeId,lineType){
  const value=String(lineType||'').toUpperCase();if(!TYPE_SET.has(value))throw new Error(`Unsupported dieline line type: ${lineType}`);
  const next=clone(doc),edge=edgeByIdV38(next,edgeId);if(!edge)throw new Error(`Dieline edge not found: ${edgeId}`);edge.lineType=value;return next;
}
export function setEdgeCurveV38(doc,edgeId,curve,params={}){
  const next=clone(doc),edge=edgeByIdV38(next,edgeId);if(!edge)throw new Error(`Dieline edge not found: ${edgeId}`);const a=nodeByIdV38(next,edge.a),b=nodeByIdV38(next,edge.b);if(!a||!b)throw new Error('Dieline edge has missing node.');
  if(curve==='line'){edge.curve='line';delete edge.c1;delete edge.c2;delete edge.arc;}
  else if(curve==='cubic'){edge.curve='cubic';edge.c1=point(params.c1?.x??(a.x+(b.x-a.x)/3),params.c1?.y??(a.y+(b.y-a.y)/3));edge.c2=point(params.c2?.x??(a.x+2*(b.x-a.x)/3),params.c2?.y??(a.y+2*(b.y-a.y)/3));delete edge.arc;}
  else if(curve==='arc'){edge.curve='arc';edge.arc={rx:Math.max(.001,Math.abs(finite(params.rx,Math.abs(b.x-a.x)/2||1))),ry:Math.max(.001,Math.abs(finite(params.ry,Math.abs(b.y-a.y)/2||1))),rotation:finite(params.rotation),largeArc:Boolean(params.largeArc),sweep:Boolean(params.sweep)};delete edge.c1;delete edge.c2;}
  else throw new Error(`Unsupported dieline curve: ${curve}`);
  return next;
}
export function setCubicHandlesV38(doc,edgeId,{c1,c2}={}){
  const next=clone(doc),edge=edgeByIdV38(next,edgeId);if(!edge)throw new Error(`Dieline edge not found: ${edgeId}`);if(edge.curve!=='cubic')throw new Error('Cubic handles require a cubic edge.');if(c1)edge.c1=point(c1.x,c1.y);if(c2)edge.c2=point(c2.x,c2.y);return next;
}

function splitLine(a,b,t){return point(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t)}
function splitCubic(a,c1,c2,b,t){
  const p01=splitLine(a,c1,t),p12=splitLine(c1,c2,t),p23=splitLine(c2,b,t),p012=splitLine(p01,p12,t),p123=splitLine(p12,p23,t),p=splitLine(p012,p123,t);
  return{p,left:{c1:p01,c2:p012},right:{c1:p123,c2:p23}};
}
export function insertNodeOnEdgeV38(doc,edgeId,t=.5){
  const ratio=Math.min(.999999,Math.max(.000001,finite(t,.5))),next=clone(doc),index=next.edges.findIndex(e=>e.id===edgeId);if(index<0)throw new Error(`Dieline edge not found: ${edgeId}`);const edge=next.edges[index],a=nodeByIdV38(next,edge.a),b=nodeByIdV38(next,edge.b);if(!a||!b)throw new Error('Dieline edge has missing node.');
  if(edge.curve==='arc')throw Object.assign(new Error('Native arc splitting is not implemented; convert the arc to cubic/line before inserting a node.'),{code:'ARC_SPLIT_UNSUPPORTED'});
  const split=edge.curve==='cubic'?splitCubic(a,edge.c1,edge.c2,b,ratio):{p:splitLine(a,b,ratio)};let n=1;while(next.nodes.some(x=>x.id===`n${n}`))n++;const mid={id:`n${n}`,...split.p};next.nodes.push(mid);
  let e=1;while(next.edges.some(x=>x.id===`e${e}`))e++;const left={...edge,id:`e${e++}`,b:mid.id},right={...edge,id:`e${e}`,a:mid.id};if(edge.curve==='cubic'){left.c1=split.left.c1;left.c2=split.left.c2;right.c1=split.right.c1;right.c2=split.right.c2}next.edges.splice(index,1,left,right);return{doc:next,nodeId:mid.id,edgeIds:[left.id,right.id]};
}
export function deleteNodeV38(doc,nodeId){
  const next=clone(doc),incident=next.edges.filter(e=>e.a===nodeId||e.b===nodeId);if(incident.length!==2)throw Object.assign(new Error(`Node ${nodeId} must have exactly two incident edges to delete safely.`),{code:'NODE_DELETE_DEGREE'});const [a,b]=incident;if(a.curve!=='line'||b.curve!=='line')throw Object.assign(new Error('Delete-node merge is fail-closed for curved edges; convert them to line first.'),{code:'CURVE_MERGE_UNSUPPORTED'});if(a.lineType!==b.lineType)throw Object.assign(new Error('Delete-node merge requires matching line types.'),{code:'LINE_TYPE_MISMATCH'});
  const otherA=a.a===nodeId?a.b:a.a,otherB=b.a===nodeId?b.b:b.a;if(otherA===otherB)throw new Error('Delete-node merge would create a degenerate edge.');
  const drop=new Set([a.id,b.id]);next.edges=next.edges.filter(e=>!drop.has(e.id));let e=1;while(next.edges.some(x=>x.id===`e${e}`))e++;next.edges.push({id:`e${e}`,a:otherA,b:otherB,lineType:a.lineType,curve:'line'});next.nodes=next.nodes.filter(n=>n.id!==nodeId);return next;
}

function rectZone(panel,amount,mode){
  if(!Number.isFinite(panel.x)||!Number.isFinite(panel.y)||!Number.isFinite(panel.w)||!Number.isFinite(panel.h))return null;
  if(mode==='bleed')return{id:`bleed-${panel.id}`,panelId:panel.id,x:panel.x-amount,y:panel.y-amount,w:panel.w+2*amount,h:panel.h+2*amount};
  const inset=Math.min(amount,panel.w/2,panel.h/2);return{id:`safe-${panel.id}`,panelId:panel.id,x:panel.x+inset,y:panel.y+inset,w:Math.max(0,panel.w-2*inset),h:Math.max(0,panel.h-2*inset)};
}
export function buildProductionZonesV38(doc,{bleed=3,safe=5}={}){
  const next=clone(doc),b=Math.max(0,finite(bleed,3)),s=Math.max(0,finite(safe,5));next.settings={...(next.settings||{}),bleedMm:b,safeMm:s};next.zones={bleed:[],safe:[],glue:[]};
  for(const panel of next.panels||[]){const bz=rectZone(panel,b,'bleed'),sz=rectZone(panel,s,'safe');if(bz)next.zones.bleed.push(bz);if(sz)next.zones.safe.push(sz);if(panel.kind==='glue'||panel.role==='glue')next.zones.glue.push({id:`glue-${panel.id}`,panelId:panel.id,x:panel.x,y:panel.y,w:panel.w,h:panel.h})}
  return next;
}

function orient(a,b,c){return(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)}
function onSegment(a,b,p,tol){return Math.min(a.x,b.x)-tol<=p.x&&p.x<=Math.max(a.x,b.x)+tol&&Math.min(a.y,b.y)-tol<=p.y&&p.y<=Math.max(a.y,b.y)+tol}
function segmentsCross(a,b,c,d,tol=.001){const o1=orient(a,b,c),o2=orient(a,b,d),o3=orient(c,d,a),o4=orient(c,d,b);if(((o1>tol&&o2< -tol)||(o1< -tol&&o2>tol))&&((o3>tol&&o4< -tol)||(o3< -tol&&o4>tol)))return true;if(Math.abs(o1)<=tol&&onSegment(a,b,c,tol))return true;if(Math.abs(o2)<=tol&&onSegment(a,b,d,tol))return true;if(Math.abs(o3)<=tol&&onSegment(c,d,a,tol))return true;if(Math.abs(o4)<=tol&&onSegment(c,d,b,tol))return true;return false}
function sharedNode(a,b){return a.a===b.a||a.a===b.b||a.b===b.a||a.b===b.b}
function issue(severity,code,detail,entityId=null){return{severity,code,detail,entityId}}
export function validateDielineDocumentV38(doc,{tolerance=.01}={}){
  const issues=[],nodes=new Map((doc?.nodes||[]).map(n=>[n.id,n])),edges=doc?.edges||[];
  if(doc?.schema!==V38_DIELINE_SCHEMA)issues.push(issue('error','SCHEMA_INVALID',`Expected ${V38_DIELINE_SCHEMA}.`));
  for(const edge of edges){if(!TYPE_SET.has(edge.lineType))issues.push(issue('error','LINE_TYPE_INVALID',`Unsupported line type ${edge.lineType}.`,edge.id));const a=nodes.get(edge.a),b=nodes.get(edge.b);if(!a||!b){issues.push(issue('error','NODE_REFERENCE_MISSING',`Edge ${edge.id} references a missing node.`,edge.id));continue}if(dist(a,b)<=tolerance)issues.push(issue('error','EDGE_DEGENERATE',`Edge ${edge.id} is shorter than ${tolerance} mm.`,edge.id));if(edge.curve==='cubic'&&(!edge.c1||!edge.c2))issues.push(issue('error','CUBIC_HANDLES_MISSING',`Cubic edge ${edge.id} is missing handles.`,edge.id));if(edge.curve==='arc'&&(!edge.arc||edge.arc.rx<=0||edge.arc.ry<=0))issues.push(issue('error','ARC_RADIUS_INVALID',`Arc edge ${edge.id} has invalid radii.`,edge.id))}
  const seen=new Map();for(const edge of edges){const k=[edge.a,edge.b].sort().join('|')+'|'+edge.lineType;const prior=seen.get(k);if(prior)issues.push(issue('warning','EDGE_DUPLICATE',`${edge.id} duplicates ${prior}.`,edge.id));else seen.set(k,edge.id)}
  const cuts=edges.filter(e=>e.lineType==='CUT'&&e.curve==='line'&&nodes.has(e.a)&&nodes.has(e.b));for(let i=0;i<cuts.length;i++)for(let j=i+1;j<cuts.length;j++){const a=cuts[i],b=cuts[j];if(sharedNode(a,b))continue;if(segmentsCross(nodes.get(a.a),nodes.get(a.b),nodes.get(b.a),nodes.get(b.b),tolerance))issues.push(issue('error','CUT_INTERSECTION',`${a.id} crosses ${b.id}.`,a.id))}
  const degree=new Map();for(const edge of edges.filter(e=>e.lineType==='CUT')){degree.set(edge.a,(degree.get(edge.a)||0)+1);degree.set(edge.b,(degree.get(edge.b)||0)+1)}const open=[...degree.entries()].filter(([,d])=>d===1).map(([id])=>id);if(open.length)issues.push(issue('warning','CUT_OPEN_ENDPOINTS',`${open.length} CUT endpoints have degree 1: ${open.slice(0,8).join(', ')}${open.length>8?'…':''}.`));
  const rectPanels=(doc?.panels||[]).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.w>0&&p.h>0),bleedIds=new Set((doc?.zones?.bleed||[]).map(z=>z.panelId)),safeIds=new Set((doc?.zones?.safe||[]).map(z=>z.panelId));for(const p of rectPanels){if(!bleedIds.has(p.id))issues.push(issue('warning','BLEED_ZONE_MISSING',`Panel ${p.id} has no bleed zone.`,p.id));if(!safeIds.has(p.id))issues.push(issue('warning','SAFE_ZONE_MISSING',`Panel ${p.id} has no safe zone.`,p.id))}
  const errors=issues.filter(x=>x.severity==='error'),warnings=issues.filter(x=>x.severity==='warning');return{ok:errors.length===0,errors,warnings,issues,stats:{nodes:nodes.size,edges:edges.length,panels:(doc?.panels||[]).length,cut:edges.filter(e=>e.lineType==='CUT').length,crease:edges.filter(e=>e.lineType==='CREASE').length,perf:edges.filter(e=>e.lineType==='PERF').length,glue:edges.filter(e=>e.lineType==='GLUE').length}};
}

export function geometryFromDielineDocumentV38(doc){
  const nodes=new Map((doc.nodes||[]).map(n=>[n.id,n])),out={width:doc.width,height:doc.height,panels:clone(doc.panels||[]),bodyPanels:clone(doc.panels||[]),flapPanels:[],cutLines:[],creaseLines:[],perfLines:[],glueLines:[],cutCurves:[],creaseCurves:[],perfCurves:[],glueCurves:[],structure:{template:doc.template,bleed:doc.settings?.bleedMm||0,safe:doc.settings?.safeMm||0}};
  const target=(kind,curve)=>{const key=kind.toLowerCase();return out[`${key}${curve?'Curves':'Lines'}`]};
  for(const edge of doc.edges||[]){const a=nodes.get(edge.a),b=nodes.get(edge.b);if(!a||!b||!['CUT','CREASE','PERF','GLUE'].includes(edge.lineType))continue;if(edge.curve==='cubic')target(edge.lineType,true).push({type:'C',kind:edge.lineType,x1:a.x,y1:a.y,c1x:edge.c1.x,c1y:edge.c1.y,c2x:edge.c2.x,c2y:edge.c2.y,x2:b.x,y2:b.y});else if(edge.curve==='arc')target(edge.lineType,true).push({type:'A',kind:edge.lineType,x1:a.x,y1:a.y,...edge.arc,largeArc:edge.arc.largeArc?1:0,sweep:edge.arc.sweep?1:0,x2:b.x,y2:b.y});else target(edge.lineType,false).push({x1:a.x,y1:a.y,x2:b.x,y2:b.y,type:edge.lineType})}
  return out;
}
