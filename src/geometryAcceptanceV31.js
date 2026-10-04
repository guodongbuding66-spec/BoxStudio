import { generateGeometry, resolveElementRect, uniqueLines } from './geometry.js';
import { flattenCurves } from './importDieline.js';
import { isPackageNoticeVisible, renderTemplate } from './variables.js';
import { vectorTextRects } from './vectorText.js';

const PT=72/25.4;
const num=(v,d=0)=>{const n=Number(v);return Number.isFinite(n)?n:d};
const dist=(a,b)=>Math.max(...Object.keys(a).map(k=>Math.abs(num(a[k])-num(b[k]))));
function nearest(expected,candidates,keys){let best=null;for(const c of candidates){const e={},a={};for(const k of keys){e[k]=expected[k];a[k]=c[k];}const error=dist(e,a);if(!best||error<best.error)best={candidate:c,error};}return best;}
function sampleKeyRects(rects=[]){if(rects.length<=3)return rects;return[rects[0],rects[Math.floor(rects.length/2)],rects.at(-1)];}

export function extractPdfGeometryV31(bytes,pageHeightMm){const text=new TextDecoder().decode(bytes),rects=[],lines=[],texts=[];let m;const media=/\/MediaBox\s*\[\s*0\s+0\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\]/.exec(text);const page=media?{w:num(media[1])/PT,h:num(media[2])/PT}:{w:NaN,h:NaN};const rr=/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+re\s+([fS])\b/g;while((m=rr.exec(text))){const x=num(m[1])/PT,yb=num(m[2])/PT,w=num(m[3])/PT,h=num(m[4])/PT;rects.push({x,y:num(pageHeightMm)-yb-h,w,h,paint:m[5]});}const lr=/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+m\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+l\s+S\b/g;while((m=lr.exec(text)))lines.push({x1:num(m[1])/PT,y1:num(pageHeightMm)-num(m[2])/PT,x2:num(m[3])/PT,y2:num(pageHeightMm)-num(m[4])/PT});const tr=/BT\s+\/F\d+\s+(-?\d+(?:\.\d+)?)\s+Tf\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+Td\s*\(/g;while((m=tr.exec(text)))texts.push({sizeMm:num(m[1])/PT,x:num(m[2])/PT,baselineY:num(pageHeightMm)-num(m[3])/PT});return{page,rects,lines,texts,text};}

export function previewGeometryProbesV31(state){
  const geo=generateGeometry(state.structure),visible=(state.elements||[]).filter(e=>!(e.type==='notice'&&!isPackageNoticeVisible(state.variables||{}))),rects=[],texts=[],outlineRects=[],lines=[],rotations=[];
  let outlinedTextVerified=0,ttfOutlineBlocked=0;
  const outline=Boolean(state.exportOptions?.outlineText),fontMode=String(state.exportOptions?.fontMode||'technical');
  for(const el of visible){
    const rr=resolveElementRect(el,geo),x=rr.absX,y=rr.absY,rotation=num(el.r);
    if(Math.abs(rotation)>.001)rotations.push({id:el.id,rotation});
    if(['barcode-qr-group','icon','shape'].includes(el.type))rects.push({id:el.id,x,y,w:num(el.w),h:num(el.h),kind:el.type});
    else if(['text','notice'].includes(el.type)&&!outline)texts.push({id:el.id,x:x+3,baselineY:y+num(el.fontSize,4.5)*1.15,sizeMm:Math.max(3,num(el.fontSize,4.5)*PT)/PT});
    else if(['text','notice'].includes(el.type)&&outline){
      if(fontMode==='technical'){
        const content=renderTemplate(el.template||'',state.variables||{}),glyphRects=vectorTextRects(content,x+3,y,num(el.fontSize,4.5),{bold:Boolean(el.bold)}),samples=sampleKeyRects(glyphRects);
        samples.forEach((r,i)=>outlineRects.push({id:`${el.id}-outline-${i+1}`,elementId:el.id,x:r.x,y:r.y,w:r.w,h:r.h,kind:'outlined-text-keypoint'}));outlinedTextVerified++;
      }else ttfOutlineBlocked++;
    }else if(el.type==='line')lines.push({id:el.id,x1:x,y1:y,x2:x+num(el.w),y2:y+num(el.h),kind:'artwork-line'});
  }
  const dielineSets=[['CUT',geo.cutLines,geo.cutCurves],['CREASE',geo.creaseLines,geo.creaseCurves],['PERF',geo.perfLines,geo.perfCurves],['GLUE',geo.glueLines,geo.glueCurves]];for(const [kind,raw,curves] of dielineSets)for(const l of uniqueLines([...(raw||[]),...flattenCurves(curves||[],32)]))lines.push({id:`${kind}-${lines.length}`,x1:num(l.x1),y1:num(l.y1),x2:num(l.x2),y2:num(l.y2),kind});
  return{geo,page:{w:geo.width,h:geo.height},rects,texts,outlineRects,lines,rotations,crossPanelExcluded:visible.filter(e=>e.type==='cross-panel-artwork').length,outlinedTextVerified,ttfOutlineBlocked};
}

function lineError(a,b){const direct=Math.max(Math.abs(a.x1-b.x1),Math.abs(a.y1-b.y1),Math.abs(a.x2-b.x2),Math.abs(a.y2-b.y2)),reverse=Math.max(Math.abs(a.x1-b.x2),Math.abs(a.y1-b.y2),Math.abs(a.x2-b.x1),Math.abs(a.y2-b.y1));return Math.min(direct,reverse);}
function nearestLine(expected,candidates){let best=null;for(const c of candidates){const error=lineError(expected,c);if(!best||error<best.error)best={candidate:c,error};}return best;}

export function geometryAcceptanceFromProductionPdfV31(state,pdfBytes,{toleranceMm=.2}={}){
  const preview=previewGeometryProbesV31(state),pdf=extractPdfGeometryV31(pdfBytes,preview.geo.height),checks=[];const add=(id,kind,error,detail='')=>checks.push({id,kind,error,ok:Number.isFinite(error)&&error<=toleranceMm,detail});
  add('page','page',Math.max(Math.abs(preview.page.w-pdf.page.w),Math.abs(preview.page.h-pdf.page.h)),`${preview.page.w.toFixed(3)}×${preview.page.h.toFixed(3)} mm`);
  for(const r of preview.rotations)add(`rotation-${r.id}`,'rotation',Infinity,`${r.id} rotation ${r.rotation}° is not represented by the current Production PDF serializer; fail-closed.`);
  const strokeRects=pdf.rects.filter(r=>r.paint==='S'),fillRects=pdf.rects.filter(r=>r.paint==='f');
  for(const p of preview.rects){const hit=nearest(p,strokeRects,['x','y','w','h']);add(p.id,p.kind,hit?.error??Infinity,hit?`PDF ${hit.candidate.x.toFixed(3)},${hit.candidate.y.toFixed(3)} ${hit.candidate.w.toFixed(3)}×${hit.candidate.h.toFixed(3)}`:'No stroked rect match');}
  for(const p of preview.texts){const hit=nearest(p,pdf.texts,['x','baselineY','sizeMm']);add(p.id,'text-anchor',hit?.error??Infinity,hit?`PDF anchor ${hit.candidate.x.toFixed(3)},${hit.candidate.baselineY.toFixed(3)} mm`:'No text anchor match');}
  for(const p of preview.outlineRects){const hit=nearest(p,fillRects,['x','y','w','h']);add(p.id,p.kind,hit?.error??Infinity,hit?`PDF outlined glyph key rect ${hit.candidate.x.toFixed(3)},${hit.candidate.y.toFixed(3)} ${hit.candidate.w.toFixed(3)}×${hit.candidate.h.toFixed(3)}`:'No outlined glyph key rect match');}
  if(preview.ttfOutlineBlocked)add('ttf-outline-readback','outlined-text',Infinity,`${preview.ttfOutlineBlocked} TTF outlined text element(s) cannot yet be independently read back as glyph paths; Production is blocked instead of silently excluding them.`);
  for(const p of preview.lines){const hit=nearestLine(p,pdf.lines);add(p.id,p.kind,hit?.error??Infinity,hit?`PDF line error ${hit.error.toFixed(4)} mm`:'No line match');}
  const failed=checks.filter(x=>!x.ok),maxError=checks.reduce((m,x)=>Number.isFinite(x.error)?Math.max(m,x.error):Infinity,0);return{ok:failed.length===0,toleranceMm,maxErrorMm:maxError,probeCount:checks.length,failedCount:failed.length,checks,failed,crossPanelExcluded:preview.crossPanelExcluded,outlinedTextVerified:preview.outlinedTextVerified,ttfOutlineBlocked:preview.ttfOutlineBlocked,note:'Compares Preview mm geometry with coordinates parsed from the final Production PDF. Technical outlined text is measured from final PDF glyph paint rectangles. Unsupported rotation and unverified TTF outline paths fail closed.'};
}
