import {prepareTemplateStateV47,artworkProfileV71} from './productExperienceV47.js';
import {defaultsForTemplate,generateGeometry} from './geometry.js';
import {createPanelFillV61} from './artworkStudioV61.js';
export const DESIGN_PRESETS_V71=Object.freeze([
 {id:'botanical',name:'植物护理',category:'care',brand:'LEAF / 01',subtitle:'BOTANICAL CARE',background:'#e5eddf',accent:'#7c9774',layout:'stripe'},
 {id:'tea',name:'茶叶档案',category:'food',brand:'TEA / 02',subtitle:'SMALL BATCH TEA',background:'#eee9dc',accent:'#b29c72',layout:'corner'},
 {id:'bakery',name:'每日烘焙',category:'food',brand:'BAKE / 03',subtitle:'FRESHLY MADE',background:'#f4e5d3',accent:'#c79865',layout:'stripe'},
 {id:'cocoa',name:'可可工坊',category:'food',brand:'COCOA / 04',subtitle:'CRAFT CHOCOLATE',background:'#e5d8d0',accent:'#aa8270',layout:'diagonal'},
 {id:'skin',name:'日常护肤',category:'care',brand:'PURE / 05',subtitle:'DAILY ESSENTIALS',background:'#dfe9ee',accent:'#819fac',layout:'corner'},
 {id:'gift',name:'节日礼盒',category:'gift',brand:'GIFT / 06',subtitle:'MADE TO SHARE',background:'#f0e0e4',accent:'#bd8f9e',layout:'stripe'},
 {id:'tech',name:'设备配件',category:'industrial',brand:'FORM / 07',subtitle:'PRECISION PARTS',background:'#e2e6ee',accent:'#8595b1',layout:'diagonal'},
 {id:'minimal',name:'极简纸品',category:'minimal',brand:'PAPER / 08',subtitle:'LESS, BUT BETTER',background:'#f4f1eb',accent:'#c7c0b4',layout:'corner'},
]);
const category=id=>({care:'护理',food:'食品',gift:'礼品',industrial:'工业',minimal:'极简'})[id]||id;
export const designCategoryLabelV71=category;
export function createArtworkProjectV71(current,presetId,{templateId=current.structure?.template||'straight-tuck-end',title}={}){
 const preset=DESIGN_PRESETS_V71.find(p=>p.id===presetId);if(!preset)throw new Error('设计模板不存在。');
 const next=prepareTemplateStateV47(current,templateId,defaultsForTemplate(templateId)),geo=generateGeometry(next.structure);next.elements=[];
 for(const panel of geo.panels.filter(p=>p.kind!=='glue')){
  next.elements.push(createPanelFillV61(panel,preset.background));const w=panel.w,h=panel.h,m=Math.min(8,Math.max(Number(geo.structure.safe||0)+1,Math.min(w*.1,h*.12))),accent={id:`v71-accent-${panel.id}`,type:'production-polygon',group:'artwork',panelId:panel.id,fillColor:preset.accent,zIndex:-99999,points:preset.layout==='diagonal'?[[w*.55,h],[w,h*.55],[w,h]]:preset.layout==='corner'?[[w*.7,0],[w,0],[w,h*.3],[w*.7,h*.3]]:[[0,h*.8],[w,h*.8],[w,h],[0,h]]};next.elements.push(accent);
  if(panel.kind==='panel'&&w>30&&h>20){const fs=Math.min(9,w*.05,h*.12);next.elements.push({id:`v71-title-${panel.id}`,type:'text',group:'artwork',panelId:panel.id,x:m,y:Math.max(m,h*.24),w:w-m*2,h:fs*1.6,r:0,template:preset.brand,fontSize:fs,bold:true,zIndex:2},{id:`v71-subtitle-${panel.id}`,type:'text',group:'artwork',panelId:panel.id,x:m,y:Math.max(m,h*.49),w:w-m*2,h:fs*1.5,r:0,template:preset.subtitle,fontSize:fs*.46,zIndex:2});}
 }
 next.projectName=String(title||preset.name+' / 包装设计').trim().slice(0,120)||preset.name;next.editorTab='Design';next.hiddenGroups={};next.lockedGroups={dieline:true};next.selectedIds=[];next.selectedId=next.elements.find(e=>e.type==='text')?.id||null;next.designPresetV71=preset.id;Object.assign(next,artworkProfileV71(next.structure));
 // Reset fold authoring when changing structure: old edge overrides and sequence
 // keys belong to the previous geometry and must not deform a new template.
 for(const key of ['reviewV35','linkedV49','foldAuthoringV50','foldSequenceV51'])delete next[key];return next;
}
