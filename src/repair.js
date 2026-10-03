import { inferFoldCandidates } from './importDieline.js';

const n=v=>Number(v)||0;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const keyPoint=(p,tol)=>`${Math.round(p.x/tol)},${Math.round(p.y/tol)}`;
function lineLength(l){return Math.hypot(n(l.x2)-n(l.x1),n(l.y2)-n(l.y1))}
function canonicalLine(l,tol=.01){
  const a=[Math.round(n(l.x1)/tol),Math.round(n(l.y1)/tol)],b=[Math.round(n(l.x2)/tol),Math.round(n(l.y2)/tol)];
  const first=(a[0]<b[0]||a[0]===b[0]&&a[1]<=b[1])?a:b,second=first===a?b:a;
  return `${first.join(',')}:${second.join(',')}`;
}
function orient(a,b,c){return (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)}
function near(a,b,tol=.05){return Math.hypot(a.x-b.x,a.y-b.y)<=tol}
function strictSegmentIntersection(l1,l2,tol=.05){
  const a={x:n(l1.x1),y:n(l1.y1)},b={x:n(l1.x2),y:n(l1.y2)},c={x:n(l2.x1),y:n(l2.y1)},d={x:n(l2.x2),y:n(l2.y2)};
  if(near(a,c,tol)||near(a,d,tol)||near(b,c,tol)||near(b,d,tol))return false;
  const o1=orient(a,b,c),o2=orient(a,b,d),o3=orient(c,d,a),o4=orient(c,d,b);return ((o1>tol&&o2<-tol)||(o1<-tol&&o2>tol))&&((o3>tol&&o4<-tol)||(o3<-tol&&o4>tol));
}
export function countLineIntersections(lines=[],tol=.05){let c=0;for(let i=0;i<lines.length;i++)for(let j=i+1;j<lines.length;j++)if(strictSegmentIntersection(lines[i],lines[j],tol))c++;return c}
export function polygonBounds(points=[]){if(!points.length)return{x:0,y:0,w:0,h:0};const xs=points.map(p=>n(p[0]??p.x)),ys=points.map(p=>n(p[1]??p.y)),x=Math.min(...xs),y=Math.min(...ys);return{x,y,w:Math.max(...xs)-x,h:Math.max(...ys)-y}}
function polygonLines(points=[]){const p=points.map(q=>({x:n(q[0]??q.x),y:n(q[1]??q.y)})),out=[];for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];out.push({x1:a.x,y1:a.y,x2:b.x,y2:b.y})}return out}
export function polygonSelfIntersections(points=[],tol=.05){const e=polygonLines(points);let c=0;for(let i=0;i<e.length;i++)for(let j=i+1;j<e.length;j++){if(j===i+1||(i===0&&j===e.length-1))continue;if(strictSegmentIntersection(e[i],e[j],tol))c++}return c}
export function syncPolygonBounds(panel){if(!panel?.points?.length)return panel;const b=polygonBounds(panel.points);panel.x=b.x;panel.y=b.y;panel.w=b.w;panel.h=b.h;return panel}

export function analyzeImportedGeometry(src={},tol=.5){
  const sets=['cutLines','creaseLines','perfLines','glueLines'];let lineCount=0,degenerate=0,duplicates=0;const seen=new Set(),endpoints=[];
  for(const name of sets)for(const l of src[name]||[]){lineCount++;if(lineLength(l)<tol*.25)degenerate++;const k=canonicalLine(l,Math.max(.01,tol*.2));if(seen.has(`${name}:${k}`))duplicates++;else seen.add(`${name}:${k}`);endpoints.push({x:n(l.x1),y:n(l.y1)},{x:n(l.x2),y:n(l.y2)})}
  let nearPairs=0;for(let i=0;i<endpoints.length;i++)for(let j=i+1;j<endpoints.length;j++){const d=dist(endpoints[i],endpoints[j]);if(d>0.001&&d<=tol)nearPairs++}
  const cutIntersections=countLineIntersections(src.cutLines||[],Math.max(.01,tol*.1));let polygonSelf=0;for(const p of src.panels||[])if(p.points?.length>=3)polygonSelf+=polygonSelfIntersections(p.points,Math.max(.01,tol*.1));
  return {lineCount,degenerate,duplicates,nearEndpointPairs:nearPairs,cutIntersections,polygonSelfIntersections:polygonSelf,panelCount:(src.panels||[]).length,polygonPanels:(src.panels||[]).filter(p=>p.points?.length>=3).length,foldCandidates:(src.foldCandidates||[]).length,tolerance:tol};
}

function snapLineSet(lines=[],tol=.5){
  const clusters=new Map();
  for(const l of lines){for(const p of [{x:n(l.x1),y:n(l.y1)},{x:n(l.x2),y:n(l.y2)}]){const k=keyPoint(p,tol);if(!clusters.has(k))clusters.set(k,[]);clusters.get(k).push(p)}}
  const centers=new Map();for(const [k,pts] of clusters){centers.set(k,{x:pts.reduce((s,p)=>s+p.x,0)/pts.length,y:pts.reduce((s,p)=>s+p.y,0)/pts.length})}
  const snapped=lines.map(l=>{const a=centers.get(keyPoint({x:n(l.x1),y:n(l.y1)},tol)),b=centers.get(keyPoint({x:n(l.x2),y:n(l.y2)},tol));return {...l,x1:a.x,y1:a.y,x2:b.x,y2:b.y}}).filter(l=>lineLength(l)>=tol*.2);
  const out=[],seen=new Set();for(const l of snapped){const k=canonicalLine(l,Math.max(.01,tol*.2));if(!seen.has(k)){seen.add(k);out.push(l)}}return out;
}

export function repairImportedGeometry(src={},tol=.5){
  const next=structuredClone(src);for(const name of ['cutLines','creaseLines','perfLines','glueLines'])next[name]=snapLineSet(next[name]||[],tol);
  next.panels=(next.panels||[]).map(p=>p.points?.length?syncPolygonBounds(p):p);next.foldCandidates=inferFoldCandidates(next.panels||[],next.creaseLines||[]);
  const warnings=[...(next.warnings||[])];warnings.push(`V0.7 repair: endpoints snapped at ${tol} mm tolerance; degenerate/duplicate straight segments removed. Intersections are reported, not auto-deleted.`);next.warnings=warnings;return next;
}

export function addPanel(src={},rect={}){
  const next=structuredClone(src),panels=next.panels||(next.panels=[]),i=panels.length+1;panels.push({id:`manual-panel-${Date.now().toString(36)}-${i}`,label:`Manual Panel ${i}`,x:Math.max(0,n(rect.x)),y:Math.max(0,n(rect.y)),w:Math.max(5,n(rect.w)||80),h:Math.max(5,n(rect.h)||60),kind:'panel'});next.foldCandidates=inferFoldCandidates(panels,next.creaseLines||[]);return next;
}
export function addPolygonPanel(src={},points=[]){
  const next=structuredClone(src),panels=next.panels||(next.panels=[]),i=panels.length+1,pts=(points?.length>=3?points:[[20,20],[110,20],[130,65],[80,100],[20,80]]).map(p=>[Math.max(0,n(p[0]??p.x)),Math.max(0,n(p[1]??p.y))]);const p=syncPolygonBounds({id:`polygon-panel-${Date.now().toString(36)}-${i}`,label:`Polygon Panel ${i}`,points:pts,kind:'panel',shape:'polygon'});panels.push(p);next.foldCandidates=inferFoldCandidates(panels,next.creaseLines||[]);return next;
}
export function updatePolygonPanel(src={},panelId,points=[]){const next=structuredClone(src),p=(next.panels||[]).find(x=>x.id===panelId);if(!p)throw new Error('Panel not found');if(points.length<3)throw new Error('Polygon 至少需要 3 个点');p.points=points.map(q=>[Math.max(0,n(q[0]??q.x)),Math.max(0,n(q[1]??q.y))]);p.shape='polygon';syncPolygonBounds(p);next.foldCandidates=inferFoldCandidates(next.panels||[],next.creaseLines||[]);return next}
export function deletePanel(src={},panelId){const next=structuredClone(src);next.panels=(next.panels||[]).filter(p=>p.id!==panelId);next.foldCandidates=inferFoldCandidates(next.panels,next.creaseLines||[]);if(next.foldRoot===panelId)next.foldRoot=next.panels[0]?.id||'artboard';return next}
export function splitPanel(src={},panelId,orientation='vertical',ratio=.5){
  const next=structuredClone(src),idx=(next.panels||[]).findIndex(p=>p.id===panelId);if(idx<0)return next;const p=next.panels[idx];if(p.points?.length)throw new Error('自由多边形 Panel 暂不支持自动 Split；请编辑 points 或创建新的 Polygon Panel。');const r=Math.max(.1,Math.min(.9,Number(ratio)||.5)),base={...p};let a,b;
  if(orientation==='horizontal'){a={...base,id:`${p.id}-a`,label:`${p.label} A`,h:p.h*r};b={...base,id:`${p.id}-b`,label:`${p.label} B`,y:p.y+p.h*r,h:p.h*(1-r)}}else{a={...base,id:`${p.id}-a`,label:`${p.label} A`,w:p.w*r};b={...base,id:`${p.id}-b`,label:`${p.label} B`,x:p.x+p.w*r,w:p.w*(1-r)}}
  next.panels.splice(idx,1,a,b);next.foldCandidates=inferFoldCandidates(next.panels,next.creaseLines||[]);if(next.foldRoot===panelId)next.foldRoot=a.id;return next;
}
export function mergePanels(src={},ids=[]){
  const next=structuredClone(src),selected=(next.panels||[]).filter(p=>ids.includes(p.id));if(selected.length!==2)throw new Error('请选择两个 Panel');const [a,b]=selected;if(a.points?.length||b.points?.length)throw new Error('Polygon Panel 暂不参与矩形自动 Merge');const tol=.8;let ok=false;
  if(Math.abs(a.y-b.y)<tol&&Math.abs(a.h-b.h)<tol&&(Math.abs(a.x+a.w-b.x)<tol||Math.abs(b.x+b.w-a.x)<tol))ok=true;
  if(Math.abs(a.x-b.x)<tol&&Math.abs(a.w-b.w)<tol&&(Math.abs(a.y+a.h-b.y)<tol||Math.abs(b.y+b.h-a.y)<tol))ok=true;
  if(!ok)throw new Error('两个 Panel 必须完整相邻且共享同宽/同高边');const minX=Math.min(a.x,b.x),minY=Math.min(a.y,b.y),maxX=Math.max(a.x+a.w,b.x+b.w),maxY=Math.max(a.y+a.h,b.y+b.h),merged={id:`merged-${Date.now().toString(36)}`,label:`Merged ${a.label} + ${b.label}`,x:minX,y:minY,w:maxX-minX,h:maxY-minY,kind:'panel'};
  next.panels=(next.panels||[]).filter(p=>!ids.includes(p.id));next.panels.push(merged);next.foldCandidates=inferFoldCandidates(next.panels,next.creaseLines||[]);if(ids.includes(next.foldRoot))next.foldRoot=merged.id;return next;
}
