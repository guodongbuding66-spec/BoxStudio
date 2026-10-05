const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const r=(v,p=6)=>{const m=10**p;return Math.round(n(v)*m)/m};
const clone=v=>structuredClone(v);
const EPS=1e-8;

export const V40_OFFSET_SCHEMA='boxstudio-offset-v40';

export function polygonAreaV40(points=[]){let a=0;for(let i=0;i<points.length;i++){const p=points[i],q=points[(i+1)%points.length];a+=n(p[0])*n(q[1])-n(q[0])*n(p[1])}return a/2}
function len(x,y){return Math.hypot(x,y)||1}
function normalFor(a,b,orientation){const dx=n(b[0])-n(a[0]),dy=n(b[1])-n(a[1]),l=len(dx,dy);return orientation>=0?[dy/l,-dx/l]:[-dy/l,dx/l]}
function lineIntersection(p,v,q,w){const d=v.x*w.y-v.y*w.x;if(Math.abs(d)<EPS)return null;const qpx=q.x-p.x,qpy=q.y-p.y,t=(qpx*w.y-qpy*w.x)/d;return{x:p.x+t*v.x,y:p.y+t*v.y}}
function bounds(points){const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);return{x:r(Math.min(...xs)),y:r(Math.min(...ys)),w:r(Math.max(...xs)-Math.min(...xs)),h:r(Math.max(...ys)-Math.min(...ys))}}
function pushPoint(out,p){const q=[r(p[0]),r(p[1])],last=out.at(-1);if(!last||Math.hypot(last[0]-q[0],last[1]-q[1])>1e-6)out.push(q)}
function shortestSweep(a,b){let d=b-a;while(d<=-Math.PI)d+=Math.PI*2;while(d>Math.PI)d-=Math.PI*2;return d}
function segmentIntersection(a,b,c,d){const r1={x:b[0]-a[0],y:b[1]-a[1]},r2={x:d[0]-c[0],y:d[1]-c[1]},den=r1.x*r2.y-r1.y*r2.x;if(Math.abs(den)<EPS)return null;const q={x:c[0]-a[0],y:c[1]-a[1]},t=(q.x*r2.y-q.y*r2.x)/den,u=(q.x*r1.y-q.y*r1.x)/den;if(t<=1e-7||t>=1-1e-7||u<=1e-7||u>=1-1e-7)return null;return{x:a[0]+t*r1.x,y:a[1]+t*r1.y,t,u}}
function firstSelfIntersection(points){const m=points.length;for(let i=0;i<m;i++){const a=points[i],b=points[(i+1)%m];for(let j=i+2;j<m;j++){if(i===0&&j===m-1)continue;const c=points[j],d=points[(j+1)%m],hit=segmentIntersection(a,b,c,d);if(hit)return{i,j,hit}}}return null}
function cleanLoop(points){const out=[];for(const p of points)pushPoint(out,p);if(out.length>2&&Math.hypot(out[0][0]-out.at(-1)[0],out[0][1]-out.at(-1)[1])<1e-6)out.pop();return out}
function repairSelfIntersections(points){let current=cleanLoop(points),repairs=0;for(let guard=0;guard<12;guard++){const x=firstSelfIntersection(current);if(!x)break;const p=[r(x.hit.x),r(x.hit.y)],loopA=cleanLoop([p,...current.slice(x.i+1,x.j+1),p]),loopB=cleanLoop([p,...current.slice(x.j+1),...current.slice(0,x.i+1),p]);const candidates=[loopA,loopB].filter(q=>q.length>=3&&Math.abs(polygonAreaV40(q))>1e-5).sort((a,b)=>Math.abs(polygonAreaV40(b))-Math.abs(polygonAreaV40(a)));if(!candidates.length)break;current=candidates[0];repairs++}return{points:current,repairs,remaining:Boolean(firstSelfIntersection(current))}}

export function offsetPolygonV40(points,distance,{join='miter',miterLimit=4,roundSegments=8,repair=true}={}){
  const src=cleanLoop((points||[]).map(p=>[n(p[0]),n(p[1])]));if(src.length<3)return{schema:V40_OFFSET_SCHEMA,ok:false,points:[],issues:[{severity:'error',code:'OFFSET_POLYGON_INVALID',detail:'Polygon needs at least 3 distinct points.'}]};
  const area=polygonAreaV40(src);if(Math.abs(area)<EPS)return{schema:V40_OFFSET_SCHEMA,ok:false,points:[],issues:[{severity:'error',code:'OFFSET_POLYGON_ZERO_AREA',detail:'Polygon has zero area.'}]};
  const orientation=Math.sign(area),d=n(distance),out=[];for(let i=0;i<src.length;i++){
    const prev=src[(i-1+src.length)%src.length],p=src[i],next=src[(i+1)%src.length],n1=normalFor(prev,p,orientation),n2=normalFor(p,next,orientation),v1={x:p[0]-prev[0],y:p[1]-prev[1]},v2={x:next[0]-p[0],y:next[1]-p[1]},s1={x:p[0]+n1[0]*d,y:p[1]+n1[1]*d},s2={x:p[0]+n2[0]*d,y:p[1]+n2[1]*d},hit=lineIntersection(s1,v1,s2,v2);
    if(join==='round'){
      const a1=Math.atan2(n1[1]*d,n1[0]*d),a2=Math.atan2(n2[1]*d,n2[0]*d),sweep=shortestSweep(a1,a2),steps=Math.max(2,Math.ceil(Math.abs(sweep)/(Math.PI/Math.max(2,roundSegments))));for(let k=0;k<=steps;k++){const a=a1+sweep*k/steps;pushPoint(out,[p[0]+Math.cos(a)*Math.abs(d),p[1]+Math.sin(a)*Math.abs(d)])}
    }else if(join==='bevel'||!hit){pushPoint(out,[s1.x,s1.y]);pushPoint(out,[s2.x,s2.y])}
    else{const ml=Math.hypot(hit.x-p[0],hit.y-p[1]),limit=Math.abs(d)*Math.max(1,n(miterLimit,4));if(Math.abs(d)>EPS&&ml>limit){pushPoint(out,[s1.x,s1.y]);pushPoint(out,[s2.x,s2.y])}else pushPoint(out,[hit.x,hit.y])}
  }
  const rawSelf=Boolean(firstSelfIntersection(out)),fixed=repair&&rawSelf?repairSelfIntersections(out):{points:out,repairs:0,remaining:rawSelf},result=cleanLoop(fixed.points),resultArea=Math.abs(polygonAreaV40(result)),issues=[];
  if(fixed.remaining)issues.push({severity:'error',code:'OFFSET_SELF_INTERSECTION',detail:'Offset polygon still self-intersects after repair.'});
  if(result.length<3||resultArea<1e-5)issues.push({severity:'error',code:'OFFSET_COLLAPSED',detail:'Offset collapsed the panel polygon.'});
  if(rawSelf&&fixed.repairs)issues.push({severity:'warning',code:'OFFSET_SELF_INTERSECTION_REPAIRED',detail:`Offset self-intersection repaired (${fixed.repairs} loop repair${fixed.repairs===1?'':'s'}).`});
  return{schema:V40_OFFSET_SCHEMA,ok:!issues.some(x=>x.severity==='error'),points:result,bounds:result.length>=3?bounds(result):null,sourceArea:r(Math.abs(area)),area:r(resultArea),distance:r(d),join,repairs:fixed.repairs,issues};
}

function panelPoints(panel){if(Array.isArray(panel?.points)&&panel.points.length>=3)return panel.points.map(p=>[n(p[0]),n(p[1])]);const x=n(panel?.x),y=n(panel?.y),w=n(panel?.w),h=n(panel?.h);return[[x,y],[x+w,y],[x+w,y+h],[x,y+h]]}
function zone(panel,kind,result,amount,join){return{id:`${kind}-${panel.id}`,panelId:panel.id,kind,amountMm:r(amount),join,points:clone(result.points),...result.bounds,area:result.area,offsetSchema:V40_OFFSET_SCHEMA,repaired:Boolean(result.repairs)}}

export function buildProductionZonesV40(topology,{bleedMm=3,safeMm=5,join='miter',miterLimit=4,roundSegments=8}={}){
  const zones={schema:'boxstudio-production-zones-v40',bleed:[],safe:[],glue:[],issues:[]};for(const panel of topology?.panels||[]){const pts=panelPoints(panel),bleed=offsetPolygonV40(pts,Math.max(0,n(bleedMm,3)),{join,miterLimit,roundSegments}),safe=offsetPolygonV40(pts,-Math.max(0,n(safeMm,5)),{join,miterLimit,roundSegments});if(bleed.ok)zones.bleed.push(zone(panel,'bleed',bleed,bleedMm,join));else for(const issue of bleed.issues)zones.issues.push({...issue,panelId:panel.id,zone:'bleed'});if(safe.ok)zones.safe.push(zone(panel,'safe',safe,safeMm,join));else for(const issue of safe.issues)zones.issues.push({...issue,panelId:panel.id,zone:'safe'});if(panel.kind==='glue'||panel.role==='glue'){const b=bounds(pts);zones.glue.push({id:`glue-${panel.id}`,panelId:panel.id,kind:'glue',points:clone(pts),...b,area:r(Math.abs(polygonAreaV40(pts)))})}}
  zones.summary={panels:(topology?.panels||[]).length,bleed:zones.bleed.length,safe:zones.safe.length,glue:zones.glue.length,errors:zones.issues.filter(x=>x.severity==='error').length,warnings:zones.issues.filter(x=>x.severity==='warning').length};zones.ok=zones.summary.errors===0&&zones.summary.bleed===zones.summary.panels&&zones.summary.safe===zones.summary.panels;return zones;
}
