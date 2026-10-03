import { generateGeometry } from './geometry.js';
import { orderedElements } from './objectOrder.js';
import { parseColor } from './productionAppearance.js';
import { downloadBytes } from './export.js';

const PT=72/25.4;
const f=n=>(Number(n)||0).toFixed(4);
const num=(v,d=0)=>{const n=Number(v);return Number.isFinite(n)?n:d};
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));

function panelPolygon(panel){
  if(Array.isArray(panel?.points)&&panel.points.length>=3)return panel.points.map(p=>[num(p[0]),num(p[1])]);
  const x=num(panel?.x),y=num(panel?.y),w=num(panel?.w),h=num(panel?.h);return[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
}
function matrixFor(el,mark,offsetX=0,offsetY=0){
  const sx=num(el.w,mark.width)/Math.max(.001,num(mark.width,1)),sy=num(el.h,mark.height)/Math.max(.001,num(mark.height,1)),a=num(el.r)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),A=c*sx,B=s*sx,C=-s*sy,D=c*sy,cx=offsetX+num(el.x)+num(el.w)/2,cy=offsetY+num(el.y)+num(el.h)/2,E=cx-A*num(mark.width)/2-C*num(mark.height)/2,F=cy-B*num(mark.width)/2-D*num(mark.height)/2;return[A,B,C,D,E,F];
}
function apply(m,p){return[m[0]*num(p[0])+m[2]*num(p[1])+m[4],m[1]*num(p[0])+m[3]*num(p[1])+m[5]]}
function bbox(points=[]){const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);return{minX:Math.min(...xs),minY:Math.min(...ys),maxX:Math.max(...xs),maxY:Math.max(...ys),w:Math.max(.001,Math.max(...xs)-Math.min(...xs)),h:Math.max(.001,Math.max(...ys)-Math.min(...ys))}}
function pct(v,min,size){const s=String(v??'0').trim();if(s.endsWith('%'))return min+num(s.slice(0,-1))*size/100;return min+num(s)}
function transformContainer(polys,m){return(polys||[]).map(poly=>poly.map(p=>apply(m,p))).filter(poly=>poly.length>=3)}
function colorArray(c){return parseColor(c||'#000').map(x=>clamp(x))}
function stableStops(stops=[]){const list=(stops||[]).map(s=>({offset:clamp(num(s.offset)),color:colorArray(s.color),opacity:clamp(num(s.opacity,1))})).sort((a,b)=>a.offset-b.offset);if(!list.length)return[{offset:0,color:[0,0,0],opacity:1},{offset:1,color:[0,0,0],opacity:1}];if(list.length===1)return[{...list[0],offset:0},{...list[0],offset:1}];if(list[0].offset>0)list.unshift({...list[0],offset:0});if(list.at(-1).offset<1)list.push({...list.at(-1),offset:1});return list}
function gradientCoords(g,primitiveDoc,m){
  const b=bbox(primitiveDoc),objectBox=String(g?.units||'').toLowerCase()!=='userspaceonuse';
  if(g?.type==='radial'){
    if(objectBox){const cx=pct(g.cx??'50%',b.minX,b.w),cy=pct(g.cy??'50%',b.minY,b.h),fx=pct(g.fx??g.cx??'50%',b.minX,b.w),fy=pct(g.fy??g.cy??'50%',b.minY,b.h),r=Math.max(.001,pct(g.r??'50%',0,Math.max(b.w,b.h)));return{type:'radial',coords:[fx,fy,0,cx,cy,r],nonUniform:b.w/b.h>1.02||b.h/b.w>1.02};}
    const c=apply(m,[num(g.cx,0),num(g.cy,0)]),foc=apply(m,[num(g.fx,num(g.cx,0)),num(g.fy,num(g.cy,0))]),edge=apply(m,[num(g.cx,0)+num(g.r,0),num(g.cy,0)]),r=Math.max(.001,Math.hypot(edge[0]-c[0],edge[1]-c[1]));return{type:'radial',coords:[foc[0],foc[1],0,c[0],c[1],r],nonUniform:false};
  }
  if(objectBox)return{type:'axial',coords:[pct(g?.x1??'0%',b.minX,b.w),pct(g?.y1??'0%',b.minY,b.h),pct(g?.x2??'100%',b.minX,b.w),pct(g?.y2??'0%',b.minY,b.h)],nonUniform:false};
  const a=apply(m,[num(g?.x1),num(g?.y1)]),z=apply(m,[num(g?.x2),num(g?.y2)]);return{type:'axial',coords:[a[0],a[1],z[0],z[1]],nonUniform:false};
}
function elementEntries(el,geo){
  const mark=el?.svgMark,a=mark?.appearance;if(!mark||!a?.primitives?.length)return[];const cross=el.type==='cross-panel-artwork',panel=cross?null:geo?.panelMap?.[el.panelId];if(!cross&&!panel)return[];const m=matrixFor(el,mark,cross?0:num(panel.x),cross?0:num(panel.y)),panelClips=cross?Object.values(geo?.panelMap||{}).filter(p=>p&&num(p.w)>0&&num(p.h)>0).map(panelPolygon):[panelPolygon(panel)],out=[];
  for(let i=0;i<a.primitives.length;i++){
    const p=a.primitives[i],points=(p.points||[]).map(q=>apply(m,q));if(points.length<3)continue;const clips=[...panelClips];if(p.clipId)clips.push(...transformContainer(a.clips?.[p.clipId],m));if(p.maskId)clips.push(...transformContainer(a.masks?.[p.maskId],m));const opacity=clamp(num(p.opacity,1));
    if(p.fill?.type==='gradient'){
      const g=a.gradients?.[p.fill.id];if(!g)continue;const coord=gradientCoords(g,points,m),stops=stableStops(g.stops),stopOpacity=stops.map(s=>s.opacity),uniformStopOpacity=Math.max(...stopOpacity)-Math.min(...stopOpacity)<1e-6?stopOpacity[0]:null;out.push({kind:'gradient',source:el.id,zIndex:num(el.zIndex),points,clips,opacity:opacity*(uniformStopOpacity??1),gradient:{type:coord.type,coords:coord.coords,stops},warning:uniformStopOpacity==null?'Per-stop alpha varies; native PDF proof keeps color stops but cannot represent varying stop alpha without a soft mask.':coord.nonUniform?'Radial objectBoundingBox gradient is approximated as a page-space circle in V0.21 PDF proof.':''});
    }else out.push({kind:'solid',source:el.id,zIndex:num(el.zIndex),points,clips,opacity,color:colorArray(p.fill?.color||'#000')});
  }
  return out;
}

export function buildNativePdfV21Plan(state,geo=generateGeometry(state.structure)){
  const ops=[];for(const el of orderedElements(state?.elements||[]))if(el?.type==='svg-symbol'||el?.type==='cross-panel-artwork')ops.push(...elementEntries(el,geo));const gradients=ops.filter(x=>x.kind==='gradient'),solids=ops.filter(x=>x.kind==='solid'),warnings=[...new Set(gradients.map(x=>x.warning).filter(Boolean))];return{geo,ops,stats:{objects:new Set(ops.map(x=>x.source)).size,gradients:gradients.length,axial:gradients.filter(x=>x.gradient.type==='axial').length,radial:gradients.filter(x=>x.gradient.type==='radial').length,solids:solids.length,alpha:ops.filter(x=>x.opacity<.999).length,warnings:warnings.length},warnings};
}

function path(points,pageH){if(!points?.length)return'';let s=`${f(points[0][0]*PT)} ${f((pageH-points[0][1])*PT)} m`;for(let i=1;i<points.length;i++)s+=` ${f(points[i][0]*PT)} ${f((pageH-points[i][1])*PT)} l`;return s+' h';}
function clipCmd(polys,pageH){if(!polys?.length)return'';return polys.map(p=>path(p,pageH)).join(' ')+' W n';}
function concatBytes(chunks){let total=0;for(const c of chunks)total+=c.length;const out=new Uint8Array(total);let at=0;for(const c of chunks){out.set(c,at);at+=c.length}return out}
function rgb(c){return c.map(v=>f(v)).join(' ')}
function makeFunctionObjects(stops,add){
  const segIds=[];for(let i=0;i<stops.length-1;i++){const a=stops[i],b=stops[i+1];segIds.push(add(`<< /FunctionType 2 /Domain [0 1] /C0 [${rgb(a.color)}] /C1 [${rgb(b.color)}] /N 1 >>`));}
  if(segIds.length===1)return segIds[0];const bounds=stops.slice(1,-1).map(s=>f(s.offset)).join(' '),encode=segIds.map(()=> '0 1').join(' ');return add(`<< /FunctionType 3 /Domain [0 1] /Functions [${segIds.map(id=>`${id} 0 R`).join(' ')}] /Bounds [${bounds}] /Encode [${encode}] >>`);
}
function shadingDictionary(g,functionId,pageH){const c=g.coords.map((v,i)=>i%2===1?((pageH-v)*PT):(v*PT));if(g.type==='radial')return`<< /ShadingType 3 /ColorSpace /DeviceRGB /Coords [${c.map(f).join(' ')}] /Function ${functionId} 0 R /Extend [true true] >>`;return`<< /ShadingType 2 /ColorSpace /DeviceRGB /Coords [${c.map(f).join(' ')}] /Function ${functionId} 0 R /Extend [true true] >>`;}

export function buildNativeGradientPdfV21(state,{includePanelOutline=true}={}){
  const plan=buildNativePdfV21Plan(state),pageH=plan.geo.height,pageW=plan.geo.width,objects=[null],add=body=>{objects.push(body);return objects.length-1},shadingRefs=[],alphaRefs=new Map();
  for(const op of plan.ops.filter(x=>x.kind==='gradient')){const fn=makeFunctionObjects(op.gradient.stops,add),sid=add(shadingDictionary(op.gradient,fn,pageH));shadingRefs.push({op,sid,name:`Sh${shadingRefs.length+1}`});}
  const alphaName=opacity=>{const a=clamp(opacity);if(a>=.999)return null;const key=a.toFixed(4);if(!alphaRefs.has(key))alphaRefs.set(key,{name:`GS${alphaRefs.size+1}`,id:add(`<< /Type /ExtGState /ca ${f(a)} /CA ${f(a)} >>`)});return alphaRefs.get(key).name};
  const cmds=['q','1 1 1 rg',`0 0 ${f(pageW*PT)} ${f(pageH*PT)} re f`,'Q'];let gi=0;
  for(const op of plan.ops){cmds.push('q');if(op.clips?.length)cmds.push(clipCmd(op.clips,pageH));cmds.push(path(op.points,pageH),'W n');const an=alphaName(op.opacity);if(an)cmds.push(`/${an} gs`);if(op.kind==='solid')cmds.push(`${rgb(op.color)} rg`,`0 0 ${f(pageW*PT)} ${f(pageH*PT)} re f`);else{const sh=shadingRefs[gi++];cmds.push(`/${sh.name} sh`)}cmds.push('Q');}
  if(includePanelOutline){cmds.push('q','0.65 0.65 0.65 RG','0.35 w');for(const p of Object.values(plan.geo.panelMap||{})){if(!p||num(p.w)<=0||num(p.h)<=0)continue;cmds.push(path(panelPolygon(p),pageH),'S')}cmds.push('Q')}
  const content=cmds.join('\n')+'\n',enc=new TextEncoder(),contentId=add(`<< /Length ${enc.encode(content).length} >>\nstream\n${content}endstream`),pageId=add(''),pagesId=add(''),catalogId=add(''),infoId=add('');
  const shadingRes=shadingRefs.map(x=>`/${x.name} ${x.sid} 0 R`).join(' '),alphaRes=[...alphaRefs.values()].map(x=>`/${x.name} ${x.id} 0 R`).join(' ');objects[pageId]=`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${f(pageW*PT)} ${f(pageH*PT)}] /Resources << /Shading << ${shadingRes} >> /ExtGState << ${alphaRes} >> >> /Contents ${contentId} 0 R >>`;objects[pagesId]=`<< /Type /Pages /Kids [${pageId} 0 R] /Count 1 >>`;objects[catalogId]=`<< /Type /Catalog /Pages ${pagesId} 0 R >>`;objects[infoId]='<< /Producer (BoxStudio V0.21 Native Gradient Proof) /Creator (BoxStudio) /Title (Native PDF Gradient Proof) >>';
  const chunks=[enc.encode('%PDF-1.6\n%BoxStudio V0.21 Native Gradient Proof\n')],offsets=new Array(objects.length).fill(0);let pos=chunks[0].length;for(let i=1;i<objects.length;i++){offsets[i]=pos;const b=enc.encode(`${i} 0 obj\n${objects[i]}\nendobj\n`);chunks.push(b);pos+=b.length}const xref=pos;let tail=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;for(let i=1;i<objects.length;i++)tail+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;tail+=`trailer\n<< /Size ${objects.length} /Root ${catalogId} 0 R /Info ${infoId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;chunks.push(enc.encode(tail));return concatBytes(chunks);
}

export function exportNativeGradientPdfV21(state){downloadBytes('boxstudio-v21-native-gradient-proof.pdf',buildNativeGradientPdfV21(state),'application/pdf')}
