import { buildArtworkAtlas, renderPanelArtworkCanvas } from './panelArtwork.js';

function num(v,d=0){const n=Number(v);return Number.isFinite(n)?n:d}
function clone(v){return structuredClone(v)}
function area2(a,b,c){return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])}
function polygonArea(points=[]){let a=0;for(let i=0;i<points.length;i++){const p=points[i],q=points[(i+1)%points.length];a+=p[0]*q[1]-q[0]*p[1]}return a/2}
function pointInTriangle(p,a,b,c,eps=1e-9){const s1=area2(p,a,b),s2=area2(p,b,c),s3=area2(p,c,a),hasNeg=s1<-eps||s2<-eps||s3<-eps,hasPos=s1>eps||s2>eps||s3>eps;return !(hasNeg&&hasPos)}
function cleanPolygon(points=[]){const out=[];for(const p of points||[]){const q=[num(p?.[0]),num(p?.[1])];const prev=out[out.length-1];if(!prev||Math.hypot(q[0]-prev[0],q[1]-prev[1])>1e-8)out.push(q)}if(out.length>2&&Math.hypot(out[0][0]-out.at(-1)[0],out[0][1]-out.at(-1)[1])<1e-8)out.pop();return out}

export function triangulatePolygon(points=[]){
  const pts=cleanPolygon(points);if(pts.length<3)return{points:pts,triangles:[],fallback:false};if(pts.length===3)return{points:pts,triangles:[[0,1,2]],fallback:false};
  const orientation=polygonArea(pts)>=0?1:-1,indices=pts.map((_,i)=>i),triangles=[];let guard=0,fallback=false;
  while(indices.length>3&&guard++<pts.length*pts.length*2){let clipped=false;for(let k=0;k<indices.length;k++){const ia=indices[(k-1+indices.length)%indices.length],ib=indices[k],ic=indices[(k+1)%indices.length],a=pts[ia],b=pts[ib],c=pts[ic];if(area2(a,b,c)*orientation<=1e-9)continue;let contains=false;for(const j of indices){if(j===ia||j===ib||j===ic)continue;if(pointInTriangle(pts[j],a,b,c)){contains=true;break}}if(contains)continue;triangles.push([ia,ib,ic]);indices.splice(k,1);clipped=true;break}if(!clipped){fallback=true;break}}
  if(!fallback&&indices.length===3)triangles.push([indices[0],indices[1],indices[2]]);
  if(fallback){triangles.length=0;for(let i=1;i<pts.length-1;i++)triangles.push([0,i,i+1])}
  return{points:pts,triangles,fallback};
}

export function panelPolygon(panel){
  if(Array.isArray(panel?.points)&&panel.points.length>=3)return cleanPolygon(panel.points);
  const x=num(panel?.x),y=num(panel?.y),w=Math.max(.001,num(panel?.w,1)),h=Math.max(.001,num(panel?.h,1));return[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
}

export function panelUvForPoint(panel,point){const w=Math.max(.001,num(panel?.w,1)),h=Math.max(.001,num(panel?.h,1));return[(num(point?.[0])-num(panel?.x))/w,(num(point?.[1])-num(panel?.y))/h]}
export function panelUvMap(panel){const points=panelPolygon(panel),tri=triangulatePolygon(points),uv=tri.points.map(p=>panelUvForPoint(panel,p)),outside=uv.filter(([u,v])=>u<-.001||v<-.001||u>1.001||v>1.001).length;return{points:tri.points,uv,triangles:tri.triangles,fallback:tri.fallback,outside}}

function nodePanel(graphNode,geo){return geo?.panelMap?.[graphNode?.id]||geo?.panelMap?.[graphNode?.artPanel]||null}
function uvEdge(panel,hinge){return[panelUvForPoint(panel,[hinge.x1,hinge.y1]),panelUvForPoint(panel,[hinge.x2,hinge.y2])]}
function uvInside(uv,tol=.002){return uv.every(([u,v])=>u>=-tol&&u<=1+tol&&v>=-tol&&v<=1+tol)}

export function foldTextureSeamReport(graph,geo,{tolerance=.002}={}){
  const nodes=new Map((graph?.nodes||[]).map(n=>[n.id,n])),seams=[];let mapped=0,warnings=0,fallbackHinges=0;
  for(const edge of graph?.edges||[]){const a=nodePanel(nodes.get(edge.from),geo),b=nodePanel(nodes.get(edge.to),geo),hinge=edge.hinge;if(!a||!b||!hinge){warnings++;seams.push({from:edge.from,to:edge.to,label:edge.label||'',status:'warning',reason:'missing panel or hinge'});continue}const fromUv=uvEdge(a,hinge),toUv=uvEdge(b,hinge),inside=uvInside(fromUv,tolerance)&&uvInside(toUv,tolerance),length=Math.hypot(num(hinge.x2)-num(hinge.x1),num(hinge.y2)-num(hinge.y1)),status=inside?'mapped':'warning';if(status==='mapped')mapped++;else warnings++;if(hinge.fallback)fallbackHinges++;seams.push({from:edge.from,to:edge.to,label:edge.label||'',status,reason:inside?'hinge endpoints map into both panel UV domains':'hinge UV is outside a panel domain',length,fromUv,toUv,fallback:Boolean(hinge.fallback)})}
  return{seams,total:seams.length,mapped,warnings,fallbackHinges,ok:warnings===0};
}

export function buildTextureProofModel(state,geo,graph){
  const atlas=buildArtworkAtlas(state,geo),planMap=new Map(atlas.plans.map(p=>[p.panelId,p])),panels=[];
  for(const node of graph?.nodes||[]){const panel=nodePanel(node,geo);if(!panel)continue;const panelId=node.artPanel||node.id,uvMap=panelUvMap(panel),plan=planMap.get(panelId)||null;panels.push({nodeId:node.id,panelId,label:node.label||panelId,panel:clone(panel),uvMap,plan,artworkElements:plan?.elements||0,commands:plan?.commands?.length||0})}
  const seams=foldTextureSeamReport(graph,geo);return{atlas,panels,seams,stats:{panels:panels.length,texturedPanels:panels.filter(p=>p.commands>0).length,triangles:panels.reduce((n,p)=>n+p.uvMap.triangles.length,0),uvOutside:panels.reduce((n,p)=>n+p.uvMap.outside,0),fallbackTriangulations:panels.filter(p=>p.uvMap.fallback).length,seamWarnings:seams.warnings,artworkCommands:atlas.commandCount}};
}

const I=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
function mmul(A,B){const C=new Array(16).fill(0);for(let r=0;r<4;r++)for(let c=0;c<4;c++)for(let k=0;k<4;k++)C[r*4+c]+=A[r*4+k]*B[k*4+c];return C}
function tr(x,y,z){const m=I();m[3]=x;m[7]=y;m[11]=z;return m}
function rotAxis(ax,ay,az,a){const n=Math.hypot(ax,ay,az)||1,x=ax/n,y=ay/n,z=az/n,c=Math.cos(a),s=Math.sin(a),t=1-c;return[t*x*x+c,t*x*y-s*z,t*x*z+s*y,0,t*x*y+s*z,t*y*y+c,t*y*z-s*x,0,t*x*z-s*y,t*y*z+s*x,t*z*z+c,0,0,0,0,1]}
function applyM(m,p){const[x,y,z]=p;return[m[0]*x+m[1]*y+m[2]*z+m[3],m[4]*x+m[5]*y+m[6]*z+m[7],m[8]*x+m[9]*y+m[10]*z+m[11]]}
function rotLine(geo,h,a){const p1=[h.x1-geo.width/2,-(h.y1-geo.height/2),0],p2=[h.x2-geo.width/2,-(h.y2-geo.height/2),0],axis=[p2[0]-p1[0],p2[1]-p1[1],p2[2]-p1[2]];return mmul(mmul(tr(...p1),rotAxis(...axis,a)),tr(-p1[0],-p1[1],-p1[2]))}
function smooth(t){return t*t*(3-2*t)}

export function buildFoldTransforms(graph,geo,progress=100){const children=new Map();for(const e of graph?.edges||[]){if(!children.has(e.from))children.set(e.from,[]);children.get(e.from).push(e)}const transforms=new Map(),t=smooth(Math.max(0,Math.min(1,num(progress)/100))),visit=(id,M)=>{transforms.set(id,M);for(const e of children.get(id)||[]){const R=e.hinge?rotLine(geo,e.hinge,num(e.angle)*Math.PI/180*t):I();visit(e.to,mmul(M,R))}};if(graph?.root)visit(graph.root,I());for(const n of graph?.nodes||[])if(!transforms.has(n.id))transforms.set(n.id,I());return transforms}

function affineFromTriangles(src,dst){const[x0,y0]=src[0],[x1,y1]=src[1],[x2,y2]=src[2],[X0,Y0]=dst[0],[X1,Y1]=dst[1],[X2,Y2]=dst[2],det=x0*(y1-y2)+x1*(y2-y0)+x2*(y0-y1);if(Math.abs(det)<1e-9)return null;const a=(X0*(y1-y2)+X1*(y2-y0)+X2*(y0-y1))/det,c=(X0*(x2-x1)+X1*(x0-x2)+X2*(x1-x0))/det,e=(X0*(x1*y2-x2*y1)+X1*(x2*y0-x0*y2)+X2*(x0*y1-x1*y0))/det,b=(Y0*(y1-y2)+Y1*(y2-y0)+Y2*(y0-y1))/det,d=(Y0*(x2-x1)+Y1*(x0-x2)+Y2*(x1-x0))/det,f=(Y0*(x1*y2-x2*y1)+Y1*(x2*y0-x0*y2)+Y2*(x0*y1-x1*y0))/det;return[a,b,c,d,e,f]}
function drawTextureTriangle(ctx,image,src,dst){const m=affineFromTriangles(src,dst);if(!m)return;ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.beginPath();ctx.moveTo(...dst[0]);ctx.lineTo(...dst[1]);ctx.lineTo(...dst[2]);ctx.closePath();ctx.clip();ctx.setTransform(...m);ctx.drawImage(image,0,0);ctx.restore()}
function pointInPolygon(point,polygon=[]){let inside=false;const[x,y]=point;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const[xi,yi]=polygon[i],[xj,yj]=polygon[j],intersect=((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi||1e-9)+xi);if(intersect)inside=!inside}return inside}

export function mountArtworkProof(container,state,geo,graph,{maxTexturePixels=720,onStatus=null,selectedPanelId=null,onSelectPanel=null,materialStyle=null}={}){
  if(typeof document==='undefined')throw new Error('3D artwork proof requires a browser document.');if(!container)throw new Error('3D artwork proof container is required.');container.innerHTML='';const model=buildTextureProofModel(state,geo,graph),canvas=document.createElement('canvas');canvas.className='v17-proof-renderer';container.appendChild(canvas);const ctx=canvas.getContext('2d'),textures=new Map(),face=materialStyle?.face||'#d8c2a0',edge=materialStyle?.edge||'rgba(70,58,44,.88)',edgeWidth=Math.max(1,num(materialStyle?.edgePreviewPx,1.2));for(const panel of model.panels){if(panel.plan)textures.set(panel.nodeId,renderPanelArtworkCanvas(panel.plan,{maxPixels:maxTexturePixels,background:face}))}
  let progress=num(state?.foldProgress,100),yaw=.55,pitch=-.34,zoom=1,drag=false,lx=0,ly=0,downX=0,downY=0,moved=false,disposed=false,lastDraw=[],selected=selectedPanelId;onStatus?.({mode:'software-texture-3d',...model.stats});
  const view=p=>{let[x,y,z]=p;const cy=Math.cos(yaw),sy=Math.sin(yaw),cx=Math.cos(pitch),sx=Math.sin(pitch),x1=cy*x+sy*z,z1=-sy*x+cy*z,y1=cx*y-sx*z1,z2=sx*y+cx*z1;return[x1,y1,z2]};
  function paint(){if(disposed)return;const d=Math.min(globalThis.devicePixelRatio||1,2),w=canvas.width/d,h=canvas.height/d;ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,w,h);ctx.fillStyle='#181b20';ctx.fillRect(0,0,w,h);const transforms=buildFoldTransforms(graph,geo,progress),base=Math.min(w,h)*.72/Math.max(100,Math.max(geo.width,geo.height)),cam=Math.max(500,Math.max(geo.width,geo.height)*1.35),draw=[];
    for(const item of model.panels){const M=transforms.get(item.nodeId)||I(),world=item.uvMap.points.map(q=>view(applyM(M,[q[0]-geo.width/2,-(q[1]-geo.height/2),0]))),projected=world.map(q=>{const k=cam/(cam-q[2]);return[w/2+q[0]*base*zoom*k,h/2-q[1]*base*zoom*k]}),z=world.reduce((a,q)=>a+q[2],0)/Math.max(1,world.length);draw.push({item,projected,z})}
    draw.sort((a,b)=>a.z-b.z);lastDraw=draw;for(const entry of draw){const item=entry.item,texture=textures.get(item.nodeId),uv=item.uvMap.uv,pts=entry.projected;if(texture){for(const tri of item.uvMap.triangles){const src=tri.map(i=>[uv[i][0]*texture.width,uv[i][1]*texture.height]),dst=tri.map(i=>pts[i]);drawTextureTriangle(ctx,texture,src,dst)}}else{ctx.beginPath();pts.forEach((q,i)=>i?ctx.lineTo(...q):ctx.moveTo(...q));ctx.closePath();ctx.fillStyle=face;ctx.fill()}
      ctx.setTransform(d,0,0,d,0,0);ctx.beginPath();pts.forEach((q,i)=>i?ctx.lineTo(...q):ctx.moveTo(...q));ctx.closePath();const isSelected=item.panelId===selected;ctx.strokeStyle=isSelected?'#52a8ff':(item.uvMap.fallback?'#e6a23c':edge);ctx.lineWidth=isSelected?Math.max(3,edgeWidth+1.5):(item.uvMap.fallback?Math.max(2,edgeWidth):edgeWidth);ctx.stroke();if(isSelected){ctx.save();ctx.globalAlpha=.12;ctx.fillStyle='#52a8ff';ctx.fill();ctx.restore()}}
  }
  const resize=()=>{const r=container.getBoundingClientRect(),d=Math.min(globalThis.devicePixelRatio||1,2),w=Math.max(360,Math.floor(r.width||720)),h=Math.max(320,Math.floor(r.height||500));canvas.width=w*d;canvas.height=h*d;canvas.style.width=`${w}px`;canvas.style.height=`${h}px`;paint()};
  const down=e=>{drag=true;lx=e.clientX;ly=e.clientY;downX=e.clientX;downY=e.clientY;moved=false;try{canvas.setPointerCapture?.(e.pointerId)}catch{}},move=e=>{if(!drag)return;if(Math.hypot(e.clientX-downX,e.clientY-downY)>4)moved=true;yaw+=(e.clientX-lx)*.008;pitch=Math.max(-1.45,Math.min(1.45,pitch+(e.clientY-ly)*.008));lx=e.clientX;ly=e.clientY;paint()},up=e=>{if(!drag)return;drag=false;if(!moved&&typeof onSelectPanel==='function'){const rect=canvas.getBoundingClientRect(),point=[e.clientX-rect.left,e.clientY-rect.top];for(let i=lastDraw.length-1;i>=0;i--){if(pointInPolygon(point,lastDraw[i].projected)){selected=lastDraw[i].item.panelId;onSelectPanel(selected,{nodeId:lastDraw[i].item.nodeId,source:'3d'});paint();break}}}},cancel=()=>{drag=false},wheel=e=>{e.preventDefault();const factor=e.deltaY>0?.92:1.08;zoom=Math.max(.35,Math.min(3,zoom*factor));paint()};canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('wheel',wheel,{passive:false});const ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;ro?.observe(container);resize();
  return{model,setProgress(v){progress=Math.max(0,Math.min(100,num(v)));paint()},setSelectedPanel(panelId){selected=panelId||null;paint()},getSelectedPanel(){return selected},setView({yaw:ny,pitch:np,zoom:nz}={}){if(Number.isFinite(ny))yaw=ny;if(Number.isFinite(np))pitch=np;if(Number.isFinite(nz))zoom=nz;paint()},repaint:paint,dispose(){disposed=true;ro?.disconnect();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',cancel);canvas.removeEventListener('wheel',wheel);container.innerHTML=''}};
}
