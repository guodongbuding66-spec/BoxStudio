import { generateGeometry } from './geometry.js';
import { buildFoldGraph } from './foldgraph.js';
import { dielineDocumentFromStateV38, geometryFromDielineDocumentV38, buildProductionZonesV38 } from './dielineCadV38.js';
import { flattenCurves } from './importDieline.js';

export const V39_TOPOLOGY_SCHEMA='boxstudio-structural-topology-v39';
const clone=v=>structuredClone(v);
const num=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const round=(v,p=6)=>{const m=10**p;return Math.round(num(v)*m)/m};
const key=(x,y,t=.01)=>`${Math.round(num(x)/t)}:${Math.round(num(y)/t)}`;
const pair=(a,b)=>a<b?`${a}|${b}`:`${b}|${a}`;
const segmentKey=(a,b,t)=>{const ka=key(a.x,a.y,t),kb=key(b.x,b.y,t);return ka<kb?`${ka}|${kb}`:`${kb}|${ka}`};
const polygonArea=pts=>pts.reduce((s,p,i)=>{const q=pts[(i+1)%pts.length];return s+p[0]*q[1]-q[0]*p[1]},0)/2;
function bbox(points){const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),x=Math.min(...xs),y=Math.min(...ys),r=Math.max(...xs),b=Math.max(...ys);return{x:round(x),y:round(y),w:round(r-x),h:round(b-y)};}
function centroid(points){const a=polygonArea(points);if(Math.abs(a)<1e-9){const b=bbox(points);return{x:b.x+b.w/2,y:b.y+b.h/2}}let x=0,y=0;for(let i=0;i<points.length;i++){const p=points[i],q=points[(i+1)%points.length],c=p[0]*q[1]-q[0]*p[1];x+=(p[0]+q[0])*c;y+=(p[1]+q[1])*c}return{x:x/(6*a),y:y/(6*a)}}
function panelPolygon(panel){if(Array.isArray(panel?.points)&&panel.points.length>=3)return panel.points.map(p=>[num(p[0]),num(p[1])]);const x=num(panel?.x),y=num(panel?.y),w=num(panel?.w),h=num(panel?.h);return[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];}
function pointInPolygon(p,poly=[]){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j],hit=((a[1]>p.y)!==(b[1]>p.y))&&(p.x<(b[0]-a[0])*(p.y-a[1])/((b[1]-a[1])||1e-12)+a[0]);if(hit)inside=!inside}return inside;}
function cleanPolygon(points,tol=.01){const out=[];for(const p of points){const q=[round(p[0]),round(p[1])],last=out.at(-1);if(!last||Math.hypot(last[0]-q[0],last[1]-q[1])>tol)out.push(q)}if(out.length>2&&Math.hypot(out[0][0]-out.at(-1)[0],out[0][1]-out.at(-1)[1])<=tol)out.pop();return out;}
function issue(severity,code,detail,extra={}){return{severity,code,detail,...extra}}

function edgeSegments(doc,edge,steps=18){
  const nodes=new Map((doc.nodes||[]).map(n=>[n.id,n])),a=nodes.get(edge.a),b=nodes.get(edge.b);if(!a||!b)return[];
  if(edge.curve==='line'||!edge.curve)return[{a:{x:a.x,y:a.y},b:{x:b.x,y:b.y}}];
  const raw=edge.curve==='cubic'?{type:'C',kind:edge.lineType,x1:a.x,y1:a.y,c1x:edge.c1?.x,c1y:edge.c1?.y,c2x:edge.c2?.x,c2y:edge.c2?.y,x2:b.x,y2:b.y}:{type:'A',kind:edge.lineType,x1:a.x,y1:a.y,...edge.arc,largeArc:edge.arc?.largeArc?1:0,sweep:edge.arc?.sweep?1:0,x2:b.x,y2:b.y};
  return flattenCurves([raw],Math.max(4,steps)).map(s=>({a:{x:num(s.x1),y:num(s.y1)},b:{x:num(s.x2),y:num(s.y2)}}));
}

function planarSegments(doc,{curveSteps=18,tolerance=.01}={}){
  const grouped=new Map(),issues=[];
  for(const edge of doc.edges||[]){
    if(!['CUT','CREASE'].includes(edge.lineType))continue;
    const segments=edgeSegments(doc,edge,curveSteps);if(!segments.length){issues.push(issue('error','TOPOLOGY_EDGE_EMPTY',`Edge ${edge.id} could not be sampled.`,{edgeId:edge.id}));continue}
    for(const s of segments){if(Math.hypot(s.a.x-s.b.x,s.a.y-s.b.y)<=tolerance)continue;const k=segmentKey(s.a,s.b,tolerance),prior=grouped.get(k);if(prior){prior.types.add(edge.lineType);prior.sourceEdgeIds.add(edge.id);prior.curved=prior.curved||edge.curve!=='line'}else grouped.set(k,{a:s.a,b:s.b,types:new Set([edge.lineType]),sourceEdgeIds:new Set([edge.id]),curved:edge.curve!=='line'});}
  }
  const segments=[...grouped.values()].map((s,index)=>({id:`s${index+1}`,a:s.a,b:s.b,lineType:s.types.has('CREASE')?'CREASE':'CUT',sourceEdgeIds:[...s.sourceEdgeIds],curved:s.curved}));
  return{segments,issues};
}

function enumerateFaces(segments,{tolerance=.01,minArea=.1}={}){
  const vertices=new Map(),half=[],outgoing=new Map();
  const vertex=p=>{const k=key(p.x,p.y,tolerance);if(!vertices.has(k))vertices.set(k,{id:k,x:round(p.x),y:round(p.y)});return vertices.get(k)};
  for(let i=0;i<segments.length;i++){
    const s=segments[i],a=vertex(s.a),b=vertex(s.b),h0={id:i*2,segment:i,from:a.id,to:b.id,twin:i*2+1},h1={id:i*2+1,segment:i,from:b.id,to:a.id,twin:i*2};half.push(h0,h1);
    if(!outgoing.has(a.id))outgoing.set(a.id,[]);if(!outgoing.has(b.id))outgoing.set(b.id,[]);outgoing.get(a.id).push(h0);outgoing.get(b.id).push(h1);
  }
  for(const list of outgoing.values())list.sort((p,q)=>{const a=vertices.get(p.from),b=vertices.get(p.to),c=vertices.get(q.to);return Math.atan2(b.y-a.y,b.x-a.x)-Math.atan2(c.y-a.y,c.x-a.x)});
  const next=new Map();for(const h of half){const list=outgoing.get(h.to)||[],at=list.findIndex(x=>x.id===h.twin);if(at>=0)next.set(h.id,list[(at-1+list.length)%list.length]?.id)}
  const seen=new Set(),raw=[];
  for(const start of half){if(seen.has(start.id))continue;const ids=[],points=[],segmentsUsed=[];let cur=start.id,guard=0,closed=false;while(cur!=null&&!seen.has(cur)&&guard++<half.length+4){seen.add(cur);ids.push(cur);const h=half[cur],v=vertices.get(h.from);points.push([v.x,v.y]);segmentsUsed.push(h.segment);cur=next.get(cur);if(cur===start.id){closed=true;break}}
    const poly=cleanPolygon(points,tolerance),area=poly.length>=3?polygonArea(poly):0;if(closed&&poly.length>=3&&area>minArea)raw.push({points:poly,area,halfEdges:ids,segments:segmentsUsed});
  }
  return{faces:raw,half,vertices};
}

function matchPanels(faces,oldPanels=[]){
  const unused=new Set(oldPanels.map(p=>p.id)),old=oldPanels.map(p=>{const poly=panelPolygon(p),b=bbox(poly),c=centroid(poly);return{raw:p,poly,b,c,area:Math.abs(polygonArea(poly))}}),mapping={},used=new Set(),panels=[];
  const sorted=[...faces].sort((a,b)=>Math.abs(b.area)-Math.abs(a.area));
  for(let i=0;i<sorted.length;i++){
    const face=sorted[i],b=bbox(face.points),c=centroid(face.points),inside=old.filter(o=>unused.has(o.raw.id)&&pointInPolygon(c,o.poly));let match=null;
    if(inside.length)match=inside.sort((a,z)=>Math.abs(a.area-Math.abs(face.area))-Math.abs(z.area-Math.abs(face.area)))[0];
    if(!match){const candidates=old.filter(o=>unused.has(o.raw.id)).map(o=>({o,d:Math.hypot(o.c.x-c.x,o.c.y-c.y)})).sort((a,z)=>a.d-z.d);const best=candidates[0],limit=Math.max(b.w,b.h,best?.o.b.w||0,best?.o.b.h||0)*.35;if(best&&best.d<=limit)match=best.o;}
    let id,label,kind='panel',role='',parent=null;if(match){id=match.raw.id;label=match.raw.label||id;kind=match.raw.kind||kind;role=match.raw.role||'';parent=match.raw.parent??null;unused.delete(id);mapping[id]=id}else{id=`panel-v39-${i+1}`;while(used.has(id)||old.some(o=>o.raw.id===id))id+='x';label=id}
    used.add(id);panels.push({id,label,kind,role,parent,points:face.points,x:b.x,y:b.y,w:b.w,h:b.h,area:round(Math.abs(face.area)),centroid:{x:round(c.x),y:round(c.y)},_halfEdges:face.halfEdges,_segments:face.segments});
  }
  for(const o of old){if(mapping[o.raw.id])continue;const target=panels.map(p=>({p,d:Math.hypot(p.centroid.x-o.c.x,p.centroid.y-o.c.y)})).sort((a,b)=>a.d-b.d)[0];if(target)mapping[o.raw.id]=target.p.id}
  return{panels,mapping,unmatchedOld:[...unused]};
}

function legacyFoldHints(state){
  try{const geo=generateGeometry(state?.structure||{}),graph=buildFoldGraph(geo),map=new Map();for(const e of graph.edges||[])map.set(pair(e.from,e.to),{...e});return{geo,graph,map}}catch{return{geo:null,graph:null,map:new Map()}}
}

function foldGraphFromFaces(doc,segments,enumerated,panels,legacy,state){
  const faceForHalf=new Map();for(let i=0;i<panels.length;i++)for(const h of panels[i]._halfEdges||[])faceForHalf.set(h,panels[i].id);
  const links=new Map(),issues=[];
  for(let si=0;si<segments.length;si++){
    const s=segments[si];if(s.lineType!=='CREASE')continue;const a=faceForHalf.get(si*2),b=faceForHalf.get(si*2+1);if(!a||!b||a===b){issues.push(issue('warning','CREASE_FACE_REVIEW',`Crease segment ${s.id} is not shared by two bounded panels.`,{segmentId:s.id,sourceEdgeIds:s.sourceEdgeIds}));continue}const k=pair(a,b),entry=links.get(k)||{a,b,segments:[],sourceEdgeIds:new Set(),curved:false};entry.segments.push(s);for(const id of s.sourceEdgeIds)entry.sourceEdgeIds.add(id);entry.curved=entry.curved||s.curved;links.set(k,entry);
  }
  const panelMap=Object.fromEntries(panels.map(p=>[p.id,p])),legacyRoot=legacy.graph?.root,root=panelMap[legacyRoot]?legacyRoot:(panels.filter(p=>p.kind!=='glue'&&p.role!=='glue').sort((a,b)=>b.area-a.area)[0]?.id||panels[0]?.id||null),adj=new Map(panels.map(p=>[p.id,[]]));
  for(const link of links.values()){adj.get(link.a)?.push({...link,to:link.b});adj.get(link.b)?.push({...link,to:link.a})}
  const docNodes=new Map((doc.nodes||[]).map(n=>[n.id,n])),docEdges=new Map((doc.edges||[]).map(e=>[e.id,e])),nodes=panels.map(p=>{const old=legacy.graph?.nodes?.find(n=>n.id===p.id||n.artPanel===p.id);return{id:p.id,label:p.label,w:p.w,h:p.h,points:clone(p.points),role:p.role||old?.role||'panel',artPanel:p.id,flat:{pos:[p.centroid.x-doc.width/2,-(p.centroid.y-doc.height/2),0],rot:[0,0,0]},folded:old?.folded?clone(old.folded):null}}),edges=[],seen=new Set(root?[root]:[]),q=root?[root]:[];
  while(q.length){const from=q.shift();for(const item of adj.get(from)||[]){if(seen.has(item.to))continue;seen.add(item.to);q.push(item.to);const hint=legacy.map.get(pair(from,item.to));let angle=90,label=`${from}/${item.to}`,angleSource='review-default';if(hint){angle=hint.from===from?num(hint.angle,90):-num(hint.angle,90);label=hint.label||label;angleSource='legacy-semantic'}else issues.push(issue('warning','FOLD_ANGLE_REVIEW',`No semantic fold-angle hint exists for ${from} → ${item.to}; using 90° review default.`,{from,to:item.to}));
      const sourceId=[...item.sourceEdgeIds][0],source=docEdges.get(sourceId),na=source?docNodes.get(source.a):null,nb=source?docNodes.get(source.b):null;let hinge=na&&nb?{x1:na.x,y1:na.y,x2:nb.x,y2:nb.y,sourceEdgeId:sourceId}:null;if(item.curved&&hinge){hinge={...hinge,curveApproximation:true};issues.push(issue('warning','CURVED_HINGE_REVIEW',`Curved crease ${sourceId} is approximated by its endpoint hinge for 3D folding.`,{edgeId:sourceId}))}edges.push({from,to:item.to,label,angle,angleSource,hinge,sourceEdgeIds:[...item.sourceEdgeIds]});}}
  const unreached=panels.map(p=>p.id).filter(id=>!seen.has(id));if(unreached.length)issues.push(issue('warning','FOLD_UNREACHED',`Panels outside the fold traversal: ${unreached.join(', ')}.`,{panels:unreached}));return{graph:{schema:'boxstudio-foldgraph-v39',template:doc.template,root,nodes,edges,unreached},issues,links:[...links.values()].map(x=>({...x,sourceEdgeIds:[...x.sourceEdgeIds]}))};
}

function classifyPanels(panels){const body=[],flaps=[];for(const p of panels){const role=String(p.role||'').toLowerCase(),kind=String(p.kind||'').toLowerCase();if(kind.includes('flap')||role.includes('flap')||role.includes('tab')||role.includes('tuck')||role.includes('wing'))flaps.push(p);else body.push(p)}return{body,flaps}}

export function buildStructuralTopologyV39(state,{doc=null,curveSteps=18,tolerance=.01,minArea=.1}={}){
  const source=clone(doc||state?.dielineV38||dielineDocumentFromStateV38(state||{})),sampled=planarSegments(source,{curveSteps,tolerance}),enumerated=enumerateFaces(sampled.segments,{tolerance,minArea}),matched=matchPanels(enumerated.faces,source.panels||[]),legacy=legacyFoldHints(state||{}),fold=foldGraphFromFaces(source,sampled.segments,enumerated,matched.panels,legacy,state),issues=[...sampled.issues,...fold.issues];
  if(!matched.panels.length)issues.push(issue('error','TOPOLOGY_NO_PANELS','No bounded panel faces could be rebuilt from CUT/CREASE geometry.'));
  if(matched.unmatchedOld.length)issues.push(issue('warning','PANEL_REMAP_REVIEW',`Original panels not directly matched to rebuilt faces: ${matched.unmatchedOld.join(', ')}.`,{panels:matched.unmatchedOld}));
  const {body,flaps}=classifyPanels(matched.panels),base=geometryFromDielineDocumentV38(source),panelMap=Object.fromEntries(matched.panels.map(p=>[p.id,p])),geometry={...base,template:source.template,width:source.width,height:source.height,panels:clone(matched.panels),bodyPanels:clone(body),flapPanels:clone(flaps),panelMap,structure:{...(state?.structure||{}),template:source.template,bleed:source.settings?.bleedMm??state?.structure?.bleed??3,safe:source.settings?.safeMm??state?.structure?.safe??5},foldCandidates:fold.links.map((l,i)=>({id:`fold-v39-${i+1}`,a:l.a,b:l.b,confirmed:true,sourceEdgeIds:l.sourceEdgeIds}))};
  const rebuiltDoc=buildProductionZonesV38({...source,panels:matched.panels.map(({_halfEdges,_segments,...p})=>p),metadata:{...(source.metadata||{}),topologySchema:V39_TOPOLOGY_SCHEMA,topologyRebuiltAt:new Date(0).toISOString()}},{bleed:source.settings?.bleedMm??3,safe:source.settings?.safeMm??5});
  const errors=issues.filter(x=>x.severity==='error'),warnings=issues.filter(x=>x.severity==='warning');return{schema:V39_TOPOLOGY_SCHEMA,version:1,ok:errors.length===0,doc:rebuiltDoc,geometry,panels:matched.panels.map(({_halfEdges,_segments,...p})=>p),panelMap,panelIdMap:matched.mapping,graph:fold.graph,adjacency:fold.links,issues,errors,warnings,stats:{segments:sampled.segments.length,faces:matched.panels.length,foldLinks:fold.links.length,foldTreeEdges:fold.graph.edges.length,errors:errors.length,warnings:warnings.length}};
}

export function reconcileArtworkToTopologyV39(state,topology){
  const next=clone(state||{}),valid=new Set(Object.keys(topology?.panelMap||{})),remapped=[],orphaned=[];for(const el of next.elements||[]){if(el?.type==='cross-panel-artwork'||!el?.panelId)continue;if(valid.has(el.panelId))continue;const target=topology?.panelIdMap?.[el.panelId];if(target&&valid.has(target)){remapped.push({elementId:el.id,from:el.panelId,to:target});el.panelId=target}else orphaned.push({elementId:el.id,panelId:el.panelId})}next.dielineV38=clone(topology.doc);next.topologyV39={schema:topology.schema,stats:clone(topology.stats),panelIdMap:clone(topology.panelIdMap),graph:clone(topology.graph)};return{state:next,remapped,orphaned,ok:orphaned.length===0};
}

export function topologyProductionGateV39(state,topology){const art=reconcileArtworkToTopologyV39(state,topology),issues=[...(topology?.issues||[])];for(const o of art.orphaned)issues.push(issue('error','ARTWORK_PANEL_ORPHAN',`Artwork ${o.elementId} references removed panel ${o.panelId}.`,o));const errors=issues.filter(x=>x.severity==='error'),warnings=issues.filter(x=>x.severity==='warning');return{ok:errors.length===0,issues,errors,warnings,reconciled:art};}
