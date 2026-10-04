const num=(v,d=0)=>{const n=Number(v);return Number.isFinite(n)?n:d};
function wrap180(v){let d=num(v)%360;if(d>180)d-=360;if(d<-180)d+=360;return d;}
function nearestEquivalent(target,reference){const t=num(target),r=num(reference);return t+Math.round((r-t)/360)*360;}
function rank(kind){return kind==='group-rotation-match'?0:kind==='group-rotation-axis'?1:2;}

export function liveGroupRotationAssistV28(state,ids,rawDelta,{enabled=true,toleranceDeg=3,step=15,includeOrthogonal=true}={}){
  const selection=[...new Set(ids||[])],selected=(state?.elements||[]).filter(e=>selection.includes(e.id)&&e.type==='cross-panel-artwork'),others=(state?.elements||[]).filter(e=>!selection.includes(e.id)&&e.type==='cross-panel-artwork'),raw=num(rawDelta),tol=Math.max(0,num(toleranceDeg,3));
  if(!enabled||selected.length<2)return{delta:raw,guides:[]};
  const candidates=[],gridStep=Math.max(.1,num(step,15)),grid=Math.round(raw/gridStep)*gridStep;
  candidates.push({delta:grid,kind:'group-rotation-grid',label:`group grid ${grid.toFixed(1)}°`});
  for(const source of selected){
    const sourceAngle=num(source.r);
    for(const target of others){
      const targetAngle=num(target.r),base=nearestEquivalent(targetAngle-sourceAngle,raw);
      candidates.push({delta:base,kind:'group-rotation-match',sourceId:source.id,targetId:target.id,label:`${source.id} → ${target.id} ${targetAngle.toFixed(1)}°`});
      if(includeOrthogonal)for(const off of [90,180,270]){
        const delta=nearestEquivalent(targetAngle+off-sourceAngle,raw);
        candidates.push({delta,kind:'group-rotation-axis',sourceId:source.id,targetId:target.id,offset:off,label:`${source.id} → ${target.id} + ${off}°`});
      }
    }
  }
  let best=null;
  for(const c of candidates){const diff=wrap180(c.delta-raw);if(Math.abs(diff)>tol)continue;if(!best||Math.abs(diff)<Math.abs(best.diff)-1e-9||(Math.abs(Math.abs(diff)-Math.abs(best.diff))<1e-9&&rank(c.kind)<rank(best.kind)))best={...c,diff};}
  if(!best)return{delta:raw,guides:[]};
  const delta=raw+best.diff;
  return{delta,guides:[{kind:best.kind,axis:'angle',value:delta,sourceId:best.sourceId||null,targetId:best.targetId||null,offset:best.offset||0,label:best.label}]};
}

export function groupRotationDiagnosticsV28(state,ids=[]){const selection=[...new Set(ids)],selected=(state?.elements||[]).filter(e=>selection.includes(e.id)&&e.type==='cross-panel-artwork'),targets=(state?.elements||[]).filter(e=>!selection.includes(e.id)&&e.type==='cross-panel-artwork');return{selectionCount:selected.length,targetCount:targets.length,objectRelativeAvailable:selected.length>=2&&targets.length>0};}
