import { generateGeometry, clampElementToPanel } from './geometry.js';
import { getMarkAssetCatalog, insertMarkAsset } from './markAssets.js';
import { getMarkTemplateCatalog, applyMarkTemplate, createMarkTemplateFromState, saveCustomMarkTemplate } from './markTemplates.js';
import { getCustomerProfileCatalog, getCustomerProfile, applyCustomerProfile } from './customerProfiles.js';
import { getPackagingRuleProfile } from './rules.js';

const clone=value=>structuredClone(value);
const num=(value,fallback=0)=>{const n=Number(value);return Number.isFinite(n)?n:fallback};
const uid=(prefix='v34')=>`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
const slug=(value='item')=>String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||`item-${Date.now()}`;

export const VARIABLE_DEFINITIONS_V34=Object.freeze([
  {key:'sku',label:'SKU / Item No.',category:'Product'},
  {key:'nw',label:'Net Weight',category:'Weight'},
  {key:'gw',label:'Gross Weight',category:'Weight'},
  {key:'weightUnit',label:'Weight Unit',category:'Weight'},
  {key:'length',label:'Length',category:'Dimensions'},
  {key:'width',label:'Width',category:'Dimensions'},
  {key:'height',label:'Height',category:'Dimensions'},
  {key:'dimensionUnit',label:'Dimension Unit',category:'Dimensions'},
  {key:'originCountry',label:'Origin Country',category:'Trade'},
  {key:'destinationCountry',label:'Destination Country',category:'Trade'},
  {key:'crn',label:'CRN',category:'Trade'},
  {key:'contractNo',label:'Contract No.',category:'Trade'},
  {key:'packageIndex',label:'Package Index',category:'Package'},
  {key:'packageCount',label:'Package Count',category:'Package'},
  {key:'qrValue',label:'QR Value',category:'Codes'},
]);

export const MARK_COMPONENTS_V34=Object.freeze({
  sku:Object.freeze({id:'sku',label:'SKU',category:'Text',element:{type:'text',template:'SKU: {{sku}}',fontSize:8,w:110,h:18}}),
  weight:Object.freeze({id:'weight',label:'N.W. / G.W.',category:'Text',element:{type:'text',template:'N.W.: {{nw}} {{weightUnit}}\nG.W.: {{gw}} {{weightUnit}}',fontSize:6,w:120,h:30}}),
  dimensions:Object.freeze({id:'dimensions',label:'Package Dimensions',category:'Text',element:{type:'text',template:'{{length}} × {{width}} × {{height}} {{dimensionUnit}}',fontSize:6,w:135,h:20}}),
  origin:Object.freeze({id:'origin',label:'Made In',category:'Text',element:{type:'text',template:'Made in {{originCountry}}',fontSize:6,w:100,h:18}}),
  destination:Object.freeze({id:'destination',label:'Destination',category:'Text',element:{type:'text',template:'{{destinationCountry}}',fontSize:7,bold:true,w:75,h:18}}),
  crn:Object.freeze({id:'crn',label:'CRN',category:'Text',element:{type:'text',template:'CRN: {{crn}}',fontSize:6,bold:true,w:100,h:18}}),
  contract:Object.freeze({id:'contract',label:'Contract No.',category:'Text',element:{type:'text',template:'Contract No.: {{contractNo}}',fontSize:6,w:125,h:18}}),
  package:Object.freeze({id:'package',label:'Package Notice',category:'Package',element:{type:'notice',template:'Package {{packageIndex}} / {{packageCount}}',fontSize:6,w:110,h:18}}),
  'barcode-qr':Object.freeze({id:'barcode-qr',label:'Barcode + QR',category:'Codes',element:{type:'barcode-qr-group',barcodeValue:'{{sku}}',qrValue:'{{qrValue}}',barcodeType:'CODE39',preset:'200x64',lockAspect:true,w:200,h:64}}),
  'this-side-up':Object.freeze({id:'this-side-up',label:'This Side Up',category:'Handling',element:{type:'icon',icon:'up',w:42,h:42}}),
  fragile:Object.freeze({id:'fragile',label:'Fragile',category:'Handling',element:{type:'icon',icon:'fragile',w:42,h:42}}),
  'keep-dry':Object.freeze({id:'keep-dry',label:'Keep Dry',category:'Handling',element:{type:'icon',icon:'dry',w:42,h:42}}),
});

export const MARK_BLOCK_PRESETS_V34=Object.freeze({
  'product-id':Object.freeze({id:'product-id',label:'Product ID',description:'SKU + contract number',elements:Object.freeze([
    {type:'text',template:'SKU: {{sku}}',fontSize:8,bold:true,w:120,h:18,dx:0,dy:0},
    {type:'text',template:'Contract No.: {{contractNo}}',fontSize:6,w:120,h:18,dx:0,dy:24},
  ])}),
  'shipping-core':Object.freeze({id:'shipping-core',label:'Shipping Core',description:'Weight + dimensions + origin',elements:Object.freeze([
    {type:'text',template:'N.W.: {{nw}} {{weightUnit}}\nG.W.: {{gw}} {{weightUnit}}',fontSize:6,w:120,h:30,dx:0,dy:0},
    {type:'text',template:'{{length}} × {{width}} × {{height}} {{dimensionUnit}}',fontSize:6,w:135,h:18,dx:0,dy:36},
    {type:'text',template:'Made in {{originCountry}}',fontSize:6,w:100,h:18,dx:0,dy:60},
  ])}),
  'handling-icons':Object.freeze({id:'handling-icons',label:'Handling Icons',description:'This Side Up + Fragile + Keep Dry',elements:Object.freeze([
    {type:'icon',icon:'up',w:38,h:38,dx:0,dy:0},
    {type:'icon',icon:'fragile',w:38,h:38,dx:46,dy:0},
    {type:'icon',icon:'dry',w:38,h:38,dx:92,dy:0},
  ])}),
  traceability:Object.freeze({id:'traceability',label:'Traceability',description:'CRN + Barcode/QR',elements:Object.freeze([
    {type:'text',template:'CRN: {{crn}}',fontSize:6,bold:true,w:120,h:18,dx:0,dy:0},
    {type:'barcode-qr-group',barcodeValue:'{{sku}}',qrValue:'{{qrValue}}',barcodeType:'CODE39',preset:'200x64',lockAspect:true,w:200,h:64,dx:0,dy:26},
  ])}),
});

function firstPanel(state,panelId=null){
  const geo=generateGeometry(state?.structure||{}),panel=geo.panelMap?.[panelId]||geo.panelMap?.[state?.markEditorPanelId]||geo.panelMap?.front||geo.panelMap?.base||(geo.bodyPanels||[]).find(p=>p?.kind==='panel')||(geo.bodyPanels||[])[0];
  return {geo,panel};
}
function markElements(state){return (state?.elements||[]).filter(element=>element?.group==='marks');}
function stripPlacement(element){const copy=clone(element);for(const key of ['id','panelId','x','y','zIndex','groupId','groupName','hidden','locked','_v34ManualHidden','_v34RuleManaged'])delete copy[key];return copy;}

export function getMarkComponentCatalogV34(state=null){
  const catalog={...MARK_COMPONENTS_V34};
  for(const asset of Object.values(getMarkAssetCatalog(state))){catalog[`asset:${asset.id}`]={id:`asset:${asset.id}`,label:asset.label,category:asset.builtIn?'Handling':'Custom Symbols',description:asset.description||'',kind:'asset',assetId:asset.id};}
  return catalog;
}

export function insertMarkComponentV34(state,componentId,{panelId=null,x=10,y=10,idFactory=null}={}){
  const component=getMarkComponentCatalogV34(state)[componentId];
  if(!component)throw new Error(`Mark component ${componentId} was not found.`);
  if(component.kind==='asset')return insertMarkAsset(state,component.assetId,{panelId,x,y});
  const next=clone(state||{}),{geo,panel}=firstPanel(next,panelId);if(!panel)throw new Error('No target panel is available.');
  const source=clone(component.element),id=idFactory?idFactory(component):uid(`mark-${slug(component.id)}`),element=clampElementToPanel({...source,id,group:'marks',panelId:panel.id,x:num(x,10),y:num(y,10),zIndex:(next.elements||[]).length,componentIdV34:component.id},geo);
  next.elements=[...(next.elements||[]),element];next.selectedId=element.id;next.markEditorPanelId=panel.id;return next;
}

export function patchMarkElementV34(state,id,patch={}){
  const next=clone(state||{}),index=(next.elements||[]).findIndex(element=>element?.id===id&&element?.group==='marks');if(index<0)throw new Error(`Mark element ${id} was not found.`);
  const allowed=new Set(['x','y','w','h','r','panelId','template','fontSize','bold','barcodeType','barcodeValue','qrValue','preset','lockAspect','icon','label']);
  const clean={};for(const [key,value] of Object.entries(patch))if(allowed.has(key))clean[key]=value;
  const geo=generateGeometry(next.structure||{});next.elements[index]=clampElementToPanel({...next.elements[index],...clean},geo);next.selectedId=id;next.markEditorPanelId=next.elements[index].panelId||next.markEditorPanelId;return next;
}

function tokenFields(element){return [['template',element?.template],['barcodeValue',element?.barcodeValue],['qrValue',element?.qrValue]];}
export function extractVariableTokensV34(value=''){return Array.from(new Set([...String(value||'').matchAll(/{{\s*([\w]+)\s*}}/g)].map(match=>match[1])));}
export function insertVariableTokenV34(value,key,{start=null,end=null}={}){const text=String(value||''),cleanKey=String(key||'').trim();if(!cleanKey)return text;const token='{{'+cleanKey+'}}',a=Number.isInteger(start)?Math.max(0,Math.min(text.length,start)):text.length,b=Number.isInteger(end)?Math.max(a,Math.min(text.length,end)):a;return `${text.slice(0,a)}${token}${text.slice(b)}`;}

export function variableDefinitionsV34(state={}){
  const known=new Map(VARIABLE_DEFINITIONS_V34.map(item=>[item.key,{...item}]));
  for(const key of Object.keys(state?.variables||{}))if(!known.has(key))known.set(key,{key,label:key,category:'Custom'});
  return [...known.values()].map(item=>({...item,value:state?.variables?.[item.key]??'',locked:(state?.lockedVariables||[]).includes(item.key)}));
}

export function variableUsageMapV34(state={}){
  const usage=new Map();
  const ensure=key=>{if(!usage.has(key))usage.set(key,{key,value:state?.variables?.[key]??'',uses:[],required:false,missing:false});return usage.get(key)};
  for(const element of markElements(state))for(const [field,value] of tokenFields(element))for(const key of extractVariableTokensV34(value)){ensure(key).uses.push({elementId:element.id,field});}
  const profile=getPackagingRuleProfile(state?.packagingRuleProfileId||'generic',state);for(const key of profile?.requiredVariables||[])ensure(key).required=true;
  for(const item of usage.values())item.missing=(item.required||item.uses.length>0)&&String(item.value??'').trim()==='';
  return [...usage.values()].sort((a,b)=>Number(b.missing)-Number(a.missing)||Number(b.required)-Number(a.required)||a.key.localeCompare(b.key));
}
export function missingVariablesV34(state={}){return variableUsageMapV34(state).filter(item=>item.missing);}

export function setVariableV34(state,key,value,{force=false}={}){
  if(!key)throw new Error('Variable key is required.');if(!force&&(state?.lockedVariables||[]).includes(key))throw new Error(`Variable ${key} is locked by the active customer profile.`);
  const next=clone(state||{});next.variables={...(next.variables||{}),[key]:String(value??'')};return next;
}

function fieldValue(state,field){if(field==='customerProfileId'||field==='markTemplateId'||field==='packagingRuleProfileId')return state?.[field]??'';return state?.variables?.[field]??'';}
function compare(actual,op,expected){
  const a=String(actual??''),e=String(expected??'');
  if(op==='eq')return a===e;if(op==='neq')return a!==e;if(op==='contains')return a.toLowerCase().includes(e.toLowerCase());if(op==='empty')return a.trim()==='';if(op==='not-empty')return a.trim()!=='';
  if(op==='in')return e.split(',').map(x=>x.trim()).filter(Boolean).includes(a);
  const an=Number(actual),en=Number(expected);if(!Number.isFinite(an)||!Number.isFinite(en))return false;if(op==='gt')return an>en;if(op==='gte')return an>=en;if(op==='lt')return an<en;if(op==='lte')return an<=en;return false;
}
export function evaluateMarkConditionV34(state,condition={}){const actual=fieldValue(state,condition.field),matched=compare(actual,condition.op||'eq',condition.value);return{field:condition.field,op:condition.op||'eq',expected:condition.value??'',actual,matched};}

export function normalizeMarkRuleV34(rule={}){
  const conditions=(Array.isArray(rule.conditions)?rule.conditions:[]).filter(item=>item?.field).map(item=>({field:String(item.field),op:String(item.op||'eq'),value:String(item.value??'')}));
  return {id:slug(rule.id||rule.label||uid('rule')),label:String(rule.label||rule.id||'Mark Rule').trim(),enabled:rule.enabled!==false,effect:rule.effect==='hide'?'hide':'show',match:rule.match==='any'?'any':'all',targetIds:Array.from(new Set((rule.targetIds||[]).map(String).filter(Boolean))),conditions};
}
export function previewMarkRuleV34(state,rule){const normalized=normalizeMarkRuleV34(rule),trace=normalized.conditions.map(condition=>evaluateMarkConditionV34(state,condition)),matched=trace.length===0?true:(normalized.match==='any'?trace.some(x=>x.matched):trace.every(x=>x.matched));return{rule:normalized,matched,trace,targetCount:normalized.targetIds.filter(id=>(state?.elements||[]).some(element=>element.id===id)).length};}
export function markRuleDebugV34(state={}){return (state?.markRulesV34||[]).map(rule=>previewMarkRuleV34(state,rule));}

export function saveMarkRuleV34(state,rule){const next=clone(state||{}),normalized=normalizeMarkRuleV34(rule),list=[...(next.markRulesV34||[])],index=list.findIndex(item=>item.id===normalized.id);if(index>=0)list[index]=normalized;else list.push(normalized);next.markRulesV34=list;return applyMarkRulesV34(next);}
export function deleteMarkRuleV34(state,id){const next=clone(state||{});next.markRulesV34=(next.markRulesV34||[]).filter(rule=>rule.id!==id);return applyMarkRulesV34(next);}

export function applyMarkRulesV34(state={}){
  const next=clone(state||{}),rules=(next.markRulesV34||[]).map(normalizeMarkRuleV34).filter(rule=>rule.enabled),previews=rules.map(rule=>previewMarkRuleV34(next,rule));
  next.elements=(next.elements||[]).map(element=>{
    if(element?.group!=='marks')return element;
    const applicable=previews.filter(item=>item.rule.targetIds.includes(element.id));
    const copy={...element};
    if(!applicable.length){if(copy._v34RuleManaged){copy.hidden=Boolean(copy._v34ManualHidden);delete copy._v34RuleManaged;delete copy._v34ManualHidden;}return copy;}
    if(copy._v34ManualHidden===undefined)copy._v34ManualHidden=Boolean(copy.hidden);
    const showRules=applicable.filter(item=>item.rule.effect==='show'),hideRules=applicable.filter(item=>item.rule.effect==='hide'),showOk=!showRules.length||showRules.some(item=>item.matched),hideMatched=hideRules.some(item=>item.matched),visible=!copy._v34ManualHidden&&showOk&&!hideMatched;
    copy.hidden=!visible;copy._v34RuleManaged=true;return copy;
  });
  return next;
}

export function getMarkBlockCatalogV34(state={}){return{...MARK_BLOCK_PRESETS_V34,...(state?.customMarkBlocksV34||{})};}
export function insertMarkBlockV34(state,blockId,{panelId=null,x=10,y=10,idFactory=null}={}){
  const block=getMarkBlockCatalogV34(state)[blockId];if(!block)throw new Error(`Mark block ${blockId} was not found.`);
  const next=clone(state||{}),{geo,panel}=firstPanel(next,panelId);if(!panel)throw new Error('No target panel is available.');const gid=uid(`block-${slug(blockId)}`),created=[];
  for(let i=0;i<(block.elements||[]).length;i++){const source=clone(block.elements[i]),dx=num(source.dx),dy=num(source.dy);delete source.dx;delete source.dy;const id=idFactory?idFactory(source,i):uid(`mark-${slug(blockId)}`),element=clampElementToPanel({...source,id,group:'marks',groupId:gid,groupName:block.label,panelId:panel.id,x:num(x,10)+dx,y:num(y,10)+dy,zIndex:(next.elements||[]).length+i,markBlockIdV34:blockId},geo);created.push(element);}
  next.elements=[...(next.elements||[]),...created];next.selectedId=created[0]?.id||next.selectedId;next.markEditorPanelId=panel.id;return next;
}

export function createMarkBlockFromSelectionV34(state,ids,{id=null,label='Reusable Mark Block',description=''}={}){
  const wanted=new Set(ids||[]),selected=markElements(state).filter(element=>wanted.has(element.id));if(!selected.length)throw new Error('Select at least one mark element.');
  const panels=new Set(selected.map(element=>element.panelId));if(panels.size>1)throw new Error('Reusable blocks must be created from one panel at a time.');const minX=Math.min(...selected.map(element=>num(element.x))),minY=Math.min(...selected.map(element=>num(element.y)));
  const elements=selected.map(element=>({...stripPlacement(element),dx:num(element.x)-minX,dy:num(element.y)-minY}));return{id:slug(id||label),label:String(label||'Reusable Mark Block').trim(),description:String(description||''),elements,custom:true,createdAt:new Date().toISOString()};
}
export function saveCustomMarkBlockV34(state,block){const next=clone(state||{}),normalized={...clone(block),id:slug(block?.id||block?.label||'mark-block'),custom:true};if(MARK_BLOCK_PRESETS_V34[normalized.id])throw new Error('Built-in mark blocks cannot be overwritten.');next.customMarkBlocksV34={...(next.customMarkBlocksV34||{}),[normalized.id]:normalized};return next;}
export function deleteCustomMarkBlockV34(state,id){if(MARK_BLOCK_PRESETS_V34[id])throw new Error('Built-in mark blocks cannot be deleted.');const next=clone(state||{}),blocks={...(next.customMarkBlocksV34||{})};delete blocks[id];next.customMarkBlocksV34=blocks;return next;}

export function applyCustomerMarkPresetV34(state,customerId,{overwriteDefaults=false}={}){
  let next=applyCustomerProfile(state,customerId,{overwriteDefaults}),profile=getCustomerProfile(customerId,next);if(profile.preferredMarkTemplateId)next=applyMarkTemplate(next,profile.preferredMarkTemplateId);return applyMarkRulesV34(next);
}
export function saveCurrentMarksTemplateV34(state,{id,label,description=''}={}){const template=createMarkTemplateFromState(state,{id,label,description});return saveCustomMarkTemplate(state,template);}
export function catalogsV34(state={}){return{components:getMarkComponentCatalogV34(state),blocks:getMarkBlockCatalogV34(state),templates:getMarkTemplateCatalog(state),customers:getCustomerProfileCatalog(state)};}
