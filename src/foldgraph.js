import { generateGeometry } from './geometry.js';

const PI = Math.PI;

function pose(pos=[0,0,0], rot=[0,0,0]) { return {pos,rot}; }
function node(id,label,w,h,flat,folded,extra={}) { return {id,label,w,h,flat,folded,...extra}; }

function flatPoseFromPanel(panel, geo) {
  const cx = panel.x + panel.w/2 - geo.width/2;
  const cy = -(panel.y + panel.h/2 - geo.height/2);
  return pose([cx,cy,0],[0,0,0]);
}

function rscGraph(geo) {
  const {L,W,H} = geo.manufacturing;
  const nodes=[];
  const p=geo.panelMap;
  const add=(id,w,h,folded,extra={})=>{
    if(!p[id]) return;
    nodes.push(node(id,p[id].label,w,h,flatPoseFromPanel(p[id],geo),folded,extra));
  };
  add('front',L,H,pose([0,0,W/2],[0,0,0]),{role:'front',artPanel:'front'});
  add('back',L,H,pose([0,0,-W/2],[0,PI,0]),{role:'back',artPanel:'back'});
  add('left',W,H,pose([-L/2,0,0],[0,-PI/2,0]),{role:'side',artPanel:'left'});
  add('right',W,H,pose([L/2,0,0],[0,PI/2,0]),{role:'side',artPanel:'right'});
  if(p.glue) add('glue',Math.max(1,p.glue.w),H,pose([-L/2-1,0,-W*.25],[0,-PI/2,0]),{role:'glue',opacity:.45});

  const topY=H/2, bottomY=-H/2;
  add('top-front',L,geo.flap,pose([0,topY,W/4],[-PI/2,0,0]),{role:'flap'});
  add('top-back',L,geo.flap,pose([0,topY,-W/4],[PI/2,0,0]),{role:'flap'});
  add('top-left',W,geo.flap,pose([-L/4,topY,0],[-PI/2,0,PI/2]),{role:'flap'});
  add('top-right',W,geo.flap,pose([L/4,topY,0],[-PI/2,0,-PI/2]),{role:'flap'});
  add('bottom-front',L,geo.flap,pose([0,bottomY,W/4],[PI/2,0,0]),{role:'flap'});
  add('bottom-back',L,geo.flap,pose([0,bottomY,-W/4],[-PI/2,0,0]),{role:'flap'});
  add('bottom-left',W,geo.flap,pose([-L/4,bottomY,0],[PI/2,0,PI/2]),{role:'flap'});
  add('bottom-right',W,geo.flap,pose([L/4,bottomY,0],[PI/2,0,-PI/2]),{role:'flap'});

  const ids=new Set(nodes.map(n=>n.id));
  const edges=[
    ['front','right','RIGHT VERTICAL',90],['right','back','BACK VERTICAL',90],['front','left','LEFT VERTICAL',-90],
    ['front','top-front','TOP FRONT',90],['back','top-back','TOP BACK',90],['left','top-left','TOP LEFT',90],['right','top-right','TOP RIGHT',90],
    ['front','bottom-front','BOTTOM FRONT',-90],['back','bottom-back','BOTTOM BACK',-90],['left','bottom-left','BOTTOM LEFT',-90],['right','bottom-right','BOTTOM RIGHT',-90]
  ].filter(([from,to])=>ids.has(from)&&ids.has(to)).map(([from,to,label,angle])=>({from,to,label,angle}));
  return {template:'side-seal-rsc',root:'front',nodes,edges};
}

function importedGraph(geo){
  // V0.46: imported semantic topology must reach 3D without silently dropping flap/glue/auxiliary panels.
  const importedPanels=(geo.panels?.length?geo.panels:geo.bodyPanels)||[];
  const nodes=importedPanels.map(p=>node(p.id,p.label,p.w,p.h,flatPoseFromPanel(p,geo),flatPoseFromPanel(p,geo),{role:p.role||p.kind||'imported',artPanel:p.id,kind:p.kind||'panel',points:p.points?structuredClone(p.points):null}));
  const ids=new Set(nodes.map(n=>n.id)),root=(ids.has(geo.foldRoot)?geo.foldRoot:nodes[0]?.id)||'artboard';
  const candidates=(geo.foldCandidates||[]).filter(c=>c.confirmed&&ids.has(c.a)&&ids.has(c.b));
  const adj=new Map(nodes.map(n=>[n.id,[]]));
  for(const c of candidates){adj.get(c.a)?.push({to:c.b,c,dir:1});adj.get(c.b)?.push({to:c.a,c,dir:-1})}
  const edges=[],seen=new Set([root]),q=[root];
  while(q.length){const from=q.shift();for(const item of adj.get(from)||[]){if(seen.has(item.to))continue;seen.add(item.to);q.push(item.to);const angle=(Number(item.c.angle)||90)*(item.dir===1?1:-1);edges.push({from,to:item.to,label:item.c.id||`${from}/${item.to}`,angle,hinge:item.c.hinge,confirmed:true})}}
  return {template:'imported',root,nodes,edges,unreached:nodes.filter(n=>!seen.has(n.id)).map(n=>n.id)};
}

function mailerGraph(geo) {
  const s=geo.structure, L=s.length,W=s.width,H=s.height;
  const p=geo.panelMap;
  const nodes=[];
  const add=(id,w,h,folded,extra={})=>{
    if(!p[id]) return;
    nodes.push(node(id,p[id].label,w,h,flatPoseFromPanel(p[id],geo),folded,extra));
  };
  add('base',L,W,pose([0,-H/2,0],[-PI/2,0,0]),{role:'base',artPanel:'base'});
  add('front',L,H,pose([0,0,W/2],[0,0,0]),{role:'front',artPanel:'front'});
  add('back',L,H,pose([0,0,-W/2],[0,PI,0]),{role:'back',artPanel:'back'});
  add('left',W,H,pose([-L/2,0,0],[0,-PI/2,0]),{role:'side',artPanel:'left'});
  add('right',W,H,pose([L/2,0,0],[0,PI/2,0]),{role:'side',artPanel:'right'});
  add('lid',L,W,pose([0,H/2,0],[-PI/2,0,0]),{role:'lid',artPanel:'lid'});
  add('lid-tuck',L,H,pose([0,0,W/2+1],[0,0,0]),{role:'tuck',artPanel:'lid-tuck',opacity:.86});
  add('left-wing',Math.max(H,p['left-wing']?.w||H),W,pose([-L/2+H*.2,0,-H*.15],[0,-PI/2,0]),{role:'lock-wing',opacity:.55});
  add('right-wing',Math.max(H,p['right-wing']?.w||H),W,pose([L/2-H*.2,0,-H*.15],[0,PI/2,0]),{role:'lock-wing',opacity:.55});
  add('lid-left',W,H,pose([-L/2+H/2,H/2,0],[-PI/2,0,PI/2]),{role:'lid-side-flap',opacity:.62});
  add('lid-right',W,H,pose([L/2-H/2,H/2,0],[-PI/2,0,-PI/2]),{role:'lid-side-flap',opacity:.62});
  add('back-left-tab',H,H,pose([-L/2+H/2,0,-W/2+H/2],[0,-PI/2,0]),{role:'tab',opacity:.5});
  add('back-right-tab',H,H,pose([L/2-H/2,0,-W/2+H/2],[0,PI/2,0]),{role:'tab',opacity:.5});
  add('front-left-tab',H,H,pose([-L/2+H/2,0,W/2-H/2],[0,-PI/2,0]),{role:'tab',opacity:.5});
  add('front-right-tab',H,H,pose([L/2-H/2,0,W/2-H/2],[0,PI/2,0]),{role:'tab',opacity:.5});

  const edges=[
    ['base','back','BASE/BACK',90],['base','front','BASE/FRONT',-90],['base','left','BASE/LEFT',90],['base','right','BASE/RIGHT',-90],
    ['back','lid','BACK/LID',90],['lid','lid-tuck','LID/TUCK',90],['left','left-wing','LEFT/LOCK',90],['right','right-wing','RIGHT/LOCK',-90],
    ['lid','lid-left','LID/LEFT FLAP',90],['lid','lid-right','LID/RIGHT FLAP',-90],
    ['back','back-left-tab','BACK/L TAB',90],['back','back-right-tab','BACK/R TAB',-90],['front','front-left-tab','FRONT/L TAB',90],['front','front-right-tab','FRONT/R TAB',-90]
  ].map(([from,to,label,angle])=>({from,to,label,angle}));
  return {template:'mailer-150010',root:'base',nodes,edges};
}

function near(a,b,tol=0.01){return Math.abs(a-b)<=tol}
function exactSharedHinge(a,b){
  if(!a||!b)return null;
  const ay1=a.y,ay2=a.y+a.h,by1=b.y,by2=b.y+b.h,ax1=a.x,ax2=a.x+a.w,bx1=b.x,bx2=b.x+b.w;
  if(near(ax2,bx1)||near(bx2,ax1)){
    const x=near(ax2,bx1)?ax2:ax1,y1=Math.max(ay1,by1),y2=Math.min(ay2,by2);
    if(y2-y1>.01)return{x1:x,y1,x2:x,y2,orientation:'vertical'};
  }
  if(near(ay2,by1)||near(by2,ay1)){
    const y=near(ay2,by1)?ay2:ay1,x1=Math.max(ax1,bx1),x2=Math.min(ax2,bx2);
    if(x2-x1>.01)return{x1,y1:y,x2,y2:y,orientation:'horizontal'};
  }
  return null;
}
function sharedHinge(a,b){
  const exact=exactSharedHinge(a,b);if(exact)return exact;if(!a||!b)return null;
  const ay1=a.y,ay2=a.y+a.h,by1=b.y,by2=b.y+b.h,ax1=a.x,ax2=a.x+a.w,bx1=b.x,bx2=b.x+b.w;
  const acx=ax1+a.w/2,acy=ay1+a.h/2,bcx=bx1+b.w/2,bcy=by1+b.h/2;
  if(Math.abs(bcx-acx)>Math.abs(bcy-acy)){
    const x=bcx>acx?bx1:bx2;return{x1:x,y1:by1,x2:x,y2:by2,orientation:'vertical',fallback:true};
  }
  const y=bcy>acy?by1:by2;return{x1:bx1,y1:y,x2:bx2,y2:y,orientation:'horizontal',fallback:true};
}
function lineCoversHinge(line,hinge,tol=.02){
  if(!line||!hinge)return false;
  if(hinge.orientation==='vertical'){
    if(!near(line.x1,line.x2,tol)||!near(line.x1,hinge.x1,tol))return false;
    const a1=Math.min(line.y1,line.y2),a2=Math.max(line.y1,line.y2),b1=Math.min(hinge.y1,hinge.y2),b2=Math.max(hinge.y1,hinge.y2);return Math.min(a2,b2)-Math.max(a1,b1)>.01;
  }
  if(!near(line.y1,line.y2,tol)||!near(line.y1,hinge.y1,tol))return false;
  const a1=Math.min(line.x1,line.x2),a2=Math.max(line.x1,line.x2),b1=Math.min(hinge.x1,hinge.x2),b2=Math.max(hinge.x1,hinge.x2);return Math.min(a2,b2)-Math.max(a1,b1)>.01;
}
function panelDistance(a,b){
  const ax=a.x+a.w/2,ay=a.y+a.h/2,bx=b.x+b.w/2,by=b.y+b.h/2;return Math.hypot(ax-bx,ay-by);
}
function foldAngle(parent,child,hinge){
  const pcx=parent.x+parent.w/2,pcy=parent.y+parent.h/2,ccx=child.x+child.w/2,ccy=child.y+child.h/2;
  if(hinge?.orientation==='vertical')return ccx<pcx?-90:90;
  return ccy<pcy?90:-90;
}
function semanticParametricGraph(geo){
  const panels=(geo.panels?.length?geo.panels:[...(geo.bodyPanels||[]),...(geo.flapPanels||[])])||[],panelMap=new Map(panels.map(p=>[p.id,p]));
  const nodes=panels.map(p=>node(p.id,p.label||p.id,p.w,p.h,flatPoseFromPanel(p,geo),flatPoseFromPanel(p,geo),{role:p.role||p.kind||'panel',artPanel:p.id,kind:p.kind||'panel',points:p.points?structuredClone(p.points):null}));
  if(!nodes.length)return{template:geo.template,root:null,nodes:[],edges:[],unreached:[]};
  const root=panelMap.has(geo.foldRoot)?geo.foldRoot:(panelMap.has('front')?'front':nodes[0].id),creases=geo.creaseLines||[],candidates=[];
  for(const p of panels){if(p.parent&&panelMap.has(p.parent)){const parent=panelMap.get(p.parent),hinge=exactSharedHinge(parent,p)||sharedHinge(parent,p);candidates.push({a:p.parent,b:p.id,hinge,priority:0,distance:panelDistance(parent,p),source:'parent'})}}
  for(let i=0;i<panels.length;i++)for(let j=i+1;j<panels.length;j++){
    const a=panels[i],b=panels[j];if(a.parent===b.id||b.parent===a.id)continue;const hinge=exactSharedHinge(a,b);if(!hinge||!creases.some(l=>lineCoversHinge(l,hinge)))continue;candidates.push({a:a.id,b:b.id,hinge,priority:1,distance:panelDistance(a,b),source:'crease'});
  }
  const seen=new Set([root]),edges=[];
  while(seen.size<panels.length){
    let choices=candidates.filter(c=>(seen.has(c.a)&&!seen.has(c.b))||(seen.has(c.b)&&!seen.has(c.a))).sort((x,y)=>x.priority-y.priority||x.distance-y.distance),choice=choices[0];
    if(!choice){
      let best=null;for(const aId of seen){const a=panelMap.get(aId);for(const b of panels){if(seen.has(b.id))continue;const distance=panelDistance(a,b);if(!best||distance<best.distance)best={a:aId,b:b.id,hinge:sharedHinge(a,b),priority:9,distance,source:'fallback'}}}choice=best;
    }
    if(!choice)break;
    const from=seen.has(choice.a)?choice.a:choice.b,to=from===choice.a?choice.b:choice.a,parent=panelMap.get(from),child=panelMap.get(to),hinge=choice.hinge||sharedHinge(parent,child);
    if(!parent||!child||!hinge)break;
    edges.push({from,to,label:`${from}/${to}`,angle:foldAngle(parent,child,hinge),hinge:{...hinge,fallback:Boolean(hinge.fallback||choice.source==='fallback')},confirmed:true,source:choice.source});seen.add(to);
  }
  return{template:geo.template,root,nodes,edges,unreached:nodes.filter(n=>!seen.has(n.id)).map(n=>n.id),semantic:true};
}
function attachHinges(graph,geo){
  const ids=new Set((graph.nodes||[]).map(n=>n.id));
  return {...graph,edges:(graph.edges||[]).filter(e=>ids.has(e.from)&&ids.has(e.to)).map(e=>({...e,hinge:e.hinge||sharedHinge(geo.panelMap[e.from],geo.panelMap[e.to])}))};
}

export function buildFoldGraph(input) {
  const geo = input?.panelMap ? input : generateGeometry(input);
  const graph = geo.template === 'imported' ? importedGraph(geo)
    : geo.template === 'mailer-150010' ? mailerGraph(geo)
    : geo.template === 'side-seal-rsc' ? rscGraph(geo)
    : semanticParametricGraph(geo);
  return attachHinges(graph,geo);
}

export function graphStats(graph){
  return {panels:graph.nodes.length, hinges:graph.edges.length, root:graph.root};
}
