import {generateGeometry} from './geometry.js';
import {handlingParamsV72,handlingSymbolV72} from './handlingSymbolsV72.js';
import {markOccupiedBoundsV66,rectanglesOverlapV66} from './shippingMarkLayoutV66.js';

export const MAX_BATCH_SYMBOLS_V83=8;
export const SYMBOL_SETS_V83=Object.freeze([
  {id:'fragile',label:'易碎品',icons:Object.freeze(['up','fragile','dry'])},
  {id:'team',label:'重箱搬运',icons:Object.freeze(['teamLift','heavy','noDrop'])},
  {id:'opening',label:'开箱提示',icons:Object.freeze(['noBlade','openHere','readInstructions'])}
].map(Object.freeze));

export function canBatchSymbolV83(id){
  return Boolean(handlingSymbolV72(id))&&Object.keys(handlingParamsV72({icon:id})).length===0;
}

export function symbolBatchLayoutV83({icons,size,gap,columns}){
  if(!Array.isArray(icons)||icons.length<1||icons.length>MAX_BATCH_SYMBOLS_V83)throw new Error('请选择 1–8 个标识。');
  if(new Set(icons).size!==icons.length||!icons.every(canBatchSymbolV83))throw new Error('组合含有重复或需单独填写数值的标识。');
  if(!Number.isFinite(size)||size<10||size>100)throw new Error('图标边长需为 10–100 mm。');
  if(!Number.isFinite(gap)||gap<0||gap>30)throw new Error('间距需为 0–30 mm。');
  if(!Number.isInteger(columns)||columns<1||columns>MAX_BATCH_SYMBOLS_V83)throw new Error('每行数量需为 1–8。');
  const step=size+gap,usedColumns=Math.min(columns,icons.length),rows=Math.ceil(icons.length/columns);
  return {w:usedColumns*size+(usedColumns-1)*gap,h:rows*size+(rows-1)*gap,
    cells:icons.map((icon,i)=>({icon,x:(i%columns)*step,y:Math.floor(i/columns)*step,w:size,h:size}))};
}

// Check the complete rectangle, including thin notches in imported dielines.
function insidePolygon(x,y,points){
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const [a,b]=points[i],[c,d]=points[j];
    if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)inside=!inside;
  }
  return inside;
}
function edgeTouchesRect(a,b,r){
  let lo=0,hi=1;
  for(const [i,min,max] of [[0,r.x,r.x+r.w],[1,r.y,r.y+r.h]]){
    const delta=b[i]-a[i];
    if(!delta){if(a[i]<min||a[i]>max)return false;continue;}
    const u=(min-a[i])/delta,v=(max-a[i])/delta;
    lo=Math.max(lo,Math.min(u,v));hi=Math.min(hi,Math.max(u,v));
    if(lo>hi)return false;
  }
  return true;
}
function fitsPolygon(r,points){
  return [[r.x,r.y],[r.x+r.w,r.y],[r.x,r.y+r.h],[r.x+r.w,r.y+r.h]].every(([x,y])=>insidePolygon(x,y,points))&&
    !points.some((a,i)=>edgeTouchesRect(a,points[(i+1)%points.length],r));
}

function candidateAxis(min,max,edges,includeGrid){
  const values=[...new Set([min,max,...edges,...(includeGrid?Array.from({length:24},(_,i)=>min+(max-min)*i/24):[])])].filter(x=>x>=min&&x<=max+1e-7).sort((a,b)=>a-b);
  // Bound preview work in unusually dense imported projects.
  return values.length<=128?values:Array.from({length:128},(_,i)=>values[Math.round(i*(values.length-1)/127)]);
}

export function planSymbolBatchV83(state,config,panelId){
  const layout=symbolBatchLayoutV83(config),panel=generateGeometry(state.structure).bodyPanels.find(p=>p.id===panelId&&p.kind==='panel');
  if(!panel)throw new Error('请选择有效的目标面。');
  if(state.schema==='boxstudio-standalone-mark'&&state.elements.length+layout.cells.length>500)throw new Error('画布对象已接近 500 个，请移除不需要的对象。');
  const safe=Math.max(2,Number(state.structure.safe)||0),clearance=3;
  const right=panel.w-safe-layout.w,bottom=panel.h-safe-layout.h;
  if(right<safe-1e-7||bottom<safe-1e-7)throw new Error('目标面的安全区放不下这组标识。请减小边长、间距或调整每行数量。');
  const occupied=markOccupiedBoundsV66(state,panelId);
  const polygon=panel.points?.length>=3?panel.points.map(([x,y])=>[x-panel.x,y-panel.y]):null;
  const xs=candidateAxis(safe,right,occupied.map(r=>r.x+r.w+clearance),polygon);
  const ys=candidateAxis(safe,bottom,occupied.map(r=>r.y+r.h+clearance),polygon);
  for(const y of ys){
    const row=occupied.filter(r=>y<r.y+r.h+clearance-1e-7&&y+layout.h+clearance>r.y+1e-7);
    for(const x of xs){
      const rect={x,y,w:layout.w,h:layout.h};
      if(row.some(o=>rectanglesOverlapV66(rect,o,clearance))||(polygon&&!fitsPolygon(rect,polygon)))continue;
      return {...rect,panelId,panelLabel:panel.label||panelId,cells:layout.cells.map(c=>({...c,x:c.x+x,y:c.y+y}))};
    }
  }
  throw new Error('未找到可放置的位置。请缩小组合、移动已有对象或换一个目标面。');
}

export function insertSymbolBatchV83(state,config,panelId){
  const plan=planSymbolBatchV83(state,config,panelId),next=structuredClone(state);
  const stamp=globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  const elements=plan.cells.map((cell,i)=>({id:'symbols-'+stamp+'-'+i,type:'icon',group:'marks',panelId,r:0,...cell}));
  next.elements.push(...elements);
  next.selectedId=elements.at(-1).id;
  if(next.schema!=='boxstudio-standalone-mark')next.markEditorPanelId=panelId;
  return {state:next,ids:elements.map(e=>e.id),plan};
}
