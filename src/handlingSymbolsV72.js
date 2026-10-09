// Public-domain / CC0 source artwork; shared by SVG, PDF and Canvas.
import {HANDLING_ART_V73 as art,HANDLING_GLYPHS_V73 as glyphs} from './handlingArtworkV73.js';
export const HANDLING_SYMBOLS_V72=Object.freeze([
 ['up','向上','方向'],['fragile','小心轻放','保护'],['dry','怕雨 / 保持干燥','保护'],
 ['stackLimit','堆码层数上限','堆码'],['stackHeight','最大堆码高度','堆码'],['stackWeight','堆码重量上限','堆码'],['noStack','禁止堆码','堆码'],
 ['noHooks','禁止手钩','搬运'],['noClamp','禁止夹持','搬运'],['clampHere','由此夹持','搬运'],['slingHere','由此吊起','搬运'],['centerGravity','重心位置','搬运'],
 ['protectHeat','怕晒 / 远离热源','保护'],['temperature','温度范围','保护'],['noRoll','禁止翻滚','搬运'],['noHandTruck','禁止手推车','搬运'],['recycle','回收标识','回收'],
].map(([id,label,category])=>Object.freeze({id,label,category})));
export const handlingSymbolV72=id=>HANDLING_SYMBOLS_V72.find(s=>s.id===id);
export function handlingParamsV72(el){
 const int=(key,min,max,fallback)=>{const n=Number(el[key]??fallback);if(!Number.isInteger(n)||n<min||n>max)throw new Error(`${key} 需为 ${min}–${max} 的整数。`);return n;};
 const range=(key,min,max,fallback)=>{const n=Number(el[key]??fallback);if(!Number.isFinite(n)||n<min||n>max)throw new Error(`${key} 需为 ${min}–${max} 的数字。`);return n;};
 if(!handlingSymbolV72(el.icon))throw new Error('搬运标识无效。');
 const p={};if(el.icon==='stackLimit')p.stackLimit=int('stackLimit',1,99,5);
 if(el.icon==='stackHeight')p.stackHeight=range('stackHeight',.1,20,1.8);
 if(el.icon==='stackWeight')p.stackWeight=int('stackWeight',1,9999,500);
 if(el.icon==='temperature'){p.temperatureMin=int('temperatureMin',-99,99,-10);p.temperatureMax=int('temperatureMax',-99,99,40);if(p.temperatureMin>=p.temperatureMax)throw new Error('最低温度必须小于最高温度。');}
 return p;
}
const mapOps=(ops,x,y,w,h)=>ops.map(([op,...v])=>[op,...v.map((n,i)=>(i%2?y+n*h:x+n*w))]);
const place=(paths,x,y,w,h)=>paths.map(p=>({...p,ops:mapOps(p.ops,x,y,w,h),stroke:p.stroke*Math.min(w,h)}));
function label(text,x,y,w,h){
 const chars=Array.from(String(text)),advance=chars.reduce((a,c)=>a+glyphs[c].advance,0),scale=Math.min(w/advance,h/.8);let cursor=x+(w-advance*scale)/2;const ops=[];
 for(const c of chars){const g=glyphs[c];ops.push(...mapOps(g.ops,cursor,y+h,scale,scale));cursor+=g.advance*scale;}
 return {ops,fill:true,rule:'nonzero',stroke:0};
}
function subpaths(p){const rows=[];for(const op of p.ops){if(op[0]==='M')rows.push({...p,ops:[]});rows.at(-1)?.ops.push(op);}return rows;}
const importedBox=subpaths(art.stackWeight[0]).at(-1);
function fitPaths(paths,x,y,w,h){const coords=paths.flatMap(p=>p.ops.flatMap(op=>op.slice(1))),xs=coords.filter((v,i)=>i%2===0),ys=coords.filter((v,i)=>i%2),a=Math.min(...xs),b=Math.min(...ys),sw=Math.max(...xs)-a,sh=Math.max(...ys)-b;return paths.map(p=>({...p,stroke:p.stroke*Math.min(w/sw,h/sh),ops:p.ops.map(([op,...v])=>[op,...v.map((n,i)=>i%2?y+(n-b)/sh*h:x+(n-a)/sw*w)])}));}
function unitBox(x,y,w,h){const values=importedBox.ops.flatMap(([op,...v])=>v),xs=values.filter((v,i)=>i%2===0),ys=values.filter((v,i)=>i%2),minX=Math.min(...xs),minY=Math.min(...ys),sw=Math.max(...xs)-minX,sh=Math.max(...ys)-minY;return{...importedBox,ops:importedBox.ops.map(([op,...v])=>[op,...v.map((n,i)=>i%2?y+(n-minY)/sh*h:x+(n-minX)/sw*w)])};}
export function handlingPrimitivesV73(el){
 const p=handlingParamsV72(el);
 if(el.icon==='stackWeight')return [...place(art.stackWeight,.08,.37,.84,.57),label(p.stackWeight+'kg',.07,.06,.86,.2)];
 if(el.icon==='stackLimit')return [unitBox(.27,.63,.46,.25),{...unitBox(.27,.38,.46,.2),fill:false,stroke:.03},label(p.stackLimit,.3,.06,.4,.22)];
 if(el.icon==='stackHeight'){const arrow=subpaths(art.up[0])[0],down={...arrow,ops:mapOps(arrow.ops,1,1,-1,-1)};return [unitBox(.15,.63,.4,.25),{...unitBox(.15,.4,.4,.18),fill:false,stroke:.03},...fitPaths([arrow],.67,.39,.16,.22),...fitPaths([down],.67,.67,.16,.22),label(p.stackHeight+'m',.08,.06,.84,.22)];}
 if(el.icon==='noStack')return [unitBox(.27,.65,.46,.24),{...unitBox(.27,.37,.46,.22),fill:false,stroke:.03},...fitPaths(art.noClamp.filter(q=>!q.fill),.23,.3,.54,.36)];
 if(el.icon==='temperature')return [...place(art.temperature,.22,.12,.56,.76),label(p.temperatureMax+'°C',.61,.08,.37,.17),label(p.temperatureMin+'°C',.02,.7,.4,.17)];
 return art[el.icon];
}
// Compatibility for old callers that inspect vector geometry.
export const handlingPathsV72=el=>handlingPrimitivesV73(el).flatMap(p=>p.ops);
const physical=el=>{const size=Math.min(el.w,el.h);return handlingPrimitivesV73(el).map(p=>({...p,stroke:p.stroke*size,ops:mapOps(p.ops,(el.w-size)/2,(el.h-size)/2,size,size)}));};
const f=n=>+n.toFixed(5);
export function handlingSvgV72(el){return physical(el).map(p=>`<path data-handling-art="v73" d="${p.ops.map(([op,...v])=>op+v.map(f).join(' ')).join(' ')}" fill="${p.fill?'#111':'none'}" fill-rule="${p.rule}" stroke="${p.stroke?'#111':'none'}" stroke-width="${f(p.stroke)}" stroke-linecap="${p.cap||'butt'}" stroke-linejoin="${p.join||'miter'}"/>`).join('');}
export function handlingPdfV72(el,x,y,pageH,pt){const out=['q 0 0 0 1 K 0 0 0 1 k [] 0 d'];for(const p of physical(el)){out.push(`${f(p.stroke*pt)} w ${{butt:0,round:1,square:2}[p.cap]||0} J ${{miter:0,round:1,bevel:2}[p.join]||0} j`);for(const[op,...v]of p.ops)out.push(op==='Z'?'h':v.map((n,i)=>f((i%2?pageH-y-n:x+n)*pt)).join(' ')+({M:' m',L:' l',C:' c'}[op]));out.push(p.fill?(p.stroke?(p.rule==='evenodd'?'B*':'B'):(p.rule==='evenodd'?'f*':'f')):'S');}out.push('Q');return out;}
export function paintHandlingV72(ctx,el,sx,sy){ctx.save();ctx.translate(el.x*sx,el.y*sy);ctx.scale(sx,sy);ctx.fillStyle='#111';ctx.strokeStyle='#111';for(const p of physical(el)){ctx.lineWidth=p.stroke;ctx.lineJoin=p.join||'miter';ctx.lineCap=p.cap||'butt';ctx.beginPath();for(const[op,...v]of p.ops){if(op==='M')ctx.moveTo(...v);else if(op==='L')ctx.lineTo(...v);else if(op==='C')ctx.bezierCurveTo(...v);else ctx.closePath();}if(p.fill)ctx.fill(p.rule);if(p.stroke)ctx.stroke();}ctx.restore();}
