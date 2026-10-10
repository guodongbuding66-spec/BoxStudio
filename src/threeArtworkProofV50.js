import {mountPaperPreviewV77} from './paperPreviewV77.js';
import { buildTextureProofModel } from './threeArtworkProof.js';
import { renderPanelArtworkCanvas } from './panelArtwork.js';

const num=(v,d=0)=>{const n=Number(v);return Number.isFinite(n)?n:d};
const clone=v=>structuredClone(v);
const clamp=(v,min,max)=>Math.min(max,Math.max(min,num(v,min)));
const edgeKey=e=>`${e?.from||''}->${e?.to||''}`;
const I=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
function mmul(A,B){const C=new Array(16).fill(0);for(let r=0;r<4;r++)for(let c=0;c<4;c++)for(let k=0;k<4;k++)C[r*4+c]+=A[r*4+k]*B[k*4+c];return C}
function tr(x,y,z){const m=I();m[3]=x;m[7]=y;m[11]=z;return m}
function rotAxis(ax,ay,az,a){const n=Math.hypot(ax,ay,az)||1,x=ax/n,y=ay/n,z=az/n,c=Math.cos(a),s=Math.sin(a),t=1-c;return[t*x*x+c,t*x*y-s*z,t*x*z+s*y,0,t*x*y+s*z,t*y*y+c,t*y*z-s*x,0,t*x*z-s*y,t*y*z+s*x,t*z*z+c,0,0,0,0,1]}
function applyM(m,p){const[x,y,z]=p;return[m[0]*x+m[1]*y+m[2]*z+m[3],m[4]*x+m[5]*y+m[6]*z+m[7],m[8]*x+m[9]*y+m[10]*z+m[11]]}
function rotLine(geo,h,a){const p1=[h.x1-geo.width/2,-(h.y1-geo.height/2),0],p2=[h.x2-geo.width/2,-(h.y2-geo.height/2),0],axis=[p2[0]-p1[0],p2[1]-p1[1],p2[2]-p1[2]];return mmul(mmul(tr(...p1),rotAxis(...axis,-a)),tr(-p1[0],-p1[1],-p1[2]))}
function smooth(t){return t*t*(3-2*t)}
function normalizedAuthoring(value={}){return{edgeAngles:{...(value.edgeAngles||{})},edgeProgress:{...(value.edgeProgress||{})},explode:clamp(value.explode??0,0,1),dimensionsVisible:value.dimensionsVisible!==false,selectedEdgeKey:value.selectedEdgeKey||null}}

export function buildFoldTransformsV50(graph,geo,progress=100,authoring={}){
  const opts=normalizedAuthoring(authoring),children=new Map();for(const edge of graph?.edges||[]){if(!children.has(edge.from))children.set(edge.from,[]);children.get(edge.from).push(edge)}
  const transforms=new Map(),globalT=smooth(clamp(progress,0,100)/100),visit=(id,M)=>{transforms.set(id,M);for(const edge of children.get(id)||[]){const key=edgeKey(edge),rawProgress=Object.prototype.hasOwnProperty.call(opts.edgeProgress,key)?opts.edgeProgress[key]:globalT*100,t=smooth(clamp(rawProgress,0,100)/100),angle=Number.isFinite(Number(opts.edgeAngles[key]))?Number(opts.edgeAngles[key]):num(edge.angle),R=edge.hinge?rotLine(geo,edge.hinge,angle*Math.PI/180*t):I();visit(edge.to,mmul(M,R))}};
  if(graph?.components?.length){for(const c of graph.components){let M=I();if(c.assembly){const a=c.assembly,t=globalT,flat=[a.flatCenter[0]-geo.width/2,-(a.flatCenter[1]-geo.height/2),0],target=[a.target[0]-geo.width/2,-(a.target[1]-geo.height/2),a.target[2]],pos=flat.map((v,i)=>v+(target[i]-v)*t);M=mmul(mmul(tr(...pos),rotAxis(1,0,0,num(a.rotationX)*Math.PI/180*t)),tr(-flat[0],-flat[1],0));}visit(c.root,M);}}else if(graph?.root)visit(graph.root,I());for(const node of graph?.nodes||[])if(!transforms.has(node.id))transforms.set(node.id,I());return transforms;
}

function affineFromTriangles(src,dst){const[x0,y0]=src[0],[x1,y1]=src[1],[x2,y2]=src[2],[X0,Y0]=dst[0],[X1,Y1]=dst[1],[X2,Y2]=dst[2],det=x0*(y1-y2)+x1*(y2-y0)+x2*(y0-y1);if(Math.abs(det)<1e-9)return null;const a=(X0*(y1-y2)+X1*(y2-y0)+X2*(y0-y1))/det,c=(X0*(x2-x1)+X1*(x0-x2)+X2*(x1-x0))/det,e=(X0*(x1*y2-x2*y1)+X1*(x2*y0-x0*y2)+X2*(x0*y1-x1*y0))/det,b=(Y0*(y1-y2)+Y1*(y2-y0)+Y2*(y0-y1))/det,d=(Y0*(x2-x1)+Y1*(x0-x2)+Y2*(x1-x0))/det,f=(Y0*(x1*y2-x2*y1)+Y1*(x2*y0-x0*y2)+Y2*(x0*y1-x1*y0))/det;return[a,b,c,d,e,f]}
function drawTextureTriangle(ctx,image,src,dst){const m=affineFromTriangles(src,dst);if(!m)return;ctx.save();ctx.beginPath();ctx.moveTo(...dst[0]);ctx.lineTo(...dst[1]);ctx.lineTo(...dst[2]);ctx.closePath();ctx.clip();ctx.transform(...m);ctx.drawImage(image,0,0);ctx.restore()}
function pointInPolygon(point,polygon=[]){let inside=false;const[x,y]=point;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const[xi,yi]=polygon[i],[xj,yj]=polygon[j],intersect=((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi||1e-9)+xi);if(intersect)inside=!inside}return inside}
function panelBounds(panel={}){if(Array.isArray(panel.points)&&panel.points.length>=3){const xs=panel.points.map(p=>num(p?.[0])),ys=panel.points.map(p=>num(p?.[1]));const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);return{x:minX,y:minY,w:maxX-minX,h:maxY-minY}}return{x:num(panel.x),y:num(panel.y),w:Math.max(.001,num(panel.w,1)),h:Math.max(.001,num(panel.h,1))}}
function depthMap(graph){const out=new Map([[graph?.root,0]]),children=new Map();for(const edge of graph?.edges||[]){if(!children.has(edge.from))children.set(edge.from,[]);children.get(edge.from).push(edge.to)}const q=graph?.root?[graph.root]:[];while(q.length){const id=q.shift(),depth=out.get(id)||0;for(const child of children.get(id)||[])if(!out.has(child)){out.set(child,depth+1);q.push(child)}}return out}
function add3(a,b){return[a[0]+b[0],a[1]+b[1],a[2]+b[2]]}

export function mountArtworkProofV50(container,state,geo,graph,options={}){
 const proof=mountPaperPreviewV77(container,state,geo,graph,buildTextureProofModel(state,geo,graph),{...options,buildTransforms:buildFoldTransformsV50});container.querySelector('canvas').dataset.v50Renderer='true';container.querySelector('canvas').classList.add('v50-proof-renderer');return proof;
}
