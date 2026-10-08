import {visibleMarkElementsV67} from './standaloneMarksV67.js';

const clone=x=>structuredClone(x);
const round=n=>Math.round(n*1000)/1000;
export function markSelectionV68(state,ids,{editable=false}={}){
 const wanted=new Set(ids);
 return visibleMarkElementsV67(state).filter(e=>wanted.has(e.id)&&(!editable||!e.locked));
}
export function markBoundsV68(elements){
 if(!elements.length)return null;
 const x=Math.min(...elements.map(e=>e.x)),y=Math.min(...elements.map(e=>e.y));
 const right=Math.max(...elements.map(e=>e.x+e.w)),bottom=Math.max(...elements.map(e=>e.y+e.h));
 return{x,y,w:right-x,h:bottom-y,right,bottom};
}
function requireEditable(state,ids,min=1){
 const elements=markSelectionV68(state,ids);
 if(elements.length<min)throw new Error(`请至少选择 ${min} 个可见对象。`);
 if(elements.some(e=>e.locked))throw new Error('所选对象包含锁定图层，请先解锁。');
 return elements;
}
export function boundedMarkMoveV68(state,ids,dx,dy,{snap=0}={}){
 const elements=requireEditable(state,ids),b=markBoundsV68(elements),{width,height}=state.artboard;
 if(![dx,dy,snap].every(Number.isFinite)||snap<0)throw new Error('移动距离必须是有效数字。');
 if(b.w>width+.001||b.h>height+.001)throw new Error('所选整体大于画布，请先调整尺寸。');
 if(snap){dx=Math.round((b.x+dx)/snap)*snap-b.x;dy=Math.round((b.y+dy)/snap)*snap-b.y;}
 return{dx:round(Math.max(-b.x,Math.min(width-b.right,dx))),dy:round(Math.max(-b.y,Math.min(height-b.bottom,dy)))};
}
export function moveMarkSelectionV68(state,ids,dx,dy,options){
 const delta=boundedMarkMoveV68(state,ids,dx,dy,options),next=clone(state),wanted=new Set(markSelectionV68(state,ids).map(e=>e.id));
 for(const e of next.elements)if(wanted.has(e.id)){e.x=round(e.x+delta.dx);e.y=round(e.y+delta.dy);}
 return next;
}
export function alignMarkSelectionV68(state,ids,direction,{target='selection',margin=8}={}){
 const elements=requireEditable(state,ids),bounds=markBoundsV68(elements);
 if(!['left','center','right','top','middle','bottom'].includes(direction))throw new Error('对齐方向无效。');
 if(!['selection','safe'].includes(target)||!Number.isFinite(margin)||margin<0)throw new Error('对齐范围无效。');
 if(target==='selection'&&elements.length<2)throw new Error('所选范围对齐至少需要 2 个对象。');
 const r=target==='safe'?{x:margin,y:margin,w:state.artboard.width-margin*2,h:state.artboard.height-margin*2}:bounds;
 const horizontal=['left','center','right'].includes(direction),axis=horizontal?'x':'y',size=horizontal?'w':'h';
 if(r[size]<0||elements.some(e=>e[size]>r[size]+.001))throw new Error('对象大于对齐范围，请先缩小尺寸。');
 const next=clone(state),wanted=new Set(elements.map(e=>e.id));
 for(const e of next.elements)if(wanted.has(e.id)){
  const value=['left','top'].includes(direction)?r[axis]:['right','bottom'].includes(direction)?r[axis]+r[size]-e[size]:r[axis]+(r[size]-e[size])/2;
  e[axis]=round(value);
 }
 return next;
}
export function distributeMarkSelectionV68(state,ids,axis){
 if(!['x','y'].includes(axis))throw new Error('分布方向无效。');
 const elements=requireEditable(state,ids,3),size=axis==='x'?'w':'h';
 const sorted=[...elements].sort((a,b)=>a[axis]-b[axis]||a.id.localeCompare(b.id)),last=sorted.at(-1);
 const start=sorted[0][axis],end=last[axis]+last[size];
 const gap=(end-start-sorted.reduce((n,e)=>n+e[size],0))/(sorted.length-1);
 if(gap<-.001)throw new Error('所选范围不足以等间距排布，请先拉开两端对象。');
 const next=clone(state),positions=new Map();let cursor=start;
 for(const e of sorted){positions.set(e.id,round(cursor));cursor+=e[size]+Math.max(0,gap);}
 for(const e of next.elements)if(positions.has(e.id))e[axis]=positions.get(e.id);
 return next;
}
export function lockMarkSelectionV68(state,ids,locked){
 if(typeof locked!=='boolean')throw new Error('图层锁定状态无效。');
 const next=clone(state),wanted=new Set(ids);
 for(const e of next.elements)if(wanted.has(e.id))e.locked=locked;
 return next;
}
export function deleteMarkSelectionV68(state,ids){
 const elements=requireEditable(state,ids),wanted=new Set(elements.map(e=>e.id)),next=clone(state);
 next.elements=next.elements.filter(e=>!wanted.has(e.id));next.selectedId='';return next;
}
export function duplicateMarkSelectionV68(state,ids){
 const elements=markSelectionV68(state,ids);
 if(!elements.length)throw new Error('请选择要复制的对象。');
 if(state.elements.length+elements.length>500)throw new Error('唛头最多支持 500 个对象。');
 const editable=clone(state);for(const e of editable.elements)e.locked=false;
 const delta=boundedMarkMoveV68(editable,ids,6,6),next=clone(state),copies=[];
 const existing=new Set(next.elements.map(e=>e.id));
 for(const e of elements){
  let id;do{id=`mark-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;}while(existing.has(id));existing.add(id);
  const copy={...clone(e),id,x:round(e.x+delta.dx),y:round(e.y+delta.dy),locked:false};copies.push(copy);
 }
 next.elements.push(...copies);next.selectedId=copies.at(-1).id;
 return{state:next,ids:copies.map(e=>e.id)};
}
export function reorderMarkSelectionV68(state,ids,direction){
 const elements=requireEditable(state,ids),wanted=new Set(elements.map(e=>e.id)),next=clone(state),list=next.elements;
 if(direction==='up'){for(let i=list.length-2;i>=0;i--)if(wanted.has(list[i].id)&&!wanted.has(list[i+1].id))[list[i],list[i+1]]=[list[i+1],list[i]];}
 else if(direction==='down'){for(let i=1;i<list.length;i++)if(wanted.has(list[i].id)&&!wanted.has(list[i-1].id))[list[i],list[i-1]]=[list[i-1],list[i]];}
 else throw new Error('图层顺序方向无效。');
 return next;
}
