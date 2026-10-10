import {mountPaperPreviewV77} from './paperPreviewV77.js';
import { buildTextureProofModel } from './threeArtworkProof.js';
import { renderPanelArtworkCanvas } from './panelArtwork.js';
import { buildFoldTransformsV50 } from './threeArtworkProofV50.js';

const num=(v,d=0)=>{const n=Number(v);return Number.isFinite(n)?n:d};
const clamp=(v,min,max)=>Math.min(max,Math.max(min,num(v,min)));
const I=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
const applyM=(m,p)=>[m[0]*p[0]+m[1]*p[1]+m[2]*p[2]+m[3],m[4]*p[0]+m[5]*p[1]+m[6]*p[2]+m[7],m[8]*p[0]+m[9]*p[1]+m[10]*p[2]+m[11]];
const add3=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const clone=v=>structuredClone(v);

function affineFromTriangles(src,dst){const[x0,y0]=src[0],[x1,y1]=src[1],[x2,y2]=src[2],[X0,Y0]=dst[0],[X1,Y1]=dst[1],[X2,Y2]=dst[2],det=x0*(y1-y2)+x1*(y2-y0)+x2*(y0-y1);if(Math.abs(det)<1e-9)return null;const a=(X0*(y1-y2)+X1*(y2-y0)+X2*(y0-y1))/det,c=(X0*(x2-x1)+X1*(x0-x2)+X2*(x1-x0))/det,e=(X0*(x1*y2-x2*y1)+X1*(x2*y0-x0*y2)+X2*(x0*y1-x1*y0))/det,b=(Y0*(y1-y2)+Y1*(y2-y0)+Y2*(y0-y1))/det,d=(Y0*(x2-x1)+Y1*(x0-x2)+Y2*(x1-x0))/det,f=(Y0*(x1*y2-x2*y1)+Y1*(x2*y0-x0*y2)+Y2*(x0*y1-x1*y0))/det;return[a,b,c,d,e,f]}
function drawTextureTriangle(ctx,image,src,dst){const m=affineFromTriangles(src,dst);if(!m)return;ctx.save();ctx.beginPath();ctx.moveTo(...dst[0]);ctx.lineTo(...dst[1]);ctx.lineTo(...dst[2]);ctx.closePath();ctx.clip();ctx.transform(...m);ctx.drawImage(image,0,0);ctx.restore()}
function pointInPolygon(point,polygon=[]){let inside=false;const[x,y]=point;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const[xi,yi]=polygon[i],[xj,yj]=polygon[j],intersect=((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi||1e-9)+xi);if(intersect)inside=!inside}return inside}
function panelBounds(panel={}){if(Array.isArray(panel.points)&&panel.points.length>=3){const xs=panel.points.map(p=>num(p?.[0])),ys=panel.points.map(p=>num(p?.[1]));const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);return{x:minX,y:minY,w:maxX-minX,h:maxY-minY}}return{x:num(panel.x),y:num(panel.y),w:Math.max(.001,num(panel.w,1)),h:Math.max(.001,num(panel.h,1))}}
function depthMap(graph){const out=new Map([[graph?.root,0]]),children=new Map();for(const edge of graph?.edges||[]){if(!children.has(edge.from))children.set(edge.from,[]);children.get(edge.from).push(edge.to)}const q=graph?.root?[graph.root]:[];while(q.length){const id=q.shift(),depth=out.get(id)||0;for(const child of children.get(id)||[])if(!out.has(child)){out.set(child,depth+1);q.push(child)}}return out}
function normalizeAuthoring(value={}){return{edgeAngles:{...(value.edgeAngles||{})},edgeProgress:{...(value.edgeProgress||{})},explode:clamp(value.explode??0,0,1),dimensionsVisible:value.dimensionsVisible!==false,selectedEdgeKey:value.selectedEdgeKey||null,penetrationPanels:[...(value.collisionPanels||value.penetrationPanels||[])],overlapPanels:[...(value.overlapPanels||[])],activePanels:[...(value.activePanels||[])]}}

export function mountCollisionProofV52(container,state,geo,graph,options={}){
 return mountPaperPreviewV77(container,state,geo,graph,buildTextureProofModel(state,geo,graph),{...options,buildTransforms:buildFoldTransformsV50});
}
