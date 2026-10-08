import {orderedElements} from './objectOrder.js';
import {barcodeLayout} from './barcode.js';
import {qrMatrix} from './qrcode.js';
import {renderTemplate,isPackageNoticeVisible} from './variables.js';
import {generateGeometry,resolveElementRect,elementInsideSafeArea} from './geometry.js';

export const BARCODE_SIZES_V70=Object.freeze([
 Object.freeze({preset:'250x80',w:250,h:80}),
 Object.freeze({preset:'200x64',w:200,h:64}),
]);
export const BARCODE_SIZE_MESSAGE_V70='条码与二维码必须保持整体：优先 250 × 80 mm，空间不足时使用 200 × 64 mm；禁止拆分或继续缩小。';
export function barcodeSizeV70(w,h){return BARCODE_SIZES_V70.find(s=>Math.abs(w-s.w)<.001&&Math.abs(h-s.h)<.001);}
// Every distance, including the gap, padding and label, uses the same scale.
export function barcodeGroupLayoutV70(e){
 const scale=Number(e.w)/250;
 return{scale,pad:5*scale,gap:7*scale,qrSide:70*scale,bw:163*scale,bh:59*scale,labelTop:70*scale,labelBaseline:74*scale,fontSize:3.3*scale,stroke:.4*scale};
}
export function visibleMarkArtworkV70(state){return state.hiddenGroups?.marks?[]:(state.elements||[]).filter(e=>!e.hidden&&!(e.type==='notice'&&!isPackageNoticeVisible(state.variables||{})));}
const overlap=(a,b)=>a.x<b.x+b.w-1e-6&&a.x+a.w>b.x+1e-6&&a.y<b.y+b.h-1e-6&&a.y+a.h>b.y+1e-6;
function bounds(e,geo){
 const r=e.type==='cross-panel-artwork'?{absX:e.x,absY:e.y}:resolveElementRect(e,geo),a=(Number(e.r)||0)*Math.PI/180,w=Math.abs(Math.cos(a))*e.w+Math.abs(Math.sin(a))*e.h,h=Math.abs(Math.cos(a))*e.h+Math.abs(Math.sin(a))*e.w;
 return{x:r.absX+(e.w-w)/2,y:r.absY+(e.h-h)/2,w,h};
}
export function barcodeChecksV70(state){
 const elements=visibleMarkArtworkV70(state),groups=elements.filter(e=>e.type==='barcode-qr-group'),checks=[],geo=groups.length?generateGeometry(state.structure):null;
 const add=(e,code,ok,message)=>checks.push({elementId:e.id,code,severity:ok?'pass':'error',title:'条码 + QR 生产检查',detail:`${e.id}：${message}`,message:`${e.id}：${message}`});
 for(const e of elements.filter(e=>['barcode','qrcode','qr-code','qr'].includes(e.type)))add(e,'BARCODE_SPLIT',false,BARCODE_SIZE_MESSAGE_V70);
 for(const e of groups){
  add(e,'BARCODE_SIZE',Boolean(barcodeSizeV70(e.w,e.h)),barcodeSizeV70(e.w,e.h)?`${e.w} × ${e.h} mm · 整体比例 3.125 : 1`:BARCODE_SIZE_MESSAGE_V70);
  add(e,'BARCODE_DIRECTION',!Number(e.r)&&e.lockAspect!==false,'条码与二维码作为一个对象，禁止旋转、拆分或非等比变形。');
  add(e,'BARCODE_SAFE',elementInsideSafeArea(e,geo),'组合及留白必须完整位于当前面的安全区。');
  const region=bounds(e,geo),covered=elements.filter(other=>other.id!==e.id&&!(other.v61PanelFill&&orderedElements(elements).indexOf(other)<orderedElements(elements).indexOf(e))&&overlap(region,bounds(other,geo)));
  add(e,'BARCODE_OVERLAP',!covered.length,covered.length?`组合留白区域与 ${covered.map(x=>x.id).join('、')} 重叠，请移动这些对象。`:'组合区域无其他对象遮挡，使用白底单色黑。');
  try{
   const value=renderTemplate(e.barcodeValue,state.variables||{}).trim(),qrValue=renderTemplate(e.qrValue,state.variables||{}),type=e.barcodeType||'CODE39',g=barcodeGroupLayoutV70(e);
   if(!value||!qrValue.trim())throw new Error('请填写条码和二维码内容。');
   if(type==='CODE39'&&!/^[0-9A-Z .$/+%\-]+$/.test(value.toUpperCase()))throw new Error('Code 39 仅支持字母、数字和标准符号。');
   const barcode=barcodeLayout(type,value,g.bw,g.bh),qr=qrMatrix(qrValue),cell=g.qrSide/(qr.size+8);
   // Project readability floor: at least 3 pixels per narrow bar at 300 DPI.
   // It is an engineering safeguard, not an ISO/GS1 print-grade certificate.
   if(barcode.unit<25.4/300*3-1e-6)throw new Error(`条码内容过密，最窄条 ${barcode.unit.toFixed(3)} mm；需至少 0.254 mm。请缩短内容或使用大规格。`);
   if(cell<.4)throw new Error('二维码模块需至少 0.4 mm，请减少二维码内容。');
   add(e,'BARCODE_ENCODING',true,`编码及尺寸通过 · 最窄条 ${barcode.unit.toFixed(3)} mm · QR 模块 ${cell.toFixed(3)} mm · 四周留白 4 个模块。`);
  }catch(error){add(e,'BARCODE_ENCODING',false,error.message);}
 }
 return checks;
}
export function assertBarcodeProductionV70(state){const errors=barcodeChecksV70(state).filter(c=>c.severity==='error');if(errors.length)throw Object.assign(new Error(errors.map(c=>c.message).join('\n')),{code:'BARCODE_PRODUCTION_BLOCKED',errors});return true;}
