import { generateGeometry, clampElementToPanel } from './geometry.js';

function clone(value){ return structuredClone(value); }
function snapValue(value, step=1){
  const s=Math.max(0,Number(step)||0);
  return s ? Math.round(Number(value||0)/s)*s : Number(value||0);
}

export function markElementsForPanel(state,panelId){
  return (state?.elements||[]).filter(element=>element?.group==='marks' && element?.panelId===panelId);
}

export function markEditorPanels(state){
  const geo=generateGeometry(state?.structure||{});
  return (geo?.bodyPanels||geo?.panels||[]).filter(panel=>panel?.kind==='panel' || !panel?.kind);
}

export function panelForMarkEditor(state,panelId){
  const geo=generateGeometry(state?.structure||{});
  const fallback=(geo?.bodyPanels||[]).find(panel=>panel?.kind==='panel') || geo?.panels?.[0] || null;
  return { geo, panel:geo?.panelMap?.[panelId] || fallback };
}

function updateMark(state,id,mutator){
  const next=clone(state||{});
  const index=(next.elements||[]).findIndex(element=>element?.id===id && element?.group==='marks');
  if(index<0) throw new Error(`Mark element ${id} was not found.`);
  const element=clone(next.elements[index]);
  mutator(element,next);
  const geo=generateGeometry(next.structure||{});
  next.elements[index]=clampElementToPanel(element,geo);
  next.selectedId=next.elements[index].id;
  return next;
}

export function setMarkPosition(state,id,x,y,{snap=1}={}){
  return updateMark(state,id,element=>{ element.x=snapValue(x,snap); element.y=snapValue(y,snap); });
}

export function nudgeMark(state,id,dx=0,dy=0,{snap=1}={}){
  const current=(state?.elements||[]).find(element=>element?.id===id);
  if(!current) throw new Error(`Mark element ${id} was not found.`);
  return setMarkPosition(state,id,Number(current.x||0)+Number(dx||0),Number(current.y||0)+Number(dy||0),{snap});
}

export function resizeMark(state,id,width,height,{lockAspect=null,snap=1}={}){
  return updateMark(state,id,element=>{
    const oldW=Math.max(1,Number(element.w)||1),oldH=Math.max(1,Number(element.h)||1);
    let w=Math.max(4,snapValue(width,snap)),h=Math.max(4,snapValue(height,snap));
    const locked=lockAspect==null ? element.lockAspect===true : Boolean(lockAspect);
    if(locked){
      const ratio=oldW/oldH;
      if(Math.abs(w-oldW)>=Math.abs(h-oldH)) h=Math.max(4,snapValue(w/ratio,snap));
      else w=Math.max(4,snapValue(h*ratio,snap));
    }
    element.w=w;element.h=h;
  });
}

export function rotateMark(state,id,delta=90){
  return updateMark(state,id,element=>{ element.r=((Number(element.r)||0)+Number(delta||0))%360; });
}

export function alignMarkToPanel(state,id,mode,{safeArea=false,snap=1}={}){
  return updateMark(state,id,(element,next)=>{
    const {panel}=panelForMarkEditor(next,element.panelId);
    if(!panel) throw new Error(`Panel ${element.panelId} was not found.`);
    const safe=safeArea?Math.max(0,Number(next.structure?.safe)||0):0;
    const minX=safe,minY=safe,maxX=Math.max(minX,panel.w-safe-Number(element.w||0)),maxY=Math.max(minY,panel.h-safe-Number(element.h||0));
    if(mode==='left') element.x=minX;
    else if(mode==='right') element.x=maxX;
    else if(mode==='center-x') element.x=(panel.w-Number(element.w||0))/2;
    else if(mode==='top') element.y=minY;
    else if(mode==='bottom') element.y=maxY;
    else if(mode==='center-y') element.y=(panel.h-Number(element.h||0))/2;
    else if(mode==='center'){element.x=(panel.w-Number(element.w||0))/2;element.y=(panel.h-Number(element.h||0))/2;}
    else throw new Error(`Unsupported alignment mode: ${mode}`);
    element.x=snapValue(element.x,snap);element.y=snapValue(element.y,snap);
  });
}

export function duplicateMark(state,id,{newId=null,offset=8}={}){
  const next=clone(state||{}),source=(next.elements||[]).find(element=>element?.id===id && element?.group==='marks');
  if(!source) throw new Error(`Mark element ${id} was not found.`);
  const copy=clone(source);
  copy.id=newId||`${source.id||'mark'}-copy-${Date.now().toString(36)}`;
  copy.x=Number(source.x||0)+Number(offset||0);copy.y=Number(source.y||0)+Number(offset||0);
  const geo=generateGeometry(next.structure||{}),clamped=clampElementToPanel(copy,geo);
  next.elements=[...(next.elements||[]),clamped];next.selectedId=clamped.id;
  return next;
}

export function deleteMark(state,id){
  const next=clone(state||{}),before=(next.elements||[]).length;
  next.elements=(next.elements||[]).filter(element=>element?.id!==id);
  if(next.elements.length===before) throw new Error(`Mark element ${id} was not found.`);
  if(next.selectedId===id) next.selectedId=(next.elements||[]).find(element=>element?.group==='marks')?.id||null;
  return next;
}

export function moveMarkToPanel(state,id,panelId,{x=10,y=10,snap=1}={}){
  return updateMark(state,id,element=>{element.panelId=panelId;element.x=snapValue(x,snap);element.y=snapValue(y,snap);});
}
