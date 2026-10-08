export const V61_PRODUCT_VERSION='V0.61';
export const V61_PANEL_FILL_PREFIX='v61-panel-fill-';
export const V61_SWATCHES=['#ffffff','#f5f1e8','#d8c2a0','#111827','#0f766e','#1d4ed8','#b91c1c','#d97706'];

const num=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
export function normalizeColorV61(value='#ffffff'){
  const s=String(value||'').trim();
  if(/^#[0-9a-f]{6}$/i.test(s))return s.toLowerCase();
  if(/^#[0-9a-f]{3}$/i.test(s))return '#'+s.slice(1).split('').map(x=>x+x).join('').toLowerCase();
  return '#ffffff';
}
export function printablePanelsV61(geo){
  const values=Object.values(geo?.panelMap||{}).filter(p=>p&&num(p.w)>0&&num(p.h)>0&&p.kind!=='glue');
  const seen=new Set();return values.filter(p=>{if(seen.has(p.id))return false;seen.add(p.id);return true});
}
export function panelFillIdV61(panelId){return `${V61_PANEL_FILL_PREFIX}${panelId}`}
export function panelFillForV61(state,panelId){return(state?.elements||[]).find(e=>e?.v61PanelFill===true&&e.panelId===panelId)||null}
export function createPanelFillV61(panel,color='#ffffff'){
  if(!panel?.id)throw new Error('V61_PANEL_REQUIRED');
  const w=Math.max(.001,num(panel.w,1)),h=Math.max(.001,num(panel.h,1));
  return{id:panelFillIdV61(panel.id),type:'production-polygon',group:'artwork',panelId:panel.id,points:[[0,0],[w,0],[w,h],[0,h]],fillColor:normalizeColorV61(color),zIndex:-100000,v61PanelFill:true,locked:true};
}
export function upsertPanelFillV61(state,geo,panelId,color){
  const next=structuredClone(state||{}),panel=geo?.panelMap?.[panelId];if(!panel)throw new Error(`V61_PANEL_NOT_FOUND:${panelId}`);
  next.elements=Array.isArray(next.elements)?next.elements:[];const fill=createPanelFillV61(panel,color),i=next.elements.findIndex(e=>e?.v61PanelFill===true&&e.panelId===panelId);
  if(i>=0)next.elements[i]=fill;else next.elements.push(fill);return next;
}
export function removePanelFillV61(state,panelId){const next=structuredClone(state||{});next.elements=(next.elements||[]).filter(e=>!(e?.v61PanelFill===true&&e.panelId===panelId));return next}
export function clearPanelFillsV61(state){const next=structuredClone(state||{});next.elements=(next.elements||[]).filter(e=>e?.v61PanelFill!==true);return next}
export function applyAllPanelFillsV61(state,geo,color){let next=structuredClone(state||{});for(const p of printablePanelsV61(geo))next=upsertPanelFillV61(next,geo,p.id,color);return next}
export function syncPanelFillsV61(state,geo){
  const next=structuredClone(state||{}),existing=(next.elements||[]).filter(e=>e?.v61PanelFill===true),others=(next.elements||[]).filter(e=>e?.v61PanelFill!==true),fills=[];
  for(const e of existing){const p=geo?.panelMap?.[e.panelId];if(p)fills.push(createPanelFillV61(p,e.fillColor))}next.elements=[...others,...fills];return next;
}
export function artworkStatsV61(state,geo){
  const elements=state?.elements||[],fills=elements.filter(e=>e?.v61PanelFill===true),images=elements.filter(e=>e?.type==='image'),marks=elements.filter(e=>e?.group==='marks'),texts=elements.filter(e=>(e?.type==='text'||e?.type==='notice')&&e?.v61PanelFill!==true);
  return{panels:printablePanelsV61(geo).length,styledPanels:fills.length,images:images.length,marks:marks.length,texts:texts.length};
}
export function artworkAcceptanceV61(){
  const fake={id:'front',w:100,h:50,kind:'panel'},geo={panelMap:{front:fake}};let state={elements:[]};state=upsertPanelFillV61(state,geo,'front','#0f766e');const f=panelFillForV61(state,'front');
  return{ok:Boolean(f&&f.fillColor==='#0f766e'&&f.points.length===4&&printablePanelsV61(geo).length===1),version:V61_PRODUCT_VERSION};
}
