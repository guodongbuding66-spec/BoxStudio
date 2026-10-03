const BUILT_IN_ASSETS=Object.freeze({
  'asset-this-side-up':Object.freeze({id:'asset-this-side-up',label:'This Side Up',description:'Built-in shipping mark.',builtIn:true,element:{type:'icon',icon:'up',group:'marks',w:48,h:48,r:0}}),
  'asset-fragile':Object.freeze({id:'asset-fragile',label:'Fragile',description:'Built-in shipping mark.',builtIn:true,element:{type:'icon',icon:'fragile',group:'marks',w:48,h:48,r:0}}),
  'asset-keep-dry':Object.freeze({id:'asset-keep-dry',label:'Keep Dry',description:'Built-in shipping mark.',builtIn:true,element:{type:'icon',icon:'dry',group:'marks',w:48,h:48,r:0}}),
});
function clone(value){return structuredClone(value);}
function slug(value='mark-asset'){
  const out=String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  return out||`mark-asset-${Date.now()}`;
}

export function getMarkAssetCatalog(state=null){
  return {...BUILT_IN_ASSETS,...((state?.customMarkAssets&&typeof state.customMarkAssets==='object')?state.customMarkAssets:{})};
}

export function createMarkAssetFromElement(element,{id,label,description=''}={}){
  if(!element||typeof element!=='object') throw new Error('Select a mark element first.');
  if(element.group!=='marks') throw new Error('Only mark-layer elements can be saved as assets.');
  const copy=clone(element);
  delete copy.id;
  delete copy.panelId;
  delete copy.x;
  delete copy.y;
  return {
    id:slug(id||label||element.id||element.type||'mark-asset'),
    label:String(label||element.id||element.type||'Mark Asset').trim(),
    description:String(description||''),
    element:copy,
    builtIn:false,
    createdAt:new Date().toISOString(),
  };
}

export function saveCustomMarkAsset(state,asset){
  const next=clone(state||{});
  const normalized={...clone(asset),id:slug(asset?.id||asset?.label||'mark-asset'),builtIn:false};
  if(BUILT_IN_ASSETS[normalized.id]) throw new Error('Built-in mark assets cannot be overwritten.');
  if(!normalized.element||typeof normalized.element!=='object') throw new Error('Mark asset is missing its element definition.');
  next.customMarkAssets={...(next.customMarkAssets||{}),[normalized.id]:normalized};
  return next;
}

export function deleteCustomMarkAsset(state,id){
  if(BUILT_IN_ASSETS[id]) throw new Error('Built-in mark assets cannot be deleted.');
  const next=clone(state||{}),assets={...(next.customMarkAssets||{})};
  delete assets[id];
  next.customMarkAssets=assets;
  return next;
}

export function insertMarkAsset(state,assetId,{panelId=null,x=10,y=10}={}){
  const catalog=getMarkAssetCatalog(state),asset=catalog[assetId];
  if(!asset) throw new Error(`Mark asset ${assetId} was not found.`);
  const next=clone(state||{});
  const selected=(next.elements||[]).find(element=>element.id===next.selectedId);
  const targetPanel=panelId||selected?.panelId||(next.elements||[]).find(element=>element.panelId)?.panelId||'front';
  const element={...clone(asset.element),id:`asset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`,group:'marks',panelId:targetPanel,x:Number(x)||0,y:Number(y)||0};
  next.elements=[...(next.elements||[]),element];
  next.selectedId=element.id;
  return next;
}

export {BUILT_IN_ASSETS};
