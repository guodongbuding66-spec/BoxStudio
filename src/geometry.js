export * from './geometryLegacyV31.js';
import * as legacy from './geometryLegacyV31.js';
import { generateAdditionalTemplateV32, isV32EngineTemplate } from './parametricTemplatesV32.js';

const ADVANCED_DEFAULTS={cornerRadius:0,flapTaper:0,relief:0,notch:0,shoulder:0};
const V32_DEFAULTS={
  'fefco-0427':{
    template:'fefco-0427',sizeType:'internal',length:300,width:200,height:70,thickness:1.5,
    materialId:'corrugated-white',flute:'E',layers:3,glue:0,burstPsi:0,tolerance:2,print:'Artwork + Dieline',compensation:true,bleed:3,safe:5,...ADVANCED_DEFAULTS,
  },
  'reverse-tuck-end':{
    template:'reverse-tuck-end',sizeType:'internal',length:120,width:45,height:180,thickness:0.45,
    materialId:'sbs-paperboard',flute:'CUSTOM',layers:1,glue:18,burstPsi:0,tolerance:1,print:'Artwork + Dieline',compensation:true,bleed:3,safe:4,...ADVANCED_DEFAULTS,
  },
  'auto-lock-bottom':{
    template:'auto-lock-bottom',sizeType:'internal',length:120,width:60,height:180,thickness:0.5,
    materialId:'sbs-paperboard',flute:'CUSTOM',layers:1,glue:18,burstPsi:0,tolerance:1,print:'Artwork + Dieline',compensation:true,bleed:3,safe:4,...ADVANCED_DEFAULTS,
  },
};

export const TEMPLATE_DEFAULTS=Object.freeze({...legacy.TEMPLATE_DEFAULTS,...V32_DEFAULTS});
export const defaultStructure={...TEMPLATE_DEFAULTS['side-seal-rsc']};

const num=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const clamp=(v,min,max=Infinity)=>Math.min(max,Math.max(min,v));

export function defaultsForTemplate(template='side-seal-rsc'){
  return structuredClone(TEMPLATE_DEFAULTS[template]||TEMPLATE_DEFAULTS['side-seal-rsc']);
}

export function normalizeStructure(input={}){
  if(!isV32EngineTemplate(input.template))return legacy.normalizeStructure(input);
  const base=TEMPLATE_DEFAULTS[input.template],s={...base,...input};
  s.template=input.template;
  s.sizeType=['internal','external','manufacturing'].includes(s.sizeType)?s.sizeType:'internal';
  s.length=Math.max(25,num(s.length,base.length));
  s.width=Math.max(20,num(s.width,base.width));
  s.height=Math.max(15,num(s.height,base.height));
  s.thickness=Math.max(.1,num(s.thickness,base.thickness));
  s.glue=Math.max(0,num(s.glue,base.glue||0));
  s.layers=Math.max(1,Math.round(num(s.layers,base.layers||1)));
  s.burstPsi=Math.max(0,num(s.burstPsi,base.burstPsi||0));
  s.tolerance=Math.max(0,num(s.tolerance,base.tolerance||0));
  s.bleed=Math.max(0,num(s.bleed,base.bleed??3));
  s.safe=Math.max(0,num(s.safe,base.safe??5));
  s.cornerRadius=clamp(num(s.cornerRadius,base.cornerRadius||0),0,30);
  s.flapTaper=clamp(num(s.flapTaper,base.flapTaper||0),0,30);
  s.relief=clamp(num(s.relief,base.relief||0),0,20);
  s.notch=clamp(num(s.notch,base.notch||0),0,25);
  s.shoulder=clamp(num(s.shoulder,base.shoulder||0),0,30);
  s.compensation=s.compensation!==false;
  return s;
}

export function manufacturingDimensions(input={}){
  const s=normalizeStructure(input);
  if(!isV32EngineTemplate(s.template))return legacy.manufacturingDimensions(s);
  return generateAdditionalTemplateV32(s).manufacturing;
}

function withGuidesV32(g){
  const bleed=Number(g.structure?.bleed||0),safe=Number(g.structure?.safe||0);
  const guidePanels=(g.bodyPanels||[]).filter(p=>p.kind==='panel'),rects=guidePanels.filter(p=>!p.points?.length),polys=guidePanels.filter(p=>p.points?.length>=3);
  return {
    ...g,
    bleedRects:rects.map(p=>({panelId:p.id,x:p.x-bleed,y:p.y-bleed,w:p.w+bleed*2,h:p.h+bleed*2})),
    safeRects:rects.map(p=>({panelId:p.id,x:p.x+safe,y:p.y+safe,w:Math.max(0,p.w-safe*2),h:Math.max(0,p.h-safe*2)})),
    bleedPolygons:polys.map(p=>({panelId:p.id,points:legacy.offsetPolygon(p.points,bleed)})),
    safePolygons:polys.map(p=>({panelId:p.id,points:legacy.offsetPolygon(p.points,-safe)})),
  };
}

export function generateGeometry(input={}){
  const s=normalizeStructure(input);
  if(!isV32EngineTemplate(s.template))return legacy.generateGeometry(s.template==='imported'?input:s);
  return withGuidesV32(generateAdditionalTemplateV32(s));
}
