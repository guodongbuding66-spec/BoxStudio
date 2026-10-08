import { buildManufacturingProfilesV55 } from './manufacturingIntelligenceV55.js';

export const V56_PRODUCT_VERSION='V0.56';
export const V56_FACTORY_SCHEMA='boxstudio-v56-factory-profile';
export const V56_DATABASE_SCHEMA='boxstudio-v56-factory-database';
export const V56_STORAGE_KEY='boxstudio-v56-factory-database';

const clone=v=>structuredClone(v);
const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const r=(v,p=2)=>{const m=10**p;return Math.round(n(v)*m)/m};
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const idSafe=v=>String(v||'factory').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'factory';
const uniq=a=>[...new Set((a||[]).map(x=>String(x).trim()).filter(Boolean))];
const issue=(severity,code,title,detail,recommendation=null,metric=null)=>({severity,code,title,detail,recommendation,metric});

const BUILT_INS=Object.freeze([
  {
    id:'generic-corrugated-machine',name:'Generic Corrugated Machine Line',builtIn:true,mode:'machine',notes:'通用瓦楞模切 / 开槽 / 折叠糊箱能力基线。实际设备参数应由工厂覆盖。',
    materials:{categories:['corrugated'],flutes:['E','B','C','EB','BC'],thicknessMinMm:.7,thicknessMaxMm:7},
    blank:{minWidthMm:120,minHeightMm:90,maxWidthMm:1600,maxHeightMm:1200},
    dieCutter:{enabled:true,minWidthMm:120,minHeightMm:90,maxWidthMm:1600,maxHeightMm:1200},
    folderGluer:{enabled:true,minPanelMm:12,maxConcurrentFolds:4},
    glue:{enabled:true,minWidthMm:12,maxWidthMm:45},
    crease:{required:true,matrices:[
      {id:'corr-e',label:'E flute general',categories:['corrugated'],flutes:['E'],thicknessMinMm:.7,thicknessMaxMm:2.2,allowanceFactorMin:1.05,allowanceFactorMax:1.35},
      {id:'corr-bc',label:'B/C flute general',categories:['corrugated'],flutes:['B','C'],thicknessMinMm:2.2,thicknessMaxMm:4.4,allowanceFactorMin:1.05,allowanceFactorMax:1.45},
      {id:'corr-double',label:'Double wall general',categories:['corrugated'],flutes:['EB','BC'],thicknessMinMm:4,thicknessMaxMm:7.5,allowanceFactorMin:1.05,allowanceFactorMax:1.5},
    ]},
    productionGate:{enabled:false,manufacturingProfile:'machine'},
  },
  {
    id:'generic-paperboard-folder-gluer',name:'Generic Paperboard Folder-Gluer',builtIn:true,mode:'machine',notes:'通用彩盒模切与糊盒能力基线。',
    materials:{categories:['paperboard'],flutes:[],thicknessMinMm:.2,thicknessMaxMm:1.2},
    blank:{minWidthMm:50,minHeightMm:40,maxWidthMm:1200,maxHeightMm:850},
    dieCutter:{enabled:true,minWidthMm:50,minHeightMm:40,maxWidthMm:1200,maxHeightMm:850},
    folderGluer:{enabled:true,minPanelMm:8,maxConcurrentFolds:4},
    glue:{enabled:true,minWidthMm:8,maxWidthMm:35},
    crease:{required:true,matrices:[
      {id:'paperboard-general',label:'Paperboard general',categories:['paperboard'],flutes:[],thicknessMinMm:.2,thicknessMaxMm:1.2,allowanceFactorMin:.45,allowanceFactorMax:.95},
    ]},
    productionGate:{enabled:false,manufacturingProfile:'machine'},
  },
  {
    id:'manual-prototype-bench',name:'Manual Prototype Bench',builtIn:true,mode:'manual',notes:'手工打样/装盒工作台。设备约束放宽，但真实穿插仍不可接受。',
    materials:{categories:['corrugated','paperboard','rigid-board'],flutes:['F','E','B','C','EB','BC','AA'],thicknessMinMm:.15,thicknessMaxMm:10},
    blank:{minWidthMm:20,minHeightMm:20,maxWidthMm:2000,maxHeightMm:1500},
    dieCutter:{enabled:false,minWidthMm:20,minHeightMm:20,maxWidthMm:2000,maxHeightMm:1500},
    folderGluer:{enabled:false,minPanelMm:6,maxConcurrentFolds:8},
    glue:{enabled:true,minWidthMm:5,maxWidthMm:80},
    crease:{required:false,matrices:[]},
    productionGate:{enabled:false,manufacturingProfile:'manual'},
  },
]);

function normRange(v={},defaults={}){return{minWidthMm:Math.max(0,n(v.minWidthMm,defaults.minWidthMm||0)),minHeightMm:Math.max(0,n(v.minHeightMm,defaults.minHeightMm||0)),maxWidthMm:Math.max(.1,n(v.maxWidthMm,defaults.maxWidthMm||2000)),maxHeightMm:Math.max(.1,n(v.maxHeightMm,defaults.maxHeightMm||1500))}}
export function normalizeFactoryProfileV56(input={}){
  const base=BUILT_INS.find(x=>x.id===input.id)||BUILT_INS[0],materials=input.materials||{},folder=input.folderGluer||{},glue=input.glue||{},crease=input.crease||{},gate=input.productionGate||{};
  const matrices=(crease.matrices||base.crease.matrices||[]).map((m,i)=>({id:String(m.id||`matrix-${i+1}`),label:String(m.label||m.id||`Matrix ${i+1}`),categories:uniq(m.categories?.length?m.categories:materials.categories||base.materials.categories),flutes:uniq(m.flutes||[]),thicknessMinMm:Math.max(.01,n(m.thicknessMinMm,.1)),thicknessMaxMm:Math.max(.02,n(m.thicknessMaxMm,20)),allowanceFactorMin:Math.max(0,n(m.allowanceFactorMin,.3)),allowanceFactorMax:Math.max(0,n(m.allowanceFactorMax,2))}));
  return{
    schema:V56_FACTORY_SCHEMA,version:1,id:idSafe(input.id||base.id),name:String(input.name||base.name||'Factory Profile'),builtIn:Boolean(input.builtIn??base.builtIn),mode:['machine','manual'].includes(input.mode)?input.mode:base.mode,notes:String(input.notes??base.notes??''),
    materials:{categories:uniq(materials.categories?.length?materials.categories:base.materials.categories),flutes:uniq(materials.flutes??base.materials.flutes),thicknessMinMm:Math.max(.01,n(materials.thicknessMinMm,base.materials.thicknessMinMm)),thicknessMaxMm:Math.max(.02,n(materials.thicknessMaxMm,base.materials.thicknessMaxMm))},
    blank:normRange(input.blank,base.blank),
    dieCutter:{enabled:Boolean(input.dieCutter?.enabled??base.dieCutter.enabled),...normRange(input.dieCutter,base.dieCutter)},
    folderGluer:{enabled:Boolean(folder.enabled??base.folderGluer.enabled),minPanelMm:Math.max(0,n(folder.minPanelMm,base.folderGluer.minPanelMm)),maxConcurrentFolds:Math.max(1,Math.round(n(folder.maxConcurrentFolds,base.folderGluer.maxConcurrentFolds)))},
    glue:{enabled:Boolean(glue.enabled??base.glue.enabled),minWidthMm:Math.max(0,n(glue.minWidthMm,base.glue.minWidthMm)),maxWidthMm:Math.max(0,n(glue.maxWidthMm,base.glue.maxWidthMm))},
    crease:{required:Boolean(crease.required??base.crease.required),matrices},
    productionGate:{enabled:Boolean(gate.enabled??base.productionGate.enabled),manufacturingProfile:['safe','machine','manual'].includes(gate.manufacturingProfile)?gate.manufacturingProfile:base.productionGate.manufacturingProfile},
  };
}

export function builtInFactoryProfilesV56(){return BUILT_INS.map(x=>normalizeFactoryProfileV56(x))}
export function createFactoryDatabaseV56(){const profiles=builtInFactoryProfilesV56();return{schema:V56_DATABASE_SCHEMA,version:1,selectedId:profiles[0].id,profiles}}
export function normalizeFactoryDatabaseV56(input={}){const seed=createFactoryDatabaseV56(),custom=(input.profiles||[]).filter(x=>!BUILT_INS.some(b=>b.id===x.id)).map(x=>normalizeFactoryProfileV56({...x,builtIn:false})),profiles=[...seed.profiles,...custom],selectedId=profiles.some(x=>x.id===input.selectedId)?input.selectedId:seed.selectedId;return{schema:V56_DATABASE_SCHEMA,version:1,selectedId,profiles}}
export function upsertFactoryProfileV56(db={},profile={}){const next=normalizeFactoryDatabaseV56(db),p=normalizeFactoryProfileV56({...profile,builtIn:false});if(BUILT_INS.some(x=>x.id===p.id))p.id=`${p.id}-custom`;const i=next.profiles.findIndex(x=>x.id===p.id);if(i>=0)next.profiles[i]=p;else next.profiles.push(p);next.selectedId=p.id;return next}
export function duplicateFactoryProfileV56(db={},sourceId,newName=null){const next=normalizeFactoryDatabaseV56(db),src=next.profiles.find(x=>x.id===sourceId);if(!src)return next;let id=`${idSafe(src.id)}-copy`,i=2;while(next.profiles.some(x=>x.id===id))id=`${idSafe(src.id)}-copy-${i++}`;const copy=normalizeFactoryProfileV56({...clone(src),id,name:newName||`${src.name} Copy`,builtIn:false});next.profiles.push(copy);next.selectedId=copy.id;return next}
export function deleteFactoryProfileV56(db={},id){const next=normalizeFactoryDatabaseV56(db),target=next.profiles.find(x=>x.id===id);if(!target||target.builtIn)return next;next.profiles=next.profiles.filter(x=>x.id!==id);if(next.selectedId===id)next.selectedId=next.profiles[0]?.id||null;return next}
export function selectFactoryProfileV56(db={},id){const next=normalizeFactoryDatabaseV56(db);if(next.profiles.some(x=>x.id===id))next.selectedId=id;return next}
export function exportFactoryDatabaseV56(db={}){return JSON.stringify(normalizeFactoryDatabaseV56(db),null,2)}
export function importFactoryDatabaseV56(text=''){const parsed=typeof text==='string'?JSON.parse(text):text;return normalizeFactoryDatabaseV56(parsed)}

export function validateFactoryProfileV56(profile={}){
  const p=normalizeFactoryProfileV56(profile),issues=[];
  if(!p.name.trim())issues.push(issue('error','V56_FACTORY_NAME','工厂名称','Factory profile requires a name.'));
  if(!p.materials.categories.length)issues.push(issue('error','V56_FACTORY_MATERIALS','材料能力','At least one material category is required.'));
  if(p.materials.thicknessMinMm>p.materials.thicknessMaxMm)issues.push(issue('error','V56_FACTORY_THICKNESS_RANGE','纸厚范围','Minimum thickness cannot exceed maximum thickness.'));
  if(p.blank.minWidthMm>p.blank.maxWidthMm||p.blank.minHeightMm>p.blank.maxHeightMm)issues.push(issue('error','V56_FACTORY_BLANK_RANGE','坯料范围','Minimum blank dimensions cannot exceed maximum blank dimensions.'));
  if(p.glue.minWidthMm>p.glue.maxWidthMm)issues.push(issue('error','V56_FACTORY_GLUE_RANGE','胶轮范围','Minimum glue width cannot exceed maximum glue width.'));
  for(const m of p.crease.matrices){if(m.thicknessMinMm>m.thicknessMaxMm||m.allowanceFactorMin>m.allowanceFactorMax)issues.push(issue('error','V56_FACTORY_CREASE_MATRIX','压痕矩阵',`Invalid crease matrix ${m.label}.`))}
  const errors=issues.filter(x=>x.severity==='error');return{ok:!errors.length,profile:p,issues,errors};
}

function findCreaseMatrix(profile,context){const t=context.material.thicknessMm,cat=context.material.category,flute=context.material.flute;return(profile.crease.matrices||[]).find(m=>m.categories.includes(cat)&&(m.flutes.length===0||m.flutes.includes(flute))&&t>=m.thicknessMinMm&&t<=m.thicknessMaxMm)||null}
function blankSize(geo={}){return{widthMm:r(Math.max(0,n(geo.width))),heightMm:r(Math.max(0,n(geo.height)))}}
export function evaluateFactoryCapabilityV56(state={},graph={},geo={},collisionReport={},profileInput={}){
  const validated=validateFactoryProfileV56(profileInput),p=validated.profile,v55=buildManufacturingProfilesV55(state,graph,geo,collisionReport),context=v55.context,issues=[...validated.issues],blank=blankSize(geo),cat=context.material.category,flute=context.material.flute,t=context.material.thicknessMm,glue=n(context.structure.glue),machineMode=p.mode==='machine';
  if(!p.materials.categories.includes(cat))issues.push(issue('error','V56_MATERIAL_CATEGORY','材料类别',`${cat} 不在 ${p.name} 的材料白名单中。`,'切换工厂 Profile，或由工厂确认并扩展材料能力。',cat));else issues.push(issue('pass','V56_MATERIAL_CATEGORY_OK','材料类别',`${cat} 已被工厂 Profile 支持。`,null,cat));
  if(cat==='corrugated'&&p.materials.flutes.length&&!p.materials.flutes.includes(flute))issues.push(issue('error','V56_FLUTE_CAPABILITY','楞型能力',`${flute||'CUSTOM'} 楞不在支持列表 ${p.materials.flutes.join(', ')}。`,'选择支持该楞型的产线或更新工厂能力表。',flute));else issues.push(issue('pass','V56_FLUTE_CAPABILITY_OK','楞型能力',`${flute||'CUSTOM'} 可由当前 Profile 处理。`,null,flute));
  if(t<p.materials.thicknessMinMm||t>p.materials.thicknessMaxMm)issues.push(issue('error','V56_THICKNESS_CAPABILITY','纸厚能力',`${r(t)} mm 超出工厂范围 ${r(p.materials.thicknessMinMm)}–${r(p.materials.thicknessMaxMm)} mm。`,'切换纸板或产线，或录入经工厂确认的真实范围。',t));else issues.push(issue('pass','V56_THICKNESS_CAPABILITY_OK','纸厚能力',`${r(t)} mm 位于工厂纸厚范围内。`,null,t));
  const blankOk=blank.widthMm>=p.blank.minWidthMm&&blank.heightMm>=p.blank.minHeightMm&&blank.widthMm<=p.blank.maxWidthMm&&blank.heightMm<=p.blank.maxHeightMm;
  issues.push(blankOk?issue('pass','V56_BLANK_SIZE_OK','坯料尺寸',`${blank.widthMm} × ${blank.heightMm} mm 位于工厂坯料范围内。`):issue('error','V56_BLANK_SIZE','坯料尺寸',`${blank.widthMm} × ${blank.heightMm} mm 超出 ${p.blank.minWidthMm}×${p.blank.minHeightMm} – ${p.blank.maxWidthMm}×${p.blank.maxHeightMm} mm。`,'调整拼版/结构尺寸或选择更大规格设备。',blank));
  if(machineMode&&!p.dieCutter.enabled)issues.push(issue('error','V56_DIECUTTER_REQUIRED','模切设备','Machine Profile 未启用模切/开槽设备。','启用真实设备能力或改用 Manual Profile。'));
  if(machineMode&&p.dieCutter.enabled){const ok=blank.widthMm>=p.dieCutter.minWidthMm&&blank.heightMm>=p.dieCutter.minHeightMm&&blank.widthMm<=p.dieCutter.maxWidthMm&&blank.heightMm<=p.dieCutter.maxHeightMm;issues.push(ok?issue('pass','V56_DIECUTTER_SIZE_OK','模切设备尺寸','坯料满足模切设备进纸范围。'):issue('error','V56_DIECUTTER_SIZE','模切设备尺寸','坯料不满足模切设备进纸范围。','调整坯料或选择其他模切机。'))}
  if(machineMode&&p.folderGluer.enabled){if(context.minPanelMm<p.folderGluer.minPanelMm)issues.push(issue('error','V56_FOLDER_GLUE_PANEL','糊盒最小面',`最小面板 ${context.minPanelMm} mm < 设备要求 ${p.folderGluer.minPanelMm} mm。`,'增大最小面板或改用人工工序。',context.minPanelMm));else issues.push(issue('pass','V56_FOLDER_GLUE_PANEL_OK','糊盒最小面','最小面板满足设备要求。',null,context.minPanelMm));if(context.maxConcurrentFolds>p.folderGluer.maxConcurrentFolds)issues.push(issue('warning','V56_FOLDER_GLUE_SEQUENCE','折叠单元复杂度',`单 Step ${context.maxConcurrentFolds} 条折线 > 设备建议 ${p.folderGluer.maxConcurrentFolds}。`,'拆分 Fold Step 或按实际折叠单元重新建模。',context.maxConcurrentFolds))}
  if(glue>0){if(!p.glue.enabled)issues.push(issue('error','V56_GLUE_DISABLED','上胶能力','当前结构需要胶舌，但该产线未启用上胶能力。'));else if(glue<p.glue.minWidthMm||glue>p.glue.maxWidthMm)issues.push(issue('error','V56_GLUE_WHEEL_RANGE','胶轮/上胶宽度',`${r(glue)} mm 超出 ${r(p.glue.minWidthMm)}–${r(p.glue.maxWidthMm)} mm。`,'调整胶舌或选择匹配胶轮/喷胶系统。',glue));else issues.push(issue('pass','V56_GLUE_WHEEL_OK','胶轮/上胶宽度',`${r(glue)} mm 位于设备范围。`,null,glue))}
  const matrix=findCreaseMatrix(p,context);if(p.crease.required&&!matrix)issues.push(issue('error','V56_CREASE_MATRIX_REQUIRED','压痕矩阵','当前材料/楞型/纸厚没有匹配的工厂压痕矩阵。','补录经工厂确认的压痕矩阵后再启用硬 Gate。'));else if(matrix)issues.push(issue('pass','V56_CREASE_MATRIX_OK','压痕矩阵',`匹配 ${matrix.label} · allowance factor ${matrix.allowanceFactorMin}–${matrix.allowanceFactorMax}。`,null,matrix.id));else issues.push(issue('info','V56_CREASE_MATRIX_OPTIONAL','压痕矩阵','当前 Profile 不强制压痕矩阵。'));
  if(context.penetrationCount>0)issues.push(issue('error','V56_FACTORY_PENETRATION','折叠路径穿插',`${context.penetrationCount} 个 penetration，工厂能力不能覆盖真实几何穿插。`,'先修复 Fold Sequence / Geometry。',context.penetrationCount));
  if(context.overlapCount>0)issues.push(issue('warning','V56_FACTORY_OVERLAP','折叠搭接复核',`${context.overlapCount} 个 overlap/contact，需要按实际工艺确认。`,null,context.overlapCount));
  const errors=issues.filter(x=>x.severity==='error'),warnings=issues.filter(x=>x.severity==='warning'),score=clamp(100-errors.length*24-warnings.length*7,0,100),status=errors.length?'fail':warnings.length?'review':'pass';
  return{schema:V56_FACTORY_SCHEMA,version:1,profile:p,context:{material:context.material,templateId:context.templateId,blank,minPanelMm:context.minPanelMm,maxConcurrentFolds:context.maxConcurrentFolds,glueMm:glue,penetrations:context.penetrationCount,overlaps:context.overlapCount,matchedCreaseMatrix:matrix},manufacturing:v55,status,score,issues,errors,warnings,gate:{enabled:p.productionGate.enabled,manufacturingProfile:p.productionGate.manufacturingProfile,blocked:p.productionGate.enabled&&errors.length>0,blockingCodes:errors.map(x=>x.code)}};
}

export function factoryPreflightChecksV56(evaluation={},blocking=evaluation?.gate?.enabled===true){return(evaluation.issues||[]).map(x=>({...x,title:`Factory · ${x.title}`,severity:!blocking&&x.severity==='error'?'warning':x.severity}))}
export function factoryAcceptanceV56(db={}){const database=normalizeFactoryDatabaseV56(db),issues=[];if(database.profiles.length<BUILT_INS.length)issues.push(issue('error','V56_FACTORY_DATABASE_BASELINES','Factory database','Built-in factory baselines are missing.'));for(const p of database.profiles){const v=validateFactoryProfileV56(p);issues.push(...v.errors.map(x=>({...x,detail:`${p.id}: ${x.detail}`})))}if(!database.profiles.some(x=>x.id===database.selectedId))issues.push(issue('error','V56_FACTORY_SELECTION','Factory selection','Selected factory profile is missing.'));const errors=issues.filter(x=>x.severity==='error');return{schema:'boxstudio-v56-factory-acceptance',version:1,ok:!errors.length,issues,errors,database,summary:{profiles:database.profiles.length,builtIns:database.profiles.filter(x=>x.builtIn).length,custom:database.profiles.filter(x=>!x.builtIn).length,selectedId:database.selectedId}}}
