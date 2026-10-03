import { getCrossSelection, setCrossSelection, selectionBounds } from './crossPanelTransformV21.js';

const clone=v=>structuredClone(v);
const num=(v,d=0)=>{const n=Number(v);return Number.isFinite(n)?n:d};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function selected(state,ids=getCrossSelection(state)){return(state?.elements||[]).filter(e=>ids.includes(e.id)&&e.type==='cross-panel-artwork')}
function centerOf(el){return{x:num(el.x)+num(el.w)/2,y:num(el.y)+num(el.h)/2}}
function normalizedSelection(next,ids){next.crossPanelEdit={snap:true,gridMm:5,toleranceMm:3,angleStep:15,...(next.crossPanelEdit||{}),selection:[...ids]};next.selectedId=ids.at(-1)||next.selectedId;return next}

export function scaleCrossSelection(state,ids,{scaleX=1,scaleY=1,origin=null,minSize=4,lockAspect=false}={}){
  const next=clone(state||{}),els=selected(next,ids);if(!els.length)return normalizedSelection(next,ids);
  const b=selectionBounds(next,ids),o=origin||{x:b.x+b.w/2,y:b.y+b.h/2};let sx=Math.max(.01,num(scaleX,1)),sy=Math.max(.01,num(scaleY,1));if(lockAspect){const s=Math.abs(sx-1)>=Math.abs(sy-1)?sx:sy;sx=s;sy=s;}
  for(const el of els){const c=centerOf(el),nc={x:o.x+(c.x-o.x)*sx,y:o.y+(c.y-o.y)*sy},nw=Math.max(minSize,num(el.w)*sx),nh=Math.max(minSize,num(el.h)*sy);el.w=nw;el.h=nh;el.x=nc.x-nw/2;el.y=nc.y-nh/2;}
  return normalizedSelection(next,ids);
}

export function rotateCrossSelection(state,ids,deltaAngle,{origin=null,snap=true,step=15}={}){
  const next=clone(state||{}),els=selected(next,ids);if(!els.length)return normalizedSelection(next,ids);const b=selectionBounds(next,ids),o=origin||{x:b.x+b.w/2,y:b.y+b.h/2},s=Math.max(1,num(step,15));let da=num(deltaAngle);if(snap)da=Math.round(da/s)*s;const a=da*Math.PI/180,c=Math.cos(a),sn=Math.sin(a);
  for(const el of els){const p=centerOf(el),dx=p.x-o.x,dy=p.y-o.y,nc={x:o.x+dx*c-dy*sn,y:o.y+dx*sn+dy*c};el.x=nc.x-num(el.w)/2;el.y=nc.y-num(el.h)/2;el.r=((num(el.r)+da)%360+360)%360;}
  return normalizedSelection(next,ids);
}

export function alignCrossSelection(state,ids,mode='left'){
  const next=clone(state||{}),els=selected(next,ids);if(els.length<2)return normalizedSelection(next,ids);const b=selectionBounds(next,ids);
  for(const el of els){if(mode==='left')el.x=b.x;else if(mode==='center')el.x=b.x+(b.w-num(el.w))/2;else if(mode==='right')el.x=b.x+b.w-num(el.w);else if(mode==='top')el.y=b.y;else if(mode==='middle')el.y=b.y+(b.h-num(el.h))/2;else if(mode==='bottom')el.y=b.y+b.h-num(el.h);}
  return normalizedSelection(next,ids);
}

export function distributeCrossSelection(state,ids,axis='x'){
  const next=clone(state||{}),els=selected(next,ids);if(els.length<3)return normalizedSelection(next,ids);if(axis==='x'){
    const ordered=[...els].sort((a,b)=>num(a.x)-num(b.x)),first=ordered[0],last=ordered.at(-1),total=ordered.reduce((n,e)=>n+num(e.w),0),span=num(last.x)+num(last.w)-num(first.x),gap=(span-total)/(ordered.length-1);let cursor=num(first.x);for(const el of ordered){el.x=cursor;cursor+=num(el.w)+gap;}
  }else{
    const ordered=[...els].sort((a,b)=>num(a.y)-num(b.y)),first=ordered[0],last=ordered.at(-1),total=ordered.reduce((n,e)=>n+num(e.h),0),span=num(last.y)+num(last.h)-num(first.y),gap=(span-total)/(ordered.length-1);let cursor=num(first.y);for(const el of ordered){el.y=cursor;cursor+=num(el.h)+gap;}
  }
  return normalizedSelection(next,ids);
}

export function parseNormalizedClipPolygon(text=''){
  const pts=String(text).trim().split(/\s+/).map(pair=>pair.split(',').map(Number)).filter(p=>p.length===2&&p.every(Number.isFinite)).map(([x,y])=>[clamp(x,0,1),clamp(y,0,1)]);if(pts.length<3)throw new Error('Clip polygon needs at least 3 normalized x,y points.');return pts;
}
export function setCrossClipPolygon(state,id,points){const next=clone(state||{}),el=(next.elements||[]).find(e=>e.id===id&&e.type==='cross-panel-artwork');if(!el)return next;const clean=(points||[]).map(p=>[clamp(num(p?.[0]),0,1),clamp(num(p?.[1]),0,1)]);if(clean.length<3)throw new Error('Clip polygon needs at least 3 points.');el.crossClip={type:'polygon',points:clean};return next;}
export function setCrossClipRect(state,id,{x=.05,y=.05,w=.9,h=.9}={}){const x0=clamp(num(x,.05),0,1),y0=clamp(num(y,.05),0,1),ww=clamp(num(w,.9),.001,1-x0),hh=clamp(num(h,.9),.001,1-y0);return setCrossClipPolygon(state,id,[[x0,y0],[x0+ww,y0],[x0+ww,y0+hh],[x0,y0+hh]]);}
export function clearCrossClip(state,id){const next=clone(state||{}),el=(next.elements||[]).find(e=>e.id===id&&e.type==='cross-panel-artwork');if(el)delete el.crossClip;return next;}
export function crossClipText(element){const pts=element?.crossClip?.points;if(!Array.isArray(pts)||pts.length<3)return'';return pts.map(p=>`${num(p[0]).toFixed(3)},${num(p[1]).toFixed(3)}`).join(' ')}
export function crossTransformDiagnostics(state){const ids=getCrossSelection(state),els=selected(state,ids),b=selectionBounds(state,ids);return{selection:ids,count:ids.length,bounds:b,clipped:els.filter(e=>Array.isArray(e.crossClip?.points)&&e.crossClip.points.length>=3).map(e=>e.id)};}
