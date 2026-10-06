import { STANDARD_TEMPLATE_CATALOG, searchTemplateCatalog } from './templates.js';
import { resolveBoxDimensionsV32 } from './parametricTemplatesV32.js';
import { MATERIAL_PRESETS_V32 } from './materialsV32.js';

export const V47_FREE_POLICY=Object.freeze({
  name:'BoxStudio Free',
  price:0,
  currency:'USD',
  accountRequired:false,
  watermark:false,
  exportGated:false,
  featureGated:false,
  commercialUse:true,
  statement:'永久免费 · 无需登录 · 无水印 · 生产导出不设付费墙',
});

export const V47_WORKFLOW=Object.freeze([
  {id:'templates',label:'选盒型',tab:null,description:'模板库 / 标准盒型 / 导入刀版'},
  {id:'structure',label:'结构尺寸',tab:'Structure',description:'内尺寸 / 制造尺寸 / 外尺寸 / 材料'},
  {id:'design',label:'图文设计',tab:'Design',description:'文字 / 图形 / 变量 / 面板定位'},
  {id:'marks',label:'唛头',tab:'Marks',description:'运输唛头 / 条码 / QR / Excel 批量'},
  {id:'preview',label:'3D 验证',tab:'3D',description:'折叠 / 旋转 / 开合 / 结构关系'},
  {id:'preflight',label:'生产检查',tab:'Preflight',description:'刀线 / 拓扑 / 约束 / 印前'},
  {id:'export',label:'免费导出',tab:'Export',description:'SVG / PDF / DXF / PNG / Production PDF'},
]);

export const V47_TEMPLATE_FILTERS=Object.freeze([
  {id:'all',label:'全部盒型'},
  {id:'mailer',label:'邮寄盒 / 飞机盒'},
  {id:'shipping',label:'运输箱'},
  {id:'folding-carton',label:'折叠纸盒'},
  {id:'import',label:'导入刀版'},
]);

export const V47_MARK_QUICK_ACTIONS=Object.freeze([
  {id:'mark',label:'运输唛头',tool:'mark',description:'快速插入标准 Shipping Mark'},
  {id:'barcode',label:'条码 + QR',tool:'barcode',description:'Code 39 / EAN-13 / UPC-A / ITF-14 / GS1-128'},
  {id:'var',label:'变量文本',tool:'var',description:'SKU / 重量 / 尺寸 / CRN / 箱号等变量'},
  {id:'text',label:'自由文字',tool:'text',description:'自定义固定文字与说明'},
]);

export const V47_REFERENCE_CAPABILITIES=Object.freeze([
  {id:'template-library',label:'盒型资源库',status:'implemented',source:'BoxStudio catalog'},
  {id:'parametric-size',label:'参数化尺寸',status:'implemented',source:'V0.32 geometry engines'},
  {id:'three-size-system',label:'内 / 制造 / 外三套尺寸',status:'implemented',source:'V0.32 dimension resolver'},
  {id:'material-presets',label:'材料 / 楞型 / 厚度',status:'implemented',source:'V0.32 material presets'},
  {id:'dieline-edit',label:'2D 刀版编辑',status:'implemented',source:'V0.38-V0.46 CAD'},
  {id:'curve-constraints',label:'高级曲线与圆角约束',status:'implemented',source:'V0.43-V0.46'},
  {id:'mark-editor',label:'唛头编辑',status:'implemented',source:'Core mark editor'},
  {id:'batch-marks',label:'Excel / CSV 批量唛头',status:'implemented',source:'Core batch engine'},
  {id:'barcode-qr',label:'真实条码 / QR',status:'implemented',source:'Barcode + QR engines'},
  {id:'three-preview',label:'3D 折叠验证',status:'implemented',source:'FoldGraph renderer'},
  {id:'preflight',label:'生产 Preflight',status:'implemented',source:'V0.31-V0.46'},
  {id:'production-export',label:'生产文件导出',status:'implemented',source:'PDF / DXF / SVG / PNG'},
]);

export function freeFeatureAccessV47(){
  return {templates:true,editor2d:true,editor3d:true,marks:true,batchMarks:true,barcodeQr:true,preflight:true,exports:['SVG','PDF','DXF','PNG','Production PDF'],accountRequired:false,watermark:false};
}

export function templateCategoryV47(record={}){
  if(record.id==='imported'||record.category==='import')return'import';
  if(record.category)return record.category;
  const text=[record.id,record.name,record.nameZh,record.code,...(record.tags||[])].join(' ').toLowerCase();
  if(text.includes('mailer')||text.includes('0427')||text.includes('150010')||text.includes('邮寄')||text.includes('飞机'))return'mailer';
  if(text.includes('folding')||text.includes('tuck')||text.includes('carton')||text.includes('纸盒'))return'folding-carton';
  return'shipping';
}

export function templateRecordsV47(){
  const core=STANDARD_TEMPLATE_CATALOG.map(x=>({...x,v47Category:templateCategoryV47(x)}));
  core.push({id:'imported',category:'import',v47Category:'import',standard:'IMPORT',code:'SVG/DXF/PDF/AI',name:'Import Existing Dieline',nameZh:'导入已有刀版',engine:'imported',status:'implemented',parameters:[],tags:['import','vector','dieline']});
  return core;
}

export function searchFreeTemplatesV47({query='',category='all'}={}){
  const q=String(query||'').trim().toLowerCase();
  return templateRecordsV47().filter(record=>{
    if(category!=='all'&&record.v47Category!==category)return false;
    if(!q)return true;
    return [record.id,record.standard,record.code,record.name,record.nameZh,...(record.tags||[])].join(' ').toLowerCase().includes(q);
  });
}

export function dimensionSummaryV47(structure={}){
  const d=resolveBoxDimensionsV32(structure);
  const clean=o=>({L:Number(o.L.toFixed(3)),W:Number(o.W.toFixed(3)),H:Number(o.H.toFixed(3))});
  return {mode:d.mode,inside:clean(d.inside),manufacturing:clean(d.manufacturing),external:clean(d.external),thicknessMm:Number(d.T.toFixed(3)),material:d.material};
}

export function materialChoicesV47(){return MATERIAL_PRESETS_V32.map(x=>({...x}));}

export function referenceFeatureCoverageV47(){
  const implemented=V47_REFERENCE_CAPABILITIES.filter(x=>x.status==='implemented').length;
  return {implemented,total:V47_REFERENCE_CAPABILITIES.length,ratio:implemented/V47_REFERENCE_CAPABILITIES.length,items:V47_REFERENCE_CAPABILITIES.map(x=>({...x}))};
}

export const V47_FREE_STUDIO_VERSION='V0.47';
