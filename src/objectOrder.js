function num(v,d=0){const n=Number(v);return Number.isFinite(n)?n:d}
function clone(v){return structuredClone(v)}

export function orderedElements(elements=[]){
  return (elements||[]).map((el,index)=>({el,index,z:Number.isFinite(Number(el?.zIndex))?Number(el.zIndex):index})).sort((a,b)=>a.z-b.z||a.index-b.index).map(x=>x.el);
}

export function normalizeZOrder(state){
  const next=clone(state||{});const ordered=orderedElements(next.elements||[]);ordered.forEach((el,index)=>{el.zIndex=index});next.elements=ordered;return next;
}

export function moveElementZ(state,id,action='front'){
  const next=normalizeZOrder(state),list=next.elements||[],index=list.findIndex(el=>el?.id===id);if(index<0)return next;
  const [item]=list.splice(index,1);
  if(action==='back')list.unshift(item);
  else if(action==='forward')list.splice(Math.min(list.length,index+1),0,item);
  else if(action==='backward')list.splice(Math.max(0,index-1),0,item);
  else list.push(item);
  list.forEach((el,i)=>{el.zIndex=i});next.elements=list;return next;
}

export function zOrderDiagnostics(state){
  const ordered=orderedElements(state?.elements||[]);return{count:ordered.length,items:ordered.map((el,index)=>({id:el.id||`item-${index}`,type:el.type||'unknown',zIndex:Number.isFinite(Number(el.zIndex))?Number(el.zIndex):index,index}))};
}
