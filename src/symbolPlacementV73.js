import {generateGeometry} from './geometry.js';
import {handlingSymbolV72} from './handlingSymbolsV72.js';
import {addMarkPresetV66,rectanglesOverlapV66} from './shippingMarkLayoutV66.js';

const inside=(x,y,points)=>{let yes=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const[a,b]=points[i],[c,d]=points[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)yes=!yes;}return yes;};
export function dropBoxSymbolV73(state,id,point){
 if(!handlingSymbolV72(id))throw new Error('搬运标识无效。');
 const geo=generateGeometry(state.structure),panel=geo.panels.find(p=>p.points?.length?inside(point.x,point.y,p.points):point.x>=p.x&&point.x<=p.x+p.w&&point.y>=p.y&&point.y<=p.y+p.h);
 if(!panel)throw new Error('请将标识拖到纸盒面板内。');
 const result=addMarkPresetV66(state,id,{panelId:panel.id}),el=result.element,safe=Math.max(2,Number(state.structure.safe)||0),x=Math.max(safe,Math.min(panel.w-safe-el.w,point.x-panel.x-el.w/2)),y=Math.max(safe,Math.min(panel.h-safe-el.h,point.y-panel.y-el.h/2));
 const bounds=e=>{const a=(e.r||0)*Math.PI/180,w=Math.abs(Math.cos(a))*e.w+Math.abs(Math.sin(a))*e.h,h=Math.abs(Math.sin(a))*e.w+Math.abs(Math.cos(a))*e.h;return{x:e.x+(e.w-w)/2,y:e.y+(e.h-h)/2,w,h};};
 let valid=!(state.elements||[]).filter(e=>e.panelId===panel.id&&!e.hidden&&!e.v61PanelFill).some(e=>rectanglesOverlapV66({x,y,w:el.w,h:el.h},bounds(e),3));
 if(panel.points?.length)for(let k=0;k<=20&&valid;k++)for(const[a,b]of[[x+el.w*k/20,y],[x+el.w*k/20,y+el.h],[x,y+el.h*k/20],[x+el.w,y+el.h*k/20]])if(!inside(panel.x+a,panel.y+b,panel.points)){valid=false;break;}
 // A crowded drop keeps the safe free position selected by the existing placer.
 if(valid)Object.assign(el,{x,y});return result.state;
}
