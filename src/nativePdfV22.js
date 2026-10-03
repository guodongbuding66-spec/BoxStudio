import { buildNativePdfV21Plan } from './nativePdfV21.js';
import { crossPanelClipPolygon } from './crossPanelArtwork.js';
import { downloadBytes } from './export.js';

const PT=72/25.4;
const f=n=>(Number(n)||0).toFixed(4);
const num=(v,d=0)=>{const n=Number(v);return Number.isFinite(n)?n:d};
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
function clone(v){return structuredClone(v)}
function panelPolygon(panel){if(Array.isArray(panel?.points)&&panel.points.length>=3)return panel.points.map(p=>[num(p[0]),num(p[1])]);const x=num(panel?.x),y=num(panel?.y),w=num(panel?.w),h=num(panel?.h);return[[x,y],[x+w,y],[x+w,y+h],[x,y+h]]}
function path(points,pageH){if(!points?.length)return'';let s=`${f(points[0][0]*PT)} ${f((pageH-points[0][1])*PT)} m`;for(let i=1;i<points.length;i++)s+=` ${f(points[i][0]*PT)} ${f((pageH-points[i][1])*PT)} l`;return s+' h'}
function clipCmd(polys,pageH){if(!polys?.length)return'';return polys.map(p=>path(p,pageH)).join(' ')+' W n'}
function concatBytes(chunks){let total=0;for(const c of chunks)total+=c.length;const out=new Uint8Array(total);let at=0;for(const c of chunks){out.set(c,at);at+=c.length}return out}
function rgb(c){return(c||[]).map(v=>f(v)).join(' ')}
function gray(v){return f(clamp(v))}
function varyingStopAlpha(stops=[]){if(!stops.length)return false;const a=stops.map(s=>clamp(num(s.opacity,1)));return Math.max(...a)-Math.min(...a)>1e-6}
function makeColorFunction(stops,add){const seg=[];for(let i=0;i<stops.length-1;i++){const a=stops[i],b=stops[i+1];seg.push(add(`<< /FunctionType 2 /Domain [0 1] /C0 [${rgb(a.color)}] /C1 [${rgb(b.color)}] /N 1 >>`))}if(seg.length===1)return seg[0];const bounds=stops.slice(1,-1).map(s=>f(s.offset)).join(' '),encode=seg.map(()=> '0 1').join(' ');return add(`<< /FunctionType 3 /Domain [0 1] /Functions [${seg.map(id=>`${id} 0 R`).join(' ')}] /Bounds [${bounds}] /Encode [${encode}] >>`)}
function makeAlphaFunction(stops,primitiveOpacity,add){const seg=[];for(let i=0;i<stops.length-1;i++){const a=clamp(num(stops[i].opacity,1)*primitiveOpacity),b=clamp(num(stops[i+1].opacity,1)*primitiveOpacity);seg.push(add(`<< /FunctionType 2 /Domain [0 1] /C0 [${gray(a)}] /C1 [${gray(b)}] /N 1 >>`))}if(seg.length===1)return seg[0];const bounds=stops.slice(1,-1).map(s=>f(s.offset)).join(' '),encode=seg.map(()=> '0 1').join(' ');return add(`<< /FunctionType 3 /Domain [0 1] /Functions [${seg.map(id=>`${id} 0 R`).join(' ')}] /Bounds [${bounds}] /Encode [${encode}] >>`)}
function shadingDictionary(g,functionId,pageH,colorSpace='/DeviceRGB'){const c=g.coords.map((v,i)=>i%2===1?((pageH-v)*PT):(v*PT)),type=g.type==='radial'?3:2;return`<< /ShadingType ${type} /ColorSpace ${colorSpace} /Coords [${c.map(f).join(' ')}] /Function ${functionId} 0 R /Extend [true true] >>`}

export function buildNativePdfV22Plan(state){
  const base=buildNativePdfV21Plan(state),next=clone(base),byId=new Map((state?.elements||[]).map(e=>[e.id,e])),warnings=[];
  for(const op of next.ops||[]){const src=byId.get(op.source),clip=src?.type==='cross-panel-artwork'?crossPanelClipPolygon(src):null;if(clip?.length)op.clips=[...(op.clips||[]),clip];if(op.kind==='gradient'&&varyingStopAlpha(op.gradient?.stops))warnings.push(`Soft-mask alpha enabled for ${op.source}.`)}
  next.warnings=[...new Set([...(next.warnings||[]).filter(w=>!String(w).includes('soft mask')), ...warnings])];next.stats={...next.stats,softMasks:(next.ops||[]).filter(op=>op.kind==='gradient'&&varyingStopAlpha(op.gradient?.stops)).length,editableClips:(state?.elements||[]).filter(e=>e.type==='cross-panel-artwork'&&Array.isArray(e.crossClip?.points)&&e.crossClip.points.length>=3).length,warnings:next.warnings.length};return next;
}

export function buildNativeGradientPdfV22(state,{includePanelOutline=true}={}){
  const plan=buildNativePdfV22Plan(state),pageH=plan.geo.height,pageW=plan.geo.width,objects=[null],add=body=>{objects.push(body);return objects.length-1},shadingRefs=[],alphaRefs=new Map(),softMaskRefs=[];
  const alphaName=opacity=>{const a=clamp(opacity);if(a>=.999)return null;const key=a.toFixed(4);if(!alphaRefs.has(key))alphaRefs.set(key,{name:`GS${alphaRefs.size+1}`,id:add(`<< /Type /ExtGState /ca ${f(a)} /CA ${f(a)} >>`)});return alphaRefs.get(key).name};
  for(const op of plan.ops.filter(x=>x.kind==='gradient')){
    const colorFn=makeColorFunction(op.gradient.stops,add),sid=add(shadingDictionary(op.gradient,colorFn,pageH,'/DeviceRGB')),entry={op,sid,name:`Sh${shadingRefs.length+1}`,gs:null};
    if(varyingStopAlpha(op.gradient.stops)){
      const maskFn=makeAlphaFunction(op.gradient.stops,clamp(op.opacity),add),maskSid=add(shadingDictionary(op.gradient,maskFn,pageH,'/DeviceGray')),maskName=`MS${softMaskRefs.length+1}`,maskContent=['q',clipCmd(op.clips,pageH),path(op.points,pageH),'W n',`/${maskName} sh`,'Q'].filter(Boolean).join('\n')+'\n',enc=new TextEncoder(),formId=add(`<< /Type /XObject /Subtype /Form /BBox [0 0 ${f(pageW*PT)} ${f(pageH*PT)}] /Group << /S /Transparency /CS /DeviceGray >> /Resources << /Shading << /${maskName} ${maskSid} 0 R >> >> /Length ${enc.encode(maskContent).length} >>\nstream\n${maskContent}endstream`),gsName=`SM${softMaskRefs.length+1}`,gsId=add(`<< /Type /ExtGState /SMask << /S /Luminosity /G ${formId} 0 R >> >>`);entry.gs=gsName;softMaskRefs.push({name:gsName,id:gsId,formId,maskSid});
    }else entry.gs=alphaName(op.opacity);
    shadingRefs.push(entry);
  }
  const cmds=['q','1 1 1 rg',`0 0 ${f(pageW*PT)} ${f(pageH*PT)} re f`,'Q'];let gi=0;
  for(const op of plan.ops){cmds.push('q');if(op.clips?.length)cmds.push(clipCmd(op.clips,pageH));cmds.push(path(op.points,pageH),'W n');if(op.kind==='solid'){const gs=alphaName(op.opacity);if(gs)cmds.push(`/${gs} gs`);cmds.push(`${rgb(op.color)} rg`,`0 0 ${f(pageW*PT)} ${f(pageH*PT)} re f`)}else{const sh=shadingRefs[gi++];if(sh.gs)cmds.push(`/${sh.gs} gs`);cmds.push(`/${sh.name} sh`)}cmds.push('Q')}
  if(includePanelOutline){cmds.push('q','0.65 0.65 0.65 RG','0.35 w');for(const p of Object.values(plan.geo.panelMap||{})){if(!p||num(p.w)<=0||num(p.h)<=0)continue;cmds.push(path(panelPolygon(p),pageH),'S')}cmds.push('Q')}
  const content=cmds.join('\n')+'\n',enc=new TextEncoder(),contentId=add(`<< /Length ${enc.encode(content).length} >>\nstream\n${content}endstream`),pageId=add(''),pagesId=add(''),catalogId=add(''),infoId=add(''),shadingRes=shadingRefs.map(x=>`/${x.name} ${x.sid} 0 R`).join(' '),allGs=[...alphaRefs.values(),...softMaskRefs].map(x=>`/${x.name} ${x.id} 0 R`).join(' ');
  objects[pageId]=`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${f(pageW*PT)} ${f(pageH*PT)}] /Resources << /Shading << ${shadingRes} >> /ExtGState << ${allGs} >> >> /Contents ${contentId} 0 R >>`;objects[pagesId]=`<< /Type /Pages /Kids [${pageId} 0 R] /Count 1 >>`;objects[catalogId]=`<< /Type /Catalog /Pages ${pagesId} 0 R >>`;objects[infoId]='<< /Producer (BoxStudio V0.22 Native Gradient Soft Mask Proof) /Creator (BoxStudio) /Title (Native PDF Gradient and Soft Mask Proof) >>';
  const chunks=[enc.encode('%PDF-1.7\n%BoxStudio V0.22 Native Gradient Soft Mask Proof\n')],offsets=new Array(objects.length).fill(0);let pos=chunks[0].length;for(let i=1;i<objects.length;i++){offsets[i]=pos;const b=enc.encode(`${i} 0 obj\n${objects[i]}\nendobj\n`);chunks.push(b);pos+=b.length}const xref=pos;let tail=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;for(let i=1;i<objects.length;i++)tail+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;tail+=`trailer\n<< /Size ${objects.length} /Root ${catalogId} 0 R /Info ${infoId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;chunks.push(enc.encode(tail));return concatBytes(chunks);
}

export function exportNativeGradientPdfV22(state){downloadBytes('boxstudio-v22-native-gradient-softmask-proof.pdf',buildNativeGradientPdfV22(state),'application/pdf')}
