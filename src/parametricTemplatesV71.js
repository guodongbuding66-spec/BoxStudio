import {resolveBoxDimensionsV32} from './parametricTemplatesV32.js';

const records=[
 ['glued-tray','tray','粘角托盘','Glued corner tray'],
 ['double-wall-tray','tray','四边双壁托盘','Four sided double wall tray'],
 ['roll-end-tray','tray','双边卷折托盘','Two sided roll end tray'],
 ['display-tray','display','高背展示托盘','High back display tray'],
 ['hinged-tray','mailer','翻盖粘角盒','Hinged lid glued tray'],
 ['lid-base-box','rigid','天地盖折叠盒','Two piece folding lid and base'],
 ['drawer-box','sleeve','抽屉套盒','Sliding drawer with folding sleeve'],
 ['partition-tray','tray','分隔托盘','Tray with removable divider'],
 ['wrap-mailer','mailer','环绕封合邮寄盒','Wrap around mailer'],
 ['four-flap-folder','mailer','四翼包裹盒','Four flap wrap folder'],
 ['self-lock-tray','tray','插舌锁角托盘','Slotted corner locking tray'],
 ['shoulder-tray','tray','双层内衬托盘','Tray with separate inner collar'],
];
export const V71_TEMPLATE_CATALOG=Object.freeze(records.map(([id,category,nameZh,name])=>({id,category,nameZh,name,standard:'CUSTOM',code:id.toUpperCase(),engine:id,status:'engineering-core',parameters:['length','width','height','thickness','glue'],tags:[id,name,nameZh,category]})));
export const V71_TEMPLATE_DEFAULTS=Object.freeze(Object.fromEntries(records.map(([id])=>[id,{template:id,sizeType:'internal',length:240,width:160,height:50,thickness:.5,materialId:'sbs-paperboard',flute:'CUSTOM',layers:1,glue:18,bleed:3,safe:5,compensation:true,tolerance:1,cornerRadius:0,flapTaper:0,relief:0,notch:0,shoulder:0}])));
export const isV71EngineTemplate=id=>Object.hasOwn(V71_TEMPLATE_DEFAULTS,id);
export const templateCatalogByIdV71=id=>V71_TEMPLATE_CATALOG.find(t=>t.id===id)||null;
export function searchTemplateCatalogV71({query='',category='all',standard='all'}={}){const q=String(query).trim().toLowerCase();return V71_TEMPLATE_CATALOG.filter(t=>(category==='all'||t.category===category)&&(standard==='all'||t.standard===standard)&&(!q||[t.id,t.name,t.nameZh,...t.tags].join(' ').toLowerCase().includes(q)));}
const rect=(id,label,x,y,w,h,parent=null,kind='panel')=>({id,label,x,y,w,h,parent,kind,role:id.split('-').at(-1)});
const seg=(x1,y1,x2,y2,type)=>({x1,y1,x2,y2,type});
const near=(a,b)=>Math.abs(a-b)<1e-6;

// Split collinear boundaries before identifying shared folds. No CUT is emitted
// through a shared hinge, including short corner tabs and return walls.
export function panelBoundaryLinesV71(panels){
 const edges=panels.flatMap(p=>[
  {axis:'h',c:p.y,a:p.x,b:p.x+p.w}, {axis:'h',c:p.y+p.h,a:p.x,b:p.x+p.w},
  {axis:'v',c:p.x,a:p.y,b:p.y+p.h}, {axis:'v',c:p.x+p.w,a:p.y,b:p.y+p.h},
 ]),groups=[];
 for(const e of edges){let g=groups.find(g=>g.axis===e.axis&&near(g.c,e.c));if(!g){g={axis:e.axis,c:e.c,edges:[]};groups.push(g);}g.edges.push(e);}
 const cutLines=[],creaseLines=[];
 for(const g of groups){const breaks=[...new Set(g.edges.flatMap(e=>[e.a,e.b]))].sort((a,b)=>a-b);for(let i=1;i<breaks.length;i++){const a=breaks[i-1],b=breaks[i],m=(a+b)/2,count=g.edges.filter(e=>m>e.a-1e-7&&m<e.b+1e-7).length;if(!count||b-a<1e-7)continue;const type=count===1?'CUT':'CREASE',l=g.axis==='h'?seg(a,g.c,b,g.c,type):seg(g.c,a,g.c,b,type);(type==='CUT'?cutLines:creaseLines).push(l);}}
 return{cutLines,creaseLines};
}

function tray({prefix='',x,y,L,W,H,frontH=H,backH=H,tabs=true,returns=[],glue=18}){
 const id=s=>prefix+s,base=rect(id('base'),'BASE',x,y,L,W),panels=[base,
  rect(id('front'),'FRONT',x,y+W,L,frontH,base.id),rect(id('back'),'BACK',x,y-backH,L,backH,base.id),
  rect(id('left'),'LEFT',x-H,y,H,W,base.id),rect(id('right'),'RIGHT',x+L,y,H,W,base.id)];
 if(tabs){const d=Math.max(2,Math.min(glue,H*.65,W*.22,L*.12));for(const wall of ['front','back']){const p=panels.find(p=>p.id===id(wall));panels.push(rect(id(wall+'-left-tab'),'CORNER GLUE',x-d,p.y,d,p.h,p.id,'glue'),rect(id(wall+'-right-tab'),'CORNER GLUE',x+L,p.y,d,p.h,p.id,'glue'));}}
 for(const wall of returns){const p=panels.find(p=>p.id===id(wall));const horizontal=['front','back'].includes(wall),depth=horizontal?p.h:p.w;const r=rect(id(wall+'-return'),'RETURN WALL',wall==='left'?p.x-depth:wall==='right'?p.x+p.w:p.x,wall==='back'?p.y-depth:wall==='front'?p.y+p.h:p.y,horizontal?p.w:depth,horizontal?depth:p.h,p.id,'flap');panels.push(r);}
 return{panels,base};
}
function sleeve({prefix,x,y,L,W,H,glue=18}){
 const specs=[['base',L],['right',H],['top',L],['left',H],['glue',Math.min(glue,L*.25)]];let px=x,prev=null;
 const panels=specs.map(([name,w])=>{const p=rect(prefix+name,name.toUpperCase(),px,y,w,W,prev,name==='glue'?'glue':'panel');px+=w;prev=p.id;return p;});return{panels,base:panels[0]};
}

export function generateAdditionalTemplateV71(input={}){
 if(!isV71EngineTemplate(input.template))return null;
 const s={...V71_TEMPLATE_DEFAULTS[input.template],...input},dims=resolveBoxDimensionsV32(s,{L:1,W:1,H:1}),{L,W,H}=dims.manufacturing,T=dims.T,id=s.template,pad=18;
 const t=tray({x:pad+3*H,y:pad+3*H+W,L,W,H,glue:s.glue,tabs:!['double-wall-tray','roll-end-tray','wrap-mailer','four-flap-folder'].includes(id),frontH:id==='display-tray'?H*.6:H,backH:id==='display-tray'?H*2:H,returns:id==='double-wall-tray'?['front','back','left','right']:id==='roll-end-tray'?['left','right']:[]});
 const panels=[...t.panels],components=[{root:'base'}];let perfLines=[],glueLines=[];
 if(id==='hinged-tray'||id==='wrap-mailer'){
  const back=panels.find(p=>p.id==='back'),lid=rect('lid','LID',back.x,back.y-W,L,W,'back'),tuck=rect('lid-tuck','LID TUCK',lid.x,lid.y-Math.min(H,W*.35),L,Math.min(H,W*.35),'lid','flap');panels.push(lid,tuck);
  if(id==='wrap-mailer'){for(const name of ['left','right']){const p=panels.find(p=>p.id===name),d=Math.min(L*.55,W);panels.push(rect(name+'-wrap','WRAP WING',name==='left'?p.x-d:p.x+p.w,p.y,d,W,p.id,'flap'));}}
 }
 if(id==='four-flap-folder'){
  for(const name of ['front','back','left','right']){const p=panels.find(p=>p.id===name),horizontal=['front','back'].includes(name),d=(horizontal?W:L)*.55;panels.push(rect(name+'-cover','COVER FLAP',name==='left'?p.x-d:name==='right'?p.x+p.w:p.x,name==='back'?p.y-d:name==='front'?p.y+p.h:p.y,horizontal?L:d,horizontal?d:W,p.id,'flap'));}
 }
 const currentRight=()=>Math.max(...panels.map(p=>p.x+p.w));
 const pose=(base,z=0,rotationX=0,dy=0)=>({target:[t.base.x+t.base.w/2,t.base.y+t.base.h/2+dy,z],rotationX,flatCenter:[base.x+base.w/2,base.y+base.h/2]});
 if(id==='lid-base-box'){
  const gap=4*T+1,lid=tray({prefix:'lid-',x:currentRight()+pad*2+H,y:t.base.y,L:L+gap,W:W+gap,H:Math.min(H*.6,Math.min(L,W)*.25),tabs:true});panels.push(...lid.panels);components.push({root:lid.base.id,assembly:pose(lid.base,H+2*T,180)});
 }
 if(id==='shoulder-tray'){const inner=tray({prefix:'inner-',x:currentRight()+pad*2+H,y:t.base.y,L:Math.max(25,L-4*T-1),W:Math.max(20,W-4*T-1),H:Math.max(15,H*.6),glue:s.glue});panels.push(...inner.panels);components.push({root:inner.base.id,assembly:pose(inner.base,T)});}
 if(id==='drawer-box'){
  const clearance=2*T+1,collar=sleeve({prefix:'sleeve-',x:currentRight()+pad*2,y:t.base.y,L:L+clearance,W:id==='drawer-box'?W+clearance:Math.max(15,H*.6),H:id==='drawer-box'?H+clearance:W+clearance,glue:Math.max(10,s.glue)});panels.push(...collar.panels);
  components.push({root:collar.base.id,assembly:pose(collar.base,id==='drawer-box'?-T:Math.min(H*.2,5),id==='drawer-box'?0:90,id==='drawer-box'?0:-W/2)});
 }
 if(id==='partition-tray'){
  const p=rect('divider','REMOVABLE DIVIDER',currentRight()+pad*2,t.base.y,L,Math.max(15,H-T));panels.push(p);components.push({root:p.id,assembly:pose(p,H/2,90)});
 }
 if(id==='self-lock-tray'){
  for(const p of panels.filter(p=>p.kind==='glue')){p.kind='flap';p.label='LOCKING TONGUE';}
  // Integral corner tongues and receiving slots, kept as semantic slot cuts.
  const d=Math.min(H*.4,W*.12,L*.1);for(const name of ['left','right']){const p=panels.find(p=>p.id===name);for(const yy of [p.y+d,p.y+p.h-d])perfLines.push(seg(p.x+p.w*.5,yy-d*.4,p.x+p.w*.5,yy+d*.4,'CUT'));}
 }
 const minX=Math.min(...panels.map(p=>p.x)),minY=Math.min(...panels.map(p=>p.y)),dx=pad-minX,dy=pad-minY;
 for(const p of panels){p.x+=dx;p.y+=dy;}
 for(const c of components)if(c.assembly){c.assembly.target[0]+=dx;c.assembly.target[1]+=dy;c.assembly.flatCenter[0]+=dx;c.assembly.flatCenter[1]+=dy;}
 for(const l of perfLines){l.x1+=dx;l.x2+=dx;l.y1+=dy;l.y2+=dy;}
 const boundary=panelBoundaryLinesV71(panels);boundary.cutLines.push(...perfLines);
 for(const p of panels.filter(p=>p.kind==='glue'))glueLines.push(seg(p.x+p.w/2,p.y+2,p.x+p.w/2,p.y+p.h-2,'GLUE'));
 return{template:id,structure:s,manufacturing:{...dims.manufacturing,T,glue:s.glue},dimensionSet:dims,width:Math.max(...panels.map(p=>p.x+p.w))+pad,height:Math.max(...panels.map(p=>p.y+p.h))+pad,margin:pad,flap:0,bodyY:0,bodyBottom:0,panels,bodyPanels:panels.filter(p=>p.kind==='panel'),flapPanels:panels.filter(p=>p.kind!=='panel'),panelMap:Object.fromEntries(panels.map(p=>[p.id,p])),...boundary,perfLines:[],glueLines,foldRoot:'base',components,documentTitle:templateCatalogByIdV71(id).nameZh,validationState:'engineering-core-pending-real-sample',engineeringNotes:['Custom parametric structure. Caliper and assembly clearance are included. Factory sample, glue/lock behavior and tooling acceptance remain required.']};
}
