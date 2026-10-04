import { resolveMaterialV32 } from './materialsV32.js';

export const PARAMETRIC_TEMPLATE_SCHEMA_V32=1;

export const V32_TEMPLATE_CATALOG=Object.freeze([
  {id:'side-seal-rsc',category:'shipping',standard:'FEFCO',code:'0201',name:'Regular Slotted Carton',nameZh:'开槽箱 / RSC',engine:'legacy-rsc',status:'implemented',parameters:['length','width','height','thickness','glue','flute'],tags:['rsc','0201','shipping','corrugated']},
  {id:'mailer-150010',category:'mailer',standard:'CUSTOM',code:'150010',name:'Flip-top Mailer 150010',nameZh:'飞机盒 / Flip-top',engine:'legacy-mailer-150010',status:'implemented',parameters:['length','width','height','thickness','wing','flute'],tags:['mailer','flip top','150010','ecommerce']},
  {id:'fefco-0427',category:'mailer',standard:'FEFCO',code:'0427',name:'Roll-end Tuck-top Mailer',nameZh:'0427 自锁邮寄盒',engine:'v32-fefco-0427',status:'engineering-core',parameters:['length','width','height','thickness','flute'],tags:['0427','mailer','rett','roll end','self lock']},
  {id:'reverse-tuck-end',category:'folding-carton',standard:'ECMA-LIKE',code:'RTE',name:'Reverse Tuck End Carton',nameZh:'反插口盒',engine:'v32-reverse-tuck-end',status:'engineering-core',parameters:['length','width','height','thickness','glue'],tags:['reverse tuck','rte','folding carton','paperboard']},
  {id:'auto-lock-bottom',category:'folding-carton',standard:'ECMA-LIKE',code:'AUTO-LOCK',name:'Auto-lock Bottom Carton',nameZh:'自动锁底盒',engine:'v32-auto-lock-bottom',status:'engineering-core',parameters:['length','width','height','thickness','glue'],tags:['auto lock','crash lock','bottom','folding carton']},
]);

const V32_ENGINE_IDS=new Set(['fefco-0427','reverse-tuck-end','auto-lock-bottom']);
const n=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const clamp=(v,min,max=Infinity)=>Math.min(max,Math.max(min,v));
const line=(x1,y1,x2,y2,type='CUT')=>({x1,y1,x2,y2,type});
const panel=(id,label,x,y,w,h,kind='panel',extra={})=>({id,label,x,y,w,h,kind,...extra});

export function templateCatalogByIdV32(id){return V32_TEMPLATE_CATALOG.find(t=>t.id===id)||null;}
export function isV32EngineTemplate(id){return V32_ENGINE_IDS.has(id);}
export function searchTemplateCatalogV32({query='',category='all',standard='all'}={}){
  const q=String(query||'').trim().toLowerCase();
  return V32_TEMPLATE_CATALOG.filter(t=>{
    if(category!=='all'&&t.category!==category)return false;
    if(standard!=='all'&&t.standard!==standard)return false;
    if(!q)return true;
    return [t.id,t.code,t.name,t.nameZh,...t.tags].join(' ').toLowerCase().includes(q);
  });
}

export function normalizeSizeModeV32(value){return ['internal','external','manufacturing'].includes(value)?value:'internal';}

export function resolveBoxDimensionsV32(input={},allowance={L:1,W:1,H:2}){
  const material=resolveMaterialV32(input),t=input.compensation===false?0:material.thicknessMm;
  const mode=normalizeSizeModeV32(input.sizeType);
  const raw={L:clamp(n(input.length,200),25),W:clamp(n(input.width,120),20),H:clamp(n(input.height,60),15)};
  const a={L:n(allowance.L,1),W:n(allowance.W,1),H:n(allowance.H,2)};
  let inside,manufacturing,external;
  if(mode==='external'){
    external={...raw};
    inside={L:clamp(raw.L-2*t,25),W:clamp(raw.W-2*t,20),H:clamp(raw.H-2*t,15)};
    manufacturing={L:inside.L+a.L*t,W:inside.W+a.W*t,H:inside.H+a.H*t};
  }else if(mode==='manufacturing'){
    manufacturing={...raw};
    inside={L:clamp(raw.L-a.L*t,25),W:clamp(raw.W-a.W*t,20),H:clamp(raw.H-a.H*t,15)};
    external={L:inside.L+2*t,W:inside.W+2*t,H:inside.H+2*t};
  }else{
    inside={...raw};
    manufacturing={L:raw.L+a.L*t,W:raw.W+a.W*t,H:raw.H+a.H*t};
    external={L:raw.L+2*t,W:raw.W+2*t,H:raw.H+2*t};
  }
  return {mode,inside,manufacturing,external,T:material.thicknessMm,material};
}

function baseStructure(input,template,defaults={}){
  const material=resolveMaterialV32({...defaults,...input});
  return {
    template,
    sizeType:normalizeSizeModeV32(input.sizeType||defaults.sizeType||'internal'),
    length:clamp(n(input.length,defaults.length||300),25),
    width:clamp(n(input.width,defaults.width||200),20),
    height:clamp(n(input.height,defaults.height||70),15),
    thickness:clamp(n(input.thickness,material.thicknessMm),0.1,20),
    materialId:input.materialId||defaults.materialId||material.materialId,
    flute:input.flute||defaults.flute||material.flute||'CUSTOM',
    layers:Math.max(1,Math.round(n(input.layers,defaults.layers||material.ply||1))),
    glue:clamp(n(input.glue,defaults.glue??18),0,80),
    bleed:clamp(n(input.bleed,defaults.bleed??3),0,20),
    safe:clamp(n(input.safe,defaults.safe??5),0,30),
    compensation:input.compensation!==false,
  };
}

function finishGeometry(template,s,dims,{width,height,margin,bodyPanels,flapPanels,cutLines,creaseLines,perfLines=[],glueLines=[],documentTitle,foldRoot='base',engineeringNotes=[]}){
  const panels=[...bodyPanels,...flapPanels];
  return {template,structure:s,manufacturing:{...dims.manufacturing,T:dims.T,glue:s.glue},dimensionSet:dims,width,height,margin,flap:0,bodyY:0,bodyBottom:height,bodyPanels,flapPanels,panels,panelMap:Object.fromEntries(panels.map(p=>[p.id,p])),cutLines,creaseLines,perfLines,glueLines,foldRoot,documentTitle,engineeringNotes,validationState:'engineering-core-pending-real-sample'};
}

function addRectOuterCuts(lines,p,skip={top:false,right:false,bottom:false,left:false}){
  if(!skip.top)lines.push(line(p.x,p.y,p.x+p.w,p.y));
  if(!skip.right)lines.push(line(p.x+p.w,p.y,p.x+p.w,p.y+p.h));
  if(!skip.bottom)lines.push(line(p.x,p.y+p.h,p.x+p.w,p.y+p.h));
  if(!skip.left)lines.push(line(p.x,p.y,p.x,p.y+p.h));
}

export function generateFefco0427V32(input={}){
  const s=baseStructure(input,'fefco-0427',{length:300,width:200,height:70,thickness:1.5,materialId:'corrugated-white',flute:'E',glue:0});
  const dims=resolveBoxDimensionsV32(s,{L:1.4,W:2.4,H:2});
  const {L,W,H}=dims.manufacturing,t=dims.T,margin=12,bridge=Math.max(3,2*t+0.4),ear=Math.max(16,Math.min(H*0.7,36));
  const xBase=margin+H+bridge+H;
  const yTuck=margin;
  const yLid=yTuck+H;
  const yBack=yLid+W;
  const yBase=yBack+H;
  const yFront=yBase+W;
  const height=yFront+H+margin;
  const width=xBase+L+H+bridge+H+margin;
  const bodyPanels=[
    panel('base','BASE',xBase,yBase,L,W,'panel',{role:'base'}),
    panel('back','BACK WALL',xBase,yBack,L,H,'panel',{role:'back-wall'}),
    panel('lid','LID',xBase,yLid,L,W,'panel',{role:'lid'}),
    panel('front','FRONT WALL',xBase,yFront,L,H,'panel',{role:'front-wall'}),
    panel('left','LEFT OUTER WALL',xBase-H-bridge,yBase,H,W,'panel',{role:'side-wall'}),
    panel('right','RIGHT OUTER WALL',xBase+L+bridge,yBase,H,W,'panel',{role:'side-wall'}),
  ];
  const flapPanels=[
    panel('lid-tuck','LID TUCK',xBase,yTuck,L,H,'flap',{parent:'lid',role:'lid-tuck'}),
    panel('lid-ear-left','LEFT LID EAR',xBase-ear,yLid,ear,W,'flap',{parent:'lid',role:'lid-ear'}),
    panel('lid-ear-right','RIGHT LID EAR',xBase+L,yLid,ear,W,'flap',{parent:'lid',role:'lid-ear'}),
    panel('left-bridge','LEFT ROLL BRIDGE',xBase-H-bridge,yBase,bridge,W,'flap',{parent:'left',role:'roll-bridge'}),
    panel('left-inner','LEFT INNER WALL',xBase-H-bridge-H,yBase,H,W,'flap',{parent:'left',role:'inner-wall'}),
    panel('right-bridge','RIGHT ROLL BRIDGE',xBase+L+H,yBase,bridge,W,'flap',{parent:'right',role:'roll-bridge'}),
    panel('right-inner','RIGHT INNER WALL',xBase+L+H+bridge,yBase,H,W,'flap',{parent:'right',role:'inner-wall'}),
    panel('back-left-tab','BACK LEFT TAB',xBase-H,yBack,H,H,'flap',{parent:'back',role:'dust-tab'}),
    panel('back-right-tab','BACK RIGHT TAB',xBase+L,yBack,H,H,'flap',{parent:'back',role:'dust-tab'}),
    panel('front-left-tab','FRONT LEFT TAB',xBase-H,yFront,H,H,'flap',{parent:'front',role:'dust-tab'}),
    panel('front-right-tab','FRONT RIGHT TAB',xBase+L,yFront,H,H,'flap',{parent:'front',role:'dust-tab'}),
  ];
  const cutLines=[],creaseLines=[];
  // Outer boundary of central stack and roll walls.
  addRectOuterCuts(cutLines,flapPanels[0],{bottom:true});
  addRectOuterCuts(cutLines,flapPanels[1],{right:true,bottom:true});
  addRectOuterCuts(cutLines,flapPanels[2],{left:true,bottom:true});
  addRectOuterCuts(cutLines,flapPanels[4],{right:true});
  addRectOuterCuts(cutLines,flapPanels[6],{left:true});
  addRectOuterCuts(cutLines,bodyPanels[3],{top:true});
  for(const p of flapPanels.slice(7))addRectOuterCuts(cutLines,p,{[p.id.includes('left')?'right':'left']:true});
  cutLines.push(line(xBase,yTuck,xBase+L,yTuck));
  cutLines.push(line(xBase,yFront+H,xBase+L,yFront+H));
  creaseLines.push(line(xBase,yLid,xBase+L,yLid,'CREASE'),line(xBase,yBack,xBase+L,yBack,'CREASE'),line(xBase,yBase,xBase+L,yBase,'CREASE'),line(xBase,yFront,xBase+L,yFront,'CREASE'));
  creaseLines.push(line(xBase-H-bridge,yBase,xBase-H-bridge,yBase+W,'CREASE'),line(xBase-H,yBase,xBase-H,yBase+W,'CREASE'),line(xBase,yBase,xBase,yBase+W,'CREASE'));
  creaseLines.push(line(xBase+L,yBase,xBase+L,yBase+W,'CREASE'),line(xBase+L+H,yBase,xBase+L+H,yBase+W,'CREASE'),line(xBase+L+H+bridge,yBase,xBase+L+H+bridge,yBase+W,'CREASE'));
  creaseLines.push(line(xBase,yBack,xBase,yBack+H,'CREASE'),line(xBase+L,yBack,xBase+L,yBack+H,'CREASE'),line(xBase,yFront,xBase,yFront+H,'CREASE'),line(xBase+L,yFront,xBase+L,yFront+H,'CREASE'));
  return finishGeometry('fefco-0427',s,dims,{width,height,margin,bodyPanels,flapPanels,cutLines,creaseLines,documentTitle:'FEFCO 0427 Roll-end Tuck-top Mailer · V0.32 engineering core',foldRoot:'base',engineeringNotes:['One-piece no-glue mailer core. Roll bridge and material compensation are parameterized.','Final factory tooling dimensions require real-sample/CAD acceptance.']});
}

function foldingCartonBody(input,template,defaults,allowance){
  const s=baseStructure(input,template,defaults),dims=resolveBoxDimensionsV32(s,allowance),{L,W,H}=dims.manufacturing,margin=18,glue=Math.max(12,s.glue),topDepth=Math.max(18,Math.min(W*0.9,70)),bottomDepth=topDepth;
  const bodyY=margin+topDepth,bodyBottom=bodyY+H;
  const specs=[['glue','GLUE',glue,'glue'],['left','LEFT',W,'panel'],['front','FRONT',L,'panel'],['right','RIGHT',W,'panel'],['back','BACK',L,'panel']];
  let x=margin;const bodyPanels=[];for(const [id,label,w,kind] of specs){bodyPanels.push(panel(id,label,x,bodyY,w,H,kind));x+=w;}
  return {s,dims,L,W,H,margin,glue,topDepth,bottomDepth,bodyY,bodyBottom,bodyPanels,bodyEnd:x};
}

export function generateReverseTuckEndV32(input={}){
  const b=foldingCartonBody(input,'reverse-tuck-end',{length:120,width:45,height:180,thickness:0.45,materialId:'sbs-paperboard',flute:'CUSTOM',glue:18},{L:1,W:1,H:1}),{s,dims,L,W,H,margin,topDepth,bottomDepth,bodyY,bodyBottom,bodyPanels,bodyEnd}=b;
  const by=Object.fromEntries(bodyPanels.map(p=>[p.id,p])),dust=Math.max(15,W*.62),tuck=Math.max(20,Math.min(W*.95,75));
  const flapPanels=[
    panel('top-front-tuck','TOP FRONT TUCK',by.front.x,bodyY-tuck,L,tuck,'flap',{parent:'front',role:'tuck'}),
    panel('top-left-dust','TOP LEFT DUST',by.left.x,bodyY-dust,W,dust,'flap',{parent:'left',role:'dust'}),
    panel('top-right-dust','TOP RIGHT DUST',by.right.x,bodyY-dust,W,dust,'flap',{parent:'right',role:'dust'}),
    panel('top-back-dust','TOP BACK DUST',by.back.x,bodyY-dust,L,dust,'flap',{parent:'back',role:'dust'}),
    panel('bottom-back-tuck','BOTTOM BACK TUCK',by.back.x,bodyBottom,L,tuck,'flap',{parent:'back',role:'tuck'}),
    panel('bottom-left-dust','BOTTOM LEFT DUST',by.left.x,bodyBottom,W,dust,'flap',{parent:'left',role:'dust'}),
    panel('bottom-right-dust','BOTTOM RIGHT DUST',by.right.x,bodyBottom,W,dust,'flap',{parent:'right',role:'dust'}),
    panel('bottom-front-dust','BOTTOM FRONT DUST',by.front.x,bodyBottom,L,dust,'flap',{parent:'front',role:'dust'}),
  ];
  const cutLines=[],creaseLines=[],glueLines=[];
  for(const p of flapPanels)addRectOuterCuts(cutLines,p,{[p.y<bodyY?'bottom':'top']:true});
  const gluePanel=by.glue;addRectOuterCuts(cutLines,gluePanel,{right:true});
  cutLines.push(line(bodyEnd,bodyY,bodyEnd,bodyBottom));
  creaseLines.push(line(by.left.x,bodyY,bodyEnd,bodyY,'CREASE'),line(by.left.x,bodyBottom,bodyEnd,bodyBottom,'CREASE'));
  for(let i=1;i<bodyPanels.length;i++)creaseLines.push(line(bodyPanels[i].x,bodyY,bodyPanels[i].x,bodyBottom,'CREASE'));
  glueLines.push(line(gluePanel.x,bodyY,gluePanel.x+gluePanel.w,bodyY,'GLUE'));
  return finishGeometry('reverse-tuck-end',s,dims,{width:bodyEnd+margin,height:bodyBottom+bottomDepth+margin,margin,bodyPanels,flapPanels,cutLines,creaseLines,glueLines,documentTitle:'Reverse Tuck End Folding Carton · V0.32 engineering core',foldRoot:'front',engineeringNotes:['Top and bottom tuck flaps close from opposite main panels.','Factory caliper, tuck friction and dust-flap clearances remain overrideable.']});
}

export function generateAutoLockBottomV32(input={}){
  const b=foldingCartonBody(input,'auto-lock-bottom',{length:120,width:60,height:180,thickness:0.5,materialId:'sbs-paperboard',flute:'CUSTOM',glue:18},{L:1,W:1,H:1}),{s,dims,L,W,H,margin,topDepth,bodyY,bodyBottom,bodyPanels,bodyEnd}=b;
  const by=Object.fromEntries(bodyPanels.map(p=>[p.id,p])),dust=Math.max(16,W*.6),tuck=Math.max(22,Math.min(W*.95,80)),lock=Math.max(24,Math.min(W*.85,90));
  const flapPanels=[
    panel('top-front-tuck','TOP TUCK',by.front.x,bodyY-tuck,L,tuck,'flap',{parent:'front',role:'tuck'}),
    panel('top-left-dust','TOP LEFT DUST',by.left.x,bodyY-dust,W,dust,'flap',{parent:'left',role:'dust'}),
    panel('top-right-dust','TOP RIGHT DUST',by.right.x,bodyY-dust,W,dust,'flap',{parent:'right',role:'dust'}),
    panel('top-back-dust','TOP BACK DUST',by.back.x,bodyY-dust,L,dust,'flap',{parent:'back',role:'dust'}),
    panel('bottom-left-lock','BOTTOM LEFT LOCK',by.left.x,bodyBottom,W,lock,'flap',{parent:'left',role:'auto-lock'}),
    panel('bottom-front-lock','BOTTOM FRONT LOCK',by.front.x,bodyBottom,L,lock,'flap',{parent:'front',role:'auto-lock'}),
    panel('bottom-right-lock','BOTTOM RIGHT LOCK',by.right.x,bodyBottom,W,lock,'flap',{parent:'right',role:'auto-lock'}),
    panel('bottom-back-lock','BOTTOM BACK LOCK',by.back.x,bodyBottom,L,lock,'flap',{parent:'back',role:'auto-lock'}),
  ];
  const cutLines=[],creaseLines=[],glueLines=[];
  for(const p of flapPanels.slice(0,4))addRectOuterCuts(cutLines,p,{bottom:true});
  // Auto-lock lower flaps use diagonal free edges instead of rectangular outer edges.
  for(const p of flapPanels.slice(4)){
    const inset=Math.min(p.w*.32,lock*.55);
    cutLines.push(line(p.x,p.y+lock,p.x+inset,p.y),line(p.x+inset,p.y,p.x+p.w-inset,p.y),line(p.x+p.w-inset,p.y,p.x+p.w,p.y+lock),line(p.x,p.y+lock,p.x+p.w,p.y+lock));
  }
  const gluePanel=by.glue;addRectOuterCuts(cutLines,gluePanel,{right:true});cutLines.push(line(bodyEnd,bodyY,bodyEnd,bodyBottom));
  creaseLines.push(line(by.left.x,bodyY,bodyEnd,bodyY,'CREASE'),line(by.left.x,bodyBottom,bodyEnd,bodyBottom,'CREASE'));
  for(let i=1;i<bodyPanels.length;i++)creaseLines.push(line(bodyPanels[i].x,bodyY,bodyPanels[i].x,bodyBottom,'CREASE'));
  // Diagonal pre-folds create the crash-lock action.
  for(const p of [flapPanels[4],flapPanels[5],flapPanels[6],flapPanels[7]])creaseLines.push(line(p.x,p.y,p.x+p.w/2,p.y+lock,'CREASE'));
  glueLines.push(line(gluePanel.x,bodyY,gluePanel.x+gluePanel.w,bodyY,'GLUE'));
  return finishGeometry('auto-lock-bottom',s,dims,{width:bodyEnd+margin,height:bodyBottom+lock+margin,margin,bodyPanels,flapPanels,cutLines,creaseLines,glueLines,documentTitle:'Auto-lock / Crash-lock Bottom Folding Carton · V0.32 engineering core',foldRoot:'front',engineeringNotes:['Diagonal lower pre-folds model the auto-lock bottom action.','Glue pattern and machine-specific lock clearances require factory-profile acceptance before tooling release.']});
}

export function generateAdditionalTemplateV32(input={}){
  switch(input.template){
    case 'fefco-0427':return generateFefco0427V32(input);
    case 'reverse-tuck-end':return generateReverseTuckEndV32(input);
    case 'auto-lock-bottom':return generateAutoLockBottomV32(input);
    default:return null;
  }
}

export function previewSvgForGeometryV32(g,{width=280,height=190}={}){
  if(!g)return '';
  const sx=width/Math.max(1,g.width),sy=height/Math.max(1,g.height),scale=Math.min(sx,sy),ox=(width-g.width*scale)/2,oy=(height-g.height*scale)/2;
  const seg=(l,cls)=>`<line class="${cls}" x1="${(ox+l.x1*scale).toFixed(2)}" y1="${(oy+l.y1*scale).toFixed(2)}" x2="${(ox+l.x2*scale).toFixed(2)}" y2="${(oy+l.y2*scale).toFixed(2)}"/>`;
  return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${g.documentTitle||g.template}"><rect width="100%" height="100%" fill="white"/>${(g.cutLines||[]).map(l=>seg(l,'cut')).join('')}${(g.creaseLines||[]).map(l=>seg(l,'crease')).join('')}</svg>`;
}
