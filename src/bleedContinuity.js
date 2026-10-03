import { buildArtworkAtlas } from './panelArtwork.js';

function num(v,d=0){const n=Number(v);return Number.isFinite(n)?n:d}
function commandBounds(c){
  if(!c)return null;
  if(c.type==='line')return{minX:Math.min(num(c.x1),num(c.x2)),maxX:Math.max(num(c.x1),num(c.x2)),minY:Math.min(num(c.y1),num(c.y2)),maxY:Math.max(num(c.y1),num(c.y2))};
  if(c.type==='svg-appearance')return{minX:num(c.x),maxX:num(c.x)+Math.max(0,num(c.w)),minY:num(c.y),maxY:num(c.y)+Math.max(0,num(c.h))};
  return{minX:num(c.x),maxX:num(c.x)+Math.max(0,num(c.w)),minY:num(c.y),maxY:num(c.y)+Math.max(0,num(c.h))};
}
function planFor(atlas,panelId){return atlas.plans.find(p=>p.panelId===panelId)||null}
function nodePanel(graphNode,geo){return geo?.panelMap?.[graphNode?.id]||geo?.panelMap?.[graphNode?.artPanel]||null}
function artPanelId(node){return node?.artPanel||node?.id}
function seamSide(panel,hinge){
  const x=num(hinge?.x1),y=num(hinge?.y1),left=Math.abs(x-num(panel?.x)),right=Math.abs(x-(num(panel?.x)+num(panel?.w))),top=Math.abs(y-num(panel?.y)),bottom=Math.abs(y-(num(panel?.y)+num(panel?.h))),vertical=Math.abs(num(hinge?.x2)-num(hinge?.x1))<Math.abs(num(hinge?.y2)-num(hinge?.y1));
  if(vertical)return left<=right?'left':'right';return top<=bottom?'top':'bottom';
}
function localSeam(panel,hinge,side){if(side==='left'||side==='right')return num(hinge.x1)-num(panel.x);return num(hinge.y1)-num(panel.y)}
function commandNearSeam(c,side,seam,band){const b=commandBounds(c);if(!b)return false;if(side==='left'||side==='right')return b.maxX>=seam-band&&b.minX<=seam+band;return b.maxY>=seam-band&&b.minY<=seam+band}
function nearCommands(plan,side,seam,band){return(plan?.commands||[]).filter(c=>commandNearSeam(c,side,seam,band))}

export function buildBleedContinuityReport(state,geo,graph,{bandMm=null}={}){
  const atlas=buildArtworkAtlas(state,geo),nodes=new Map((graph?.nodes||[]).map(n=>[n.id,n])),band=Math.max(.1,num(bandMm,state?.structure?.bleed||3)),seams=[];let twoSided=0,oneSided=0,empty=0,missing=0;
  for(const edge of graph?.edges||[]){const na=nodes.get(edge.from),nb=nodes.get(edge.to),pa=nodePanel(na,geo),pb=nodePanel(nb,geo),hinge=edge.hinge;if(!pa||!pb||!hinge){missing++;seams.push({from:edge.from,to:edge.to,status:'missing',reason:'missing panel or hinge'});continue}
    const aId=artPanelId(na),bId=artPanelId(nb),aSide=seamSide(pa,hinge),bSide=seamSide(pb,hinge),aSeam=localSeam(pa,hinge,aSide),bSeam=localSeam(pb,hinge,bSide),aHits=nearCommands(planFor(atlas,aId),aSide,aSeam,band),bHits=nearCommands(planFor(atlas,bId),bSide,bSeam,band);let status='empty';if(aHits.length&&bHits.length){status='two-sided';twoSided++}else if(aHits.length||bHits.length){status='one-sided';oneSided++}else empty++;
    seams.push({from:edge.from,to:edge.to,label:edge.label||'',status,bandMm:band,a:{panelId:aId,side:aSide,count:aHits.length,sources:[...new Set(aHits.map(x=>x.source).filter(Boolean))]},b:{panelId:bId,side:bSide,count:bHits.length,sources:[...new Set(bHits.map(x=>x.source).filter(Boolean))]}})}
  return{seams,total:seams.length,twoSided,oneSided,empty,missing,bandMm:band,warnings:oneSided+missing};
}

export function continuitySummary(report){return{total:report?.total||0,twoSided:report?.twoSided||0,oneSided:report?.oneSided||0,empty:report?.empty||0,missing:report?.missing||0,warnings:report?.warnings||0,bandMm:report?.bandMm||0};}
