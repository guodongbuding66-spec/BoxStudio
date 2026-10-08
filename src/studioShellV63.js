import { buildLinkedWorkspaceModelV49 } from './linkedWorkspaceV49.js';
import { artworkStatsV61 } from './artworkStudioV61.js';
import { runPreflight } from './preflight.js';

export const V63_PRODUCT_VERSION='V0.63';
export const V63_ADVANCED_INSPECTOR_KEY='boxstudio-v63-inspector-advanced';
export const V63_STAGES=Object.freeze([
  {id:'structure',tab:'Structure',label:'结构',hint:'尺寸 / 材料 / 刀版'},
  {id:'artwork',tab:'Design',label:'Artwork',hint:'文字 / 图片 / 颜色'},
  {id:'marks',tab:'Marks',label:'唛头',hint:'运输信息 / 批量变量'},
  {id:'proof',tab:'3D',label:'3D 校样',hint:'折叠 / 方向 / 外观'},
  {id:'preflight',tab:'Preflight',label:'检查',hint:'印前问题 / 风险'},
  {id:'export',tab:'Export',label:'导出',hint:'PDF / SVG / DXF'},
]);

const num=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
export function stageForTabV63(tab='Design'){return V63_STAGES.find(x=>x.tab===tab)||V63_STAGES[1]}
export function nextStageV63(tab='Design'){const current=stageForTabV63(tab),i=V63_STAGES.findIndex(x=>x.id===current.id);return V63_STAGES[Math.min(V63_STAGES.length-1,i+1)]}
export function preflightSummaryV63(results=[]){const counts={pass:0,warning:0,error:0,total:0};for(const item of results||[]){const key=['pass','warning','error'].includes(item?.severity)?item.severity:'warning';counts[key]++;counts.total++}counts.ready=counts.error===0;return counts}
export function selectedContextV63(state={},geo={}){
  const element=(state.elements||[]).find(e=>e?.id===state.selectedId)||null;
  const panelId=element?.panelId||state.linkedV49?.selectedPanelId||state.markEditorPanelId||null;
  const panel=panelId?geo?.panelMap?.[panelId]:null;
  const type=element?.type||'panel';
  const typeLabel=type==='image'?'图片 / Logo':type==='text'||type==='notice'?'文字':type==='barcode-qr-group'?'条码 + QR':type==='icon'?'搬运标识':element?'Artwork 对象':'面板';
  return{
    elementId:element?.id||null,
    type,
    typeLabel,
    panelId:panel?.id||panelId||null,
    panelLabel:panel?.label||panel?.id||panelId||'未选择面板',
    objectSize:element?{w:num(element.w),h:num(element.h),r:num(element.r)}:null,
    panelSize:panel?{w:num(panel.w),h:num(panel.h)}:null,
  };
}
export function workspaceSummaryV63(state={}){
  const linked=buildLinkedWorkspaceModelV49(state),geo=linked.review.geo,preflight=preflightSummaryV63(runPreflight(state)),artwork=artworkStatsV61(state,geo),selected=selectedContextV63(state,geo),s=state.structure||{};
  return{
    schema:'boxstudio-v63-studio-shell',version:1,
    stage:stageForTabV63(state.editorTab),
    nextStage:nextStageV63(state.editorTab),
    structure:{template:s.template||'',length:num(s.length),width:num(s.width),height:num(s.height),thickness:num(s.thickness),materialId:s.materialId||'',flute:s.flute||''},
    panels:linked.stats.panels,
    hinges:linked.stats.hinges,
    artwork,
    preflight,
    selected,
  };
}
export function studioShellAcceptanceV63(state={}){
  try{const summary=workspaceSummaryV63(state),ids=new Set(V63_STAGES.map(x=>x.id));return{ok:Boolean(V63_STAGES.length===6&&ids.size===6&&summary.panels>0&&Number.isFinite(summary.preflight.total)&&summary.nextStage?.tab),version:V63_PRODUCT_VERSION,summary}}catch(error){return{ok:false,version:V63_PRODUCT_VERSION,error:String(error?.message||error)}}
}
