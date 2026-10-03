function num(v,d=0){const n=Number(v);return Number.isFinite(n)?n:d}
function mmFromLength(v, fallback=0){const s=String(v??'').trim();const n=parseFloat(s);if(!Number.isFinite(n))return fallback;if(/mm$/i.test(s))return n;if(/cm$/i.test(s))return n*10;if(/in$/i.test(s))return n*25.4;if(/pt$/i.test(s))return n*25.4/72;if(/px$/i.test(s))return n*25.4/96;return n}
function kindFromEl(el){const s=[el.id,el.getAttribute('class'),el.getAttribute('stroke'),el.getAttribute('style'),el.getAttribute('data-layer'),el.parentElement?.id].filter(Boolean).join(' ').toLowerCase();if(/crease|fold|压线|red|#f00|#ff0000|rgb\(255\s*,\s*0\s*,\s*0/.test(s))return'CREASE';if(/perf|dash|齿|purple|violet/.test(s))return'PERF';if(/glue|糊|green/.test(s))return'GLUE';return'CUT'}
function line(x1,y1,x2,y2,type='CUT'){return{x1:num(x1),y1:num(y1),x2:num(x2),y2:num(y2),type}}
function parsePoints(s=''){const a=String(s).trim().split(/[\s,]+/).map(Number).filter(Number.isFinite),out=[];for(let i=0;i+1<a.length;i+=2)out.push([a[i],a[i+1]]);return out}
function pathTokens(d=''){return String(d).match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g)||[]}

export const IDENTITY=[1,0,0,1,0,0];
export function multiplyMatrix(A=IDENTITY,B=IDENTITY){return[A[0]*B[0]+A[2]*B[1],A[1]*B[0]+A[3]*B[1],A[0]*B[2]+A[2]*B[3],A[1]*B[2]+A[3]*B[3],A[0]*B[4]+A[2]*B[5]+A[4],A[1]*B[4]+A[3]*B[5]+A[5]]}
export function applyMatrix(m=IDENTITY,x=0,y=0){return[m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]]}
export function parseTransform(value=''){
  let m=[...IDENTITY];const re=/([a-zA-Z]+)\s*\(([^)]*)\)/g;let x;
  while((x=re.exec(String(value||'')))){const name=x[1].toLowerCase(),p=x[2].trim().split(/[\s,]+/).filter(Boolean).map(Number),rad=d=>d*Math.PI/180;let t=[...IDENTITY];
    if(name==='matrix'&&p.length>=6)t=p.slice(0,6);
    else if(name==='translate')t=[1,0,0,1,p[0]||0,p[1]||0];
    else if(name==='scale'){const sx=p[0]??1,sy=p[1]??sx;t=[sx,0,0,sy,0,0]}
    else if(name==='rotate'){const a=rad(p[0]||0),c=Math.cos(a),s=Math.sin(a),r=[c,s,-s,c,0,0];if(p.length>=3){const [cx,cy]=[p[1],p[2]];t=multiplyMatrix(multiplyMatrix([1,0,0,1,cx,cy],r),[1,0,0,1,-cx,-cy])}else t=r}
    else if(name==='skewx')t=[1,0,Math.tan(rad(p[0]||0)),1,0,0];
    else if(name==='skewy')t=[1,Math.tan(rad(p[0]||0)),0,1,0,0];
    m=multiplyMatrix(m,t);
  }
  return m;
}
function matrixForElement(el,root){const chain=[];let n=el;while(n&&n!==root){if(n.getAttribute)chain.push(parseTransform(n.getAttribute('transform')||''));n=n.parentElement}let m=[...IDENTITY];for(let i=chain.length-1;i>=0;i--)m=multiplyMatrix(m,chain[i]);return m}
function transformLine(l,m){const a=applyMatrix(m,l.x1,l.y1),b=applyMatrix(m,l.x2,l.y2);return{...l,x1:a[0],y1:a[1],x2:b[0],y2:b[1]}}
function transformCurve(c,m){const start=applyMatrix(m,c.x1,c.y1),end=applyMatrix(m,c.x2,c.y2),out={...c,x1:start[0],y1:start[1],x2:end[0],y2:end[1]};if(c.type==='C'){const p1=applyMatrix(m,c.c1x,c.c1y),p2=applyMatrix(m,c.c2x,c.c2y);Object.assign(out,{c1x:p1[0],c1y:p1[1],c2x:p2[0],c2y:p2[1]})}if(c.type==='Q'){const p=applyMatrix(m,c.cx,c.cy);Object.assign(out,{cx:p[0],cy:p[1]})}if(c.type==='A'){const sx=Math.hypot(m[0],m[1]),sy=Math.hypot(m[2],m[3]),rot=Math.atan2(m[1],m[0])*180/Math.PI;Object.assign(out,{rx:Math.abs(c.rx*sx),ry:Math.abs(c.ry*sy),rotation:(c.rotation||0)+rot})}return out}
function pathSegments(d='',type='CUT'){
  const t=pathTokens(d),lines=[],curves=[];let i=0,cmd='',x=0,y=0,sx=0,sy=0;const next=()=>Number(t[i++]),isCmd=v=>/^[a-zA-Z]$/.test(v||'');
  while(i<t.length){if(isCmd(t[i]))cmd=t[i++];if(!cmd)break;const rel=cmd===cmd.toLowerCase(),u=cmd.toUpperCase();
    if(u==='M'){let nx=next(),ny=next();if(rel){nx+=x;ny+=y}x=nx;y=ny;sx=x;sy=y;cmd=rel?'l':'L'}
    else if(u==='L'){let nx=next(),ny=next();if(rel){nx+=x;ny+=y}lines.push(line(x,y,nx,ny,type));x=nx;y=ny}
    else if(u==='H'){let nx=next();if(rel)nx+=x;lines.push(line(x,y,nx,y,type));x=nx}
    else if(u==='V'){let ny=next();if(rel)ny+=y;lines.push(line(x,y,x,ny,type));y=ny}
    else if(u==='C'){let c1x=next(),c1y=next(),c2x=next(),c2y=next(),nx=next(),ny=next();if(rel){c1x+=x;c1y+=y;c2x+=x;c2y+=y;nx+=x;ny+=y}curves.push({type:'C',kind:type,x1:x,y1:y,c1x,c1y,c2x,c2y,x2:nx,y2:ny});x=nx;y=ny}
    else if(u==='Q'){let cx=next(),cy=next(),nx=next(),ny=next();if(rel){cx+=x;cy+=y;nx+=x;ny+=y}curves.push({type:'Q',kind:type,x1:x,y1:y,cx,cy,x2:nx,y2:ny});x=nx;y=ny}
    else if(u==='A'){let rx=next(),ry=next(),rotation=next(),largeArc=next(),sweep=next(),nx=next(),ny=next();if(rel){nx+=x;ny+=y}curves.push({type:'A',kind:type,x1:x,y1:y,rx,ry,rotation,largeArc:Number(largeArc)||0,sweep:Number(sweep)||0,x2:nx,y2:ny});x=nx;y=ny}
    else if(u==='Z'){lines.push(line(x,y,sx,sy,type));x=sx;y=sy;cmd=''}
    else{while(i<t.length&&!isCmd(t[i]))i++;cmd=''}
  }
  return{lines,curves};
}
export function curveToPath(c){if(c.type==='C')return`M ${c.x1} ${c.y1} C ${c.c1x} ${c.c1y} ${c.c2x} ${c.c2y} ${c.x2} ${c.y2}`;if(c.type==='Q')return`M ${c.x1} ${c.y1} Q ${c.cx} ${c.cy} ${c.x2} ${c.y2}`;if(c.type==='A')return`M ${c.x1} ${c.y1} A ${Math.max(.001,c.rx)} ${Math.max(.001,c.ry)} ${c.rotation||0} ${c.largeArc?1:0} ${c.sweep?1:0} ${c.x2} ${c.y2}`;return`M ${c.x1} ${c.y1} L ${c.x2} ${c.y2}`}
function sampleCurve(c,steps=16){
  const out=[];
  if(c.type==='C'){
    let px=c.x1,py=c.y1;for(let k=1;k<=steps;k++){const q=k/steps,a=(1-q)**3,b=3*(1-q)**2*q,d=3*(1-q)*q*q,e=q**3,xx=a*c.x1+b*c.c1x+d*c.c2x+e*c.x2,yy=a*c.y1+b*c.c1y+d*c.c2y+e*c.y2;out.push(line(px,py,xx,yy,c.kind));px=xx;py=yy}
  }else if(c.type==='Q'){
    let px=c.x1,py=c.y1;for(let k=1;k<=steps;k++){const q=k/steps,xx=(1-q)*(1-q)*c.x1+2*(1-q)*q*c.cx+q*q*c.x2,yy=(1-q)*(1-q)*c.y1+2*(1-q)*q*c.cy+q*q*c.y2;out.push(line(px,py,xx,yy,c.kind));px=xx;py=yy}
  }else if(c.type==='A'){
    let rx=Math.abs(Number(c.rx)||0),ry=Math.abs(Number(c.ry)||0);if(rx<1e-9||ry<1e-9)return[line(c.x1,c.y1,c.x2,c.y2,c.kind)];
    const phi=(Number(c.rotation)||0)*Math.PI/180,cos=Math.cos(phi),sin=Math.sin(phi),dx=(c.x1-c.x2)/2,dy=(c.y1-c.y2)/2,xp=cos*dx+sin*dy,yp=-sin*dx+cos*dy;let lam=xp*xp/(rx*rx)+yp*yp/(ry*ry);if(lam>1){const sc=Math.sqrt(lam);rx*=sc;ry*=sc}
    const den=(rx*rx*yp*yp+ry*ry*xp*xp)||1,num=Math.max(0,(rx*rx*ry*ry-rx*rx*yp*yp-ry*ry*xp*xp)/den),sign=(Boolean(c.largeArc)===Boolean(c.sweep))?-1:1,coef=sign*Math.sqrt(num),cxp=coef*(rx*yp/ry),cyp=coef*(-ry*xp/rx),cx=cos*cxp-sin*cyp+(c.x1+c.x2)/2,cy=sin*cxp+cos*cyp+(c.y1+c.y2)/2;
    const ang=(ux,uy,vx,vy)=>{const dot=ux*vx+uy*vy,det=ux*vy-uy*vx;return Math.atan2(det,dot)},ux=(xp-cxp)/rx,uy=(yp-cyp)/ry,vx=(-xp-cxp)/rx,vy=(-yp-cyp)/ry;let theta=ang(1,0,ux,uy),delta=ang(ux,uy,vx,vy);if(!c.sweep&&delta>0)delta-=Math.PI*2;if(c.sweep&&delta<0)delta+=Math.PI*2;
    const segs=Math.max(4,Math.ceil(Math.abs(delta)/(Math.PI/2)*Math.max(2,steps/4)));let px=c.x1,py=c.y1;for(let k=1;k<=segs;k++){const a=theta+delta*k/segs,xx=cx+rx*Math.cos(a)*cos-ry*Math.sin(a)*sin,yy=cy+rx*Math.cos(a)*sin+ry*Math.sin(a)*cos;out.push(line(px,py,xx,yy,c.kind));px=xx;py=yy}
  }else out.push(line(c.x1,c.y1,c.x2,c.y2,c.kind));
  return out;
}
export function flattenCurves(curves=[],steps=16){return curves.flatMap(c=>sampleCurve(c,steps))}
function bounds(lines,curves=[]){const xs=[],ys=[];for(const l of lines){xs.push(l.x1,l.x2);ys.push(l.y1,l.y2)}for(const c of curves){xs.push(c.x1,c.x2);ys.push(c.y1,c.y2);if(c.type==='C'){xs.push(c.c1x,c.c2x);ys.push(c.c1y,c.c2y)}if(c.type==='Q'){xs.push(c.cx);ys.push(c.cy)}if(c.type==='A'){xs.push(c.x1-c.rx,c.x1+c.rx,c.x2-c.rx,c.x2+c.rx);ys.push(c.y1-c.ry,c.y1+c.ry,c.y2-c.ry,c.y2+c.ry)}}if(!xs.length)return{minX:0,minY:0,maxX:100,maxY:100,width:100,height:100};const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);return{minX,minY,maxX,maxY,width:maxX-minX,height:maxY-minY}}
function shiftLines(lines,dx,dy,scale=1){return lines.map(l=>({...l,x1:(l.x1+dx)*scale,y1:(l.y1+dy)*scale,x2:(l.x2+dx)*scale,y2:(l.y2+dy)*scale}))}
function shiftCurves(curves,dx,dy,scale=1){return curves.map(c=>{const o={...c,x1:(c.x1+dx)*scale,y1:(c.y1+dy)*scale,x2:(c.x2+dx)*scale,y2:(c.y2+dy)*scale};if(c.type==='C')Object.assign(o,{c1x:(c.c1x+dx)*scale,c1y:(c.c1y+dy)*scale,c2x:(c.c2x+dx)*scale,c2y:(c.c2y+dy)*scale});if(c.type==='Q')Object.assign(o,{cx:(c.cx+dx)*scale,cy:(c.cy+dy)*scale});if(c.type==='A')Object.assign(o,{rx:c.rx*scale,ry:c.ry*scale});return o})}
function hasEdge(lines,x1,y1,x2,y2,tol=.75){const horiz=Math.abs(y1-y2)<tol;return lines.some(l=>{if(horiz&&Math.abs(l.y1-l.y2)<tol&&Math.abs(l.y1-y1)<tol){const a=Math.min(l.x1,l.x2),b=Math.max(l.x1,l.x2);return a<=Math.min(x1,x2)+tol&&b>=Math.max(x1,x2)-tol}if(!horiz&&Math.abs(l.x1-l.x2)<tol&&Math.abs(l.x1-x1)<tol){const a=Math.min(l.y1,l.y2),b=Math.max(l.y1,l.y2);return a<=Math.min(y1,y2)+tol&&b>=Math.max(y1,y2)-tol}return false})}
export function inferPanels(lines,width,height){
  const straight=lines.filter(l=>Math.abs(l.x1-l.x2)<.5||Math.abs(l.y1-l.y2)<.5),xs=[0,width],ys=[0,height];for(const l of straight){if(Math.abs(l.x1-l.x2)<.5)xs.push((l.x1+l.x2)/2);if(Math.abs(l.y1-l.y2)<.5)ys.push((l.y1+l.y2)/2)}
  const uniq=a=>[...new Set(a.map(v=>Math.round(v*10)/10))].sort((a,b)=>a-b),X=uniq(xs),Y=uniq(ys),panels=[];
  for(let xi=0;xi<X.length-1;xi++)for(let yi=0;yi<Y.length-1;yi++){const x1=X[xi],x2=X[xi+1],y1=Y[yi],y2=Y[yi+1],w=x2-x1,h=y2-y1;if(w<8||h<8)continue;if(hasEdge(straight,x1,y1,x2,y1)&&hasEdge(straight,x1,y2,x2,y2)&&hasEdge(straight,x1,y1,x1,y2)&&hasEdge(straight,x2,y1,x2,y2))panels.push({id:`panel-${panels.length+1}`,label:`Panel ${panels.length+1}`,x:x1,y:y1,w,h,kind:'panel'})}
  if(!panels.length)panels.push({id:'artboard',label:'Imported Artboard',x:0,y:0,w:width,h:height,kind:'panel'});return panels.slice(0,80);
}
function overlap(a1,a2,b1,b2){return Math.max(0,Math.min(a2,b2)-Math.max(a1,b1))}
function creaseCovers(crease,hinge,tol=1.2){if(hinge.orientation==='vertical'){if(Math.abs(crease.x1-crease.x2)>tol||Math.abs((crease.x1+crease.x2)/2-hinge.x1)>tol)return false;return overlap(Math.min(crease.y1,crease.y2),Math.max(crease.y1,crease.y2),hinge.y1,hinge.y2)>Math.min(hinge.y2-hinge.y1,8)}if(Math.abs(crease.y1-crease.y2)>tol||Math.abs((crease.y1+crease.y2)/2-hinge.y1)>tol)return false;return overlap(Math.min(crease.x1,crease.x2),Math.max(crease.x1,crease.x2),hinge.x1,hinge.x2)>Math.min(hinge.x2-hinge.x1,8)}
export function inferFoldCandidates(panels=[],creaseLines=[]){const rectPanels=panels.filter(p=>!(p.points&&p.points.length>=3)),out=[];for(let i=0;i<rectPanels.length;i++)for(let j=i+1;j<rectPanels.length;j++){const a=rectPanels[i],b=rectPanels[j],tol=.8;let hinge=null;if(Math.abs(a.x+a.w-b.x)<tol||Math.abs(b.x+b.w-a.x)<tol){const x=Math.abs(a.x+a.w-b.x)<tol?a.x+a.w:b.x+b.w,y1=Math.max(a.y,b.y),y2=Math.min(a.y+a.h,b.y+b.h);if(y2-y1>2)hinge={x1:x,y1,x2:x,y2,orientation:'vertical'}}else if(Math.abs(a.y+a.h-b.y)<tol||Math.abs(b.y+b.h-a.y)<tol){const y=Math.abs(a.y+a.h-b.y)<tol?a.y+a.h:b.y+b.h,x1=Math.max(a.x,b.x),x2=Math.min(a.x+a.w,b.x+b.w);if(x2-x1>2)hinge={x1,y1:y,x2,y2:y,orientation:'horizontal'}}if(hinge&&creaseLines.some(c=>creaseCovers(c,hinge))){out.push({id:`fold-${a.id}-${b.id}`,a:a.id,b:b.id,angle:90,confirmed:false,hinge})}}return out}

export function parseSvgDieline(text){
  const doc=new DOMParser().parseFromString(text,'image/svg+xml'),svg=doc.documentElement;if(svg.tagName.toLowerCase()!=='svg')throw new Error('不是有效 SVG');let vb=(svg.getAttribute('viewBox')||'').trim().split(/[\s,]+/).map(Number),sx=1,sy=1;
  if(vb.length===4&&vb.every(Number.isFinite)){const wmm=mmFromLength(svg.getAttribute('width'),0),hmm=mmFromLength(svg.getAttribute('height'),0);if(wmm>0)sx=wmm/vb[2];if(hmm>0)sy=hmm/vb[3];if(wmm>0&&!hmm)sy=sx;if(hmm>0&&!wmm)sx=sy}else vb=[0,0,0,0];
  const sets={CUT:[],CREASE:[],PERF:[],GLUE:[]},curveSets={CUT:[],CREASE:[],PERF:[],GLUE:[]};let transformed=0;
  for(const el of Array.from(svg.querySelectorAll('line,rect,polyline,polygon,path'))){const k=kindFromEl(el),arr=sets[k],curves=curveSets[k],m=matrixForElement(el,svg);if((el.getAttribute('transform')||'')||el.closest('g[transform]'))transformed++;
    const addLine=l=>arr.push(transformLine(l,m)),addCurve=c=>curves.push(transformCurve(c,m));
    if(el.tagName==='line')addLine(line(el.getAttribute('x1'),el.getAttribute('y1'),el.getAttribute('x2'),el.getAttribute('y2'),k));
    else if(el.tagName==='rect'){const x=num(el.getAttribute('x')),y=num(el.getAttribute('y')),w=num(el.getAttribute('width')),h=num(el.getAttribute('height'));[line(x,y,x+w,y,k),line(x+w,y,x+w,y+h,k),line(x+w,y+h,x,y+h,k),line(x,y+h,x,y,k)].forEach(addLine)}
    else if(el.tagName==='polyline'||el.tagName==='polygon'){const p=parsePoints(el.getAttribute('points')),n=el.tagName==='polygon'?p.length:p.length-1;for(let i=0;i<n;i++){const a=p[i],b=p[(i+1)%p.length];if(a&&b)addLine(line(a[0],a[1],b[0],b[1],k))}}
    else{const parsed=pathSegments(el.getAttribute('d')||'',k);parsed.lines.forEach(addLine);parsed.curves.forEach(addCurve)}
  }
  let all=Object.values(sets).flat(),allCurves=Object.values(curveSets).flat();if(!all.length&&!allCurves.length)throw new Error('SVG 中没有可识别的 line/rect/polyline/path 刀线');const b=bounds(all,allCurves),dx=-b.minX,dy=-b.minY,scale=Math.min(sx,sy)||1;for(const k of Object.keys(sets)){sets[k]=shiftLines(sets[k],dx,dy,scale);curveSets[k]=shiftCurves(curveSets[k],dx,dy,scale)}all=Object.values(sets).flat();allCurves=Object.values(curveSets).flat();const b2=bounds(all,allCurves),width=Math.max(1,b2.width),height=Math.max(1,b2.height),panelBasis=all.concat(flattenCurves(allCurves,10)),panels=inferPanels(panelBasis,width,height),foldCandidates=inferFoldCandidates(panels,sets.CREASE.concat(flattenCurves(curveSets.CREASE,12)));
  return{width,height,cutLines:sets.CUT,creaseLines:sets.CREASE,perfLines:sets.PERF,glueLines:sets.GLUE,cutCurves:curveSets.CUT,creaseCurves:curveSets.CREASE,perfCurves:curveSets.PERF,glueCurves:curveSets.GLUE,panels,foldCandidates,foldRoot:panels[0]?.id||'artboard',source:'SVG',warnings:[...(transformed?[`已展开 ${transformed} 个带 transform/父级 transform 的 SVG 元素。复杂 skew + arc 仍建议生产前核对。`]:[]),...(allCurves.length?[`保留 ${allCurves.length} 条原生 Bezier / Arc 曲线，可在 V0.7 曲线编辑器中修改控制点。`]:[])]};
}

export function parseDxfDieline(text){
  const raw=String(text||'').replace(/\r/g,'').split('\n'),pairs=[];for(let i=0;i+1<raw.length;i+=2)pairs.push([raw[i].trim(),raw[i+1].trim()]);const sets={CUT:[],CREASE:[],PERF:[],GLUE:[]};let i=0;const layerKind=l=>/crease|fold/i.test(l)?'CREASE':/perf/i.test(l)?'PERF':/glue/i.test(l)?'GLUE':'CUT';
  while(i<pairs.length){if(pairs[i][0]==='0'&&pairs[i][1]==='LINE'){let layer='CUT',x1=0,y1=0,x2=0,y2=0;i++;while(i<pairs.length&&pairs[i][0]!=='0'){const[c,v]=pairs[i];if(c==='8')layer=v;if(c==='10')x1=num(v);if(c==='20')y1=num(v);if(c==='11')x2=num(v);if(c==='21')y2=num(v);i++}sets[layerKind(layer)].push(line(x1,-y1,x2,-y2,layerKind(layer)));continue}
    if(pairs[i][0]==='0'&&(pairs[i][1]==='LWPOLYLINE'||pairs[i][1]==='POLYLINE')){let layer='CUT',pts=[],closed=false;i++;while(i<pairs.length&&!(pairs[i][0]==='0'&&(pairs[i][1]==='LINE'||pairs[i][1]==='LWPOLYLINE'||pairs[i][1]==='POLYLINE'||pairs[i][1]==='ENDSEC'||pairs[i][1]==='EOF'))){const[c,v]=pairs[i];if(c==='8')layer=v;if(c==='70')closed=(Number(v)&1)===1;if(c==='10'){const x=num(v),yPair=pairs[i+1]?.[0]==='20'?pairs[++i]:['20','0'];pts.push([x,-num(yPair[1])])}i++}const k=layerKind(layer);for(let p=0;p<pts.length-1;p++)sets[k].push(line(...pts[p],...pts[p+1],k));if(closed&&pts.length>2)sets[k].push(line(...pts[pts.length-1],...pts[0],k));continue}i++}
  let all=Object.values(sets).flat();if(!all.length)throw new Error('DXF 中没有可识别的 LINE/LWPOLYLINE');const b=bounds(all);for(const k of Object.keys(sets))sets[k]=shiftLines(sets[k],-b.minX,-b.minY,1);all=Object.values(sets).flat();const b2=bounds(all),width=Math.max(1,b2.width),height=Math.max(1,b2.height),panels=inferPanels(all,width,height),foldCandidates=inferFoldCandidates(panels,sets.CREASE);return{width,height,cutLines:sets.CUT,creaseLines:sets.CREASE,perfLines:sets.PERF,glueLines:sets.GLUE,cutCurves:[],creaseCurves:[],perfCurves:[],glueCurves:[],panels,foldCandidates,foldRoot:panels[0]?.id||'artboard',source:'DXF',warnings:[]};
}

export async function parseDielineFile(file){if(!file)throw new Error('请选择 SVG / DXF / PDF / AI 文件');const lower=file.name.toLowerCase();if(lower.endsWith('.svg'))return parseSvgDieline(await file.text());if(lower.endsWith('.dxf'))return parseDxfDieline(await file.text());if(lower.endsWith('.pdf')||lower.endsWith('.ai')){const {parsePdfAiBytes}=await import('./pdfAiImport.js');return await parsePdfAiBytes(new Uint8Array(await file.arrayBuffer()),file.name)}throw new Error('V0.7 支持 SVG / DXF / PDF，以及 PDF-compatible AI 导入')}
