import bwip from '../vendor/bwip-js/bwip-js-gen.mjs';
import {renderTemplate,isPackageNoticeVisible} from './variables.js';

export const CODE_TYPES_V72=Object.freeze([
 ['code128','Code 128','条形码','ITEM-2026-001'],['code39','Code 39','条形码','ITEM-001'],['code93','Code 93','条形码','BOX-2026'],
 ['ean13','EAN-13','商品码','6901234567892'],['ean8','EAN-8','商品码','96385074'],['upca','UPC-A','商品码','012345678905'],
 ['itf14','ITF-14','运输码','10012345678902'],['gs1-128','GS1-128','运输码','(01)09501101530003(10)LOT001'],
 ['qrcode','QR 二维码','二维码','https://example.com/box/ITEM-001'],['datamatrix','Data Matrix','二维码','BOX-2026-001'],
 ['pdf417','PDF417','二维码','BOX-2026-001'],['azteccode','Aztec','二维码','BOX-2026-001'],
].map(([id,label,category,example])=>Object.freeze({id,label,category,example})));
export const codeTypeV72=id=>CODE_TYPES_V72.find(t=>t.id===id);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cache=new Map();
function rawCode(type,value){const key=JSON.stringify([type,value]);if(cache.has(key))return cache.get(key);let raw;try{raw=bwip.raw({bcid:type,text:value,includetext:false,...(type==='code93'?{includecheck:true}:{}),...(type==='qrcode'?{eclevel:'M'}:{})})[0];}catch(e){throw new Error('编码无效：'+String(e?.message||e).replace(/^bwipp\.[^:]+:\s*/,''));}if(!raw||(!raw.pixs&&!raw.sbs))throw new Error('此编码不能生成。');if(cache.size>=80)cache.delete(cache.keys().next().value);cache.set(key,raw);return raw;}
export function generatedCodeLayoutV72(el,variables={}){
 const type=codeTypeV72(el.codeType);if(!type)throw new Error('请选择有效的编码类型。');
 let value=renderTemplate(el.codeValue,variables);if(!value.trim())throw new Error('请输入编码内容。');if(value.length>2048)throw new Error('编码内容不能超过 2048 个字符。');
 if(type.id==='code39')value=value.toUpperCase();
 const lengths={ean13:13,ean8:8,upca:12,itf14:14},length=lengths[type.id];
 if(length){if(!/^\d+$/.test(value)||![length-1,length].includes(value.length))throw new Error(`${type.label} 需输入 ${length-1} 位数字自动补校验位，或 ${length} 位完整编码。`);if(value.length===length-1){const sum=[...value].reverse().reduce((a,c,i)=>a+Number(c)*(i%2?1:3),0);value+=(10-sum%10)%10;}}
 const w=Number(el.w),h=Number(el.h);if(!Number.isFinite(w)||!Number.isFinite(h)||w<8||h<8||w>1500||h>1500)throw new Error('编码宽高需为 8–1500 mm。');
 const raw=rawCode(type.id,value),rects=[];let module,label='',fontSize=0;
 if(raw.pixs){
  // Keep rectangular PDF417 modules at the encoder's native aspect ratio.
  const q=type.id==='qrcode'?4:type.id==='datamatrix'?2:2,ratio=raw.height/raw.pixy/(raw.width/raw.pixx),cols=raw.pixx+2*q,rows=(raw.pixy+2*q)*ratio;
  module=Math.min(w/cols,h/rows);const ox=(w-cols*module)/2+q*module,oy=(h-rows*module)/2+q*module*ratio;
  for(let y=0;y<raw.pixy;y++){let start=-1;for(let x=0;x<=raw.pixx;x++){const black=x<raw.pixx&&raw.pixs[y*raw.pixx+x];if(black&&start<0)start=x;if(!black&&start>=0){rects.push({x:ox+start*module,y:oy+y*module*ratio,w:(x-start)*module,h:module*ratio});start=-1;}}}
 }else{
  const quiet=12,units=raw.sbs.reduce((a,b)=>a+b,0);module=w/(units+quiet*2);fontSize=el.codeShowText===false?0:Math.min(4,h*.13);const bottom=Math.max(1,fontSize*1.6),barH=h-bottom-1,maxHeight=Math.max(...raw.bhs.map((n,i)=>n+(raw.bbs[i]||0)));if(barH<5)throw new Error('条形码高度不足，请增加高度。');
  let x=quiet*module;for(let i=0;i<raw.sbs.length;i++){if(i%2===0){const j=i/2,offset=raw.bbs[j]||0,hh=raw.bhs[j];rects.push({x,y:1+barH*(1-(hh+offset)/maxHeight),w:raw.sbs[i]*module,h:barH*hh/maxHeight});}x+=raw.sbs[i]*module;}
  label=el.codeShowText===false?'':value;
  if(type.id==='itf14'){const thickness=Math.max(module,1);rects.push({x:quiet*module,y:1,w:units*module,h:thickness},{x:quiet*module,y:1+barH-thickness,w:units*module,h:thickness});}
 }
 const minimum=raw.pixs ? .4 : .254;
 if(module<minimum-1e-6)throw new Error(`编码过密：模块 ${module.toFixed(3)} mm，需至少 ${minimum} mm；请增大尺寸或缩短内容。`);
 return{type:type.id,value,rects,w,h,module,minimum,label,fontSize,labelY:h-fontSize*.35,matrix:Boolean(raw.pixs),quietModules:raw.pixs?(type.id==='qrcode'?4:2):12};
}
export function generatedCodeSvgV72(el,variables={}){const l=generatedCodeLayoutV72(el,variables),n=v=>+v.toFixed(6);return `<rect width="${l.w}" height="${l.h}" fill="#fff"/><g fill="#000">${l.rects.map(r=>`<rect x="${n(r.x)}" y="${n(r.y)}" width="${n(r.w)}" height="${n(r.h)}"/>`).join('')}</g>${l.label?`<text x="${l.w/2}" y="${l.labelY}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="${l.fontSize}" fill="#000">${escape(l.label)}</text>`:''}`;}
export function generatedCodeFileSvgV72(el,variables={}){return`<svg xmlns="http://www.w3.org/2000/svg" width="${el.w}mm" height="${el.h}mm" viewBox="0 0 ${el.w} ${el.h}">${generatedCodeSvgV72(el,variables)}</svg>`;}
export function validateGeneratedCodeV72(el,variables={}){return generatedCodeLayoutV72(el,variables);}
export function generatedCodeChecksV72(state){
 const visible=(state.elements||[]).filter(e=>!e.hidden&&!state.hiddenGroups?.[e.group]&&!(e.type==='notice'&&!isPackageNoticeVisible(state.variables))),codes=visible.filter(e=>e.type==='generated-code'),errors=[];
 for(const e of codes){try{generatedCodeLayoutV72(e,state.variables||{});}catch(err){errors.push({elementId:e.id,severity:'error',code:'CODE_ENCODING',message:`${e.id}：${err.message}`});}
  if(Number(e.r))errors.push({elementId:e.id,severity:'error',code:'CODE_ROTATION',message:'编码对象请保持正向，避免任意角度旋转。'});
  for(const other of visible)if(other.id!==e.id&&other.panelId===e.panelId&&!other.v61PanelFill&&e.x<other.x+other.w&&e.x+e.w>other.x&&e.y<other.y+other.h&&e.y+e.h>other.y)errors.push({elementId:e.id,severity:'error',code:'CODE_OVERLAP',message:`${e.id} 与 ${other.id} 重叠，请为编码及留白区域保留空间。`});
 }
 return errors;
}
export function insertGeneratedCodeV72(state,config){
 const next=structuredClone(state),e={id:'code-'+(globalThis.crypto?.randomUUID?.()||Date.now().toString(36)),type:'generated-code',group:'marks',panelId:'label',r:0,codeType:config.codeType,codeValue:String(config.codeValue),codeShowText:config.codeShowText!==false,w:Number(config.w),h:Number(config.h)};generatedCodeLayoutV72(e,next.variables);
 if(e.w>next.artboard.width-16||e.h>next.artboard.height-16)throw new Error('当前画布安全区放不下该编码，请增大画布或调整尺寸。');
 const occupied=(next.elements||[]).filter(x=>!x.hidden&&!(x.type==='notice'&&!isPackageNoticeVisible(next.variables))),xs=[8,...occupied.map(o=>o.x+o.w+3)],ys=[8,...occupied.map(o=>o.y+o.h+3)];let found=false;
 for(const y of ys){for(const x of xs){if(x+e.w>next.artboard.width-8||y+e.h>next.artboard.height-8)continue;if(occupied.some(o=>x<o.x+o.w+2&&x+e.w+2>o.x&&y<o.y+o.h+2&&y+e.h+2>o.y))continue;Object.assign(e,{x,y});found=true;break;}if(found)break;}
 if(!found)throw new Error('画布没有足够空白位置，先移动现有对象或使用空白画布。');next.elements.push(e);next.selectedId=e.id;return next;
}
