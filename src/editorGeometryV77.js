export const PX_MM_V77=25.4/96;
const round=n=>Math.round(n*10000)/10000;
export function smartSnapV77(bounds,targets,dx,dy,{tolerance=2,enabled=true}={}){
 if(![dx,dy,tolerance].every(Number.isFinite)||tolerance<0)throw new Error('吸附参数无效。');const guides=[];if(!enabled)return{dx,dy,guides};
 for(const axis of ['x','y']){const size=axis==='x'?'w':'h',offset=axis==='x'?dx:dy,anchors=[0,.5,1].map(t=>bounds[axis]+bounds[size]*t+offset);let best=null;for(const target of targets)for(const factor of [0,.5,1]){const value=target[axis]+target[size]*factor;for(const anchor of anchors){const delta=value-anchor;if(Math.abs(delta)<=tolerance&&(!best||Math.abs(delta)<Math.abs(best.delta)))best={axis,value,delta,id:target.id};}}if(best){if(axis==='x')dx+=best.delta;else dy+=best.delta;guides.push(best);}}
 return{dx:round(dx),dy:round(dy),guides};
}
export function dimensionSvgV77(g,{advanced=false}={}){
 const panels=(g.bodyPanels?.length?g.bodyPanels:g.panels)||[],p=g.panelMap?.base||g.panelMap?.front||panels[0];if(!p)return'';const fs=Math.max(4,Math.min(g.width,g.height)*.017),stroke=Math.max(.35,fs/15),arrow=fs*.35;let rows=[];
 function dimension(x1,y1,x2,y2,value){const x=(x1+x2)/2,y=(y1+y2)/2,horizontal=Math.abs(x2-x1)>Math.abs(y2-y1),label=Number(value.toFixed(2))+' mm';rows.push(`<path d="M${x1} ${y1}L${x2} ${y2}"/>`);for(const[x,y,sign]of [[x1,y1,1],[x2,y2,-1]])rows.push(horizontal?`<path d="M${x+arrow*sign} ${y-arrow*.5}L${x} ${y}L${x+arrow*sign} ${y+arrow*.5}"/>`:`<path d="M${x-arrow*.5} ${y+arrow*sign}L${x} ${y}L${x+arrow*.5} ${y+arrow*sign}"/>`);rows.push(`<text x="${x}" y="${y-fs*.35}" text-anchor="middle" font-size="${fs}" paint-order="stroke" stroke="white" stroke-width="${fs*.45}" fill="#3087ef">${label}</text>`);}
 dimension(p.x,p.y+p.h*.78,p.x+p.w,p.y+p.h*.78,p.w);dimension(p.x+p.w*.74,p.y,p.x+p.w*.74,p.y+p.h,p.h);const side=panels.find(q=>q.id!==p.id&&q.id!=='glue'&&Math.abs(q.h-p.h)>.01)||panels.find(q=>q.id!==p.id&&q.id!=='glue');if(side){if(Math.abs(side.h-p.h)>.01)dimension(side.x+side.w*.5,side.y,side.x+side.w*.5,side.y+side.h,side.h);else dimension(side.x,side.y+side.h*.65,side.x+side.w,side.y+side.h*.65,side.w);}
 if(advanced)for(const q of (g.flapPanels||[]).slice(0,12))dimension(q.x,q.y+q.h*.6,q.x+q.w,q.y+q.h*.6,q.w);
 return`<g class="ui-only v77-dimensions" data-v77-dimensions pointer-events="none" fill="none" stroke="#3087ef" stroke-width="${stroke}">${rows.join('')}</g>`;
}
export function guideSvgV77(guides,width,height){return`<g class="ui-only v77-smart-guides" pointer-events="none" stroke="#e04fb2" stroke-width=".6" stroke-dasharray="4 2">${guides.map(g=>g.axis==='x'?`<line x1="${g.value}" x2="${g.value}" y1="0" y2="${height}"/>`:`<line x1="0" x2="${width}" y1="${g.value}" y2="${g.value}"/>`).join('')}</g>`;}
