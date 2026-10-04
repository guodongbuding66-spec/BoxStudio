import { generateGeometry, resolveElementRect, reanchorElementByAbsolute, clampElementToPanel } from './geometry.js';

const clone=v=>structuredClone(v);
const num=(v,d=0)=>{const n=Number(v);return Number.isFinite(n)?n:d};
const uid=(prefix='v33')=>`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
const DEFAULT_LAYERS=Object.freeze({artwork:{visible:true,locked:false},marks:{visible:true,locked:false},dieline:{visible:true,locked:true}});

function layerKey(el){return el?.group==='artwork'?'artwork':'marks'}
function orderedWithZ(elements=[]){return elements.map((el,index)=>({el,index,z:Number.isFinite(Number(el?.zIndex))?Number(el.zIndex):index})).sort((a,b)=>a.z-b.z||a.index-b.index).map(x=>x.el)}
function normalizeZ(elements=[]){const out=orderedWithZ(elements).map((el,i)=>({...el,zIndex:i}));return out}
function idSet(state){return new Set((state?.elements||[]).map(x=>x.id))}

export function ensureEditorV33(state={}){
  const next=clone(state),ids=idSet(next),old=next.editorV33||{},sel=(old.selection||[]).filter(id=>ids.has(id));
  next.editorV33={
    selection:sel.length?sel:(ids.has(next.selectedId)?[next.selectedId]:[]),
    layers:{artwork:{...DEFAULT_LAYERS.artwork,...(old.layers?.artwork||{})},marks:{...DEFAULT_LAYERS.marks,...(old.layers?.marks||{})},dieline:{...DEFAULT_LAYERS.dieline,...(old.layers?.dieline||{})}},
    focusPanelId:old.focusPanelId||null,
    fitMode:old.fitMode||'all',
  };
  return next;
}
export function selectionIdsV33(state={}){return ensureEditorV33(state).editorV33.selection}
export function selectedElementsV33(state={}){const ids=new Set(selectionIdsV33(state));return (state.elements||[]).filter(x=>ids.has(x.id))}
export function setSelectionV33(state,ids=[],{primary=null}={}){const next=ensureEditorV33(state),valid=idSet(next),out=[...new Set(ids)].filter(id=>valid.has(id));next.editorV33.selection=out;next.selectedId=primary&&out.includes(primary)?primary:(out.at(-1)||null);return next}
export function selectElementV33(state,id,{additive=false,groupAware=true}={}){
  const next=ensureEditorV33(state),el=(next.elements||[]).find(x=>x.id===id);if(!el)return next;let ids=[id];
  if(groupAware&&el.groupId)ids=(next.elements||[]).filter(x=>x.groupId===el.groupId).map(x=>x.id);
  if(additive){const set=new Set(next.editorV33.selection);for(const x of ids)set.has(x)?set.delete(x):set.add(x);return setSelectionV33(next,[...set],{primary:id})}
  return setSelectionV33(next,ids,{primary:id});
}
export function selectAllLayerV33(state,layer='marks'){const next=ensureEditorV33(state),ids=(next.elements||[]).filter(x=>layerKey(x)===layer&&!x.hidden).map(x=>x.id);return setSelectionV33(next,ids)}

export function groupSelectionV33(state,{groupId=null,name='Group'}={}){const next=ensureEditorV33(state),ids=new Set(next.editorV33.selection);if(ids.size<2)return next;const gid=groupId||uid('group');next.elements=(next.elements||[]).map(el=>ids.has(el.id)?{...el,groupId:gid,groupName:name}:el);return next}
export function ungroupSelectionV33(state){const next=ensureEditorV33(state),selected=selectedElementsV33(next),gids=new Set(selected.map(x=>x.groupId).filter(Boolean));if(!gids.size)return next;next.elements=(next.elements||[]).map(el=>gids.has(el.groupId)?Object.fromEntries(Object.entries(el).filter(([k])=>!['groupId','groupName'].includes(k))):el);return next}

export function copySelectionV33(state){const next=ensureEditorV33(state),selected=selectedElementsV33(next);return{schema:'boxstudio-v33-clipboard',version:1,elements:clone(selected)}}
function defaultIdFactory(el,i){return uid(el?.type||`item${i}`)}
export function pasteClipboardV33(state,clipboard,{offsetMm=8,idFactory=defaultIdFactory}={}){
  const next=ensureEditorV33(state);if(clipboard?.schema!=='boxstudio-v33-clipboard'||!Array.isArray(clipboard.elements)||!clipboard.elements.length)return next;
  const groupMap=new Map(),created=[];for(let i=0;i<clipboard.elements.length;i++){
    const src=clone(clipboard.elements[i]),oldGroup=src.groupId;if(oldGroup&&!groupMap.has(oldGroup))groupMap.set(oldGroup,uid('group'));
    src.id=idFactory(src,i);src.x=num(src.x)+offsetMm;src.y=num(src.y)+offsetMm;if(oldGroup)src.groupId=groupMap.get(oldGroup);src.zIndex=(next.elements?.length||0)+i;src._v33Created=true;created.push(src);
  }
  next.elements=normalizeZ([...(next.elements||[]),...created]);return setSelectionV33(next,created.map(x=>x.id));
}
export function duplicateSelectionV33(state,opts={}){return pasteClipboardV33(state,copySelectionV33(state),opts)}
export function deleteSelectionV33(state){const next=ensureEditorV33(state),ids=new Set(next.editorV33.selection);next.elements=(next.elements||[]).filter(x=>!ids.has(x.id));next.editorV33.selection=[];next.selectedId=null;return next}

export function moveSelectionZV33(state,action='front'){
  const next=ensureEditorV33(state),ids=new Set(next.editorV33.selection);if(!ids.size)return next;let list=normalizeZ(next.elements||[]),selected=list.filter(x=>ids.has(x.id)),rest=list.filter(x=>!ids.has(x.id));
  if(action==='back')list=[...selected,...rest];
  else if(action==='front')list=[...rest,...selected];
  else if(action==='forward'){
    list=[...rest,...selected];const target=Math.min(list.length-selected.length,(Math.max(...selected.map(x=>(next.elements||[]).findIndex(y=>y.id===x.id)))+1));list=[...rest];list.splice(target,0,...selected);
  }else if(action==='backward'){
    const first=Math.min(...selected.map(x=>(next.elements||[]).findIndex(y=>y.id===x.id))),target=Math.max(0,first-1);list=[...rest];list.splice(target,0,...selected);
  }
  next.elements=normalizeZ(list);return next;
}

function selectedAbsolute(next){const geo=generateGeometry(next.structure),ids=new Set(next.editorV33.selection);return{geo,items:(next.elements||[]).filter(el=>ids.has(el.id)).map(el=>({el,rr:resolveElementRect(el,geo)}))}}
function updateByAbsolute(next,geo,id,x,y){const index=next.elements.findIndex(e=>e.id===id);if(index<0)return;next.elements[index]=reanchorElementByAbsolute(next.elements[index],geo,x,y)}
export function alignSelectionV33(state,mode='left'){
  const next=ensureEditorV33(state),{geo,items}=selectedAbsolute(next);if(items.length<2)return next;
  const minX=Math.min(...items.map(x=>x.rr.absX)),maxX=Math.max(...items.map(x=>x.rr.absX+num(x.el.w))),minY=Math.min(...items.map(x=>x.rr.absY)),maxY=Math.max(...items.map(x=>x.rr.absY+num(x.el.h))),cx=(minX+maxX)/2,cy=(minY+maxY)/2;
  for(const {el,rr} of items){let x=rr.absX,y=rr.absY;if(mode==='left')x=minX;if(mode==='center')x=cx-num(el.w)/2;if(mode==='right')x=maxX-num(el.w);if(mode==='top')y=minY;if(mode==='middle')y=cy-num(el.h)/2;if(mode==='bottom')y=maxY-num(el.h);updateByAbsolute(next,geo,el.id,x,y)}return next;
}
export function distributeSelectionV33(state,axis='horizontal'){
  const next=ensureEditorV33(state),{geo,items}=selectedAbsolute(next);if(items.length<3)return next;const horizontal=axis==='horizontal',sorted=[...items].sort((a,b)=>(horizontal?a.rr.absX+a.el.w/2:a.rr.absY+a.el.h/2)-(horizontal?b.rr.absX+b.el.w/2:b.rr.absY+b.el.h/2));const first=sorted[0],last=sorted.at(-1),start=horizontal?first.rr.absX+first.el.w/2:first.rr.absY+first.el.h/2,end=horizontal?last.rr.absX+last.el.w/2:last.rr.absY+last.el.h/2,step=(end-start)/(sorted.length-1);for(let i=1;i<sorted.length-1;i++){const {el,rr}=sorted[i],target=start+step*i,x=horizontal?target-el.w/2:rr.absX,y=horizontal?rr.absY:target-el.h/2;updateByAbsolute(next,geo,el.id,x,y)}return next;
}

export function translateSelectionV33(state,dx=0,dy=0){const next=ensureEditorV33(state),{geo,items}=selectedAbsolute(next);for(const {el,rr} of items)updateByAbsolute(next,geo,el.id,rr.absX+num(dx),rr.absY+num(dy));return next}
export function updatePrimaryElementV33(state,patch={}){const next=ensureEditorV33(state),id=next.selectedId||next.editorV33.selection.at(-1),i=(next.elements||[]).findIndex(x=>x.id===id);if(i<0)return next;const el={...next.elements[i],...patch};next.elements[i]=clampElementToPanel(el,generateGeometry(next.structure));return next}
export function setSelectionFlagV33(state,flag,value){const next=ensureEditorV33(state),ids=new Set(next.editorV33.selection);next.elements=(next.elements||[]).map(el=>ids.has(el.id)?{...el,[flag]:Boolean(value)}:el);return next}
export function setLayerStateV33(state,layer,patch={}){const next=ensureEditorV33(state);if(!next.editorV33.layers[layer])return next;next.editorV33.layers[layer]={...next.editorV33.layers[layer],...patch};return next}
export function elementVisibleV33(state,el){const next=ensureEditorV33(state),layer=next.editorV33.layers[layerKey(el)];return !el.hidden&&layer?.visible!==false}
export function elementLockedV33(state,el){const next=ensureEditorV33(state),layer=next.editorV33.layers[layerKey(el)];return Boolean(el.locked||layer?.locked)}

export function insertTableV33(state,{panelId=null,x=12,y=12,w=180,h=90,rows=3,cols=3,header=true,group='artwork',groupId=null}={}){
  let next=ensureEditorV33(state);const geo=generateGeometry(next.structure),panel=geo.panelMap[panelId]||geo.panelMap.front||geo.panelMap.base||geo.bodyPanels?.[0];if(!panel)return next;rows=Math.max(2,Math.min(12,Math.round(num(rows,3))));cols=Math.max(2,Math.min(8,Math.round(num(cols,3))));w=Math.min(Math.max(40,num(w,180)),Math.max(40,panel.w-8));h=Math.min(Math.max(28,num(h,90)),Math.max(28,panel.h-8));x=Math.max(0,Math.min(num(x,12),Math.max(0,panel.w-w)));y=Math.max(0,Math.min(num(y,12),Math.max(0,panel.h-h)));const gid=groupId||uid('table'),base=`table-${Date.now().toString(36)}`,made=[],push=el=>made.push({...el,group,groupId:gid,groupName:'Table',panelId:panel.id,zIndex:(next.elements?.length||0)+made.length,_v33Created:true});push({id:`${base}-border`,type:'shape',x,y,w,h,r:0,fill:'none'});for(let c=1;c<cols;c++)push({id:`${base}-v${c}`,type:'line',x:x+w*c/cols,y,w:0,h,r:0});for(let r=1;r<rows;r++)push({id:`${base}-h${r}`,type:'line',x,y:y+h*r/rows,w,h:0,r:0});for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)push({id:`${base}-t${r}-${c}`,type:'text',x:x+w*c/cols+2,y:y+h*r/rows+2,w:Math.max(8,w/cols-4),h:Math.max(6,h/rows-4),r:0,template:header&&r===0?`Header ${c+1}`:`Cell ${r+1}.${c+1}`,fontSize:Math.max(3,Math.min(6,h/rows*.24)),bold:Boolean(header&&r===0)});next.elements=normalizeZ([...(next.elements||[]),...made]);return setSelectionV33(next,made.map(x=>x.id),{primary:made[0].id});
}

export function panelFocusV33(state,panelId=null){const next=ensureEditorV33(state),geo=generateGeometry(next.structure),panel=geo.panelMap[panelId]||geo.panelMap[next.editorV33.focusPanelId]||geo.panelMap.front||geo.panelMap.base||geo.bodyPanels?.[0];if(!panel)return{state:next,panel:null,viewBox:`0 0 ${geo.width} ${geo.height}`};const pad=Math.max(8,Math.min(40,Math.min(panel.w,panel.h)*.12)),x=panel.x-pad,y=panel.y-pad,w=panel.w+pad*2,h=panel.h+pad*2;next.editorV33.focusPanelId=panel.id;next.editorV33.fitMode='panel';return{state:next,panel,viewBox:`${x} ${y} ${w} ${h}`}}
export function fitAllV33(state){const next=ensureEditorV33(state),geo=generateGeometry(next.structure);next.editorV33.fitMode='all';return{state:next,viewBox:`0 0 ${geo.width} ${geo.height}`}}

export {DEFAULT_LAYERS};
