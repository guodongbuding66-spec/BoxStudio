import { resolveMaterialV32 } from './materialsV32.js';
import { templateCatalogById } from './templates.js';
import { ensureFoldSequenceV51, buildFoldSequenceModelV51 } from './foldSequenceV51.js';

export const V55_MANUFACTURING_SCHEMA='boxstudio-v55-manufacturing-intelligence';
export const V55_PRODUCT_VERSION='V0.55';
export const V55_MANUFACTURING_VERSION=1;

const num=(v,d=0)=>{const n=Number(v);return Number.isFinite(n)?n:d};
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const round=(v,p=2)=>{const m=10**p;return Math.round(num(v)*m)/m};
const severityWeight={error:28,warning:9,info:0,pass:0};
const MACHINE_PREFERRED=new Set(['side-seal-rsc','fefco-0203','reverse-tuck-end','straight-tuck-end','auto-lock-bottom','sleeve-carton']);

const PROFILE_DEFS=Object.freeze({
  safe:{id:'safe',label:'Safe',description:'保守制造检查；适合出生产文件前的风险筛查。',panelFactor:7,glueFactor:6,minGlue:18,tuckFactor:5,maxConcurrent:3,strictCollision:true,strictCompensation:true},
  machine:{id:'machine',label:'Machine',description:'自动/半自动模切、折叠、糊盒路径；对胶舌、同步折叠和小面更严格。',panelFactor:6,glueFactor:5,minGlue:15,tuckFactor:4,maxConcurrent:4,strictCollision:true,strictCompensation:true},
  manual:{id:'manual',label:'Manual',description:'人工装盒路径；允许更小操作空间，但仍保留结构和碰撞底线。',panelFactor:4,glueFactor:2.5,minGlue:8,tuckFactor:3,maxConcurrent:7,strictCollision:false,strictCompensation:false},
});

function panelBounds(panel={}){
  if(Array.isArray(panel.points)&&panel.points.length>=3){const xs=panel.points.map(p=>num(p?.[0])),ys=panel.points.map(p=>num(p?.[1]));return{w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)}}
  return{w:Math.max(0,num(panel.w)),h:Math.max(0,num(panel.h))};
}
function semanticPanels(geo={}){return (geo.panels?.length?geo.panels:geo.bodyPanels||[]).filter(Boolean)}
function isActionPanel(panel={}){const s=`${panel.id||''} ${panel.kind||''} ${panel.role||''}`.toLowerCase();return /tuck|tab|lock|flap|glue|lid|wing/.test(s)}
function issue(severity,code,title,detail,metric=null,recommendation=null,entityId=null){return{severity,code,title,detail,metric,recommendation,entityId}}
function creaseAdvisory(material){const t=material.thicknessMm,category=material.category;const factor=category==='corrugated'?1.2:category==='paperboard'?.65:1.4;return{factor,allowanceMm:round(t*factor),note:'Engineering advisory only; factory tooling/creasing matrix must override this value.'}}
function processClass(templateId){if(templateId==='side-seal-rsc'||templateId==='fefco-0203')return'flexo-folder-gluer / slotter compatible family';if(['reverse-tuck-end','straight-tuck-end','auto-lock-bottom','sleeve-carton'].includes(templateId))return'die-cut + folder-gluer family';if(['mailer-150010','fefco-0427'].includes(templateId))return'die-cut / erection-oriented family';return'custom converting path'}
function thresholdSeverity(profile,hard=false){if(hard)return'error';return profile.id==='manual'?'warning':'error'}

export function buildManufacturingContextV55(state={},graph={},geo={},collisionReport={}){
  const structure=state.structure||{},material=resolveMaterialV32(structure),templateId=structure.template||'side-seal-rsc',meta=templateCatalogById(templateId),panels=semanticPanels(geo),dims=panels.map(p=>({id:p.id,...panelBounds(p),action:isActionPanel(p)})).filter(p=>p.w>0&&p.h>0),minPanel=dims.length?Math.min(...dims.map(p=>Math.min(p.w,p.h))):0,actionPanels=dims.filter(p=>p.action),minAction=actionPanels.length?Math.min(...actionPanels.map(p=>Math.min(p.w,p.h))):minPanel;
  const seq=ensureFoldSequenceV51(state,graph),model=buildFoldSequenceModelV51(seq,graph,geo),groups=model.steps.map(s=>s.edgeKeys.length),maxConcurrent=groups.length?Math.max(...groups):0;
  const angles=(seq.foldAuthoringV50?.edges||[]).map(e=>Math.abs(num(e.angle))).filter(Number.isFinite),maxAngle=angles.length?Math.max(...angles):0;
  const penetrationCount=collisionReport?.penetrations?.length||0,overlapCount=collisionReport?.overlaps?.length||0;
  return{schema:V55_MANUFACTURING_SCHEMA,version:V55_MANUFACTURING_VERSION,templateId,template:meta,structure,material,process:processClass(templateId),panels:dims,panelCount:dims.length,minPanelMm:round(minPanel),minActionPanelMm:round(minAction),folds:model.edges.length,stepCount:model.stepCount,maxConcurrentFolds:maxConcurrent,maxAngleDeg:round(maxAngle,1),penetrationCount,overlapCount,crease:creaseAdvisory(material),machinePreferred:MACHINE_PREFERRED.has(templateId)};
}

export function assessManufacturingProfileV55(context={},profileId='safe',overrides={}){
  const profile=PROFILE_DEFS[profileId]||PROFILE_DEFS.safe,t=Math.max(.1,num(overrides.thicknessMm,context.material?.thicknessMm||.1)),s=context.structure||{},issues=[];
  const minPanelReq=Math.max(profile.id==='manual'?8:12,t*profile.panelFactor),minActionReq=Math.max(profile.id==='manual'?7:10,t*profile.tuckFactor),glueReq=Math.max(profile.minGlue,t*profile.glueFactor),glue=num(s.glue,0);
  issues.push(issue('pass','V55_MATERIAL_RESOLVED','材料与厚度',`${context.material?.name||'Unknown'} · ${context.material?.flute||'CUSTOM'} · ${round(t)} mm`,round(t),'工厂纸板实测厚度可覆盖工程预设。'));
  if(context.minPanelMm<minPanelReq)issues.push(issue(thresholdSeverity(profile),'V55_PANEL_HANDLING_MARGIN','最小面板操作余量',`最小语义面板 ${context.minPanelMm} mm，小于 ${profile.label} 建议 ${round(minPanelReq)} mm。`,context.minPanelMm,`增大最小面板/翼片，或切换 Manual 路径并做实样装配。`));
  else issues.push(issue('pass','V55_PANEL_HANDLING_OK','最小面板操作余量',`${context.minPanelMm} mm ≥ 建议 ${round(minPanelReq)} mm。`,context.minPanelMm));
  if(context.minActionPanelMm<minActionReq)issues.push(issue(thresholdSeverity(profile),'V55_TUCK_FLAP_MARGIN','插舌/翼片余量',`最小动作面 ${context.minActionPanelMm} mm，小于建议 ${round(minActionReq)} mm。`,context.minActionPanelMm,'增加 tuck/flap 深度或降低自动化要求。'));
  else issues.push(issue('pass','V55_TUCK_FLAP_OK','插舌/翼片余量',`${context.minActionPanelMm} mm ≥ 建议 ${round(minActionReq)} mm。`,context.minActionPanelMm));
  const glueRelevant=glue>0||context.panels.some(p=>/glue/i.test(p.id||''));
  if(glueRelevant&&glue<glueReq)issues.push(issue(thresholdSeverity(profile),'V55_GLUE_FLAP_MARGIN','胶舌宽度',`当前胶舌 ${round(glue)} mm，小于 ${profile.label} 建议 ${round(glueReq)} mm。`,glue,`建议胶舌 ≥ ${round(glueReq)} mm；最终以胶型、上胶轮和机台要求为准。`));
  else if(glueRelevant)issues.push(issue('pass','V55_GLUE_FLAP_OK','胶舌宽度',`${round(glue)} mm ≥ 建议 ${round(glueReq)} mm。`,glue));
  else issues.push(issue('info','V55_GLUE_NOT_REQUIRED','胶舌检查','当前结构没有显式胶舌宽度要求。'));
  if(!s.compensation&&t>=1.5)issues.push(issue(profile.strictCompensation?'error':'warning','V55_THICKNESS_COMPENSATION_OFF','材料厚度补偿关闭',`板厚 ${round(t)} mm，但尺寸补偿关闭。厚板结构的 crease-center / inside-outside 换算风险较高。`,t,'启用 thickness compensation，或使用工厂提供的 crease allowance / score-to-score 数据。'));
  else issues.push(issue('pass','V55_THICKNESS_COMPENSATION','材料厚度补偿',s.compensation===false?'薄板手工路径允许关闭，但需实样确认。':'已启用尺寸/厚度补偿。'));
  if(context.penetrationCount>0)issues.push(issue('error','V55_FOLD_PENETRATION','折叠路径穿插',`${context.penetrationCount} 个 penetration 仍存在；不能判定为制造可行。`,context.penetrationCount,'先使用 V0.53/V0.54 修复折叠路径。'));
  else issues.push(issue('pass','V55_NO_PENETRATION','折叠路径穿插','完整折叠路径未检测到 penetration。',0));
  if(context.overlapCount>0)issues.push(issue(profile.strictCollision?'warning':'info','V55_FOLD_OVERLAP','折叠搭接/接触',`${context.overlapCount} 个 overlap/contact；可能是设计搭接，也可能影响高速装盒。`,context.overlapCount,'检查对应关键帧，确认属于预期搭接。'));
  if(context.maxConcurrentFolds>profile.maxConcurrent)issues.push(issue(profile.id==='machine'?'warning':'info','V55_CONCURRENT_FOLDS','同步折叠复杂度',`单 Step 最多 ${context.maxConcurrentFolds} 条折线同步，${profile.label} 建议 ≤ ${profile.maxConcurrent}。`,context.maxConcurrentFolds,'拆分 Fold Step，减少同一阶段同时运动的面板。'));
  else issues.push(issue('pass','V55_CONCURRENT_FOLDS_OK','同步折叠复杂度',`最大 ${context.maxConcurrentFolds} 条/Step，处于建议范围。`,context.maxConcurrentFolds));
  if(profile.id==='machine'&&!context.machinePreferred)issues.push(issue('warning','V55_MACHINE_TEMPLATE_PATH','自动化结构适配',`${context.templateId} 当前更偏 ${context.process}，需要具体设备能力确认。`,null,'用实际 die-cutter / folder-gluer 的尺寸、进料、折叠单元限制覆盖默认判断。'));
  else issues.push(issue('info','V55_PROCESS_CLASS','建议制造路径',context.process));
  if(context.material?.category==='rigid-board')issues.push(issue('warning','V55_RIGID_BOARD_SPECIAL_PROCESS','灰板/硬板特殊工艺','Rigid board 通常需要独立开槽/裱糊/包边工艺，当前折叠启发式不能替代专用工艺卡。'));
  const errors=issues.filter(x=>x.severity==='error'),warnings=issues.filter(x=>x.severity==='warning'),score=clamp(100-issues.reduce((sum,x)=>sum+(severityWeight[x.severity]||0),0),0,100),status=errors.length?'fail':warnings.length?'review':'pass';
  const recommendations=issues.filter(x=>x.recommendation).map(x=>({code:x.code,text:x.recommendation}));
  return{schema:V55_MANUFACTURING_SCHEMA,version:V55_MANUFACTURING_VERSION,profile:{id:profile.id,label:profile.label,description:profile.description},status,score,errors,warnings,issues,recommendations,thresholds:{minPanelMm:round(minPanelReq),minActionPanelMm:round(minActionReq),minGlueMm:round(glueReq),maxConcurrentFolds:profile.maxConcurrent},engineering:{creaseAllowanceMm:context.crease?.allowanceMm||0,creaseFactor:context.crease?.factor||0,factoryOverrideRequired:true}};
}

export function buildManufacturingProfilesV55(state={},graph={},geo={},collisionReport={},overrides={}){
  const context=buildManufacturingContextV55(state,graph,geo,collisionReport),profiles=['safe','machine','manual'].map(id=>assessManufacturingProfileV55(context,id,overrides));
  const recommended=[...profiles].sort((a,b)=>Number(a.status==='fail')-Number(b.status==='fail')||b.score-a.score)[0]||profiles[0];
  return{schema:V55_MANUFACTURING_SCHEMA,version:V55_MANUFACTURING_VERSION,context,profiles,recommendedProfileId:recommended?.profile.id||'safe',factoryOverrideRequired:true,disclaimer:'Engineering feasibility guidance only. Final production settings must be confirmed with actual board, tooling and converting equipment.'};
}

export function manufacturingPreflightChecksV55(bundle={},profileId='safe',{blocking=false}={}){
  const profile=(bundle.profiles||[]).find(x=>x.profile.id===profileId)||bundle.profiles?.[0];if(!profile)return[];
  return profile.issues.map(x=>({...x,severity:!blocking&&x.severity==='error'?'warning':x.severity,title:`Manufacturing · ${x.title}`}));
}

export function manufacturingAcceptanceV55(state={},graph={},geo={},collisionReport={}){
  const bundle=buildManufacturingProfilesV55(state,graph,geo,collisionReport),issues=[];
  if(bundle.profiles.length!==3)issues.push(issue('error','V55_PROFILE_COUNT','Profile count','Safe / Machine / Manual profiles are required.'));
  for(const p of bundle.profiles){if(!Number.isFinite(p.score)||p.score<0||p.score>100)issues.push(issue('error','V55_SCORE_RANGE','Manufacturing score',`${p.profile.id} score must be within 0–100.`));if(!p.issues.length)issues.push(issue('error','V55_EMPTY_PROFILE','Manufacturing checks',`${p.profile.id} requires inspectable checks.`));}
  const safe=bundle.profiles.find(x=>x.profile.id==='safe'),manual=bundle.profiles.find(x=>x.profile.id==='manual');if(safe&&manual&&safe.thresholds.minGlueMm<manual.thresholds.minGlueMm)issues.push(issue('error','V55_PROFILE_ORDER','Profile strictness','Safe glue threshold cannot be looser than Manual.'));
  const errors=issues.filter(x=>x.severity==='error');return{schema:'boxstudio-v55-manufacturing-acceptance',version:1,ok:errors.length===0,issues,errors,bundle,summary:{profiles:bundle.profiles.length,recommended:bundle.recommendedProfileId,material:bundle.context.material?.materialId||null,thickness:bundle.context.material?.thicknessMm||0,penetrations:bundle.context.penetrationCount,overlaps:bundle.context.overlapCount}};
}
