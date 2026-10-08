export const V62_PRODUCT_VERSION='V0.62';
export const V62_GUIDE_STORAGE_KEY='boxstudio-v62-print-guides';
export const V62_GUIDE_DEFAULTS=Object.freeze({bleed:true,safe:true,panels:false,cut:false,crease:false});

const num=(value,fallback=0)=>{const n=Number(value);return Number.isFinite(n)?n:fallback};
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
const boundsOf=panel=>{
  if(Array.isArray(panel?.points)&&panel.points.length>=3){
    const xs=panel.points.map(p=>num(p?.[0])),ys=panel.points.map(p=>num(p?.[1]));
    const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    return{x:minX,y:minY,w:Math.max(0,maxX-minX),h:Math.max(0,maxY-minY)};
  }
  return{x:num(panel?.x),y:num(panel?.y),w:Math.max(0,num(panel?.w)),h:Math.max(0,num(panel?.h))};
};

export function normalizeGuidePrefsV62(input={}){
  return Object.fromEntries(Object.keys(V62_GUIDE_DEFAULTS).map(key=>[key,input?.[key]===undefined?V62_GUIDE_DEFAULTS[key]:Boolean(input[key])]));
}

export function printablePanelsV62(geo={}){
  const seen=new Set(),values=Object.values(geo?.panelMap||{});
  return values.filter(panel=>{
    if(!panel?.id||panel.kind==='glue'||seen.has(panel.id))return false;
    const b=boundsOf(panel);if(b.w<=0||b.h<=0)return false;
    seen.add(panel.id);return true;
  });
}

export function panelGuideGeometryV62(panel,{safeMm=5,bleedMm=3}={}){
  const b=boundsOf(panel),safe=Math.max(0,num(safeMm,5)),bleed=Math.max(0,num(bleedMm,3));
  const maxInset=Math.max(0,Math.min(b.w,b.h)/2-.001),inset=clamp(safe,0,maxInset);
  return{
    panelId:panel?.id||'',
    label:panel?.label||panel?.id||'Panel',
    bounds:b,
    safe:{x:b.x+inset,y:b.y+inset,w:Math.max(0,b.w-inset*2),h:Math.max(0,b.h-inset*2),insetMm:inset},
    bleed:{x:b.x-bleed,y:b.y-bleed,w:b.w+bleed*2,h:b.h+bleed*2,outsetMm:bleed},
    polygon:Array.isArray(panel?.points)&&panel.points.length>=3?panel.points.map(p=>[num(p?.[0]),num(p?.[1])]):null,
  };
}

export function buildPrintGuideModelV62(state={},geo={},prefs={}){
  const guidePrefs=normalizeGuidePrefsV62(prefs),safeMm=Math.max(0,num(state?.structure?.safe,5)),bleedMm=Math.max(0,num(state?.structure?.bleed,3));
  const panels=printablePanelsV62(geo).map(panel=>panelGuideGeometryV62(panel,{safeMm,bleedMm}));
  const cutAll=(geo?.cutLines||[]).map(line=>({...line})),creaseAll=(geo?.creaseLines||[]).map(line=>({...line}));
  return{
    schema:'boxstudio-v62-print-guides',
    version:1,
    prefs:guidePrefs,
    safeMm,
    bleedMm,
    panels,
    cutLines:guidePrefs.cut?cutAll:[],
    creaseLines:guidePrefs.crease?creaseAll:[],
    visiblePanels:guidePrefs.panels?panels:[],
    safeZones:guidePrefs.safe?panels.map(p=>({...p.safe,panelId:p.panelId,label:p.label})):[],
    bleedZones:guidePrefs.bleed?panels.map(p=>({...p.bleed,panelId:p.panelId,label:p.label})):[],
    counts:{panels:panels.length,cut:cutAll.length,crease:creaseAll.length,safe:guidePrefs.safe?panels.length:0,bleed:guidePrefs.bleed?panels.length:0},
  };
}

export function printGuideAcceptanceV62(){
  const geo={panelMap:{front:{id:'front',label:'Front',x:10,y:20,w:100,h:60,kind:'panel'},glue:{id:'glue',x:0,y:0,w:10,h:60,kind:'glue'}},cutLines:[{x1:0,y1:0,x2:10,y2:0}],creaseLines:[{x1:10,y1:0,x2:10,y2:60}]};
  const model=buildPrintGuideModelV62({structure:{safe:5,bleed:3}},geo,{cut:true,crease:true});
  const p=model.panels[0];
  return{ok:Boolean(model.panels.length===1&&model.cutLines.length===1&&model.creaseLines.length===1&&p?.safe?.w===90&&p?.bleed?.w===106),version:V62_PRODUCT_VERSION};
}
