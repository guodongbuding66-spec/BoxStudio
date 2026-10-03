import { generateGeometry } from './geometry.js';
import { cleanSvg, downloadText } from './export.js';
import { orderedElements } from './objectOrder.js';

function num(v,d=0){const n=Number(v);return Number.isFinite(n)?n:d}
function esc(v=''){return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;')}
function idSafe(v='id'){return String(v||'id').replace(/[^A-Za-z0-9_.-]/g,'-')}
function fmt(v){return Number(num(v).toFixed(4))}
function panelPolygon(panel){if(Array.isArray(panel?.points)&&panel.points.length>=3)return panel.points.map(p=>[num(p[0]),num(p[1])]);const x=num(panel?.x),y=num(panel?.y),w=num(panel?.w),h=num(panel?.h);return[[x,y],[x+w,y],[x+w,y+h],[x,y+h]]}
function pointsAttr(points=[]){return points.map(p=>`${fmt(p[0])},${fmt(p[1])}`).join(' ')}
function matrixFor(el,mark,offsetX=0,offsetY=0){const sx=num(el.w,mark.width)/Math.max(.001,num(mark.width,1)),sy=num(el.h,mark.height)/Math.max(.001,num(mark.height,1)),a=num(el.r)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),A=c*sx,B=s*sx,C=-s*sy,D=c*sy,cx=offsetX+num(el.x)+num(el.w)/2,cy=offsetY+num(el.y)+num(el.h)/2,E=cx-A*num(mark.width)/2-C*num(mark.height)/2,F=cy-B*num(mark.width)/2-D*num(mark.height)/2;return[A,B,C,D,E,F]}
function matrixText(m){return`matrix(${m.map(fmt).join(' ')})`}
function gradientMarkup(g,id){const stops=(g?.stops||[]).map(s=>`<stop offset="${fmt(num(s.offset)*100)}%" stop-color="${esc(s.color||'#000')}" stop-opacity="${fmt(s.opacity??1)}"/>`).join('');if(g?.type==='radial')return`<radialGradient id="${id}" gradientUnits="${String(g.units||'').toLowerCase()==='userspaceonuse'?'userSpaceOnUse':'objectBoundingBox'}" cx="${esc(g.cx??'50%')}" cy="${esc(g.cy??'50%')}" r="${esc(g.r??'50%')}" fx="${esc(g.fx??g.cx??'50%')}" fy="${esc(g.fy??g.cy??'50%')}">${stops}</radialGradient>`;return`<linearGradient id="${id}" gradientUnits="${String(g?.units||'').toLowerCase()==='userspaceonuse'?'userSpaceOnUse':'objectBoundingBox'}" x1="${esc(g?.x1??'0%')}" y1="${esc(g?.y1??'0%')}" x2="${esc(g?.x2??'100%')}" y2="${esc(g?.y2??'0%')}">${stops}</linearGradient>`}
function localContainerDefs(appearance,prefix){const defs=[];for(const [id,polys] of Object.entries(appearance?.clips||{}))defs.push(`<clipPath id="${prefix}-clip-${idSafe(id)}" clipPathUnits="userSpaceOnUse">${(polys||[]).map(p=>`<polygon points="${pointsAttr(p)}"/>`).join('')}</clipPath>`);for(const [id,polys] of Object.entries(appearance?.masks||{}))defs.push(`<mask id="${prefix}-mask-${idSafe(id)}" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse">${(polys||[]).map(p=>`<polygon points="${pointsAttr(p)}" fill="#fff"/>`).join('')}</mask>`);return defs}
function panelClipDef(id,panels=[]){return`<clipPath id="${id}" clipPathUnits="userSpaceOnUse">${panels.map(p=>`<polygon points="${pointsAttr(panelPolygon(p))}"/>`).join('')}</clipPath>`}
function elementAppearance(el,geo,{cross=false}={}){const mark=el?.svgMark,a=mark?.appearance;if(!mark||!a?.primitives?.length)return null;const prefix=`v20-${idSafe(el.id)}`,panel=cross?null:geo?.panelMap?.[el.panelId];if(!cross&&!panel)return null;const offsetX=cross?0:num(panel.x),offsetY=cross?0:num(panel.y),m=matrixFor(el,mark,offsetX,offsetY),defs=[...localContainerDefs(a,prefix)],gradientIds={};for(const [gid,g] of Object.entries(a.gradients||{})){const id=`${prefix}-grad-${idSafe(gid)}`;gradientIds[gid]=id;defs.push(gradientMarkup(g,id))}
  const primitiveMarkup=(a.primitives||[]).map((p,i)=>{const fill=p.fill?.type==='gradient'?`url(#${gradientIds[p.fill.id]||''})`:String(p.fill?.color||'#000'),clip=p.clipId?` clip-path="url(#${prefix}-clip-${idSafe(p.clipId)})"`:'',mask=p.maskId?` mask="url(#${prefix}-mask-${idSafe(p.maskId)})"`:'',opacity=fmt(p.opacity??1);return`<polygon data-v20-primitive="${i}" points="${pointsAttr(p.points||[])}" fill="${esc(fill)}" fill-opacity="${opacity}"${clip}${mask}/>`}).join('');
  const outlines=cross?(mark.lines||[]).map(l=>`<line x1="${fmt(l.x1)}" y1="${fmt(l.y1)}" x2="${fmt(l.x2)}" y2="${fmt(l.y2)}" stroke="#111" stroke-width="${fmt(Math.max(mark.width,mark.height)/220)}" fill="none"/>`).join(''):'';
  let clipId='';if(cross){clipId=`${prefix}-panel-clip`;defs.push(panelClipDef(clipId,Object.values(geo?.panelMap||{}).filter(p=>p&&num(p.w)>0&&num(p.h)>0)))}else{clipId=`${prefix}-panel-clip`;defs.push(panelClipDef(clipId,[panel]))}
  const body=`<g data-v20-source="${esc(el.id)}" clip-path="url(#${clipId})"><g transform="${matrixText(m)}">${primitiveMarkup}${outlines}</g></g>`;return{defs,body,gradientCount:Object.keys(gradientIds).length,primitiveCount:a.primitives.length,cross};
}

export function buildNativeSvgV20Layer(state,geo=generateGeometry(state.structure)){
  const entries=[];for(const el of orderedElements(state?.elements||[])){if(el?.type==='svg-symbol')entries.push(elementAppearance(el,geo,{cross:false}));else if(el?.type==='cross-panel-artwork')entries.push(elementAppearance(el,geo,{cross:true}))}const valid=entries.filter(Boolean),defs=valid.flatMap(x=>x.defs),body=valid.map(x=>x.body).join('');return{defs:`<defs data-boxstudio-v20="native-appearance">${defs.join('')}</defs>`,body:`<g id="boxstudio-v20-native-appearance" data-native-gradients="true">${body}</g>`,stats:{objects:valid.length,crossPanelObjects:valid.filter(x=>x.cross).length,gradients:valid.reduce((n,x)=>n+x.gradientCount,0),primitives:valid.reduce((n,x)=>n+x.primitiveCount,0)}};
}

export function injectNativeSvgV20(baseSvgText,state,geo=generateGeometry(state.structure)){
  const base=String(baseSvgText||'');if(!/<\/svg>\s*$/i.test(base))throw new Error('Production SVG base document is invalid.');const layer=buildNativeSvgV20Layer(state,geo);return{svg:base.replace(/<\/svg>\s*$/i,`${layer.defs}${layer.body}</svg>`),stats:layer.stats};
}

export function buildProductionSvgV20(svgEl,state){if(!svgEl)throw new Error('2D design SVG is not available. Open the Design workspace before exporting native SVG appearance.');const base=cleanSvg(svgEl,state.exportOptions||{});return injectNativeSvgV20(base,state).svg}
export function exportProductionSvgV20(svgEl,state){downloadText('boxstudio-v20-native-gradient.svg',buildProductionSvgV20(svgEl,state),'image/svg+xml;charset=utf-8')}
