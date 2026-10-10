import {resolveBoxDimensionsV32} from './parametricTemplatesV32.js';
import {panelBoundaryLinesV71} from './parametricTemplatesV71.js';
const rows=[['roll-lock-mailer','mailer','纸厚补偿卷边翻盖盒'],['roll-lock-tray','tray','纸厚补偿双壁托盘']];
export const V78_TEMPLATE_CATALOG=rows.map(([id,category,nameZh])=>({id,category,nameZh,name:id.replaceAll('-',' '),standard:'CUSTOM',code:id.toUpperCase(),engine:id,status:'engineering-core',parameters:['length','width','height','thickness'],tags:[id,nameZh,'双壁','卷边','纸厚']}));
export const V78_TEMPLATE_DEFAULTS=Object.fromEntries(rows.map(([id])=>[id,{template:id,sizeType:'internal',length:250,width:180,height:55,thickness:1.5,materialId:'corrugated-kraft',flute:'E',layers:3,glue:0,bleed:3,safe:5,compensation:true,tolerance:1,cornerRadius:0,flapTaper:0,relief:0,notch:0,shoulder:0}]));
export const isV78EngineTemplate=id=>Object.hasOwn(V78_TEMPLATE_DEFAULTS,id);
export const templateCatalogByIdV78=id=>V78_TEMPLATE_CATALOG.find(r=>r.id===id)||null;
export function searchTemplateCatalogV78({query='',category='all',standard='all'}={}){const q=query.trim().toLowerCase();return V78_TEMPLATE_CATALOG.filter(r=>(category==='all'||r.category===category)&&(standard==='all'||r.standard===standard)&&[r.id,r.nameZh,...r.tags].join(' ').toLowerCase().includes(q));}
export function generateAdditionalTemplateV78(input){
 const s={...V78_TEMPLATE_DEFAULTS[input.template],...input},dims=resolveBoxDimensionsV32(s,{L:1,W:1,H:1}),{L,W,H}=dims.manufacturing,T=dims.T,pad=18;
 if(H<=2*T||L<=2*H+4*T||W<=4*T)throw new Error('卷边结构需要盒长大于两倍盒高，且盒高大于两倍纸厚。');
 const x=pad+2*H+20,y=pad+H+W+Math.min(H,W*.3),panels=[];
 const add=(id,label,x,y,w,h,parent=null,kind='panel',angle)=>{const p={id,label,x,y,w,h,parent,kind,role:id,foldAngleV78:angle};panels.push(p);return p;};
 const base=add('base','盒底',x,y,L,W);
 add('front','前壁',x+T/2,y+W,L-T,H,'base');const back=add('back','后壁',x+T/2,y-H,L-T,H,'base');
 for(const side of ['left','right']){
  const left=side==='left',wall=add(side,left?'左外壁':'右外壁',left?x-H:x+L,y,H,W,'base'),outer=left?wall.x:wall.x+wall.w;
  const spine=add(side+'-spine','纸厚桥',left?outer-T:outer,y,T,W,wall.id,'flap');
  const inner=add(side+'-inner-wall','卷折内壁',left?spine.x-(H-T):spine.x+T,y,H-T,W,spine.id,'flap');
  const foot=Math.min(10,(L-2*T)*.08);add(side+'-floor-lock','内壁锁脚',left?inner.x-foot:inner.x+inner.w,y,foot,W,inner.id,'flap',left?90:-90);
 }
 // Corner ears are trapped between the outer and inner side walls.
 const ear=Math.min(H*.7,L*.1);for(const wall of ['front','back']){const p=panels.find(p=>p.id===wall);add(wall+'-left-tab','左角耳',p.x-ear,p.y,ear,H,p.id,'flap');add(wall+'-right-tab','右角耳',p.x+p.w,p.y,ear,H,p.id,'flap');}
 if(s.template==='roll-lock-mailer'){
  const lid=add('lid','盖板',x+T,back.y-W,L-2*T,W,'back');const tuck=Math.min(H*.8,W*.3);add('lid-tuck','插舌',lid.x,lid.y-tuck,lid.w,tuck,'lid','flap');
  const wing=Math.min(H*.8,L*.18);add('lid-left','左盖翼',lid.x-wing,lid.y,wing,W,'lid','flap');add('lid-right','右盖翼',lid.x+lid.w,lid.y,wing,W,'lid','flap');
 }
 const dx=pad-Math.min(...panels.map(p=>p.x)),dy=pad-Math.min(...panels.map(p=>p.y));for(const p of panels){p.x+=dx;p.y+=dy;}
 const boundary=panelBoundaryLinesV71(panels);
 return{template:s.template,structure:s,manufacturing:{...dims.manufacturing,T,glue:0},dimensionSet:dims,width:Math.max(...panels.map(p=>p.x+p.w))+pad,height:Math.max(...panels.map(p=>p.y+p.h))+pad,margin:pad,flap:0,bodyY:base.y,bodyBottom:base.y+base.h,panels,bodyPanels:panels.filter(p=>p.kind==='panel'),flapPanels:panels.filter(p=>p.kind!=='panel'),panelMap:Object.fromEntries(panels.map(p=>[p.id,p])),...boundary,perfLines:[],glueLines:[],foldRoot:'base',components:[{root:'base'}],documentTitle:templateCatalogByIdV78(s.template).nameZh,validationState:'engineering-core-pending-real-sample',engineeringNotes:['The caliper bridge and three connected 90-degree hinges offset the inner walls by the real paper thickness. Lock tongues are physical panels. Factory sampling is required.']};
}
