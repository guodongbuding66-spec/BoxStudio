import { IDENTITY, multiplyMatrix, applyMatrix, parseTransform } from './importDieline.js';

const SVG_MARK_SCHEMA='boxstudio-svg-mark';
const SVG_MARK_SCHEMA_VERSION=1;
const BLOCKED_TAGS=/<\s*(script|foreignObject|iframe|object|embed|image|use)\b/i;
const EXTERNAL_REF=/(?:href|xlink:href)\s*=\s*["']\s*(?:https?:|data:|javascript:|\/\/)/i;

function clone(value){return structuredClone(value);}
function num(value,fallback=0){const n=Number(value);return Number.isFinite(n)?n:fallback;}
function fnv1a(text=''){let hash=0x811c9dc5;for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,0x01000193)>>>0;}return hash.toString(16).padStart(8,'0');}
function parseLength(value,fallback=0){const s=String(value??'').trim(),n=parseFloat(s);if(!Number.isFinite(n))return fallback;if(/mm$/i.test(s))return n;if(/cm$/i.test(s))return n*10;if(/in$/i.test(s))return n*25.4;if(/pt$/i.test(s))return n*25.4/72;if(/px$/i.test(s))return n*25.4/96;return n;}
function attrsOf(tag=''){const out={};const re=/([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;let m;while((m=re.exec(tag)))out[m[1].toLowerCase()]=m[2]??m[3]??m[4]??'';return out;}
function points(value=''){const n=String(value).trim().split(/[\s,]+/).map(Number).filter(Number.isFinite),out=[];for(let i=0;i+1<n.length;i+=2)out.push([n[i],n[i+1]]);return out;}
function pathTokens(d=''){return String(d).match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g)||[];}
function line(x1,y1,x2,y2){return{x1:num(x1),y1:num(y1),x2:num(x2),y2:num(y2)};}
function cubic(a,b,c,d,t){const q=1-t;return q*q*q*a+3*q*q*t*b+3*q*t*t*c+t*t*t*d;}
function quad(a,b,c,t){const q=1-t;return q*q*a+2*q*t*b+t*t*c;}
function sampleArc(x1,y1,rx0,ry0,rotation,largeArc,sweep,x2,y2,steps=24){
  let rx=Math.abs(num(rx0)),ry=Math.abs(num(ry0));if(rx<1e-9||ry<1e-9)return[line(x1,y1,x2,y2)];
  const phi=num(rotation)*Math.PI/180,cos=Math.cos(phi),sin=Math.sin(phi),dx=(x1-x2)/2,dy=(y1-y2)/2,xp=cos*dx+sin*dy,yp=-sin*dx+cos*dy;let lam=xp*xp/(rx*rx)+yp*yp/(ry*ry);if(lam>1){const s=Math.sqrt(lam);rx*=s;ry*=s;}
  const den=rx*rx*yp*yp+ry*ry*xp*xp||1,n=Math.max(0,(rx*rx*ry*ry-rx*rx*yp*yp-ry*ry*xp*xp)/den),sign=(Boolean(largeArc)===Boolean(sweep))?-1:1,coef=sign*Math.sqrt(n),cxp=coef*rx*yp/ry,cyp=coef*-ry*xp/rx,cx=cos*cxp-sin*cyp+(x1+x2)/2,cy=sin*cxp+cos*cyp+(y1+y2)/2;
  const angle=(ux,uy,vx,vy)=>Math.atan2(ux*vy-uy*vx,ux*vx+uy*vy),ux=(xp-cxp)/rx,uy=(yp-cyp)/ry,vx=(-xp-cxp)/rx,vy=(-yp-cyp)/ry;let theta=angle(1,0,ux,uy),delta=angle(ux,uy,vx,vy);if(!sweep&&delta>0)delta-=Math.PI*2;if(sweep&&delta<0)delta+=Math.PI*2;
  const count=Math.max(4,Math.ceil(Math.abs(delta)/(Math.PI*2)*steps));const out=[];let px=x1,py=y1;for(let i=1;i<=count;i++){const a=theta+delta*i/count,xx=cx+rx*Math.cos(a)*cos-ry*Math.sin(a)*sin,yy=cy+rx*Math.cos(a)*sin+ry*Math.sin(a)*cos;out.push(line(px,py,xx,yy));px=xx;py=yy;}return out;
}

export function pathToLines(d='',curveSteps=18){
  const t=pathTokens(d),out=[];let i=0,cmd='',x=0,y=0,sx=0,sy=0;const next=()=>Number(t[i++]),isCmd=v=>/^[a-zA-Z]$/.test(v||'');
  while(i<t.length){if(isCmd(t[i]))cmd=t[i++];if(!cmd)break;const rel=cmd===cmd.toLowerCase(),u=cmd.toUpperCase();
    if(u==='M'){let nx=next(),ny=next();if(rel){nx+=x;ny+=y;}x=nx;y=ny;sx=x;sy=y;cmd=rel?'l':'L';}
    else if(u==='L'){let nx=next(),ny=next();if(rel){nx+=x;ny+=y;}out.push(line(x,y,nx,ny));x=nx;y=ny;}
    else if(u==='H'){let nx=next();if(rel)nx+=x;out.push(line(x,y,nx,y));x=nx;}
    else if(u==='V'){let ny=next();if(rel)ny+=y;out.push(line(x,y,x,ny));y=ny;}
    else if(u==='C'){let c1x=next(),c1y=next(),c2x=next(),c2y=next(),nx=next(),ny=next();if(rel){c1x+=x;c1y+=y;c2x+=x;c2y+=y;nx+=x;ny+=y;}let px=x,py=y;for(let k=1;k<=curveSteps;k++){const q=k/curveSteps,xx=cubic(x,c1x,c2x,nx,q),yy=cubic(y,c1y,c2y,ny,q);out.push(line(px,py,xx,yy));px=xx;py=yy;}x=nx;y=ny;}
    else if(u==='Q'){let cx=next(),cy=next(),nx=next(),ny=next();if(rel){cx+=x;cy+=y;nx+=x;ny+=y;}let px=x,py=y;for(let k=1;k<=curveSteps;k++){const q=k/curveSteps,xx=quad(x,cx,nx,q),yy=quad(y,cy,ny,q);out.push(line(px,py,xx,yy));px=xx;py=yy;}x=nx;y=ny;}
    else if(u==='A'){let rx=next(),ry=next(),rot=next(),large=next(),sweep=next(),nx=next(),ny=next();if(rel){nx+=x;ny+=y;}out.push(...sampleArc(x,y,rx,ry,rot,large,sweep,nx,ny,Math.max(16,curveSteps*2)));x=nx;y=ny;}
    else if(u==='Z'){out.push(line(x,y,sx,sy));x=sx;y=sy;cmd='';}
    else{while(i<t.length&&!isCmd(t[i]))i++;cmd='';}
  }
  return out.filter(l=>[l.x1,l.y1,l.x2,l.y2].every(Number.isFinite));
}
function transformLines(lines,m){return lines.map(l=>{const a=applyMatrix(m,l.x1,l.y1),b=applyMatrix(m,l.x2,l.y2);return line(a[0],a[1],b[0],b[1]);});}
function primitiveLines(name,a){
  if(name==='line')return[line(a.x1,a.y1,a.x2,a.y2)];
  if(name==='rect'){const x=num(a.x),y=num(a.y),w=num(a.width),h=num(a.height);return[line(x,y,x+w,y),line(x+w,y,x+w,y+h),line(x+w,y+h,x,y+h),line(x,y+h,x,y)];}
  if(name==='polyline'||name==='polygon'){const p=points(a.points),out=[];for(let i=1;i<p.length;i++)out.push(line(...p[i-1],...p[i]));if(name==='polygon'&&p.length>2)out.push(line(...p[p.length-1],...p[0]));return out;}
  if(name==='circle'||name==='ellipse'){const cx=num(a.cx),cy=num(a.cy),rx=name==='circle'?num(a.r):num(a.rx),ry=name==='circle'?num(a.r):num(a.ry),out=[],steps=48;let px=cx+rx,py=cy;for(let i=1;i<=steps;i++){const q=Math.PI*2*i/steps,xx=cx+Math.cos(q)*rx,yy=cy+Math.sin(q)*ry;out.push(line(px,py,xx,yy));px=xx;py=yy;}return out;}
  if(name==='path')return pathToLines(a.d||'');
  return[];
}
function lineBounds(lines){const xs=[],ys=[];for(const l of lines){xs.push(l.x1,l.x2);ys.push(l.y1,l.y2);}if(!xs.length)return null;const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);return{minX,minY,maxX,maxY,width:Math.max(.001,maxX-minX),height:Math.max(.001,maxY-minY)};}

export function validateSvgMark(mark){const errors=[];if(!mark||mark.schema!==SVG_MARK_SCHEMA)errors.push('Invalid SVG mark schema.');if(Number(mark?.schemaVersion)!==SVG_MARK_SCHEMA_VERSION)errors.push('Unsupported SVG mark schema version.');if(!Array.isArray(mark?.lines)||!mark.lines.length)errors.push('SVG mark has no vector segments.');if(!(Number(mark?.width)>0&&Number(mark?.height)>0))errors.push('SVG mark dimensions are invalid.');return{ok:errors.length===0,errors};}

export function parseSvgMark(svgText,{name='Imported SVG',maxSegments=6000}={}){
  const text=String(svgText||'').trim();if(!/^<\s*svg\b/i.test(text))throw new Error('SVG mark must start with an <svg> element.');if(BLOCKED_TAGS.test(text))throw new Error('SVG mark contains blocked embedded/external content.');if(EXTERNAL_REF.test(text))throw new Error('SVG mark contains an external reference.');
  const rootTag=text.match(/<\s*svg\b[^>]*>/i)?.[0]||'',rootAttrs=attrsOf(rootTag),vb=(rootAttrs.viewbox||'').trim().split(/[\s,]+/).map(Number),sourceViewBox=vb.length>=4&&vb.every(Number.isFinite)?vb.slice(0,4):[0,0,parseLength(rootAttrs.width,100)||100,parseLength(rootAttrs.height,100)||100];
  const tokens=text.match(/<!--[^]*?-->|<\/?[^>]+>/g)||[],stack=[{matrix:[...IDENTITY],hidden:false}],segments=[];let depth=0;
  for(const token of tokens){if(token.startsWith('<!--'))continue;const closing=/^<\s*\//.test(token),nameMatch=token.match(/^<\s*\/?\s*([\w:-]+)/),tagName=nameMatch?.[1]?.toLowerCase();if(!tagName)continue;if(closing){if((tagName==='g'||tagName==='svg')&&stack.length>1)stack.pop();continue;}
    const a=attrsOf(token),parent=stack[stack.length-1],style=String(a.style||'').toLowerCase(),hidden=parent.hidden||a.display==='none'||a.visibility==='hidden'||/display\s*:\s*none|visibility\s*:\s*hidden/.test(style),matrix=multiplyMatrix(parent.matrix,parseTransform(a.transform||'')),selfClosing=/\/\s*>$/.test(token);
    if((tagName==='g'||tagName==='svg')&&!selfClosing){stack.push({matrix,hidden});depth++;continue;}if(hidden)continue;
    if(['line','rect','polyline','polygon','circle','ellipse','path'].includes(tagName)){segments.push(...transformLines(primitiveLines(tagName,a),matrix));if(segments.length>maxSegments)throw new Error(`SVG mark exceeds ${maxSegments} vector segments.`);}
  }
  const b=lineBounds(segments);if(!b)throw new Error('SVG mark does not contain supported vector geometry.');const normalized=segments.map(l=>({x1:l.x1-b.minX,y1:l.y1-b.minY,x2:l.x2-b.minX,y2:l.y2-b.minY})),mark={schema:SVG_MARK_SCHEMA,schemaVersion:SVG_MARK_SCHEMA_VERSION,name:String(name||'Imported SVG'),width:b.width,height:b.height,sourceViewBox,segmentCount:normalized.length,lines:normalized,sourceHash:fnv1a(text)};const check=validateSvgMark(mark);if(!check.ok)throw new Error(check.errors.join(' '));return mark;
}

export function createSvgMarkElement(mark,{id=null,panelId='front',x=10,y=10,width=80,height=null,rotation=0}={}){
  const check=validateSvgMark(mark);if(!check.ok)throw new Error(check.errors.join(' '));const w=Math.max(4,num(width,80)),h=Math.max(4,height==null?w*mark.height/mark.width:num(height));return{id:id||`svg-mark-${Date.now().toString(36)}`,type:'svg-symbol',group:'marks',panelId,x:num(x,10),y:num(y,10),w,h,r:num(rotation),lockAspect:true,svgMark:clone(mark),label:mark.name};
}
function rotatePoint(x,y,cx,cy,deg=0){const a=num(deg)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),dx=x-cx,dy=y-cy;return[cx+dx*c-dy*s,cy+dx*s+dy*c];}
export function materializeSvgMarkElement(element){
  const mark=element?.svgMark,check=validateSvgMark(mark);if(!check.ok)throw new Error(`SVG mark ${element?.id||''}: ${check.errors.join(' ')}`);const sx=num(element.w,mark.width)/mark.width,sy=num(element.h,mark.height)/mark.height,cx=num(element.x)+num(element.w)/2,cy=num(element.y)+num(element.h)/2;
  return mark.lines.map((l,index)=>{const a=rotatePoint(num(element.x)+l.x1*sx,num(element.y)+l.y1*sy,cx,cy,element.r),b=rotatePoint(num(element.x)+l.x2*sx,num(element.y)+l.y2*sy,cx,cy,element.r);return{id:`${element.id||'svg'}-seg-${index}`,type:'line',group:'marks',panelId:element.panelId,x:a[0],y:a[1],w:b[0]-a[0],h:b[1]-a[1],r:0,svgSourceId:element.id};});
}
export function materializeSvgMarksForProduction(state){const next=clone(state||{}),out=[];for(const element of next.elements||[]){if(element?.type==='svg-symbol')out.push(...materializeSvgMarkElement(element));else out.push(element);}next.elements=out;return next;}
export function svgMarkPreviewMarkup(mark,{stroke='currentColor'}={}){const check=validateSvgMark(mark);if(!check.ok)return'';return`<svg viewBox="0 0 ${mark.width} ${mark.height}" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="${stroke}" stroke-width="${Math.max(mark.width,mark.height)/220}">${mark.lines.map(l=>`<line x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}"/>`).join('')}</svg>`;}

export {SVG_MARK_SCHEMA,SVG_MARK_SCHEMA_VERSION};
