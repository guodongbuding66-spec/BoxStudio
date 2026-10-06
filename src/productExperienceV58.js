import { generateGeometry } from './geometry.js';
import { cloneState, defaultState } from './model.js';

export const V58_PRODUCT_VERSION='V0.58';
export const V58_FREE_POLICY={freeForEveryone:true,loginRequired:false,paywall:false,trial:false,downloadGate:false};

export const V58_STUDIO_FLOW=[
  {id:'templates',label:'选择盒型',target:{page:'templates'}},
  {id:'size',label:'尺寸 / 材料',target:{page:'editor',editorTab:'Structure'}},
  {id:'design',label:'2D 设计',target:{page:'editor',editorTab:'Design'}},
  {id:'preview',label:'3D 预览',target:{page:'editor',editorTab:'3D'}},
  {id:'marks',label:'唛头',target:{page:'editor',editorTab:'Marks'}},
  {id:'export',label:'导出',target:{page:'editor',editorTab:'Export'}},
];

export const V58_REFERENCE_PATTERNS=[
  {id:'compact-dieline-flow',source:'Pacdora',label:'盒型 → 尺寸/材料/厚度 → 刀版 → 3D → 导出'},
  {id:'three-column-editor',source:'Packform',label:'左侧工具 / 中央画布 / 右侧属性与预览'},
  {id:'live-3d',source:'Pacdora + Packform',label:'2D 与 3D 保持同一结构与图文状态'},
  {id:'print-first',source:'Pacdora + Packform',label:'AI/PDF/DXF 与印前检查是主流程，不藏在后台'},
  {id:'marks-first-class',source:'Packform workflow',label:'条码、二维码、运输信息与搬运标识直接在刀版面板上编辑'},
];

export const V58_MARK_GROUPS=[
  {id:'shipping',label:'运输信息',items:['sku','weights','dimensions','package','contract','crn','origin','destination']},
  {id:'trace',label:'识别与追溯',items:['barcodeQr','variable']},
  {id:'handling',label:'搬运标识',items:['up','fragile','dry']},
];

export const V58_MARK_PRESETS={
  sku:{id:'sku',label:'SKU',kind:'text',template:'SKU: {{sku}}',fontSize:8,bold:true,w:120,h:20},
  weights:{id:'weights',label:'N.W. / G.W.',kind:'text',template:'N.W.: {{nw}} {{weightUnit}}\nG.W.: {{gw}} {{weightUnit}}',fontSize:6,w:115,h:34},
  dimensions:{id:'dimensions',label:'L × W × H',kind:'text',template:'MEAS: {{length}} × {{width}} × {{height}} {{dimensionUnit}}',fontSize:6,w:150,h:24},
  package:{id:'package',label:'箱号 Package X/Y',kind:'text',template:'PACKAGE: {{packageIndex}} / {{packageCount}}',fontSize:6,w:120,h:22,bold:true},
  contract:{id:'contract',label:'合同号',kind:'text',template:'CONTRACT: {{contractNo}}',fontSize:6,w:135,h:22},
  crn:{id:'crn',label:'CRN',kind:'text',template:'CRN: {{crn}}',fontSize:6,w:100,h:22,bold:true},
  origin:{id:'origin',label:'Made in',kind:'text',template:'Made in {{originCountry}}',fontSize:6,w:105,h:22},
  destination:{id:'destination',label:'目的国',kind:'text',template:'DEST: {{destinationCountry}}',fontSize:6,w:100,h:22,bold:true},
  variable:{id:'variable',label:'自定义变量文字',kind:'text',template:'{{sku}}',fontSize:7,w:105,h:22},
  barcodeQr:{id:'barcodeQr',label:'Barcode + QR',kind:'barcode-qr-group',w:200,h:64,barcodeType:'CODE39'},
  up:{id:'up',label:'This Side Up',kind:'icon',icon:'up',w:40,h:40},
  fragile:{id:'fragile',label:'Fragile',kind:'icon',icon:'fragile',w:40,h:40},
  dry:{id:'dry',label:'Keep Dry',kind:'icon',icon:'dry',w:40,h:40},
};

export const V58_PRINT_ADVISORIES=[
  {id:'safe-area',label:'重要文字 / 条码保持在 Safe Area 内'},
  {id:'barcode-black',label:'条码 / QR 建议使用单色黑，避免套印偏差'},
  {id:'resolution',label:'位图建议 ≥ 300 DPI；矢量优先'},
  {id:'bleed',label:'背景色 / 图片延伸至出血区'},
  {id:'production-export',label:'生产交付优先使用 PDF / AI-compatible / DXF，并保留刀线语义'},
];

const n=(v,d=0)=>{const x=Number(v);return Number.isFinite(x)?x:d};
const deep=s=>cloneState(s||defaultState);

export function markPanelOptionsV58(state={}){
  const s=deep(state),g=generateGeometry(s.structure||defaultState.structure);
  return (g.bodyPanels||[]).filter(p=>p.kind==='panel').map(p=>({id:p.id,label:p.label||p.id,role:p.role||p.kind,w:n(p.w),h:n(p.h)}));
}

function choosePanel(state,requested){
  const panels=markPanelOptionsV58(state);if(!panels.length)throw new Error('V58_NO_MARK_PANEL');
  const valid=id=>panels.find(p=>p.id===id);
  const selectedElement=(state.elements||[]).find(e=>e.id===state.selectedId);
  return valid(requested)||valid(state.markEditorPanelId)||valid(state.linkedV49?.selectedPanelId)||valid(selectedElement?.panelId)||valid('front')||valid('lid')||valid('base')||panels[0];
}

function fitRect(panel,preset){
  const margin=Math.min(10,Math.max(2,Math.min(panel.w,panel.h)*.06));
  const maxW=Math.max(12,panel.w-margin*2),maxH=Math.max(12,panel.h-margin*2);
  const w=Math.min(n(preset.w,100),maxW),h=Math.min(n(preset.h,24),maxH);
  return{x:margin,y:margin,w,h};
}

function uid(prefix='mark'){
  const stamp=Date.now().toString(36),rand=Math.random().toString(36).slice(2,7);return `v58-${prefix}-${stamp}-${rand}`;
}

export function addMarkPresetV58(state,presetId,{panelId=null}={}){
  const preset=V58_MARK_PRESETS[presetId];if(!preset)throw new Error(`V58_UNKNOWN_MARK_PRESET:${presetId}`);
  const next=deep(state),panel=choosePanel(next,panelId),rect=fitRect(panel,preset),id=uid(preset.id);
  let element;
  if(preset.kind==='text')element={id,type:'text',group:'marks',panelId:panel.id,...rect,r:0,template:preset.template,fontSize:Math.min(n(preset.fontSize,6),Math.max(3,rect.h*.42)),bold:Boolean(preset.bold)};
  else if(preset.kind==='barcode-qr-group')element={id,type:'barcode-qr-group',group:'marks',panelId:panel.id,...rect,r:0,barcodeValue:'{{sku}}',qrValue:'{{qrValue}}',preset:rect.w>=190?'200x64':'custom',lockAspect:true,barcodeType:preset.barcodeType||'CODE39'};
  else if(preset.kind==='icon')element={id,type:'icon',icon:preset.icon,group:'marks',panelId:panel.id,...rect,r:0};
  else throw new Error(`V58_UNSUPPORTED_MARK_KIND:${preset.kind}`);
  next.elements=[...(next.elements||[]),element];next.selectedId=id;next.markEditorPanelId=panel.id;next.page='editor';next.editorTab='Marks';
  return{state:next,element,panel};
}

export function studioSummaryV58(state={}){
  const s=deep(state),st=s.structure||{},panels=markPanelOptionsV58(s);
  return{templateId:st.template||'unknown',length:n(st.length),width:n(st.width),height:n(st.height),sizeType:st.sizeType||'internal',materialId:st.materialId||'',flute:st.flute||'',thickness:n(st.thickness),panelCount:panels.length,markCount:(s.elements||[]).filter(e=>e.group==='marks').length,page:s.page||'editor',editorTab:s.editorTab||'Design'};
}

export function productAcceptanceV58(){
  const groups=new Set(V58_MARK_GROUPS.flatMap(g=>g.items)),missing=[...groups].filter(id=>!V58_MARK_PRESETS[id]);
  const flowIds=V58_STUDIO_FLOW.map(x=>x.id);
  return{ok:Object.values(V58_FREE_POLICY).every((v,i)=>i===0?v===true:v===false)&&missing.length===0&&flowIds.join('>')==='templates>size>design>preview>marks>export',missing,flowIds,markPresets:Object.keys(V58_MARK_PRESETS).length,referencePatterns:V58_REFERENCE_PATTERNS.length};
}
