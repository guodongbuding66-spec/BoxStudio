export * from './geometryLegacyV31.js';
import * as legacy from './geometryLegacyV31.js';
import { generateAdditionalTemplateV32, isV32EngineTemplate } from './parametricTemplatesV32.js';
import { generateAdditionalTemplateV48, isV48EngineTemplate } from './parametricTemplatesV48.js';
import {generateAdditionalTemplateV71,isV71EngineTemplate,V71_TEMPLATE_DEFAULTS} from './parametricTemplatesV71.js';
import { cubicFilletV43 } from './curvedGeometryV43.js';

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
const V48_DEFAULTS={
  'fefco-0203':{
    template:'fefco-0203',sizeType:'internal',length:400,width:300,height:250,thickness:3,
    materialId:'corrugated-kraft',flute:'B',layers:3,glue:35,burstPsi:0,tolerance:2,print:'Artwork + Dieline',compensation:true,bleed:3,safe:5,...ADVANCED_DEFAULTS,
  },
  'straight-tuck-end':{
    template:'straight-tuck-end',sizeType:'internal',length:120,width:45,height:180,thickness:0.45,
    materialId:'sbs-paperboard',flute:'CUSTOM',layers:1,glue:18,burstPsi:0,tolerance:1,print:'Artwork + Dieline',compensation:true,bleed:3,safe:4,...ADVANCED_DEFAULTS,
  },
  'sleeve-carton':{
    template:'sleeve-carton',sizeType:'internal',length:160,width:60,height:120,thickness:0.5,
    materialId:'sbs-paperboard',flute:'CUSTOM',layers:1,glue:18,burstPsi:0,tolerance:1,print:'Artwork + Dieline',compensation:true,bleed:3,safe:4,...ADVANCED_DEFAULTS,
  },
};

export const TEMPLATE_DEFAULTS=Object.freeze({...legacy.TEMPLATE_DEFAULTS,...V32_DEFAULTS,...V48_DEFAULTS,...V71_TEMPLATE_DEFAULTS});
export const defaultStructure={...TEMPLATE_DEFAULTS['side-seal-rsc']};

const num=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const clamp=(v,min,max=Infinity)=>Math.min(max,Math.max(min,v));
const line=(x1,y1,x2,y2,type='CUT')=>({x1,y1,x2,y2,type});
const close=(a,b)=>Math.abs(Number(a)-Number(b))<1e-6;
const sameSegment=(a,b)=>((close(a.x1,b.x1)&&close(a.y1,b.y1)&&close(a.x2,b.x2)&&close(a.y2,b.y2))||(close(a.x1,b.x2)&&close(a.y1,b.y2)&&close(a.x2,b.x1)&&close(a.y2,b.y1)));
const isParametricEngineTemplate=template=>isV32EngineTemplate(template)||isV48EngineTemplate(template)||isV71EngineTemplate(template);
const generateParametricTemplate=s=>isV71EngineTemplate(s.template)?generateAdditionalTemplateV71(s):isV48EngineTemplate(s.template)?generateAdditionalTemplateV48(s):generateAdditionalTemplateV32(s);

export function defaultsForTemplate(template='side-seal-rsc'){
  return structuredClone(TEMPLATE_DEFAULTS[template]||TEMPLATE_DEFAULTS['side-seal-rsc']);
}

export function normalizeStructure(input={}){
  if(!isParametricEngineTemplate(input.template))return legacy.normalizeStructure(input);
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
  if(!isParametricEngineTemplate(s.template))return legacy.manufacturingDimensions(s);
  return generateParametricTemplate(s).manufacturing;
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

function removePanelOuterCuts(g,p,freeY){
  const targets=[
    line(p.x,freeY,p.x+p.w,freeY),
    line(p.x,p.y,p.x,p.y+p.h),
    line(p.x+p.w,p.y,p.x+p.w,p.y+p.h),
  ];
  g.cutLines=(g.cutLines||[]).filter(candidate=>!targets.some(target=>sameSegment(candidate,target)));
}

function applyTuckShapeV42(g,s,panelId){
  const p=g.panelMap?.[panelId];if(!p)return null;
  const parent=p.parent?g.panelMap?.[p.parent]:null;
  const above=parent?((p.y+p.h/2)<(parent.y+parent.h/2)):true;
  const freeY=above?p.y:p.y+p.h,foldY=above?p.y+p.h:p.y;
  const taper=clamp(num(s.flapTaper),0,Math.min(p.w*.2,p.h*.55,30));
  const notch=clamp(num(s.notch),0,Math.min(p.h*.45,25));
  const shoulder=clamp(num(s.shoulder),0,Math.min(p.w*.16,30));
  if(!(taper||notch||shoulder))return {panelId,taper:0,notch:0,shoulder:0};
  removePanelOuterCuts(g,p,freeY);
  const leftFree=p.x+taper,rightFree=p.x+p.w-taper,direction=above?1:-1;
  p.points=above?[[p.x,foldY],[leftFree,freeY],[rightFree,freeY],[p.x+p.w,foldY]]:[[p.x,foldY],[p.x+p.w,foldY],[rightFree,freeY],[leftFree,freeY]];
  g.cutLines.push(line(p.x,foldY,leftFree,freeY),line(p.x+p.w,foldY,rightFree,freeY));
  if(notch>0){
    const notchWidth=Math.min(Math.max(12,notch*3),Math.max(12,(rightFree-leftFree)*.38)),cx=(leftFree+rightFree)/2,nl=cx-notchWidth/2,nr=cx+notchWidth/2,ny=freeY+direction*notch;
    g.cutLines.push(line(leftFree,freeY,nl,freeY),line(nl,freeY,nl,ny),line(nl,ny,nr,ny),line(nr,ny,nr,freeY),line(nr,freeY,rightFree,freeY));
  }else g.cutLines.push(line(leftFree,freeY,rightFree,freeY));
  if(shoulder>0){
    const depth=Math.min(p.h*.18,Math.max(2,shoulder*.35)),sy=foldY+(above?-depth:depth);
    g.cutLines.push(line(p.x+shoulder,foldY,p.x+shoulder,sy),line(p.x+p.w-shoulder,foldY,p.x+p.w-shoulder,sy));
  }
  return {panelId,taper,notch,shoulder};
}

function applyReliefV42(g,s){
  const relief=clamp(num(s.relief),0,20);if(!relief)return 0;
  const base=g.panelMap?.base;if(!base)return 0;
  const d=Math.min(relief,Math.max(1,Math.min(base.w,base.h)*.08));
  const pts=[[base.x,base.y,-1,-1],[base.x+base.w,base.y,1,-1],[base.x,base.y+base.h,-1,1],[base.x+base.w,base.y+base.h,1,1]];
  pts.forEach(([x,y,sx,sy])=>g.cutLines.push(line(x,y,x+sx*d,y+sy*d)));
  return d;
}

export function applyAdvancedStructureV42(geometry,input={}){
  if(!geometry)return geometry;
  const s=normalizeStructure(input),g=structuredClone(geometry),applied=[];
  if(s.template==='fefco-0427'){
    const tuck=applyTuckShapeV42(g,s,'lid-tuck');if(tuck&&(tuck.taper||tuck.notch||tuck.shoulder))applied.push(tuck);
    const relief=applyReliefV42(g,s);if(relief)applied.push({kind:'roll-relief',depth:relief});
  }else if(s.template==='reverse-tuck-end'){
    for(const id of ['top-front-tuck','bottom-back-tuck']){const tuck=applyTuckShapeV42(g,s,id);if(tuck&&(tuck.taper||tuck.notch||tuck.shoulder))applied.push(tuck)}
  }else if(s.template==='auto-lock-bottom'){
    const tuck=applyTuckShapeV42(g,s,'top-front-tuck');if(tuck&&(tuck.taper||tuck.notch||tuck.shoulder))applied.push(tuck);
  }else if(s.template==='straight-tuck-end'){
    for(const id of ['top-front-tuck','bottom-front-tuck']){const tuck=applyTuckShapeV42(g,s,id);if(tuck&&(tuck.taper||tuck.notch||tuck.shoulder))applied.push(tuck)}
  }
  const cornerMode=s.cornerRadius>0?'metadata-only-line-engine':'off';
  g.advancedV42={cornerRadius:s.cornerRadius,cornerRadiusMode:cornerMode,flapTaper:s.flapTaper,relief:s.relief,notch:s.notch,shoulder:s.shoulder,applied};
  g.engineeringNotes=[...(g.engineeringNotes||[])];
  if(s.cornerRadius>0)g.engineeringNotes.push(`Requested corner radius ${s.cornerRadius} mm is stored for the V0.42 structure model but is not emitted as a production arc by the V0.42 line-segment generator.`);
  if(applied.length)g.engineeringNotes.push('Advanced tuck/relief controls modified semantic CUT geometry. Real-sample tooling acceptance is still required.');
  return g;
}

function touches(lineRecord,corner){return(close(lineRecord.x1,corner.x)&&close(lineRecord.y1,corner.y))||(close(lineRecord.x2,corner.x)&&close(lineRecord.y2,corner.y))}
function otherEndpoint(lineRecord,corner){return close(lineRecord.x1,corner.x)&&close(lineRecord.y1,corner.y)?{x:lineRecord.x2,y:lineRecord.y2}:{x:lineRecord.x1,y:lineRecord.y1}}
function roundCutCornerV43(g,corner,radius,panelId){
  const incident=(g.cutLines||[]).filter(l=>touches(l,corner));if(incident.length!==2)return null;
  const a=otherEndpoint(incident[0],corner),b=otherEndpoint(incident[1],corner),fillet=cubicFilletV43(a,corner,b,radius,{kind:'CUT',panelId});if(!fillet)return null;
  const drop=new Set(incident);g.cutLines=(g.cutLines||[]).filter(l=>!drop.has(l));
  g.cutLines.push(line(a.x,a.y,fillet.start.x,fillet.start.y),line(b.x,b.y,fillet.end.x,fillet.end.y));
  g.cutCurves=[...(g.cutCurves||[]),fillet.curve];
  return{panelId,radius:fillet.radius,corner:{x:corner.x,y:corner.y},curve:structuredClone(fillet.curve)};
}
function freeCornersForPanelV43(g,p){
  if(!Array.isArray(p?.points)||p.points.length<4)return[];const parent=p.parent?g.panelMap?.[p.parent]:null,above=parent?((p.y+p.h/2)<(parent.y+parent.h/2)):true,freeY=above?p.y:p.y+p.h;
  return p.points.map(q=>({x:num(q[0]),y:num(q[1])})).filter(q=>close(q.y,freeY)).sort((a,b)=>a.x-b.x).slice(0,2);
}
export function applyProductionCurvesV43(geometry,input={}){
  if(!geometry)return geometry;const s=normalizeStructure(input),g=structuredClone(geometry),requested=clamp(num(s.cornerRadius),0,30),supported={
    'fefco-0427':['lid-tuck'],
    'reverse-tuck-end':['top-front-tuck','bottom-back-tuck'],
    'auto-lock-bottom':['top-front-tuck'],
    'straight-tuck-end':['top-front-tuck','bottom-front-tuck'],
  },panelIds=supported[s.template]||[],applied=[];
  if(requested>0){for(const panelId of panelIds){const p=g.panelMap?.[panelId];if(!p)continue;const records=[];for(const corner of freeCornersForPanelV43(g,p)){const item=roundCutCornerV43(g,corner,requested,panelId);if(item){records.push(item);applied.push(item)}}if(records.length)p.productionCurvesV43=records.map(x=>structuredClone(x.curve))}}
  g.advancedV43={cornerRadius:requested,cornerRadiusMode:applied.length?'production-native-cubic':'off',curvesAdded:applied.length,applied:applied.map(({curve,...rest})=>rest),meshPolicy:applied.length?'sample-native-curves-for-topology':'line-topology'};
  g.engineeringNotes=[...(g.engineeringNotes||[])];
  if(applied.length)g.engineeringNotes.push(`V0.43 emits ${applied.length} native cubic CUT fillet${applied.length===1?'':'s'} for ${requested} mm requested corner radius. SVG/PDF preserve cubic vectors; DXF emits SPLINE. 3D topology samples the same native curves only at mesh reconstruction time.`);
  return g;
}

export function generateGeometry(input={}){
  const s=normalizeStructure(input);
  if(!isParametricEngineTemplate(s.template))return legacy.generateGeometry(s.template==='imported'?input:s);
  const base=generateParametricTemplate(s),v42=applyAdvancedStructureV42(base,s),v43=applyProductionCurvesV43(v42,s);
  return withGuidesV32(v43);
}
