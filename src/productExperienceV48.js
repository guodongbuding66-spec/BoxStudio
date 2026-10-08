import { STANDARD_TEMPLATE_CATALOG } from './templates.js';
import { defaultsForTemplate, generateGeometry } from './geometry.js';
import { resolveMaterialV32 } from './materialsV32.js';

export const V48_PRODUCT_VERSION='V0.48';

const PRESETS=Object.freeze({
  shipping:Object.freeze([
    {id:'shipping-s',label:'小型运输箱',length:300,width:200,height:180},
    {id:'shipping-m',label:'中型运输箱',length:450,width:320,height:260},
    {id:'shipping-l',label:'大型运输箱',length:600,width:400,height:350},
  ]),
  mailer:Object.freeze([
    {id:'mailer-s',label:'小型电商盒',length:220,width:150,height:55},
    {id:'mailer-m',label:'中型电商盒',length:320,width:220,height:80},
    {id:'mailer-l',label:'大型电商盒',length:420,width:300,height:110},
  ]),
  'folding-carton':Object.freeze([
    {id:'carton-s',label:'小型彩盒',length:75,width:35,height:120},
    {id:'carton-m',label:'中型彩盒',length:120,width:50,height:180},
    {id:'carton-l',label:'大型彩盒',length:180,width:70,height:240},
  ]),
  sleeve:Object.freeze([
    {id:'sleeve-s',label:'小型套筒',length:100,width:35,height:80},
    {id:'sleeve-m',label:'中型套筒',length:160,width:60,height:120},
    {id:'sleeve-l',label:'大型套筒',length:240,width:85,height:170},
  ]),
});

const r=(v,p=2)=>{const m=10**p;return Math.round(Number(v||0)*m)/m};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function templateMetaV48(templateId){return STANDARD_TEMPLATE_CATALOG.find(t=>t.id===templateId)||null;}
export function presetsForTemplateV48(templateId){
  const meta=templateMetaV48(templateId),list=PRESETS[meta?.category]||PRESETS.shipping;
  return list.map(x=>({...x}));
}

export function resolveQuickMaterialV48(input={}){
  const hasThickness=input.thickness!==undefined&&input.thickness!==null&&String(input.thickness).trim()!=='';
  const raw=Number(input.thickness),thickness=hasThickness&&Number.isFinite(raw)?Math.max(.1,raw):undefined;
  const resolved=resolveMaterialV32({materialId:input.materialId,flute:input.flute,...(thickness!==undefined?{thickness}:{})});
  return {...resolved,thicknessMm:thickness??resolved.thicknessMm};
}

export function dimensionSummaryV48(templateId,input={}){
  const defaults=defaultsForTemplate(templateId),structure={...defaults,...input,template:templateId};
  const material=resolveQuickMaterialV48(structure);structure.materialId=material.materialId;structure.flute=material.flute||'CUSTOM';structure.thickness=material.thicknessMm;
  const geometry=generateGeometry(structure),set=geometry?.dimensionSet;
  if(set){
    return {templateId,mode:set.mode,material,inside:{L:r(set.inside.L),W:r(set.inside.W),H:r(set.inside.H)},manufacturing:{L:r(set.manufacturing.L),W:r(set.manufacturing.W),H:r(set.manufacturing.H)},external:{L:r(set.external.L),W:r(set.external.W),H:r(set.external.H)},thickness:r(set.T),exact:true};
  }
  const raw={L:r(structure.length),W:r(structure.width),H:r(structure.height)},manufacturing=geometry?.manufacturing||{};
  return {templateId,mode:structure.sizeType||'internal',material,inside:raw,manufacturing:{L:r(manufacturing.L??raw.L),W:r(manufacturing.W??raw.W),H:r(manufacturing.H??raw.H)},external:{L:r(raw.L+2*material.thicknessMm),W:r(raw.W+2*material.thicknessMm),H:r(raw.H+2*material.thicknessMm)},thickness:r(material.thicknessMm),exact:false};
}

export function previewSvgForTemplateV48(templateId,{width=250,height=150,structure=null}={}){
  const g=generateGeometry({...defaultsForTemplate(templateId),...(structure||{}),template:templateId});if(!g)return'';
  const sx=width/Math.max(1,g.width),sy=height/Math.max(1,g.height),scale=Math.min(sx,sy)*.9,ox=(width-g.width*scale)/2,oy=(height-g.height*scale)/2;
  const seg=(l,kind)=>`<line x1="${r(ox+l.x1*scale)}" y1="${r(oy+l.y1*scale)}" x2="${r(ox+l.x2*scale)}" y2="${r(oy+l.y2*scale)}" class="${kind}"/>`;
  return `<svg class="v48-template-svg" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(g.documentTitle||templateId)}"><rect width="100%" height="100%" rx="8" class="paper"/>${(g.cutLines||[]).map(l=>seg(l,'cut')).join('')}${(g.creaseLines||[]).map(l=>seg(l,'crease')).join('')}</svg>`;
}

export function templateCountV48(){return STANDARD_TEMPLATE_CATALOG.filter(t=>t.engine&&['implemented','engineering-core'].includes(t.status)).length;}
