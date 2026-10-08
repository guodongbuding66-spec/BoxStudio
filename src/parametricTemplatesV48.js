import { resolveBoxDimensionsV32 } from './parametricTemplatesV32.js';
import { resolveMaterialV32 } from './materialsV32.js';

export const PARAMETRIC_TEMPLATE_SCHEMA_V48=1;

export const V48_TEMPLATE_CATALOG=Object.freeze([
  {id:'fefco-0203',category:'shipping',standard:'FEFCO',code:'0203',name:'Full Overlap Slotted Container',nameZh:'0203 全叠盖开槽箱',engine:'v48-fefco-0203',status:'engineering-core',parameters:['length','width','height','thickness','glue','flute'],tags:['0203','fefco','full overlap','slotted','shipping','corrugated']},
  {id:'straight-tuck-end',category:'folding-carton',standard:'ECMA-LIKE',code:'STE',name:'Straight Tuck End Carton',nameZh:'同向插口盒 / STE',engine:'v48-straight-tuck-end',status:'engineering-core',parameters:['length','width','height','thickness','glue'],tags:['straight tuck','ste','folding carton','paperboard']},
  {id:'sleeve-carton',category:'sleeve',standard:'CUSTOM',code:'SLEEVE',name:'Open End Folding Sleeve',nameZh:'开口套筒盒 / Sleeve',engine:'v48-sleeve-carton',status:'engineering-core',parameters:['length','width','height','thickness','glue'],tags:['sleeve','open end','wrap','paperboard','band']},
]);

const IDS=new Set(V48_TEMPLATE_CATALOG.map(x=>x.id));
const n=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const clamp=(v,min,max=Infinity)=>Math.min(max,Math.max(min,v));
const line=(x1,y1,x2,y2,type='CUT')=>({x1,y1,x2,y2,type});
const panel=(id,label,x,y,w,h,kind='panel',extra={})=>({id,label,x,y,w,h,kind,...extra});

export const V48_ALLOWANCES=Object.freeze({
  'fefco-0203':{L:1.5,W:1.5,H:2.2},
  'straight-tuck-end':{L:1,W:1,H:1},
  'sleeve-carton':{L:1,W:1,H:1},
});

export function templateCatalogByIdV48(id){return V48_TEMPLATE_CATALOG.find(t=>t.id===id)||null;}
export function isV48EngineTemplate(id){return IDS.has(id);}
export function searchTemplateCatalogV48({query='',category='all',standard='all'}={}){
  const q=String(query||'').trim().toLowerCase();
  return V48_TEMPLATE_CATALOG.filter(t=>(category==='all'||t.category===category)&&(standard==='all'||t.standard===standard)&&(!q||[t.id,t.code,t.name,t.nameZh,...t.tags].join(' ').toLowerCase().includes(q)));
}

function normalizeStructure(input,template,defaults){
  const material=resolveMaterialV32({...defaults,...input});
  return {
    template,
    sizeType:['internal','external','manufacturing'].includes(input.sizeType)?input.sizeType:(defaults.sizeType||'internal'),
    length:clamp(n(input.length,defaults.length),25),
    width:clamp(n(input.width,defaults.width),20),
    height:clamp(n(input.height,defaults.height),15),
    thickness:clamp(n(input.thickness,material.thicknessMm),.1,20),
    materialId:input.materialId||defaults.materialId||material.materialId,
    flute:input.flute||defaults.flute||material.flute||'CUSTOM',
    layers:Math.max(1,Math.round(n(input.layers,defaults.layers||material.ply||1))),
    glue:clamp(n(input.glue,defaults.glue??18),0,100),
    bleed:clamp(n(input.bleed,defaults.bleed??3),0,20),
    safe:clamp(n(input.safe,defaults.safe??5),0,30),
    compensation:input.compensation!==false,
    cornerRadius:clamp(n(input.cornerRadius,0),0,30),
    flapTaper:clamp(n(input.flapTaper,0),0,30),
    relief:clamp(n(input.relief,0),0,20),
    notch:clamp(n(input.notch,0),0,25),
    shoulder:clamp(n(input.shoulder,0),0,30),
  };
}

function finish(template,s,dims,{width,height,margin,bodyPanels,flapPanels=[],cutLines,creaseLines,perfLines=[],glueLines=[],foldRoot,documentTitle,engineeringNotes=[]}){
  const panels=[...bodyPanels,...flapPanels];
  return {
    template,structure:s,
    manufacturing:{...dims.manufacturing,T:dims.T,glue:s.glue},dimensionSet:dims,
    width,height,margin,flap:0,bodyY:0,bodyBottom:height,
    bodyPanels,flapPanels,panels,panelMap:Object.fromEntries(panels.map(p=>[p.id,p])),
    cutLines,creaseLines,perfLines,glueLines,foldRoot,documentTitle,engineeringNotes,
    validationState:'engineering-core-pending-real-sample',
  };
}

function addRectOuterCuts(lines,p,skip={top:false,right:false,bottom:false,left:false}){
  if(!skip.top)lines.push(line(p.x,p.y,p.x+p.w,p.y));
  if(!skip.right)lines.push(line(p.x+p.w,p.y,p.x+p.w,p.y+p.h));
  if(!skip.bottom)lines.push(line(p.x,p.y+p.h,p.x+p.w,p.y+p.h));
  if(!skip.left)lines.push(line(p.x,p.y,p.x,p.y+p.h));
}

function bodyStrip({margin,bodyY,H,L,W,glue}){
  const specs=[['glue','GLUE',glue,'glue','glue'],['left','LEFT',W,'panel','side'],['front','FRONT',L,'panel','front'],['right','RIGHT',W,'panel','side'],['back','BACK',L,'panel','back']];
  let x=margin;const bodyPanels=[];
  for(const [id,label,w,kind,role] of specs){bodyPanels.push(panel(id,label,x,bodyY,w,H,kind,{role}));x+=w;}
  return {bodyPanels,bodyEnd:x,by:Object.fromEntries(bodyPanels.map(p=>[p.id,p]))};
}

export function generateFefco0203V48(input={}){
  const s=normalizeStructure(input,'fefco-0203',{length:400,width:300,height:250,thickness:3,materialId:'corrugated-kraft',flute:'B',layers:3,glue:35,bleed:3,safe:5});
  const dims=resolveBoxDimensionsV32(s,V48_ALLOWANCES['fefco-0203']),{L,W,H}=dims.manufacturing,margin=18,glue=Math.max(24,s.glue),major=W,minor=Math.max(20,W/2),bodyY=margin+major,bodyBottom=bodyY+H;
  const {bodyPanels,bodyEnd,by}=bodyStrip({margin,bodyY,H,L,W,glue});
  const flapPanels=[
    panel('top-left','TOP LEFT FLAP',by.left.x,bodyY-minor,W,minor,'flap',{parent:'left',role:'minor-flap'}),
    panel('top-front','TOP FRONT FULL OVERLAP',by.front.x,bodyY-major,L,major,'flap',{parent:'front',role:'major-full-overlap'}),
    panel('top-right','TOP RIGHT FLAP',by.right.x,bodyY-minor,W,minor,'flap',{parent:'right',role:'minor-flap'}),
    panel('top-back','TOP BACK FULL OVERLAP',by.back.x,bodyY-major,L,major,'flap',{parent:'back',role:'major-full-overlap'}),
    panel('bottom-left','BOTTOM LEFT FLAP',by.left.x,bodyBottom,W,minor,'flap',{parent:'left',role:'minor-flap'}),
    panel('bottom-front','BOTTOM FRONT FULL OVERLAP',by.front.x,bodyBottom,L,major,'flap',{parent:'front',role:'major-full-overlap'}),
    panel('bottom-right','BOTTOM RIGHT FLAP',by.right.x,bodyBottom,W,minor,'flap',{parent:'right',role:'minor-flap'}),
    panel('bottom-back','BOTTOM BACK FULL OVERLAP',by.back.x,bodyBottom,L,major,'flap',{parent:'back',role:'major-full-overlap'}),
  ];
  const cutLines=[],creaseLines=[],glueLines=[];
  addRectOuterCuts(cutLines,by.glue,{right:true});
  cutLines.push(line(bodyEnd,bodyY,bodyEnd,bodyBottom));
  for(const p of flapPanels)addRectOuterCuts(cutLines,p,{[p.y<bodyY?'bottom':'top']:true});
  creaseLines.push(line(by.left.x,bodyY,bodyEnd,bodyY,'CREASE'),line(by.left.x,bodyBottom,bodyEnd,bodyBottom,'CREASE'));
  for(let i=1;i<bodyPanels.length;i++)creaseLines.push(line(bodyPanels[i].x,bodyY,bodyPanels[i].x,bodyBottom,'CREASE'));
  glueLines.push(line(by.glue.x,bodyY,by.glue.x+by.glue.w,bodyY,'GLUE'));
  return finish('fefco-0203',s,dims,{width:bodyEnd+margin,height:bodyBottom+major+margin,margin,bodyPanels,flapPanels,cutLines,creaseLines,glueLines,foldRoot:'front',documentTitle:'FEFCO 0203 Full Overlap Slotted Container · V0.48 engineering core',engineeringNotes:['Major top and bottom flaps use full-width overlap depth; minor side flaps remain half-width engineering defaults.','Corrugated caliper compensation is applied to manufacturing dimensions. Final slot width and machine allowance require factory-profile acceptance.']});
}

export function generateStraightTuckEndV48(input={}){
  const s=normalizeStructure(input,'straight-tuck-end',{length:120,width:45,height:180,thickness:.45,materialId:'sbs-paperboard',flute:'CUSTOM',layers:1,glue:18,bleed:3,safe:4});
  const dims=resolveBoxDimensionsV32(s,V48_ALLOWANCES['straight-tuck-end']),{L,W,H}=dims.manufacturing,margin=18,glue=Math.max(12,s.glue),tuck=Math.max(20,Math.min(W*.95,75)),dust=Math.max(15,W*.62),bodyY=margin+tuck,bodyBottom=bodyY+H;
  const {bodyPanels,bodyEnd,by}=bodyStrip({margin,bodyY,H,L,W,glue});
  const flapPanels=[
    panel('top-front-tuck','TOP FRONT TUCK',by.front.x,bodyY-tuck,L,tuck,'flap',{parent:'front',role:'tuck'}),
    panel('top-left-dust','TOP LEFT DUST',by.left.x,bodyY-dust,W,dust,'flap',{parent:'left',role:'dust'}),
    panel('top-right-dust','TOP RIGHT DUST',by.right.x,bodyY-dust,W,dust,'flap',{parent:'right',role:'dust'}),
    panel('top-back-dust','TOP BACK DUST',by.back.x,bodyY-dust,L,dust,'flap',{parent:'back',role:'dust'}),
    panel('bottom-front-tuck','BOTTOM FRONT TUCK',by.front.x,bodyBottom,L,tuck,'flap',{parent:'front',role:'tuck'}),
    panel('bottom-left-dust','BOTTOM LEFT DUST',by.left.x,bodyBottom,W,dust,'flap',{parent:'left',role:'dust'}),
    panel('bottom-right-dust','BOTTOM RIGHT DUST',by.right.x,bodyBottom,W,dust,'flap',{parent:'right',role:'dust'}),
    panel('bottom-back-dust','BOTTOM BACK DUST',by.back.x,bodyBottom,L,dust,'flap',{parent:'back',role:'dust'}),
  ];
  const cutLines=[],creaseLines=[],glueLines=[];
  for(const p of flapPanels)addRectOuterCuts(cutLines,p,{[p.y<bodyY?'bottom':'top']:true});
  addRectOuterCuts(cutLines,by.glue,{right:true});cutLines.push(line(bodyEnd,bodyY,bodyEnd,bodyBottom));
  creaseLines.push(line(by.left.x,bodyY,bodyEnd,bodyY,'CREASE'),line(by.left.x,bodyBottom,bodyEnd,bodyBottom,'CREASE'));
  for(let i=1;i<bodyPanels.length;i++)creaseLines.push(line(bodyPanels[i].x,bodyY,bodyPanels[i].x,bodyBottom,'CREASE'));
  glueLines.push(line(by.glue.x,bodyY,by.glue.x+by.glue.w,bodyY,'GLUE'));
  return finish('straight-tuck-end',s,dims,{width:bodyEnd+margin,height:bodyBottom+tuck+margin,margin,bodyPanels,flapPanels,cutLines,creaseLines,glueLines,foldRoot:'front',documentTitle:'Straight Tuck End Folding Carton · V0.48 engineering core',engineeringNotes:['Top and bottom tuck flaps close from the same main panel to model straight-tuck behavior.','Tuck friction, dust-flap clearance and board grain remain factory-profile parameters before tooling release.']});
}

export function generateSleeveCartonV48(input={}){
  const s=normalizeStructure(input,'sleeve-carton',{length:160,width:60,height:120,thickness:.5,materialId:'sbs-paperboard',flute:'CUSTOM',layers:1,glue:18,bleed:3,safe:4});
  const dims=resolveBoxDimensionsV32(s,V48_ALLOWANCES['sleeve-carton']),{L,W,H}=dims.manufacturing,margin=18,glue=Math.max(12,s.glue),bodyY=margin;
  const {bodyPanels,bodyEnd,by}=bodyStrip({margin,bodyY,H,L,W,glue});
  const cutLines=[line(by.glue.x,bodyY,bodyEnd,bodyY),line(by.glue.x,bodyY+H,bodyEnd,bodyY+H),line(by.glue.x,bodyY,by.glue.x,bodyY+H),line(bodyEnd,bodyY,bodyEnd,bodyY+H)],creaseLines=[],glueLines=[];
  for(let i=1;i<bodyPanels.length;i++)creaseLines.push(line(bodyPanels[i].x,bodyY,bodyPanels[i].x,bodyY+H,'CREASE'));
  glueLines.push(line(by.glue.x,bodyY,by.glue.x+by.glue.w,bodyY,'GLUE'));
  return finish('sleeve-carton',s,dims,{width:bodyEnd+margin,height:bodyY+H+margin,margin,bodyPanels,cutLines,creaseLines,glueLines,foldRoot:'front',documentTitle:'Open End Folding Sleeve · V0.48 engineering core',engineeringNotes:['Open top and bottom are intentional; the sleeve wraps four product faces and closes at the glue seam.','Caliper compensation is included; overlap/glue target should be replaced by a factory/customer profile for production tooling.']});
}

export function generateAdditionalTemplateV48(input={}){
  switch(input.template){
    case 'fefco-0203':return generateFefco0203V48(input);
    case 'straight-tuck-end':return generateStraightTuckEndV48(input);
    case 'sleeve-carton':return generateSleeveCartonV48(input);
    default:return null;
  }
}

export function dimensionSetForTemplateV48(template,input={}){
  if(!isV48EngineTemplate(template))return null;
  return resolveBoxDimensionsV32({...input,template},V48_ALLOWANCES[template]);
}
