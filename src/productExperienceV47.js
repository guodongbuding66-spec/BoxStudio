import { STANDARD_TEMPLATE_CATALOG } from './templates.js';
import { MATERIAL_PRESETS_V32, FLUTE_PRESETS_V32 } from './materialsV32.js';
import { stateForTemplate, cloneState } from './model.js';

export const V47_PRODUCT_VERSION='V0.47';
export const V47_FREE_POLICY=Object.freeze({freeForEveryone:true,loginRequired:false,paywall:false,trial:false});
export const V47_WORKFLOW=Object.freeze([
  {id:'template',label:'1 选择盒型',tab:'Structure'},
  {id:'size',label:'2 设置尺寸',tab:'Structure'},
  {id:'dieline',label:'3 编辑刀版',tab:'Design'},
  {id:'preview',label:'4 3D 预览',tab:'3D'},
  {id:'marks',label:'5 编辑唛头',tab:'Marks'},
  {id:'export',label:'6 检查并导出',tab:'Export'},
]);

const implementedStatus=new Set(['implemented','engineering-core']);
export function actionableTemplatesV47(){return STANDARD_TEMPLATE_CATALOG.filter(t=>t.engine&&implementedStatus.has(t.status));}
export function templateCategoriesV47(){return ['all',...new Set(actionableTemplatesV47().map(t=>t.category))]}
export function searchTemplatesV47({query='',category='all',standard='all'}={}){
  const q=String(query||'').trim().toLowerCase();
  return actionableTemplatesV47().filter(t=>(category==='all'||t.category===category)&&(standard==='all'||t.standard===standard)&&(!q||[t.id,t.code,t.name,t.nameZh,...(t.tags||[])].join(' ').toLowerCase().includes(q)));
}
export function materialOptionsV47(){return MATERIAL_PRESETS_V32.map(x=>({...x}))}
export function fluteOptionsV47(){return Object.values(FLUTE_PRESETS_V32).map(x=>({...x}))}
export function sanitizeQuickSizeV47(input={}){
  const n=(v,d)=>Number.isFinite(Number(v))?Number(v):d;
  return {length:Math.max(25,n(input.length,300)),width:Math.max(20,n(input.width,200)),height:Math.max(15,n(input.height,70)),thickness:Math.max(.1,n(input.thickness,1.5)),sizeType:['internal','external','manufacturing'].includes(input.sizeType)?input.sizeType:'internal',materialId:String(input.materialId||'corrugated-white'),flute:String(input.flute||'E').toUpperCase()};
}
export function prepareTemplateStateV47(currentState,templateId,quickSize={}){
  const found=actionableTemplatesV47().find(t=>t.id===templateId);if(!found)throw Object.assign(new Error(`Template ${templateId} is not available for free editing.`),{code:'V47_TEMPLATE_NOT_ACTIONABLE'});
  const next=cloneState(currentState),preset=stateForTemplate(templateId,next.variables),size=sanitizeQuickSizeV47(quickSize);
  next.structure={...preset.structure,...size,template:templateId};next.elements=preset.elements;next.variables={...preset.variables};next.selectedId=preset.selectedId;next.projectName=`${found.nameZh||found.name} / Free Project`;next.page='editor';next.editorTab='Structure';next.foldProgress=100;next.savedAt=new Date().toISOString();return next;
}

export const V47_MARK_GROUPS=Object.freeze([
  {id:'shipping',label:'运输信息',items:['SKU','N.W. / G.W.','L×W×H','箱号 / Package X/Y','合同号','目的国']},
  {id:'identity',label:'识别与追溯',items:['Code 39','EAN-13','UPC-A','ITF-14','GS1-128','QR']},
  {id:'handling',label:'搬运标识',items:['向上','易碎','防潮','禁止翻滚','堆码限制','重心']},
  {id:'origin',label:'产地与合规',items:['Made in','CRN','客户料号','批次号','日期码','自定义变量']},
]);
