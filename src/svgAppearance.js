import { IDENTITY, multiplyMatrix, applyMatrix, parseTransform } from './importDieline.js';

export const SVG_APPEARANCE_SCHEMA='boxstudio-svg-appearance';
export const SVG_APPEARANCE_VERSION=1;

function num(v,d=0){const n=Number(v);return Number.isFinite(n)?n:d}
function attrsOf(tag=''){const out={};const re=/([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;let m;while((m=re.exec(tag)))out[m[1].toLowerCase()]=m[2]??m[3]??m[4]??'';return out}
function styleMap(style=''){const out={};for(const part of String(style).split(';')){const i=part.indexOf(':');if(i>0)out[part.slice(0,i).trim().toLowerCase()]=part.slice(i+1).trim()}return out}
function points(value=''){const n=String(value).trim().split(/[\s,]+/).map(Number).filter(Number.isFinite),out=[];for(let i=0;i+1<n.length;i+=2)out.push([n[i],n[i+1]]);return out}
function transformPoints(list,m){return list.map(([x,y])=>applyMatrix(m,num(x),num(y)))}
function boundsOfPoints(list=[]){if(!list.length)return null;const xs=list.map(p=>p[0]),ys=list.map(p=>p[1]);return{minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)}}
function normalizePoints(list,b){return list.map(([x,y])=>[x-b.minX,y-b.minY])}
function parseOpacity(v,d=1){const n=Number(v);return Number.isFinite(n)?Math.max(0,Math.min(1,n)):d}
function parseOffset(v){const s=String(v??'0').trim();if(s.endsWith('%'))return Math.max(0,Math.min(1,parseFloat(s)/100));return Math.max(0,Math.min(1,num(s)))}
function paintRef(v=''){const s=String(v).trim();const m=s.match(/^url\(\s*#([^\s)]+)\s*\)$/i);return m?m[1]:null}
function cssValue(a,s,key){return a[key]??s[key]}
function presentation(a,parent={}){const s=styleMap(a.style||''),fillRaw=cssValue(a,s,'fill'),strokeRaw=cssValue(a,s,'stroke'),clipRaw=cssValue(a,s,'clip-path'),maskRaw=cssValue(a,s,'mask');return{
  fillSpecified:fillRaw!=null?true:Boolean(parent.fillSpecified),
  fill:fillRaw!=null?fillRaw:parent.fill,
  stroke:strokeRaw!=null?strokeRaw:parent.stroke,
  opacity:parseOpacity(cssValue(a,s,'opacity'),parent.opacity??1),
  fillOpacity:parseOpacity(cssValue(a,s,'fill-opacity'),parent.fillOpacity??1),
  strokeOpacity:parseOpacity(cssValue(a,s,'stroke-opacity'),parent.strokeOpacity??1),
  strokeWidth:num(cssValue(a,s,'stroke-width'),parent.strokeWidth??1),
  clipId:paintRef(clipRaw)||parent.clipId||null,
  maskId:paintRef(maskRaw)||parent.maskId||null,
};}
function primitivePolygon(name,a){
  if(name==='rect'){const x=num(a.x),y=num(a.y),w=num(a.width),h=num(a.height);return w>0&&h>0?[[x,y],[x+w,y],[x+w,y+h],[x,y+h]]:[]}
  if(name==='polygon')return points(a.points)
  if(name==='circle'||name==='ellipse'){const cx=num(a.cx),cy=num(a.cy),rx=name==='circle'?num(a.r):num(a.rx),ry=name==='circle'?num(a.r):num(a.ry);if(rx<=0||ry<=0)return[];const out=[];for(let i=0;i<48;i++){const q=Math.PI*2*i/48;out.push([cx+Math.cos(q)*rx,cy+Math.sin(q)*ry])}return out}
  return[];
}
function parseSimplePathPolygon(d=''){
  const tokens=String(d).match(/[MLHVZmlhvz]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g)||[];let i=0,cmd='',x=0,y=0,sx=0,sy=0;const out=[],next=()=>Number(tokens[i++]),isCmd=t=>/^[MLHVZmlhvz]$/.test(t||'');
  while(i<tokens.length){if(isCmd(tokens[i]))cmd=tokens[i++];if(!cmd)return null;const rel=cmd===cmd.toLowerCase(),u=cmd.toUpperCase();if(u==='M'){let nx=next(),ny=next();if(rel){nx+=x;ny+=y}x=nx;y=ny;sx=x;sy=y;out.push([x,y]);cmd=rel?'l':'L'}else if(u==='L'){let nx=next(),ny=next();if(rel){nx+=x;ny+=y}x=nx;y=ny;out.push([x,y])}else if(u==='H'){let nx=next();if(rel)nx+=x;x=nx;out.push([x,y])}else if(u==='V'){let ny=next();if(rel)ny+=y;y=ny;out.push([x,y])}else if(u==='Z'){x=sx;y=sy;return out.length>=3?out:null}else return null}
  return null;
}
function gradientStops(body=''){const out=[];for(const m of body.matchAll(/<\s*stop\b[^>]*>/gi)){const a=attrsOf(m[0]),s=styleMap(a.style||''),color=a['stop-color']??s['stop-color']??'#000',opacity=parseOpacity(a['stop-opacity']??s['stop-opacity'],1);out.push({offset:parseOffset(a.offset),color,opacity})}return out.length?out:[{offset:0,color:'#000',opacity:1},{offset:1,color:'#000',opacity:1}]}
function parseGradients(text){const out={};for(const m of text.matchAll(/<\s*(linearGradient|radialGradient)\b([^>]*)>([\s\S]*?)<\s*\/\s*\1\s*>/gi)){const kind=m[1].toLowerCase(),a=attrsOf(m[2]),id=a.id;if(!id)continue;if(kind==='lineargradient')out[id]={id,type:'linear',x1:a.x1??'0%',y1:a.y1??'0%',x2:a.x2??'100%',y2:a.y2??'0%',units:a.gradientunits||'objectBoundingBox',stops:gradientStops(m[3])};else out[id]={id,type:'radial',cx:a.cx??'50%',cy:a.cy??'50%',r:a.r??'50%',fx:a.fx??a.cx??'50%',fy:a.fy??a.cy??'50%',units:a.gradientunits||'objectBoundingBox',stops:gradientStops(m[3])}}return out}
function parseShapeContainer(body=''){const shapes=[];for(const m of body.matchAll(/<\s*(rect|polygon|circle|ellipse)\b[^>]*>/gi)){const a=attrsOf(m[0]),poly=primitivePolygon(m[1].toLowerCase(),a);if(poly.length>=3)shapes.push(poly)}return shapes}
function parseContainers(text,tag){const out={};const re=new RegExp(`<\\s*${tag}\\b([^>]*)>([\\s\\S]*?)<\\s*\\/\\s*${tag}\\s*>`,'gi');for(const m of text.matchAll(re)){const a=attrsOf(m[1]),id=a.id;if(id)out[id]=parseShapeContainer(m[2])}return out}
function hasUnsupportedCss(text){return /<\s*style\b/i.test(text)}
function normalizeContainerMap(map,b){const out={};for(const [id,polys] of Object.entries(map))out[id]=polys.map(p=>normalizePoints(p,b));return out}

export function parseSvgAppearance(svgText,{bounds=null,maxPrimitives=2000}={}){
  const text=String(svgText||''),warnings=[],gradients=parseGradients(text),rawClips=parseContainers(text,'clipPath'),rawMasks=parseContainers(text,'mask');if(hasUnsupportedCss(text))warnings.push('Embedded <style> CSS is not evaluated; inline/presentation attributes only.');
  const rootStyle={fillSpecified:false,fill:null,stroke:null,opacity:1,fillOpacity:1,strokeOpacity:1,strokeWidth:1,clipId:null,maskId:null},stack=[{matrix:[...IDENTITY],style:rootStyle,hidden:false}],primitives=[];const tokens=text.match(/<!--[^]*?-->|<\/?[^>]+>/g)||[];
  for(const token of tokens){if(token.startsWith('<!--'))continue;const closing=/^<\s*\//.test(token),mm=token.match(/^<\s*\/?\s*([\w:-]+)/),name=mm?.[1]?.toLowerCase();if(!name)continue;if(['defs','lineargradient','radialgradient','clippath','mask'].includes(name)){if(!closing&&!/\/\s*>$/.test(token))stack.push({...stack.at(-1),definition:true});else if(closing&&stack.length>1)stack.pop();continue}if(stack.at(-1)?.definition){if(closing&&stack.length>1)stack.pop();continue}if(closing){if((name==='g'||name==='svg')&&stack.length>1)stack.pop();continue}
    const a=attrsOf(token),parent=stack.at(-1),sm=styleMap(a.style||''),hidden=parent.hidden||a.display==='none'||a.visibility==='hidden'||/display\s*:\s*none|visibility\s*:\s*hidden/.test(String(a.style||'').toLowerCase()),matrix=multiplyMatrix(parent.matrix,parseTransform(a.transform||'')),style=presentation(a,parent.style),self=/\/\s*>$/.test(token);if((name==='g'||name==='svg')&&!self){stack.push({matrix,style,hidden});continue}if(hidden)continue;
    let poly=primitivePolygon(name,a);if(name==='path'&&style.fillSpecified&&String(style.fill||'').toLowerCase()!=='none'){poly=parseSimplePathPolygon(a.d||'')||[];if(!poly.length)warnings.push('A filled curved/complex path remains outline-only in V0.18 appearance proof.')}if(poly.length>=3&&style.fillSpecified&&String(style.fill||'').toLowerCase()!=='none'){const transformed=transformPoints(poly,matrix),ref=paintRef(style.fill),fill=ref?{type:'gradient',id:ref}:{type:'solid',color:String(style.fill)};primitives.push({kind:'polygon',points:transformed,fill,opacity:style.opacity*style.fillOpacity,clipId:style.clipId,maskId:style.maskId});if(primitives.length>maxPrimitives)throw new Error(`SVG appearance exceeds ${maxPrimitives} filled primitives.`)}
  }
  const b=bounds||(()=>{const all=primitives.flatMap(p=>p.points);const q=boundsOfPoints(all);return q||{minX:0,minY:0,maxX:1,maxY:1}})();const normalized=primitives.map(p=>({...p,points:normalizePoints(p.points,b)}));const clips=normalizeContainerMap(rawClips,b),masks=normalizeContainerMap(rawMasks,b);const usedGradients=new Set(normalized.filter(p=>p.fill?.type==='gradient').map(p=>p.fill.id));for(const id of usedGradients)if(!gradients[id])warnings.push(`Gradient #${id} was referenced but not found.`);for(const p of normalized){if(p.clipId&&!clips[p.clipId])warnings.push(`clipPath #${p.clipId} is unsupported or empty.`);if(p.maskId&&!masks[p.maskId])warnings.push(`mask #${p.maskId} is unsupported or empty.`)}
  return{schema:SVG_APPEARANCE_SCHEMA,schemaVersion:SVG_APPEARANCE_VERSION,primitives:normalized,gradients,clips,masks,warnings:[...new Set(warnings)],hasPaintedFill:normalized.length>0};
}

export function appearanceStats(appearance){const p=appearance?.primitives||[],gradientIds=new Set(p.filter(x=>x.fill?.type==='gradient').map(x=>x.fill.id)),clipIds=new Set(p.map(x=>x.clipId).filter(Boolean)),maskIds=new Set(p.map(x=>x.maskId).filter(Boolean));return{primitives:p.length,gradients:gradientIds.size,clips:clipIds.size,masks:maskIds.size,warnings:(appearance?.warnings||[]).length};}
