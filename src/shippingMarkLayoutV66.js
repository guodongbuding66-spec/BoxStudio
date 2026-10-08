import { cloneState } from './model.js';
import { generateGeometry } from './geometry.js';
import { addMarkPresetV58 } from './productExperienceV58.js';
import { isPackageNoticeVisible } from './variables.js';

export const MARK_FIELDS_V66 = [
  ['sku','SKU'],['qrValue','二维码内容'],['nw','净重 N.W.'],['gw','毛重 G.W.'],
  ['weightUnit','重量单位'],['packageIndex','当前箱号'],['packageCount','总箱数'],
  ['contractNo','合同号'],['crn','CRN'],['originCountry','原产国'],['destinationCountry','目的国'],
  ['length','包装长'],['width','包装宽'],['height','包装高'],['dimensionUnit','尺寸单位'],
];

export function validateMarkDataV66(vars) {
  const errors=[];
  if(!String(vars.sku||'').trim())errors.push('请填写 SKU。');
  for(const [key,label] of [['nw','净重'],['gw','毛重']])
    if(String(vars[key]??'').trim()===''||!Number.isFinite(Number(vars[key]))||Number(vars[key])<0)errors.push(`${label}必须是非负数。`);
  if(Number(vars.gw)<Number(vars.nw))errors.push('毛重不能小于净重。');
  for(const [key,label] of [['packageIndex','当前箱号'],['packageCount','总箱数']])
    if(!Number.isInteger(Number(vars[key]))||Number(vars[key])<1)errors.push(`${label}必须是正整数。`);
  if(Number(vars.packageIndex)>Number(vars.packageCount))errors.push('当前箱号不能大于总箱数。');
  if(!['KG','LBS'].includes(vars.weightUnit))errors.push('请选择有效重量单位。');
  if(!['MM','CM','INCH'].includes(vars.dimensionUnit))errors.push('请选择有效尺寸单位。');
  for(const [key,label] of [['length','包装长'],['width','包装宽'],['height','包装高']])
    if(String(vars[key]??'').trim()===''||!Number.isFinite(Number(vars[key]))||Number(vars[key])<=0)errors.push(`${label}必须大于 0。`);
  return errors;
}

export function applyMarkDataV66(state,patch,{syncDimensions=state.syncDimensions}={}) {
  const next=cloneState(state),keys=new Set(MARK_FIELDS_V66.map(x=>x[0]));
  for(const [key,value] of Object.entries(patch||{}))if(keys.has(key))next.variables[key]=String(value).trim();
  next.syncDimensions=Boolean(syncDimensions);
  if(next.syncDimensions){
    const unit=String(next.variables.dimensionUnit||'MM').toUpperCase(),factor=unit==='INCH'?1/25.4:unit==='CM'?1/10:1;
    for(const key of ['length','width','height'])next.variables[key]=(Number(next.structure[key])*factor).toFixed(unit==='INCH'?2:unit==='CM'?1:0);
  }
  const errors=validateMarkDataV66(next.variables);
  if(errors.length)throw Object.assign(new Error(errors.join('\n')),{code:'MARK_DATA_INVALID',errors});
  return next;
}

export function rectanglesOverlapV66(a,b,gap=2){
  return a.x < b.x+b.w+gap-1e-7 && a.x+a.w+gap > b.x+1e-7 && a.y < b.y+b.h+gap-1e-7 && a.y+a.h+gap > b.y+1e-7;
}

function rotatedBounds(e){
  const angle=Number(e.r||0)*Math.PI/180,c=Math.abs(Math.cos(angle)),s=Math.abs(Math.sin(angle));
  const w=Number(e.w)*c+Number(e.h)*s,h=Number(e.w)*s+Number(e.h)*c;
  return{x:Number(e.x)+(Number(e.w)-w)/2,y:Number(e.y)+(Number(e.h)-h)/2,w,h};
}

function insidePolygon(x,y,points){
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const [ax,ay]=points[i],[bx,by]=points[j];
    if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
  }
  return inside;
}

export function addMarkPresetV66(state,presetId,{panelId=null}={}){
  const result=addMarkPresetV58(state,presetId,{panelId}),geo=generateGeometry(state.structure),panel=geo.panelMap[result.panel.id],e=result.element;
  const safe=Math.max(2,Number(state.structure.safe)||0),gap=3;
  const maxW=panel.w-safe*2,maxH=panel.h-safe*2;
  if(maxW<=0||maxH<=0)throw Object.assign(new Error('目标面的安全区不足，请选择更大的面。'),{code:'MARK_NO_SPACE'});
  // One scale factor preserves the locked Barcode + QR group and icon geometry.
  const scale=Math.min(1,maxW/e.w,maxH/e.h);
  e.w*=scale;e.h*=scale;
  if(e.fontSize)e.fontSize*=scale;
  const occupied=(state.elements||[]).filter(x=>x.panelId===panel.id&&!x.hidden&&!x.v61PanelFill&&!(x.type==='notice'&&!isPackageNoticeVisible(state.variables))).map(rotatedBounds);
  const xs=[safe,...occupied.map(r=>r.x+r.w+gap)].sort((a,b)=>a-b),ys=[safe,...occupied.map(r=>r.y+r.h+gap)].sort((a,b)=>a-b);
  const polygon=panel.points?.length>=3?panel.points:null;
  let placement=null;
  for(const y of ys){for(const x of xs){
    const r={x,y,w:e.w,h:e.h};
    if(x+e.w>panel.w-safe+1e-7||y+e.h>panel.h-safe+1e-7)continue;
    if(occupied.some(o=>rectanglesOverlapV66(r,o,gap)))continue;
    // Check edges as well as corners on imported concave panels.
    if(polygon){let valid=true;for(let k=0;k<=20&&valid;k++){const t=k/20;for(const [px,py] of [[x+e.w*t,y],[x+e.w*t,y+e.h],[x,y+e.h*t],[x+e.w,y+e.h*t]])if(!insidePolygon(panel.x+px,panel.y+py,polygon)){valid=false;break}}if(!valid)continue;}
    placement=r;break;
  }if(placement)break;}
  if(!placement)throw Object.assign(new Error('当前面没有足够空位。请移动已有对象，或选择其他目标面后插入。'),{code:'MARK_NO_SPACE'});
  Object.assign(e,placement);
  return result;
}

export function validateProjectStateV66(state){
  if(!state||!state.structure||!Array.isArray(state.elements)||!state.variables||typeof state.variables!=='object')throw new Error('项目文件缺少结构、图文或唛头数据。');
  if(['length','width','height','thickness'].some(k=>!Number.isFinite(Number(state.structure[k]))||Number(state.structure[k])<=0))throw new Error('项目结构尺寸或纸厚无效。');
  const geo=generateGeometry(state.structure);
  if(!Number.isFinite(geo.width)||!Number.isFinite(geo.height)||geo.width<=0||geo.height<=0)throw new Error('项目刀版尺寸无效。');
  for(const e of state.elements){
    if(!e||!e.id||!geo.panelMap[e.panelId])throw new Error(`对象 ${e?.id||'未命名'} 的目标面不存在。`);
    const badSize=e.type==='line'?Number(e.w)<0||Number(e.h)<0||(Number(e.w)===0&&Number(e.h)===0):Number(e.w)<=0||Number(e.h)<=0;
    if(['x','y','w','h','r'].some(k=>!Number.isFinite(Number(e[k]??0)))||badSize)throw new Error(`对象 ${e.id} 的位置或尺寸无效。`);
  }
  return true;
}
