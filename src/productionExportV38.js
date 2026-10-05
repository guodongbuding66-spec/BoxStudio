import { flattenCurves } from './importDieline.js';
import { geometryFromDielineDocumentV38 } from './dielineCadV38.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const f=value=>Number(value||0).toFixed(3);
const PT=72/25.4;
export const V38_DEFAULT_SPOTS=Object.freeze({CUT:'CutContour',CREASE:'Crease',PERF:'Perforation',GLUE:'Glue',BLEED:'Bleed',SAFE:'Safe'});

function nodeMap(doc){return new Map((doc.nodes||[]).map(node=>[node.id,node]))}
function edgePath(edge,nodes){const a=nodes.get(edge.a),b=nodes.get(edge.b);if(!a||!b)return'';if(edge.curve==='cubic')return`M ${f(a.x)} ${f(a.y)} C ${f(edge.c1?.x)} ${f(edge.c1?.y)} ${f(edge.c2?.x)} ${f(edge.c2?.y)} ${f(b.x)} ${f(b.y)}`;if(edge.curve==='arc'){const arc=edge.arc||{};return`M ${f(a.x)} ${f(a.y)} A ${f(arc.rx||1)} ${f(arc.ry||1)} ${f(arc.rotation||0)} ${arc.largeArc?1:0} ${arc.sweep?1:0} ${f(b.x)} ${f(b.y)}`}return`M ${f(a.x)} ${f(a.y)} L ${f(b.x)} ${f(b.y)}`}
function zonePath(z){return`M ${f(z.x)} ${f(z.y)} h ${f(z.w)} v ${f(z.h)} h ${f(-z.w)} Z`}
export function buildDielineSvgV38(doc,{spotNames=V38_DEFAULT_SPOTS,includeZones=true}={}){
  const nodes=nodeMap(doc),types=['CUT','CREASE','PERF','GLUE'],parts=[`<svg xmlns="http://www.w3.org/2000/svg" width="${f(doc.width)}mm" height="${f(doc.height)}mm" viewBox="0 0 ${f(doc.width)} ${f(doc.height)}" data-schema="boxstudio-dieline-v38">`];
  for(const type of types){const paths=(doc.edges||[]).filter(edge=>edge.lineType===type).map(edge=>`<path d="${edgePath(edge,nodes)}" fill="none" stroke="black" stroke-width="0.2" vector-effect="non-scaling-stroke" data-edge-id="${esc(edge.id)}"/>`).join('');parts.push(`<g id="layer-${type}" data-line-type="${type}" data-spot-name="${esc(spotNames[type]||type)}">${paths}</g>`)}
  if(includeZones){for(const type of ['BLEED','SAFE']){const key=type.toLowerCase(),paths=(doc.zones?.[key]||[]).map(z=>`<path d="${zonePath(z)}" fill="none" stroke="black" stroke-width="0.15" stroke-dasharray="2 1" data-panel-id="${esc(z.panelId)}"/>`).join('');parts.push(`<g id="layer-${type}" data-line-type="${type}" data-spot-name="${esc(spotNames[type]||type)}">${paths}</g>`)}}
  parts.push('</svg>');return parts.join('');
}

function edgeSegments(doc,edge,steps=24){const nodes=nodeMap(doc),a=nodes.get(edge.a),b=nodes.get(edge.b);if(!a||!b)return[];if(edge.curve==='line'||!edge.curve)return[{x1:a.x,y1:a.y,x2:b.x,y2:b.y,type:edge.lineType}];const raw=edge.curve==='cubic'?{type:'C',kind:edge.lineType,x1:a.x,y1:a.y,c1x:edge.c1.x,c1y:edge.c1.y,c2x:edge.c2.x,c2y:edge.c2.y,x2:b.x,y2:b.y}:{type:'A',kind:edge.lineType,x1:a.x,y1:a.y,...edge.arc,largeArc:edge.arc?.largeArc?1:0,sweep:edge.arc?.sweep?1:0,x2:b.x,y2:b.y};return flattenCurves([raw],steps)}
function dxfPair(code,value){return`${code}\n${value}\n`}
export function buildDxfV38(doc,{curveSteps=24}={}){
  const layers=['CUT','CREASE','PERF','GLUE','BLEED','SAFE'];let out='';out+=dxfPair(0,'SECTION')+dxfPair(2,'HEADER')+dxfPair(9,'$ACADVER')+dxfPair(1,'AC1015')+dxfPair(9,'$INSUNITS')+dxfPair(70,4)+dxfPair(0,'ENDSEC');out+=dxfPair(0,'SECTION')+dxfPair(2,'TABLES')+dxfPair(0,'TABLE')+dxfPair(2,'LAYER')+dxfPair(70,layers.length);for(const layer of layers)out+=dxfPair(0,'LAYER')+dxfPair(2,layer)+dxfPair(70,0)+dxfPair(62,7)+dxfPair(6,'CONTINUOUS');out+=dxfPair(0,'ENDTAB')+dxfPair(0,'ENDSEC')+dxfPair(0,'SECTION')+dxfPair(2,'ENTITIES');
  const emit=(layer,l)=>{out+=dxfPair(0,'LINE')+dxfPair(8,layer)+dxfPair(10,f(l.x1))+dxfPair(20,f(l.y1))+dxfPair(30,'0.000')+dxfPair(11,f(l.x2))+dxfPair(21,f(l.y2))+dxfPair(31,'0.000')};
  for(const edge of doc.edges||[])if(['CUT','CREASE','PERF','GLUE'].includes(edge.lineType))for(const l of edgeSegments(doc,edge,curveSteps))emit(edge.lineType,l);
  for(const [layer,zones] of [['BLEED',doc.zones?.bleed||[]],['SAFE',doc.zones?.safe||[]]])for(const z of zones){emit(layer,{x1:z.x,y1:z.y,x2:z.x+z.w,y2:z.y});emit(layer,{x1:z.x+z.w,y1:z.y,x2:z.x+z.w,y2:z.y+z.h});emit(layer,{x1:z.x+z.w,y1:z.y+z.h,x2:z.x,y2:z.y+z.h});emit(layer,{x1:z.x,y1:z.y+z.h,x2:z.x,y2:z.y})}
  return out+dxfPair(0,'ENDSEC')+dxfPair(0,'EOF');
}

function pdfName(value='Spot'){return String(value).replace(/[^A-Za-z0-9_.-]/g,'_')}
function buildPdf(objects){let body='%PDF-1.7\n%BoxStudio V0.38\n',offsets=[0];for(let i=0;i<objects.length;i++){offsets[i+1]=Buffer.byteLength(body,'utf8');body+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`}const xref=Buffer.byteLength(body,'utf8');body+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;for(let i=1;i<offsets.length;i++)body+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;body+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;return new TextEncoder().encode(body)}
function spotObjects(name,cmyk,fnRef){return`[/Separation /${pdfName(name)} /DeviceCMYK ${fnRef} 0 R]`}
export function buildDielinePdfV38(doc,{spotNames=V38_DEFAULT_SPOTS,curveSteps=32}={}){
  const widthPt=doc.width*PT,heightPt=doc.height*PT,types=['CUT','CREASE','PERF','GLUE'],resourceNames={CUT:'CSCUT',CREASE:'CSCREASE',PERF:'CSPERF',GLUE:'CSGLUE'},segments=[];
  for(const type of types)for(const edge of (doc.edges||[]).filter(e=>e.lineType===type))for(const l of edgeSegments(doc,edge,curveSteps))segments.push({type,...l});
  const commands=[];for(const s of segments){const dash=s.type==='CUT'?'[] 0 d':'[5 3] 0 d',w=s.type==='CUT'?.35:.28;commands.push(`q /${resourceNames[s.type]} CS 1 SCN ${f(w)} w ${dash} ${f(s.x1*PT)} ${f(heightPt-s.y1*PT)} m ${f(s.x2*PT)} ${f(heightPt-s.y2*PT)} l S Q`)}const stream=commands.join('\n')+'\n';
  const objects=[];objects.push('<< /Type /Catalog /Pages 2 0 R >>');objects.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f(widthPt)} ${f(heightPt)}] /TrimBox [0 0 ${f(widthPt)} ${f(heightPt)}] /Resources << /ColorSpace << /CSCUT 5 0 R /CSCREASE 6 0 R /CSPERF 7 0 R /CSGLUE 8 0 R >> >> /Contents 4 0 R >>`);objects.push(`<< /Length ${Buffer.byteLength(stream,'utf8')} >>\nstream\n${stream}endstream`);
  objects.push(spotObjects(spotNames.CUT,[0,1,0,0],9));objects.push(spotObjects(spotNames.CREASE,[1,0,0,0],10));objects.push(spotObjects(spotNames.PERF,[0,0,1,0],11));objects.push(spotObjects(spotNames.GLUE,[1,0,1,0],12));
  objects.push('<< /FunctionType 2 /Domain [0 1] /C0 [0 0 0 0] /C1 [0 1 0 0] /N 1 >>');objects.push('<< /FunctionType 2 /Domain [0 1] /C0 [0 0 0 0] /C1 [1 0 0 0] /N 1 >>');objects.push('<< /FunctionType 2 /Domain [0 1] /C0 [0 0 0 0] /C1 [0 0 1 0] /N 1 >>');objects.push('<< /FunctionType 2 /Domain [0 1] /C0 [0 0 0 0] /C1 [1 0 1 0] /N 1 >>');return buildPdf(objects);
}

export function exportSummaryV38(doc){const geo=geometryFromDielineDocumentV38(doc);return{schema:doc.schema,widthMm:doc.width,heightMm:doc.height,nodes:doc.nodes?.length||0,edges:doc.edges?.length||0,cut:geo.cutLines.length+geo.cutCurves.length,crease:geo.creaseLines.length+geo.creaseCurves.length,perf:geo.perfLines.length+geo.perfCurves.length,glue:geo.glueLines.length+geo.glueCurves.length}}
