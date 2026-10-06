import { searchTemplatesV47 } from './productExperienceV47.js';
import { dimensionSummaryV48, presetsForTemplateV48, templateCountV48 } from './productExperienceV48.js';
import { V58_FREE_POLICY } from './productExperienceV58.js';

export const V59_PRODUCT_VERSION='V0.59';
export const V59_UI_MODES={simple:{id:'simple',label:'简洁模式'},professional:{id:'professional',label:'专业模式'}};
export const V59_GUIDED_FLOW=[
  {id:'structure',tab:'Structure',label:'盒型与尺寸',short:'尺寸 / 材料'},
  {id:'design',tab:'Design',label:'平面设计',short:'文字 / 图形'},
  {id:'preview',tab:'3D',label:'3D 预览',short:'折叠 / 外观'},
  {id:'marks',tab:'Marks',label:'唛头',short:'条码 / 变量'},
  {id:'export',tab:'Export',label:'导出',short:'PDF / SVG / DXF'},
];
export const V59_SIZE_MODES=[
  {id:'internal',label:'内尺寸'},
  {id:'manufacturing',label:'制造尺寸'},
  {id:'external',label:'外尺寸'},
];
export const V59_OUTPUT_FORMATS=[
  {id:'pdf',label:'PDF',detail:'生产 PDF / PDF-X candidate workflow'},
  {id:'svg',label:'SVG',detail:'1:1 mm editable vector'},
  {id:'dxf',label:'DXF',detail:'CUT / CREASE / PERF / GLUE layers'},
  {id:'png',label:'PNG',detail:'high-resolution preview'},
];
export const V59_REFERENCE_PRINCIPLES=[
  {source:'Pacdora',id:'detail-workbench',label:'模板详情直接进入参数 + 刀版 + 3D/导出工作台'},
  {source:'Pacdora',id:'size-mode',label:'内尺寸 / 制造尺寸 / 外尺寸为一级参数'},
  {source:'Pacdora',id:'print-lines',label:'出血 / 裁切 / 压痕视觉语义清晰'},
  {source:'Packform',id:'one-project',label:'参数、展开图、图文、3D 与导出保持同一项目'},
  {source:'Packform',id:'progressive-complexity',label:'基础编辑默认简单，高级刀模能力按需展开'},
  {source:'Packform',id:'marks-flow',label:'唛头 / 条码 / QR / 批量字段映射作为正常设计操作'},
];

export function normalizeUiModeV59(value){return value==='professional'?'professional':'simple'}
export function templateStudioDataV59(templateId,config={}){
  const template=searchTemplatesV47({}).find(x=>x.id===templateId);if(!template)throw new Error(`V59_UNKNOWN_TEMPLATE:${templateId}`);
  return{template,presets:presetsForTemplateV48(templateId),summary:dimensionSummaryV48(templateId,config),sizeModes:V59_SIZE_MODES,outputs:V59_OUTPUT_FORMATS};
}
export function productAcceptanceV59(){
  const templates=searchTemplatesV47({});
  const tested=[];
  for(const t of templates){const data=templateStudioDataV59(t.id,{});tested.push({id:t.id,presets:data.presets.length,thickness:data.summary.thickness})}
  const flow=V59_GUIDED_FLOW.map(x=>x.tab).join('>');
  const free=V58_FREE_POLICY.freeForEveryone===true&&V58_FREE_POLICY.loginRequired===false&&V58_FREE_POLICY.paywall===false&&V58_FREE_POLICY.trial===false&&V58_FREE_POLICY.downloadGate===false;
  return{ok:free&&templateCountV48()===templates.length&&templates.length>=8&&flow==='Structure>Design>3D>Marks>Export'&&V59_OUTPUT_FORMATS.length===4&&V59_REFERENCE_PRINCIPLES.length>=6,free,templates:templates.length,tested,flow,outputs:V59_OUTPUT_FORMATS.map(x=>x.id)};
}
