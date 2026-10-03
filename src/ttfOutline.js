// BoxStudio V0.7 — minimal TrueType glyf outline parser.
// Supports cmap format 4/12, simple glyphs and common XY-positioned composite glyphs.
// It intentionally does not parse CFF/CFF2 OpenType outlines.

function tag(view, o){return String.fromCharCode(view.getUint8(o),view.getUint8(o+1),view.getUint8(o+2),view.getUint8(o+3))}
function u16(v,o){return v.getUint16(o,false)} function i16(v,o){return v.getInt16(o,false)} function u32(v,o){return v.getUint32(o,false)}
function fixed2_14(v,o){return i16(v,o)/16384}

function tableDirectory(view){
  const num=u16(view,4), out={}; let o=12;
  for(let i=0;i<num;i++,o+=16){const name=tag(view,o);out[name]={offset:u32(view,o+8),length:u32(view,o+12)}}
  return out;
}
function need(tables,name){const t=tables[name];if(!t)throw new Error(`TTF 缺少 ${name} table`);return t}

function parseCmap(view,tables){
  const t=need(tables,'cmap'), base=t.offset, n=u16(view,base+2);let best=null;
  for(let i=0;i<n;i++){
    const rec=base+4+i*8, platform=u16(view,rec), enc=u16(view,rec+2), off=u32(view,rec+4), sub=base+off, format=u16(view,sub);
    let score=-1;if(format===12&&(platform===3||platform===0))score=100+(enc===10?10:0);else if(format===4&&(platform===3||platform===0))score=50+(enc===1?5:0);
    if(score>(best?.score??-1))best={format,sub,score};
  }
  if(!best)throw new Error('TTF cmap 不支持（需要 format 4 或 12）');
  if(best.format===12){
    const nGroups=u32(view,best.sub+12), groups=[];let o=best.sub+16;
    for(let i=0;i<nGroups;i++,o+=12)groups.push([u32(view,o),u32(view,o+4),u32(view,o+8)]);
    return cp=>{let lo=0,hi=groups.length-1;while(lo<=hi){const m=(lo+hi)>>1,g=groups[m];if(cp<g[0])hi=m-1;else if(cp>g[1])lo=m+1;else return g[2]+(cp-g[0])}return 0};
  }
  const segCount=u16(view,best.sub+6)/2,endOff=best.sub+14,startOff=endOff+segCount*2+2,deltaOff=startOff+segCount*2,rangeOff=deltaOff+segCount*2;
  return cp=>{
    for(let i=0;i<segCount;i++){const end=u16(view,endOff+i*2),start=u16(view,startOff+i*2);if(cp<start||cp>end)continue;const delta=i16(view,deltaOff+i*2),range=u16(view,rangeOff+i*2);if(range===0)return (cp+delta)&0xffff;const loc=rangeOff+i*2+range+(cp-start)*2;if(loc+2>view.byteLength)return 0;const gid=u16(view,loc);return gid?((gid+delta)&0xffff):0}return 0;
  };
}

function parseLoca(view,tables,numGlyphs,indexToLocFormat){
  const t=need(tables,'loca'), arr=new Uint32Array(numGlyphs+1);
  for(let i=0;i<=numGlyphs;i++)arr[i]=indexToLocFormat===0?u16(view,t.offset+i*2)*2:u32(view,t.offset+i*4);
  return arr;
}
function parseHmtx(view,tables,numGlyphs,numHMetrics){
  const t=need(tables,'hmtx'), adv=new Uint16Array(numGlyphs);let last=0;
  for(let i=0;i<numGlyphs;i++){if(i<numHMetrics){last=u16(view,t.offset+i*4);adv[i]=last}else adv[i]=last}return adv;
}
function midpoint(a,b){return{x:(a.x+b.x)/2,y:(a.y+b.y)/2,on:true}}

function simpleGlyph(view,o,nContours){
  let p=o+10;const endPts=[];for(let i=0;i<nContours;i++,p+=2)endPts.push(u16(view,p));const nPoints=(endPts.at(-1)??-1)+1;if(nPoints<=0)return[];
  const instr=u16(view,p);p+=2+instr;const flags=[];
  while(flags.length<nPoints){const fl=view.getUint8(p++);flags.push(fl);if(fl&8){const rep=view.getUint8(p++);for(let r=0;r<rep;r++)flags.push(fl)}}
  const xs=new Int32Array(nPoints),ys=new Int32Array(nPoints);let x=0,y=0;
  for(let i=0;i<nPoints;i++){const fl=flags[i];let dx=0;if(fl&2){const b=view.getUint8(p++);dx=(fl&16)?b:-b}else if(!(fl&16)){dx=i16(view,p);p+=2}x+=dx;xs[i]=x}
  for(let i=0;i<nPoints;i++){const fl=flags[i];let dy=0;if(fl&4){const b=view.getUint8(p++);dy=(fl&32)?b:-b}else if(!(fl&32)){dy=i16(view,p);p+=2}y+=dy;ys[i]=y}
  const contours=[];let start=0;for(const end of endPts){const pts=[];for(let i=start;i<=end;i++)pts.push({x:xs[i],y:ys[i],on:Boolean(flags[i]&1)});contours.push(pts);start=end+1}return contours;
}
function transformContours(contours,a,b,c,d,tx,ty){return contours.map(cont=>cont.map(p=>({x:a*p.x+c*p.y+tx,y:b*p.x+d*p.y+ty,on:p.on})))}

function glyphContours(font,gid,depth=0){
  if(depth>12)throw new Error('TTF composite glyph recursion too deep');if(gid<0||gid>=font.numGlyphs)return[];const off=font.loca[gid],next=font.loca[gid+1];if(off===next)return[];let p=font.glyfOffset+off;const nContours=i16(font.view,p);
  if(nContours>=0)return simpleGlyph(font.view,p,nContours);
  p+=10;const all=[];let more=true;
  while(more){const flags=u16(font.view,p),comp=u16(font.view,p+2);p+=4;let arg1,arg2;if(flags&1){arg1=i16(font.view,p);arg2=i16(font.view,p+2);p+=4}else{arg1=font.view.getInt8(p);arg2=font.view.getInt8(p+1);p+=2}
    let tx=0,ty=0;if(flags&2){tx=arg1;ty=arg2}
    let a=1,b=0,c=0,d=1;if(flags&8){a=d=fixed2_14(font.view,p);p+=2}else if(flags&64){a=fixed2_14(font.view,p);d=fixed2_14(font.view,p+2);p+=4}else if(flags&128){a=fixed2_14(font.view,p);b=fixed2_14(font.view,p+2);c=fixed2_14(font.view,p+4);d=fixed2_14(font.view,p+6);p+=8}
    all.push(...transformContours(glyphContours(font,comp,depth+1),a,b,c,d,tx,ty));more=Boolean(flags&32);
  }
  return all;
}

function contourCommands(points){
  if(!points.length)return[];const pts=points.map(p=>({...p}));let start;
  if(pts[0].on)start=pts[0];else if(pts.at(-1).on)start=pts.at(-1);else start=midpoint(pts.at(-1),pts[0]);
  const cmds=[{op:'M',x:start.x,y:start.y}];let i=pts[0].on?1:0,cur=start,guard=0;
  while(guard++<pts.length+2){if(i>=pts.length)break;const p=pts[i],next=pts[(i+1)%pts.length];if(p.on){cmds.push({op:'L',x:p.x,y:p.y});cur=p;i++}else if(next.on){cmds.push({op:'Q',cx:p.x,cy:p.y,x:next.x,y:next.y});cur=next;i+=2}else{const mid=midpoint(p,next);cmds.push({op:'Q',cx:p.x,cy:p.y,x:mid.x,y:mid.y});cur=mid;i++}}
  if(Math.abs(cur.x-start.x)>1e-9||Math.abs(cur.y-start.y)>1e-9)cmds.push({op:'L',x:start.x,y:start.y});cmds.push({op:'Z'});return cmds;
}
export function glyphCommands(font,gid){return glyphContours(font,gid).flatMap(contourCommands)}

export function parseTrueTypeFont(buffer,name='Uploaded TTF'){
  const view=buffer instanceof DataView?buffer:new DataView(buffer instanceof ArrayBuffer?buffer:buffer.buffer,buffer.byteOffset||0,buffer.byteLength||buffer.buffer.byteLength);const tables=tableDirectory(view);
  if(tables['CFF ']||tables['CFF2'])throw new Error('当前精确转曲仅支持 TrueType glyf 字体；CFF/CFF2 OTF 尚未支持');
  const head=need(tables,'head'),maxp=need(tables,'maxp'),hhea=need(tables,'hhea'),glyf=need(tables,'glyf');const unitsPerEm=u16(view,head.offset+18),indexToLocFormat=i16(view,head.offset+50),numGlyphs=u16(view,maxp.offset+4),numHMetrics=u16(view,hhea.offset+34);
  const font={name,view,tables,unitsPerEm,indexToLocFormat,numGlyphs,numHMetrics,glyfOffset:glyf.offset};font.cmap=parseCmap(view,tables);font.loca=parseLoca(view,tables,numGlyphs,indexToLocFormat);font.advance=parseHmtx(view,tables,numGlyphs,numHMetrics);return font;
}

export function textOutlineCommands(font,text,x=0,yTop=0,sizeMm=7,{letterSpacing=0,lineHeight=1.15}={}){
  if(!font)throw new Error('未加载 TTF 字体');const scale=sizeMm/font.unitsPerEm,lines=String(text).split('\n'),out=[];
  for(let li=0;li<lines.length;li++){let penX=x;const baseline=yTop+(li+1)*sizeMm*lineHeight;for(const ch of [...lines[li]]){const gid=font.cmap(ch.codePointAt(0))||0,cmds=glyphCommands(font,gid);for(const c of cmds){if(c.op==='Z'){out.push({op:'Z'});continue}const z={...c};for(const k of ['x','cx'])if(k in z)z[k]=penX+z[k]*scale;for(const k of ['y','cy'])if(k in z)z[k]=baseline-z[k]*scale;out.push(z)}penX+=(font.advance[gid]||font.unitsPerEm*.5)*scale+letterSpacing}}
  return out;
}
export function commandsToSvgPath(cmds=[]){return cmds.map(c=>c.op==='M'||c.op==='L'?`${c.op}${c.x.toFixed(3)} ${c.y.toFixed(3)}`:c.op==='Q'?`Q${c.cx.toFixed(3)} ${c.cy.toFixed(3)} ${c.x.toFixed(3)} ${c.y.toFixed(3)}`:c.op==='C'?`C${c.c1x.toFixed(3)} ${c.c1y.toFixed(3)} ${c.c2x.toFixed(3)} ${c.c2y.toFixed(3)} ${c.x.toFixed(3)} ${c.y.toFixed(3)}`:'Z').join(' ')}
