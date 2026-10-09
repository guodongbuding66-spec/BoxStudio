// Original vector artwork. Parameters and paths are shared by SVG, PDF and 3D.
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
const M=(x,y)=>['M',x,y],L=(x,y)=>['L',x,y],C=(...v)=>['C',...v],Z=()=>['Z'];
const line=(x,y,a,b)=>[M(x,y),L(a,b)],box=(x,y,w,h)=>[M(x,y),L(x+w,y),L(x+w,y+h),L(x,y+h),Z()];
const circle=(x,y,r)=>[M(x+r,y),C(x+r,y+r*.552,x+r*.552,y+r,x,y+r),C(x-r*.552,y+r,x-r,y+r*.552,x-r,y),C(x-r,y-r*.552,x-r*.552,y-r,x,y-r),C(x+r*.552,y-r,x+r,y-r*.552,x+r,y)];
const slash=()=>line(.17,.83,.83,.17);
const segments={a:[0,0,1,0],b:[1,0,1,.5],c:[1,.5,1,1],d:[0,1,1,1],e:[0,.5,0,1],f:[0,0,0,.5],g:[0,.5,1,.5]};
const digits={'0':'abcdef','1':'bc','2':'abdeg','3':'abcdg','4':'bcfg','5':'acdfg','6':'acdefg','7':'abc','8':'abcdefg','9':'abcdfg','-':'g','C':'adef'};
const units={m:[M(0,1),L(0,.4),L(.5,.4),L(.5,1),M(.5,.4),L(1,.4),L(1,1)],k:[M(0,0),L(0,1),M(0,.65),L(1,.25),M(.4,.5),L(1,1)],g:[M(1,.4),L(.1,.4),L(0,.5),L(0,.7),L(.1,.8),L(1,.8),M(1,.4),L(1,1),L(0,1)]};
function number(text,x,y,w,h){const chars=String(text),step=w/chars.length,ops=[];for(let i=0;i<chars.length;i++){if(chars[i]==='.'){ops.push(...line(x+i*step+.2*step,y+h,x+i*step+.4*step,y+h));continue;}if(units[chars[i]]){ops.push(...units[chars[i]].map(([op,a,b])=>[op,x+i*step+a*step*.65,y+b*h]));continue;}for(const key of digits[chars[i]]||''){const[a,b,c,d]=segments[key];ops.push(...line(x+i*step+a*step*.65,y+b*h,x+i*step+c*step*.65,y+d*h));}}return ops;}
export function handlingPathsV72(el){
 const p=handlingParamsV72(el),up=[...line(.32,.72,.32,.27),...line(.22,.42,.32,.27),...line(.32,.27,.42,.42),...line(.68,.72,.68,.27),...line(.58,.42,.68,.27),...line(.68,.27,.78,.42)];
 const glass=[M(.28,.18),L(.72,.18),L(.61,.48),L(.39,.48),Z(),...line(.5,.48,.5,.78),...line(.34,.78,.66,.78)];
 const umbrella=[M(.18,.48),C(.393333,.16,.606667,.16,.82,.48),Z(),M(.5,.48),L(.5,.78),C(.58,.86,.646667,.86,.7,.78)];
 const clamp=[...box(.34,.33,.32,.35),...line(.15,.32,.15,.7),...line(.85,.32,.85,.7),...line(.15,.51,.29,.51),...line(.85,.51,.71,.51)];
 const roll=[...box(.36,.39,.28,.25),M(.18,.45),C(.1,.8,.85,.9,.86,.5),...line(.86,.5,.74,.61),...line(.86,.5,.92,.64)];
 const truck=[...box(.43,.25,.3,.35),...line(.27,.2,.34,.7),...line(.34,.7,.75,.7),...circle(.37,.77,.07)];
 const paths={up,fragile:glass,dry:umbrella,
  stackLimit:[...box(.28,.67,.44,.16),...line(.2,.56,.8,.56),...number(p.stackLimit,.38,.17,.3,.25)],
  stackHeight:[...box(.21,.62,.4,.19),...line(.75,.22,.75,.8),...line(.67,.31,.75,.22),...line(.75,.22,.83,.31),...line(.67,.71,.75,.8),...line(.75,.8,.83,.71),...number(p.stackHeight+'m',.16,.2,.48,.21)],
  stackWeight:[...box(.27,.66,.46,.17),...line(.19,.55,.81,.55),...number(p.stackWeight,.22,.17,.62,.21),...number('kg',.4,.42,.23,.09)],
  noStack:[...box(.28,.64,.44,.17),...box(.28,.39,.44,.17),...box(.28,.14,.44,.17),...slash()],
  noHooks:[M(.4,.2),L(.6,.2),L(.6,.54),C(.6,.83,.25,.83,.3,.57),...slash()],
  noClamp:[...clamp,...slash()],clampHere:[...clamp,...line(.23,.43,.3,.51),...line(.23,.59,.3,.51),...line(.77,.43,.7,.51),...line(.77,.59,.7,.51)],
  slingHere:[...box(.29,.38,.42,.36),...line(.29,.62,.5,.17),...line(.71,.62,.5,.17),...circle(.5,.17,.055)],
  centerGravity:[...circle(.5,.5,.25),...line(.13,.5,.87,.5),...line(.5,.13,.5,.87),...circle(.5,.5,.07)],
  protectHeat:[...box(.25,.55,.5,.27),...circle(.5,.27,.1),...line(.5,.1,.5,.05),...line(.34,.17,.29,.12),...line(.66,.17,.71,.12),...line(.33,.31,.24,.31),...line(.67,.31,.76,.31),...line(.28,.48,.74,.48)],
  temperature:[...box(.17,.22,.08,.39),...circle(.21,.69,.12),...line(.21,.32,.21,.69),...number(p.temperatureMax+'C',.43,.2,.44,.2),...number(p.temperatureMin+'C',.43,.61,.44,.2)],
  noRoll:[...roll,...slash()],noHandTruck:[...truck,...slash()],
  recycle:[M(.33,.23),L(.5,.12),L(.68,.41),...line(.68,.41,.53,.37),...line(.68,.41,.71,.26),M(.77,.52),L(.8,.72),L(.43,.72),...line(.43,.72,.53,.62),...line(.43,.72,.54,.81),M(.3,.77),L(.14,.67),L(.33,.34),...line(.33,.34,.35,.49),...line(.33,.34,.18,.38)]};
 return paths[el.icon];
}
export function handlingSvgV72(el){const path=handlingPathsV72(el).map(([op,...v])=>op+v.map((n,i)=>+(n*(i%2?el.h:el.w)).toFixed(5)).join(' ')).join(' '),stroke=Math.max(.3,Math.min(el.w,el.h)*.025);return`<rect width="${el.w}" height="${el.h}" fill="none" stroke="#111" stroke-width="${stroke*.65}"/><path d="${path}" fill="none" stroke="#111" stroke-width="${stroke}" stroke-linejoin="round" stroke-linecap="round"/>`;}
export function handlingPdfV72(el,x,y,pageH,pt){const f=n=>+n.toFixed(4),stroke=Math.max(.3,Math.min(el.w,el.h)*.025),out=['q 0 0 0 1 K 0 0 0 1 k [] 0 d 1 J 1 j',`${f(stroke*.65*pt)} w ${f(x*pt)} ${f((pageH-y-el.h)*pt)} ${f(el.w*pt)} ${f(el.h*pt)} re S`,`${f(stroke*pt)} w`];for(const[op,...v]of handlingPathsV72(el))out.push(op==='Z'?'h':v.map((n,i)=>f((i%2?pageH-y-n*el.h:x+n*el.w)*pt)).join(' ')+({M:' m',L:' l',C:' c'}[op]));out.push('S Q');return out;}
export function paintHandlingV72(ctx,el,sx,sy){ctx.save();ctx.translate(el.x*sx,el.y*sy);ctx.scale(el.w*sx,el.h*sy);ctx.strokeStyle='#111';ctx.lineWidth=.025;ctx.lineJoin='round';ctx.lineCap='round';ctx.strokeRect(0,0,1,1);ctx.beginPath();for(const[op,...v]of handlingPathsV72(el)){if(op==='M')ctx.moveTo(...v);else if(op==='L')ctx.lineTo(...v);else if(op==='C')ctx.bezierCurveTo(...v);else ctx.closePath();}ctx.stroke();ctx.restore();}
