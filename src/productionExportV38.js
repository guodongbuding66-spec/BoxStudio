import { flattenCurves } from './importDieline.js';
import { geometryFromDielineDocumentV38 } from './dielineCadV38.js';
import { curveRecordToCubicsV43, nativeArcForDxfV43 } from './curvedGeometryV43.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const f=value=>Number(value||0).toFixed(3);
const PT=72/25.4;
const utf8Length=value=>new TextEncoder().encode(String(value)).length;
export const V38_DEFAULT_SPOTS=Object.freeze({CUT:'CutContour',CREASE:'Crease',PERF:'Perforation',GLUE:'Glue',BLEED:'Bleed',SAFE:'Safe'});

function nodeMap(doc){return new Map((doc.nodes||[]).map(node=>[node.id,node]))}
function edgeRaw(edge,nodes){const a=nodes.get(edge.a),b=nodes.get(edge.b);if(!a||!b)return null;if(edge.curve==='cubic')return{type:'C',kind:edge.lineType,x1:a.x,y1:a.y,c1x:edge.c1?.x,c1y:edge.c1?.y,c2x:edge.c2?.x,c2y:edge.c2?.y,x2:b.x,y2:b.y};if(edge.curve==='arc')return{type:'A',kind:edge.lineType,x1:a.x,y1:a.y,...edge.arc,largeArc:edge.arc?.largeArc?1:0,sweep:edge.arc?.sweep?1:0,x2:b.x,y2:b.y};return{type:'L',kind:edge.lineType,x1:a.x,y1:a.y,x2:b.x,y2:b.y}}
function edgePath(edge,nodes){const raw=edgeRaw(edge,nodes);if(!raw)return'';if(raw.type==='C')return`M ${f(raw.x1)} ${f(raw.y1)} C ${f(raw.c1x)} ${f(raw.c1y)} ${f(raw.c2x)} ${f(raw.c2y)} ${f(raw.x2)} ${f(raw.y2)}`;if(raw.type==='A')return`M ${f(raw.x1)} ${f(raw.y1)} A ${f(raw.rx||1)} ${f(raw.ry||1)} ${f(raw.rotation||0)} ${raw.largeArc?1:0} ${raw.sweep?1:0} ${f(raw.x2)} ${f(raw.y2)}`;return`M ${f(raw.x1)} ${f(raw.y1)} L ${f(raw.x2)} ${f(raw.y2)}`}
function zonePath(z){return`M ${f(z.x)} ${f(z.y)} h ${f(z.w)} v ${f(z.h)} h ${f(-z.w)} Z`}
export function buildDielineSvgV38(doc,{spotNames=V38_DEFAULT_SPOTS,includeZones=true}={}){
  const nodes=nodeMap(doc),types=['CUT','CREASE','PERF','GLUE'],parts=[`<svg xmlns="http://www.w3.org/2000/svg" width="${f(doc.width)}mm" height="${f(doc.height)}mm" viewBox="0 0 ${f(doc.width)} ${f(doc.height)}" data-schema="boxstudio-dieline-v38" data-curve-serializer="v0.43-native">`];
  for(const type of types){const paths=(doc.edges||[]).filter(edge=>edge.lineType===type).map(edge=>`<path d="${edgePath(edge,nodes)}" fill="none" stroke="black" stroke-width="0.2" vector-effect="non-scaling-stroke" data-edge-id="${esc(edge.id)}" data-curve="${esc(edge.curve||'line')}"/>`).join('');parts.push(`<g id="layer-${type}" data-line-type="${type}" data-spot-name="${esc(spotNames[type]||type)}">${paths}</g>`)}
  if(includeZones){for(const type of ['BLEED','SAFE']){const key=type.toLowerCase(),paths=(doc.zones?.[key]||[]).map(z=>`<path d="${zonePath(z)}" fill="none" stroke="black" stroke-width="0.15" stroke-dasharray="2 1" data-panel-id="${esc(z.panelId)}"/>`).join('');parts.push(`<g id="layer-${type}" data-line-type="${type}" data-spot-name="${esc(spotNames[type]||type)}">${paths}</g>`)}}
  parts.push('</svg>');return parts.join('');
}

function edgeSegments(doc,edge,steps=24){const nodes=nodeMap(doc),raw=edgeRaw(edge,nodes);if(!raw)return[];if(raw.type==='L')return[{x1:raw.x1,y1:raw.y1,x2:raw.x2,y2:raw.y2,type:edge.lineType}];return flattenCurves([raw],steps)}
function dxfPair(code,value){return`${code}\n${value}\n`}
function dxfLine(layer,l){return dxfPair(0,'LINE')+dxfPair(8,layer)+dxfPair(10,f(l.x1))+dxfPair(20,f(l.y1))+dxfPair(30,'0.000')+dxfPair(11,f(l.x2))+dxfPair(21,f(l.y2))+dxfPair(31,'0.000')}
function dxfArc(layer,arc){return dxfPair(0,'ARC')+dxfPair(8,layer)+dxfPair(10,f(arc.cx))+dxfPair(20,f(arc.cy))+dxfPair(30,'0.000')+dxfPair(40,f(arc.r))+dxfPair(50,f(arc.start))+dxfPair(51,f(arc.end))}
function dxfSpline(layer,c){let out=dxfPair(0,'SPLINE')+dxfPair(8,layer)+dxfPair(70,8)+dxfPair(71,3)+dxfPair(72,8)+dxfPair(73,4)+dxfPair(74,0);for(const k of [0,0,0,0,1,1,1,1])out+=dxfPair(40,f(k));for(const p of [[c.x1,c.y1],[c.c1x,c.c1y],[c.c2x,c.c2y],[c.x2,c.y2]])out+=dxfPair(10,f(p[0]))+dxfPair(20,f(p[1]))+dxfPair(30,'0.000');return out}
export function buildDxfV38(doc,{curveSteps=24,curveMode='native'}={}){
  const layers=['CUT','CREASE','PERF','GLUE','BLEED','SAFE'],nodes=nodeMap(doc);let out='';out+=dxfPair(999,'BoxStudio V0.43 native curve DXF')+dxfPair(0,'SECTION')+dxfPair(2,'HEADER')+dxfPair(9,'$ACADVER')+dxfPair(1,'AC1015')+dxfPair(9,'$INSUNITS')+dxfPair(70,4)+dxfPair(0,'ENDSEC');out+=dxfPair(0,'SECTION')+dxfPair(2,'TABLES')+dxfPair(0,'TABLE')+dxfPair(2,'LAYER')+dxfPair(70,layers.length);for(const layer of layers)out+=dxfPair(0,'LAYER')+dxfPair(2,layer)+dxfPair(70,0)+dxfPair(62,7)+dxfPair(6,'CONTINUOUS');out+=dxfPair(0,'ENDTAB')+dxfPair(0,'ENDSEC')+dxfPair(0,'SECTION')+dxfPair(2,'ENTITIES');
  for(const edge of doc.edges||[]){if(!['CUT','CREASE','PERF','GLUE'].includes(edge.lineType))continue;const raw=edgeRaw(edge,nodes);if(!raw)continue;if(curveMode==='flatten'||raw.type==='L'){for(const l of edgeSegments(doc,edge,curveSteps))out+=dxfLine(edge.lineType,l);continue}if(raw.type==='A'){const arc=nativeArcForDxfV43(raw);if(arc){out+=dxfArc(edge.lineType,arc);continue}for(const cubic of curveRecordToCubicsV43(raw))out+=dxfSpline(edge.lineType,cubic);continue}if(raw.type==='C'){out+=dxfSpline(edge.lineType,raw);continue}}
  for(const [layer,zones] of [['BLEED',doc.zones?.bleed||[]],['SAFE',doc.zones?.safe||[]]])for(const z of zones){out+=dxfLine(layer,{x1:z.x,y1:z.y,x2:z.x+z.w,y2:z.y});out+=dxfLine(layer,{x1:z.x+z.w,y1:z.y,x2:z.x+z.w,y2:z.y+z.h});out+=dxfLine(layer,{x1:z.x+z.w,y1:z.y+z.h,x2:z.x,y2:z.y+z.h});out+=dxfLine(layer,{x1:z.x,y1:z.y+z.h,x2:z.x,y2:z.y})}
  return out+dxfPair(0,'ENDSEC')+dxfPair(0,'EOF');
}

function pdfName(value='Spot'){return String(value).replace(/[^A-Za-z0-9_.-]/g,'_')}
function buildPdf(objects){let body='%PDF-1.7\n%BoxStudio V0.43 native curve dieline\n',offsets=[0];for(let i=0;i<objects.length;i++){offsets[i+1]=utf8Length(body);body+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`}const xref=utf8Length(body);body+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;for(let i=1;i<offsets.length;i++)body+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;body+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;return new TextEncoder().encode(body)}
function spotObjects(name,fnRef){return`[/Separation /${pdfName(name)} /DeviceCMYK ${fnRef} 0 R]`}
function pdfPoint(x,y,heightPt){return`${f(x*PT)} ${f(heightPt-y*PT)}`}
function pdfEdgePath(doc,edge,nodes){const raw=edgeRaw(edge,nodes);if(!raw)return'';if(raw.type==='L')return`${pdfPoint(raw.x1,raw.y1,doc.height*PT)} m ${pdfPoint(raw.x2,raw.y2,doc.height*PT)} l`;const cubics=curveRecordToCubicsV43(raw);if(!cubics.length)return'';let s=`${pdfPoint(cubics[0].x1,cubics[0].y1,doc.height*PT)} m`;for(const c of cubics)s+=` ${pdfPoint(c.c1x,c.c1y,doc.height*PT)} ${pdfPoint(c.c2x,c.c2y,doc.height*PT)} ${pdfPoint(c.x2,c.y2,doc.height*PT)} c`;return s}
export function buildDielinePdfV38(doc,{spotNames=V38_DEFAULT_SPOTS}={}){
  const widthPt=doc.width*PT,heightPt=doc.height*PT,types=['CUT','CREASE','PERF','GLUE'],resourceNames={CUT:'CSCUT',CREASE:'CSCREASE',PERF:'CSPERF',GLUE:'CSGLUE'},nodes=nodeMap(doc),commands=['% V0.43 native structural curves'];
  for(const type of types)for(const edge of (doc.edges||[]).filter(e=>e.lineType===type)){const path=pdfEdgePath(doc,edge,nodes);if(!path)continue;const dash=type==='CUT'?'[] 0 d':'[5 3] 0 d',w=type==='CUT'?.35:.28;commands.push(`q /${resourceNames[type]} CS 1 SCN ${f(w)} w ${dash} ${path} S Q`)}const stream=commands.join('\n')+'\n';
  const objects=[];objects.push('<< /Type /Catalog /Pages 2 0 R >>');objects.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f(widthPt)} ${f(heightPt)}] /TrimBox [0 0 ${f(widthPt)} ${f(heightPt)}] /Resources << /ColorSpace << /CSCUT 5 0 R /CSCREASE 6 0 R /CSPERF 7 0 R /CSGLUE 8 0 R >> >> /Contents 4 0 R >>`);objects.push(`<< /Length ${utf8Length(stream)} >>\nstream\n${stream}endstream`);
  objects.push(spotObjects(spotNames.CUT,9));objects.push(spotObjects(spotNames.CREASE,10));objects.push(spotObjects(spotNames.PERF,11));objects.push(spotObjects(spotNames.GLUE,12));
  objects.push('<< /FunctionType 2 /Domain [0 1] /C0 [0 0 0 0] /C1 [0 1 0 0] /N 1 >>');objects.push('<< /FunctionType 2 /Domain [0 1] /C0 [0 0 0 0] /C1 [1 0 0 0] /N 1 >>');objects.push('<< /FunctionType 2 /Domain [0 1] /C0 [0 0 0 0] /C1 [0 0 1 0] /N 1 >>');objects.push('<< /FunctionType 2 /Domain [0 1] /C0 [0 0 0 0] /C1 [1 0 1 0] /N 1 >>');return buildPdf(objects);
}

export function exportSummaryV38(doc){const geo=geometryFromDielineDocumentV38(doc),curves=(geo.cutCurves?.length||0)+(geo.creaseCurves?.length||0)+(geo.perfCurves?.length||0)+(geo.glueCurves?.length||0);return{schema:doc.schema,widthMm:doc.width,heightMm:doc.height,nodes:doc.nodes?.length||0,edges:doc.edges?.length||0,cut:geo.cutLines.length+geo.cutCurves.length,crease:geo.creaseLines.length+geo.creaseCurves.length,perf:geo.perfLines.length+geo.perfCurves.length,glue:geo.glueLines.length+geo.glueCurves.length,nativeCurves:curves,curveSerializer:'v0.43-native'} }
