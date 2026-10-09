import {createArtworkV74} from './artworkLibraryV74.js';
import {prepareTemplateStateV47,artworkProfileV71} from './productExperienceV47.js';
import {defaultsForTemplate,generateGeometry} from './geometry.js';
import {createPanelFillV61} from './artworkStudioV61.js';
export const DESIGN_PRESETS_V71=Object.freeze([
 {"id": "honey", "name": "蜂蜜工坊", "category": "food", "brand": "HONEY / 17", "subtitle": "PURE AND GOLDEN", "background": "#f3e9cc", "accent": "#ceb661", "layout": "frame", "asset": "hexagon"},
 {"id": "pet", "name": "宠物日常", "category": "care", "brand": "PAWS / 18", "subtitle": "CARE FOR LITTLE FRIENDS", "background": "#efe7dc", "accent": "#bda58a", "layout": "grid", "asset": "paw-print"},
 {"id": "citrus", "name": "柑橘果饮", "category": "food", "brand": "CITRUS / 19", "subtitle": "BRIGHT AND FRESH", "background": "#f5ecd7", "accent": "#e1b861", "layout": "band", "asset": "citrus"},
 {"id": "pasta", "name": "意面厨房", "category": "food", "brand": "PASTA / 20", "subtitle": "GOOD FOOD GOOD DAYS", "background": "#efe4da", "accent": "#cba588", "layout": "frame", "asset": "chef-hat"},
 {"id": "forest", "name": "森林香氛", "category": "care", "brand": "FOREST / 21", "subtitle": "A QUIET MOMENT", "background": "#dfe9e1", "accent": "#89a995", "layout": "arch", "asset": "tree-pine"},
 {"id": "wildflower", "name": "野花手信", "category": "gift", "brand": "WILD / 22", "subtitle": "GATHER THE LITTLE THINGS", "background": "#eee1e8", "accent": "#bc8faa", "layout": "grid", "asset": "flower"},
 {"id": "studio", "name": "设计文具", "category": "minimal", "brand": "STUDIO / 23", "subtitle": "MAKE SOMETHING TODAY", "background": "#e7e6e2", "accent": "#adaaa0", "layout": "frame", "asset": "pencil-ruler"},
 {"id": "record", "name": "唱片档案", "category": "gift", "brand": "RECORD / 24", "subtitle": "YOUR DAILY SOUNDTRACK", "background": "#e5e3ed", "accent": "#9a92b5", "layout": "band", "asset": "disc-3"},
 {"id": "mountain", "name": "户外装备", "category": "industrial", "brand": "SUMMIT / 25", "subtitle": "TAKE THE NEXT STEP", "background": "#e0e8e8", "accent": "#88a4a5", "layout": "arch", "asset": "mountain"},
 {"id": "bicycle", "name": "骑行配件", "category": "industrial", "brand": "RIDE / 26", "subtitle": "EVERYDAY ADVENTURES", "background": "#e9e9db", "accent": "#abab77", "layout": "grid", "asset": "bike"},
 {"id": "rose", "name": "玫瑰护肤", "category": "care", "brand": "ROSE / 27", "subtitle": "SOFTEN YOUR EVERYDAY", "background": "#f0e1de", "accent": "#c79c91", "layout": "frame", "asset": "flower-2"},
 {"id": "mint", "name": "薄荷口香糖", "category": "food", "brand": "MINT / 28", "subtitle": "A FRESH LITTLE BREAK", "background": "#dfede7", "accent": "#8bb7a4", "layout": "band", "asset": "leaf"},
 {"id": "winter", "name": "冬日礼品", "category": "gift", "brand": "WINTER / 29", "subtitle": "WARM WISHES INSIDE", "background": "#e4ebf0", "accent": "#9cabb9", "layout": "grid", "asset": "snowflake"},
 {"id": "ceramic", "name": "陶艺器物", "category": "minimal", "brand": "CLAY / 30", "subtitle": "CRAFTED WITH PATIENCE", "background": "#efe4db", "accent": "#bea28c", "layout": "arch", "asset": "amphora"},
 {"id": "camera", "name": "摄影附件", "category": "industrial", "brand": "FOCUS / 31", "subtitle": "CAPTURE YOUR WORLD", "background": "#e3e6eb", "accent": "#959faa", "layout": "frame", "asset": "camera"},
 {"id": "berry", "name": "莓果甜点", "category": "food", "brand": "BERRY / 32", "subtitle": "A LITTLE SWEETNESS", "background": "#f0e2e7", "accent": "#c09aa9", "layout": "arch", "asset": "cherry"},
 {id:'coffee-roast',name:'精品咖啡',category:'food',brand:'ROAST / 09',subtitle:'SINGLE ORIGIN COFFEE',background:'#eee4d8',accent:'#936847',layout:'stripe',asset:'coffee'},
 {id:'harvest',name:'谷物收获',category:'food',brand:'HARVEST / 10',subtitle:'NATURALLY GROWN',background:'#f2ebd5',accent:'#b09643',layout:'corner',asset:'wheat'},
 {id:'bloom',name:'花漾礼品',category:'gift',brand:'BLOOM / 11',subtitle:'A LITTLE JOY FOR YOU',background:'#f0e2e5',accent:'#b86e88',layout:'diagonal',asset:'flower-2'},
 {id:'ocean',name:'海洋护理',category:'care',brand:'OCEAN / 12',subtitle:'HYDRATE AND RENEW',background:'#deeceb',accent:'#4d8d91',layout:'stripe',asset:'droplet'},
 {id:'orchard',name:'果园风物',category:'food',brand:'ORCHARD / 13',subtitle:'FRESH FROM THE ORCHARD',background:'#e8eddd',accent:'#719461',layout:'corner',asset:'apple'},
 {id:'jewel',name:'珠宝档案',category:'gift',brand:'JEWEL / 14',subtitle:'PRECIOUS EVERY DAY',background:'#eae5f0',accent:'#807090',layout:'diagonal',asset:'gem'},
 {id:'recharge',name:'能源配件',category:'industrial',brand:'RECHARGE / 15',subtitle:'POWER YOUR EVERYDAY',background:'#e2e8eb',accent:'#497082',layout:'stripe',asset:'battery'},
 {id:'eco-paper',name:'再生纸品',category:'minimal',brand:'CYCLE / 16',subtitle:'RECYCLED AND REIMAGINED',background:'#eee6d9',accent:'#827458',layout:'corner',asset:'recycle'},
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
  next.elements.push(createPanelFillV61(panel,preset.background));const w=panel.w,h=panel.h,m=Math.min(8,Math.max(Number(geo.structure.safe||0)+1,Math.min(w*.1,h*.12))),accent={id:`v71-accent-${panel.id}`,type:'production-polygon',group:'artwork',panelId:panel.id,fillColor:preset.accent,zIndex:-99999,points:preset.layout==='diagonal'?[[w*.55,h],[w,h*.55],[w,h]]:preset.layout==='corner'?[[w*.7,0],[w,0],[w,h*.3],[w*.7,h*.3]]:[[0,h*.8],[w,h*.8],[w,h],[0,h]]};if(preset.layout==='frame'){const b=Math.min(3,w*.05,h*.05);for(const [i,points]of [[[0,0],[w,0],[w,b],[0,b]],[[0,h-b],[w,h-b],[w,h],[0,h]],[[0,b],[b,b],[b,h-b],[0,h-b]],[[w-b,b],[w,b],[w,h-b],[w-b,h-b]]].entries())next.elements.push({...accent,id:accent.id+'-'+i,points});}
  else if(preset.layout==='band')next.elements.push({...accent,points:[[0,h*.65],[w,h*.65],[w,h*.9],[0,h*.9]]});
  else if(preset.layout==='grid'){const size=Math.min(w*.12,h*.12);for(let i=0;i<6;i++){const cx=(i+.5)*w/6,cy=h*.86;next.elements.push({...accent,id:accent.id+'-'+i,points:[[cx,cy-size*.45],[cx+size*.45,cy],[cx,cy+size*.45],[cx-size*.45,cy]]});}}
  else if(preset.layout==='arch'){const points=[[w*.65,h],[w*.65,h*.75]];for(let i=1;i<=16;i++){const a=Math.PI+i*Math.PI/16;points.push([w*.8+Math.cos(a)*w*.15,h*.75+Math.sin(a)*h*.2]);}points.push([w*.95,h]);next.elements.push({...accent,points});}
  else next.elements.push(accent);
  if(preset.asset&&panel.kind==='panel'&&w>40&&h>35){const icon=createArtworkV74(preset.asset,panel,{color:preset.accent});icon.w=icon.h=Math.min(w*.18,h*.18,24);icon.x=w-icon.w-m;icon.y=h*.57;next.elements.push(icon);}
  if(panel.kind==='panel'&&w>30&&h>20){const fs=Math.min(9,w*.05,h*.12);next.elements.push({id:`v71-title-${panel.id}`,type:'text',group:'artwork',panelId:panel.id,x:m,y:Math.max(m,h*.24),w:w-m*2,h:fs*1.6,r:0,template:preset.brand,fontSize:fs,bold:true,zIndex:2},{id:`v71-subtitle-${panel.id}`,type:'text',group:'artwork',panelId:panel.id,x:m,y:Math.max(m,h*.49),w:w-m*2,h:fs*1.5,r:0,template:preset.subtitle,fontSize:fs*.46,zIndex:2});}
 }
 next.projectName=String(title||preset.name+' / 包装设计').trim().slice(0,120)||preset.name;next.editorTab='Design';next.hiddenGroups={};next.lockedGroups={dieline:true};next.selectedIds=[];next.selectedId=next.elements.find(e=>e.type==='text')?.id||null;next.designPresetV71=preset.id;Object.assign(next,artworkProfileV71(next.structure));
 // Reset fold authoring when changing structure: old edge overrides and sequence
 // keys belong to the previous geometry and must not deform a new template.
 for(const key of ['reviewV35','linkedV49','foldAuthoringV50','foldSequenceV51'])delete next[key];return next;
}
