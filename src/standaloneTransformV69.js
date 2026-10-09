import {BARCODE_SIZES_V70,BARCODE_SIZE_MESSAGE_V70} from './barcodeGroupV70.js';
import {visibleMarkElementsV67} from './standaloneMarksV67.js';

const round=n=>Math.round(n*1000)/1000;
export function resizeStandaloneMarkV69(state,id,corner,dx,dy,{preserveAspect=false}={}){
 const source=visibleMarkElementsV67(state).find(e=>e.id===id);
 if(!source)throw new Error('请选择可见对象。');
 if(source.locked)throw new Error('图层已锁定，请先解锁。');
 if(!['nw','ne','sw','se'].includes(corner)||![dx,dy].every(Number.isFinite))throw new Error('缩放方向或距离无效。');
 const west=corner.includes('w'),north=corner.includes('n'),{width,height}=state.artboard;
 const anchorX=west?source.x+source.w:source.x,anchorY=north?source.y+source.h:source.y;
 const availableW=west?anchorX:width-anchorX,availableH=north?anchorY:height-anchorY;
 const minW=source.type==='barcode-qr-group'?200:4,minH=source.type==='barcode-qr-group'?64:4;
 if(source.x<0||source.y<0||source.x+source.w>width+.001||source.y+source.h>height+.001)throw new Error('请先把对象移回画布，再使用角点缩放。');
 const desiredW=source.w+(west?-dx:dx),desiredH=source.h+(north?-dy:dy);
 const proportional=preserveAspect||['barcode-qr-group','image','icon','generated-code'].includes(source.type);
 let w,h;
 if(source.type==='barcode-qr-group'){
  const desired=(desiredW*source.w+desiredH*source.h)/(source.w**2+source.h**2)*source.w;
  const sizes=BARCODE_SIZES_V70.filter(s=>s.w<=availableW+.001&&s.h<=availableH+.001);
  if(!sizes.length)throw new Error(BARCODE_SIZE_MESSAGE_V70);
  const size=sizes.reduce((best,s)=>Math.abs(s.w-desired)<Math.abs(best.w-desired)?s:best);w=size.w;h=size.h;
 }else if(proportional){
  const minimum=Math.max(minW/source.w,minH/source.h),maximum=Math.min(availableW/source.w,availableH/source.h);
  if(maximum<minimum)throw new Error('画布空间不足以容纳最小对象尺寸。');
  const scale=Math.max(minimum,Math.min(maximum,(desiredW*source.w+desiredH*source.h)/(source.w**2+source.h**2)));
  w=round(source.w*scale);h=w/(source.w/source.h);
 }else{
  if(availableW<minW||availableH<minH)throw new Error('画布空间不足以容纳最小对象尺寸。');
  w=round(Math.max(minW,Math.min(availableW,desiredW)));h=round(Math.max(minH,Math.min(availableH,desiredH)));
 }
 const next=structuredClone(state),e=next.elements.find(e=>e.id===id);
 if(source.type==='barcode-qr-group'){e.preset=w===250?'250x80':'200x64';e.lockAspect=true;}
 Object.assign(e,{x:west?anchorX-w:anchorX,y:north?anchorY-h:anchorY,w,h});next.selectedId=id;
 return next;
}
