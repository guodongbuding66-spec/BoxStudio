import {prepareTemplateStateV47,artworkProfileV71} from './productExperienceV47.js';
import {defaultsForTemplate,generateGeometry} from './geometry.js';
import {createPanelFillV61} from './artworkStudioV61.js';
import {createArtworkV74} from './artworkLibraryV74.js';
import {textStyleV76} from './textLayoutV76.js';
// Brand families have related palettes and distinct SKUs / actual carton sizes.
const families=[
 ['果间','ORCHARD', 'food',['柑橘果饮','莓果果饮','蜜桃果饮'],['pack-1f34a','pack-1fad0','pack-1f351'],'#fff3dd',['#ec963f','#8b5379','#dd8392']],
 ['山芽','SHANYA','food',['绿茶','红茶','花草茶'],['pack-1f343','pack-1f342','pack-1f338'],'#edf0df',['#456a4f','#91674b','#ad7591']],
 ['拾谷','HARVEST','food',['燕麦谷物','坚果谷物','蜂蜜谷物'],['pack-1f33e','pack-1f95c','pack-1f36f'],'#f5ecd7',['#b99545','#967251','#c1933e']],
 ['豆序','ROAST','food',['浅烘咖啡','中烘咖啡','深烘咖啡'],['pack-2615','pack-2615','pack-2615'],'#efe6da',['#bd926c','#946b4b','#5f493b']],
 ['每日烘焙','DAILY BAKE','food',['黄油曲奇','原味贝果','巧克力饼干'],['pack-1f36a','pack-1f96f','pack-1f36b'],'#fff0dc',['#c78645','#b49766','#8b6357']],
 ['可可里','COCOA','food',['黑巧克力','牛奶巧克力','坚果巧克力'],['pack-1f36b','pack-1f95b','pack-1f330'],'#f2e5dc',['#70534b','#b78468','#97735c']],
 ['花序','BLOOM','care',['玫瑰洁面','草本乳液','花香香皂'],['pack-1f339','pack-1f9f4','pack-1f9fc'],'#f5e8e8',['#bd7c86','#77947c','#a289ae']],
 ['净日','PURE DAY','care',['日常洗护','温和清洁','旅行洗护'],['pack-1f9f4','pack-1f9fc','pack-1faa5'],'#eaf0ee',['#739d95','#91aa9b','#83a1b5']],
 ['木息','FOREST','care',['草本香氛','花木香氛','烛光礼盒'],['pack-1f33f','pack-1f332','pack-1f56f'],'#ecebdf',['#778876','#59796b','#a18b68']],
 ['织物日常','THREAD','minimal',['棉织衬衣','温暖围巾','针织袜子'],['pack-1f455','pack-1f9e3','pack-1f9e6'],'#f1e9dd',['#8e9ca2','#b18a72','#89917c']],
 ['步履','WALK','minimal',['日常鞋履','轻便出行','都市配件'],['pack-1f45f','pack-1f45c','pack-1f576'],'#e9edf0',['#597888','#887b66','#67727d']],
 ['拾光','GATHER','gift',['节日礼盒','庆典礼盒','纪念礼盒'],['pack-1f381','pack-1f389','pack-1f380'],'#f2e6db',['#b77d71','#b69357','#997594']],
 ['月满','MOON','gift',['经典月饼','双味月饼','团圆礼盒'],['pack-1f96e','pack-1f3ee','pack-1f381'],'#f4e9d0',['#a77244','#b87e69','#847758']],
 ['冬日来信','WINTER','gift',['圣诞礼盒','雪季礼盒','冬日手信'],['pack-1f384','pack-2744','pack-1f98c'],'#e8eef0',['#5b7c70','#86a7b7','#9e8770']],
 ['新岁','NEW YEAR','gift',['新年红包','新年礼物','花开迎春'],['pack-1f9e7','pack-1f3ee','pack-1f338'],'#fae9de',['#c35e52','#a9473d','#c37877']],
 ['植养','BOTANIC','care',['绿植养护','鲜花养护','草本补给'],['pack-1fab4','pack-1f337','pack-1f331'],'#e8eedf',['#7c9970','#b38295','#61866b']]
];
export const INDUSTRY_PRESETS_V79=Object.freeze(families.flatMap(([brand,english,category,products,assets,background,accents],i)=>products.map((product,j)=>({id:`series-${i}-${j}`,name:brand+' · '+product,category,brand:english,subtitle:product,background,accent:accents[j],layout:['frame','band','corner'][j],asset:assets[j],series:brand,variant:j,product,brandZh:brand,sku:english.replace(/ /g,'-')+'-'+(j+1),sizeFactor:[.78,1,1.22][j]}))));
export function createIndustryProjectV79(current,preset,{templateId=current.structure?.template||'straight-tuck-end',title}={}){
 const dims=defaultsForTemplate(templateId);for(const k of ['length','width','height'])dims[k]=Math.round(({length:200,width:140,height:60})[k]*preset.sizeFactor);const next=prepareTemplateStateV47(current,templateId,dims),geo=generateGeometry(next.structure);next.elements=[];Object.assign(next,artworkProfileV71(next.structure));next.variables={...next.variables,brand:preset.brandZh,product:preset.product,sku:preset.sku,netContent:'净含量：请填写',ingredients:'成分 / 配料：请按实际产品填写',instructions:'使用与保存：请按实际产品填写',manufacturer:'生产商、地址与联系方式：请填写'};
 const printPanels=geo.panels.filter(p=>p.kind==='panel'),front=printPanels.find(p=>/^(lid|top)$/.test(p.id))||printPanels.find(p=>/front/.test(p.id))||printPanels[0],back=printPanels.find(p=>/back/.test(p.id))||printPanels[1];
 const text=(panel,key,template,x,y,w,h,fs,{bold=false,color='#253128',...style}={})=>({id:`v79-${key}-${panel.id}`,type:'text',name:key,group:'artwork',panelId:panel.id,x,y,w,h:Math.max(4,h,Math.max(1,fs)*1.2),r:0,template,fontSize:Math.max(1,fs),fontIdV74:'noto-sc-full',fontWeightV79:bold?700:400,bold,textStyleV76:textStyleV76({color,wrap:true,...style}),zIndex:3});
 for(const p of geo.panels.filter(p=>p.kind!=='glue')){next.elements.push(createPanelFillV61(p,preset.background));if(p.kind!=='panel'||p.w<36||p.h<34)continue;const m=Math.max(4,Math.min(8,p.w*.06,p.h*.08)),w=p.w-2*m,h=p.h-2*m;
  next.elements.push({id:'v79-band-'+p.id,type:'production-polygon',group:'artwork',panelId:p.id,fillColor:preset.accent,zIndex:0,points:[[0,p.h*.91],[p.w,p.h*.91],[p.w,p.h],[0,p.h]]});
  if(p.id===front.id){const fs=Math.min(9,w/9,h*.1),size=Math.min(w*.48,h*.3);next.elements.push(text(p,'品牌','{{brand}}',m,m,w,fs*1.7,fs,{bold:true,color:preset.accent}),text(p,'系列',preset.brand,m,m+fs*1.7,w,fs,fs*.4,{color:preset.accent}),text(p,'品名','{{product}}',m,p.h*.6,w,fs*1.8,fs*.75,{bold:true}),text(p,'规格','{{netContent}}',m,p.h*.79,w,fs,Math.max(1.1,fs*.35)));if(size>=8){const a=createArtworkV74(preset.asset,{...p,w:Math.max(24,p.w),h:Math.max(24,p.h)});Object.assign(a,{x:(p.w-size)/2,y:p.h*.28,w:size,h:size});next.elements.push(a);}if(preset.category==='gift'){next.elements.find(e=>e.id==='v79-品牌-'+p.id).printFinishV79={type:'gold',depth:.15};}}
  else if(p.id===back?.id){const fs=Math.min(4,w/16,h/16);next.elements.push(text(p,'产品说明','{{product}}',m,m,w,fs*2,fs,{bold:true,color:preset.accent}),text(p,'信息','{{ingredients}}\n\n{{instructions}}\n\n{{manufacturer}}',m,m+fs*2.8,w,h*.72,Math.max(1.2,fs*.72)),text(p,'货号','SKU / {{sku}}',m,p.h*.82,w,fs*1.3,Math.max(1.1,fs*.65)));}
  else {const fs=Math.min(4,w/12,h/9);next.elements.push(text(p,'侧面品牌','{{brand}}',m,m,w,fs*2,fs,{bold:true,color:preset.accent}),text(p,'侧面信息','{{product}}\nSKU / {{sku}}',m,p.h*.45,w,h*.35,Math.max(1.1,fs*.7)));}
 }
 next.projectName=String(title||preset.name+' / '+Math.round(dims.length)+'mm 系列').slice(0,120);next.designPresetV71=preset.id;next.brandSeriesV79={name:preset.series,sku:preset.sku,variant:preset.variant};next.editorTab='Design';next.hiddenGroups={};next.lockedGroups={dieline:true};next.selectedIds=[];next.selectedId=next.elements.find(e=>e.type==='text')?.id;for(const k of ['reviewV35','linkedV49','foldAuthoringV50','foldSequenceV51'])delete next[k];return next;
}
