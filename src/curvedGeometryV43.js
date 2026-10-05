const EPS=1e-9;
const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const pt=(x,y)=>({x:n(x),y:n(y)});
const len=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
const unit=(x,y)=>{const d=Math.hypot(x,y);return d>EPS?{x:x/d,y:y/d}:{x:0,y:0}};
const dot=(a,b)=>a.x*b.x+a.y*b.y;
const cross=(a,b)=>a.x*b.y-a.y*b.x;
const rad=d=>d*Math.PI/180;
const deg=r=>r*180/Math.PI;

export function cubicPointV43(curve,t){
  const u=1-t,x=u*u*u*curve.x1+3*u*u*t*curve.c1x+3*u*t*t*curve.c2x+t*t*t*curve.x2,y=u*u*u*curve.y1+3*u*u*t*curve.c1y+3*u*t*t*curve.c2y+t*t*t*curve.y2;return{x,y};
}

export function sampleCubicV43(curve,steps=12){
  const count=Math.max(2,Math.round(n(steps,12))),out=[];for(let i=0;i<=count;i++)out.push(cubicPointV43(curve,i/count));return out;
}

export function cubicFilletV43(a0,corner,b0,radius,{kind='CUT',panelId=null}={}){
  const a=pt(a0.x,a0.y),c=pt(corner.x,corner.y),b=pt(b0.x,b0.y),ua=unit(a.x-c.x,a.y-c.y),ub=unit(b.x-c.x,b.y-c.y),la=len(a,c),lb=len(b,c),theta=Math.acos(clamp(dot(ua,ub),-1,1));
  if(!(radius>EPS)||la<EPS||lb<EPS||theta<EPS||Math.abs(Math.PI-theta)<1e-5)return null;
  const rMax=Math.max(0,Math.min(la,lb)*.45*Math.tan(theta/2)),r=Math.min(Math.abs(n(radius)),rMax);if(r<EPS)return null;
  const tangent=r/Math.tan(theta/2),start={x:c.x+ua.x*tangent,y:c.y+ua.y*tangent},end={x:c.x+ub.x*tangent,y:c.y+ub.y*tangent},turn=Math.PI-theta,h=4/3*Math.tan(turn/4)*r;
  const inDir=unit(c.x-a.x,c.y-a.y),outDir=unit(b.x-c.x,b.y-c.y),curve={type:'C',kind,x1:start.x,y1:start.y,c1x:start.x+inDir.x*h,c1y:start.y+inDir.y*h,c2x:end.x-outDir.x*h,c2y:end.y-outDir.y*h,x2:end.x,y2:end.y,radius:r,panelId};
  return{radius:r,start,end,curve,turnRadians:turn,clockwise:cross(inDir,outDir)>0};
}

export function svgArcCenterV43(raw){
  const x1=n(raw.x1),y1=n(raw.y1),x2=n(raw.x2),y2=n(raw.y2),rotation=n(raw.rotation),largeArc=Boolean(Number(raw.largeArc)||raw.largeArc===true),sweep=Boolean(Number(raw.sweep)||raw.sweep===true);let rx=Math.abs(n(raw.rx,1)),ry=Math.abs(n(raw.ry,1));
  if(rx<EPS||ry<EPS||Math.hypot(x2-x1,y2-y1)<EPS)return null;
  const phi=rad(rotation%360),cp=Math.cos(phi),sp=Math.sin(phi),dx=(x1-x2)/2,dy=(y1-y2)/2,xp=cp*dx+sp*dy,yp=-sp*dx+cp*dy,lambda=xp*xp/(rx*rx)+yp*yp/(ry*ry);if(lambda>1){const scale=Math.sqrt(lambda);rx*=scale;ry*=scale}
  const rx2=rx*rx,ry2=ry*ry,numr=Math.max(0,rx2*ry2-rx2*yp*yp-ry2*xp*xp),den=Math.max(EPS,rx2*yp*yp+ry2*xp*xp),sign=largeArc===sweep?-1:1,k=sign*Math.sqrt(numr/den),cxp=k*(rx*yp/ry),cyp=k*(-ry*xp/rx),cx=cp*cxp-sp*cyp+(x1+x2)/2,cy=sp*cxp+cp*cyp+(y1+y2)/2;
  const angle=(ux,uy,vx,vy)=>{const d=Math.hypot(ux,uy)*Math.hypot(vx,vy);if(d<EPS)return 0;const a=Math.acos(clamp((ux*vx+uy*vy)/d,-1,1));return ux*vy-uy*vx<0?-a:a},ux=(xp-cxp)/rx,uy=(yp-cyp)/ry,vx=(-xp-cxp)/rx,vy=(-yp-cyp)/ry,theta1=angle(1,0,ux,uy);let delta=angle(ux,uy,vx,vy);if(!sweep&&delta>0)delta-=Math.PI*2;if(sweep&&delta<0)delta+=Math.PI*2;
  return{cx,cy,rx,ry,rotation,phi,theta1,delta,largeArc,sweep,x1,y1,x2,y2};
}

function ellipsePoint(center,theta){const ct=Math.cos(theta),st=Math.sin(theta),cp=Math.cos(center.phi),sp=Math.sin(center.phi);return{x:center.cx+cp*center.rx*ct-sp*center.ry*st,y:center.cy+sp*center.rx*ct+cp*center.ry*st};}
function ellipseDerivative(center,theta){const ct=Math.cos(theta),st=Math.sin(theta),cp=Math.cos(center.phi),sp=Math.sin(center.phi);return{x:-cp*center.rx*st-sp*center.ry*ct,y:-sp*center.rx*st+cp*center.ry*ct};}

export function arcToCubicsV43(raw,{kind=raw?.kind||'CUT'}={}){
  const center=svgArcCenterV43(raw);if(!center)return[];const count=Math.max(1,Math.ceil(Math.abs(center.delta)/(Math.PI/2))),step=center.delta/count,out=[];for(let i=0;i<count;i++){const a=center.theta1+i*step,b=a+step,p0=ellipsePoint(center,a),p1=ellipsePoint(center,b),d0=ellipseDerivative(center,a),d1=ellipseDerivative(center,b),alpha=4/3*Math.tan(step/4);out.push({type:'C',kind,x1:p0.x,y1:p0.y,c1x:p0.x+alpha*d0.x,c1y:p0.y+alpha*d0.y,c2x:p1.x-alpha*d1.x,c2y:p1.y-alpha*d1.y,x2:p1.x,y2:p1.y,sourceArc:true})}return out;
}

export function nativeArcForDxfV43(raw,tolerance=1e-5){
  const center=svgArcCenterV43(raw);if(!center||Math.abs(center.rx-center.ry)>Math.max(tolerance,Math.max(center.rx,center.ry)*1e-6))return null;const a1=deg(center.theta1),a2=deg(center.theta1+center.delta),norm=a=>((a%360)+360)%360;return center.delta>=0?{cx:center.cx,cy:center.cy,r:center.rx,start:norm(a1),end:norm(a2)}:{cx:center.cx,cy:center.cy,r:center.rx,start:norm(a2),end:norm(a1)};
}

export function curveRecordToCubicsV43(raw){
  if(!raw)return[];if(raw.type==='C')return[{...raw}];if(raw.type==='Q'){const x1=n(raw.x1),y1=n(raw.y1),x2=n(raw.x2),y2=n(raw.y2),cx=n(raw.cx),cy=n(raw.cy);return[{type:'C',kind:raw.kind||raw.lineType||'CUT',x1,y1,c1x:x1+2/3*(cx-x1),c1y:y1+2/3*(cy-y1),c2x:x2+2/3*(cx-x2),c2y:y2+2/3*(cy-y2),x2,y2}]}if(raw.type==='A')return arcToCubicsV43(raw,{kind:raw.kind||raw.lineType||'CUT'});return[];
}

export function curveDiagnosticsV43(curves=[]){let cubic=0,arc=0,invalid=0;for(const c of curves||[]){if(c?.type==='C'){cubic++;if(![c.x1,c.y1,c.c1x,c.c1y,c.c2x,c.c2y,c.x2,c.y2].every(Number.isFinite))invalid++}else if(c?.type==='A'){arc++;if(!svgArcCenterV43(c))invalid++}else invalid++}return{cubic,arc,invalid,total:cubic+arc+invalid};}
