import { applyMatrix, multiplyMatrix, IDENTITY, inferPanels, inferFoldCandidates, flattenCurves } from './importDieline.js';

const PT_TO_MM=25.4/72;
function n(v,d=0){const x=Number(v);return Number.isFinite(x)?x:d}
function line(x1,y1,x2,y2,type='CUT'){return{x1,y1,x2,y2,type}}
function latin(bytes){return new TextDecoder('latin1').decode(bytes)}
function kindFromName(name=''){const s=String(name).replace(/^\//,'').toLowerCase();if(/crease|fold|score/.test(s))return'CREASE';if(/perf|perfor/.test(s))return'PERF';if(/glue|adhes/.test(s))return'GLUE';return'CUT'}
function kindFromRgb(r=0,g=0,b=0,dash=false){if(dash&&Math.max(r,g,b)-Math.min(r,g,b)>.15)return'PERF';if(r>.65&&g<.45&&b<.45)return'CREASE';if(g>.45&&r<.55)return'GLUE';if(r>.55&&b>.45&&g<.45)return'PERF';return'CUT'}
function kindFromCmyk(c=0,m=0,y=0,k=0,dash=false){if(m>.6&&c<.35&&y<.35)return'CREASE';if(y>.55&&c>.35&&m<.4)return'GLUE';if(m>.45&&c>.35)return'PERF';return dash?'PERF':'CUT'}
function pathTokens(s=''){return String(s).match(/\/[A-Za-z0-9_.:+-]+|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?|[A-Za-z][A-Za-z0-9*']*/g)||[]}
function isNum(x){return /^[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?$/.test(x)}
function ptx(m,x,y){const p=applyMatrix(m,x,y);return[p[0],-p[1]]}

async function inflate(bytes){
  if(typeof DecompressionStream!=='undefined'){
    const ds=new DecompressionStream('deflate');const ab=await new Response(new Blob([bytes]).stream().pipeThrough(ds)).arrayBuffer();return new Uint8Array(ab);
  }
  throw new Error('当前运行环境无法解压 FlateDecode PDF stream');
}

function colorAliases(pdfText){const map={};const re=/\/([A-Za-z0-9_.+-]+)\s*\[\s*\/Separation\s*\/([^\s\]]+)/g;let m;while((m=re.exec(pdfText)))map[m[1]]=m[2];return map}
async function extractStreams(bytes){
  const txt=latin(bytes),out=[],warnings=[];let pos=0;
  while(true){const s=txt.indexOf('stream',pos);if(s<0)break;let dataStart=s+6;if(txt[dataStart]==='\r'&&txt[dataStart+1]==='\n')dataStart+=2;else if(txt[dataStart]==='\n'||txt[dataStart]==='\r')dataStart++;else{pos=s+6;continue}const e=txt.indexOf('endstream',dataStart);if(e<0)break;let dataEnd=e;while(dataEnd>dataStart&&(txt[dataEnd-1]==='\r'||txt[dataEnd-1]==='\n'))dataEnd--;const dictStart=txt.lastIndexOf('<<',s),dict=dictStart>=0?txt.slice(dictStart,s):'';let payload=bytes.slice(dataStart,dataEnd);
    try{if(/\/FlateDecode\b/.test(dict))payload=await inflate(payload);else if(/\/Filter\b/.test(dict)&&!/\/FlateDecode\b/.test(dict)){warnings.push('PDF 含暂不支持的 stream Filter，已跳过一个 stream。');pos=e+9;continue}out.push(latin(payload))}catch(err){warnings.push(`PDF stream 解压失败：${err?.message||err}`)}pos=e+9;
  }
  return{streams:out,warnings};
}
function parseContent(content,aliases={}){
  const sets={CUT:[],CREASE:[],PERF:[],GLUE:[]},curves={CUT:[],CREASE:[],PERF:[],GLUE:[]};const toks=pathTokens(content);let stack=[],ctm=[...IDENTITY],matrixStack=[],path=[],start=null,current=null,spotSpace='',kind='CUT',dash=false;
  const addPath=(close=false)=>{if(close&&current&&start&&(Math.abs(current[0]-start[0])>1e-6||Math.abs(current[1]-start[1])>1e-6))path.push({shape:'L',a:current,b:start});for(const seg of path){if(seg.shape==='L')sets[kind].push(line(seg.a[0],seg.a[1],seg.b[0],seg.b[1],kind));else curves[kind].push({...seg.curve,kind})}path=[];start=null;current=null};
  const nums=k=>stack.slice(-k).map(Number);const popName=()=>String(stack.at(-1)||'').replace(/^\//,'');
  for(const tok of toks){if(isNum(tok)||tok.startsWith('/')){stack.push(tok);continue}
    const op=tok;
    try{
      if(op==='q'){matrixStack.push([...ctm])}
      else if(op==='Q'){ctm=matrixStack.pop()||[...IDENTITY]}
      else if(op==='cm'){const [a,b,c,d,e,f]=nums(6);ctm=multiplyMatrix(ctm,[a,b,c,d,e,f])}
      else if(op==='RG'){const [r,g,b]=nums(3);kind=kindFromRgb(r,g,b,dash);spotSpace=''}
      else if(op==='G'){kind=dash?'PERF':'CUT';spotSpace=''}
      else if(op==='K'){const [c,m,y,k]=nums(4);kind=kindFromCmyk(c,m,y,k,dash);spotSpace=''}
      else if(op==='CS'||op==='cs'){spotSpace=popName();kind=kindFromName(aliases[spotSpace]||spotSpace)}
      else if(op==='SCN'||op==='scn'){if(spotSpace)kind=kindFromName(aliases[spotSpace]||spotSpace)}
      else if(op==='d'){const vals=stack.filter(isNum).map(Number);dash=vals.length>1&&vals.slice(0,-1).some(v=>Math.abs(v)>1e-9);if(dash&&kind==='CUT'&&!spotSpace)kind='PERF';else if(!dash&&kind==='PERF'&&!spotSpace)kind='CUT'}
      else if(op==='m'){const [x,y]=nums(2),p=ptx(ctm,x,y);current=p;start=p;path=[]}
      else if(op==='l'&&current){const [x,y]=nums(2),p=ptx(ctm,x,y);path.push({shape:'L',a:current,b:p});current=p}
      else if(op==='c'&&current){const [x1,y1,x2,y2,x3,y3]=nums(6),c1=ptx(ctm,x1,y1),c2=ptx(ctm,x2,y2),p=ptx(ctm,x3,y3);path.push({shape:'C',curve:{type:'C',x1:current[0],y1:current[1],c1x:c1[0],c1y:c1[1],c2x:c2[0],c2y:c2[1],x2:p[0],y2:p[1]}});current=p}
      else if(op==='v'&&current){const [x2,y2,x3,y3]=nums(4),c2=ptx(ctm,x2,y2),p=ptx(ctm,x3,y3);path.push({shape:'C',curve:{type:'C',x1:current[0],y1:current[1],c1x:current[0],c1y:current[1],c2x:c2[0],c2y:c2[1],x2:p[0],y2:p[1]}});current=p}
      else if(op==='y'&&current){const [x1,y1,x3,y3]=nums(4),c1=ptx(ctm,x1,y1),p=ptx(ctm,x3,y3);path.push({shape:'C',curve:{type:'C',x1:current[0],y1:current[1],c1x:c1[0],c1y:c1[1],c2x:p[0],c2y:p[1],x2:p[0],y2:p[1]}});current=p}
      else if(op==='re'){const [x,y,w,h]=nums(4),p1=ptx(ctm,x,y),p2=ptx(ctm,x+w,y),p3=ptx(ctm,x+w,y+h),p4=ptx(ctm,x,y+h);path.push({shape:'L',a:p1,b:p2},{shape:'L',a:p2,b:p3},{shape:'L',a:p3,b:p4},{shape:'L',a:p4,b:p1});current=p1;start=p1}
      else if(op==='h'){if(current&&start)path.push({shape:'L',a:current,b:start});current=start}
      else if(op==='S'){addPath(false)}
      else if(op==='s'){addPath(true)}
      else if(op==='B'||op==='B*'||op==='b'||op==='b*'){addPath(op[0]==='b')}
      else if(op==='n'){path=[];start=null;current=null}
    }finally{stack=[]}
  }
  return{sets,curves};
}
function geomBounds(lines,curves){const xs=[],ys=[];for(const l of lines){xs.push(l.x1,l.x2);ys.push(l.y1,l.y2)}for(const c of curves){xs.push(c.x1,c.x2,c.c1x,c.c2x);ys.push(c.y1,c.y2,c.c1y,c.c2y)}if(!xs.length)return null;return{minX:Math.min(...xs),minY:Math.min(...ys),maxX:Math.max(...xs),maxY:Math.max(...ys)}}
function normalizeSets(sets,curves){const all=Object.values(sets).flat(),allC=Object.values(curves).flat(),b=geomBounds(all,allC);if(!b)throw new Error('PDF/AI 中没有识别到可描边的矢量刀线路径');const dx=-b.minX,dy=-b.minY;for(const k of Object.keys(sets))sets[k]=sets[k].map(l=>({...l,x1:(l.x1+dx)*PT_TO_MM,y1:(l.y1+dy)*PT_TO_MM,x2:(l.x2+dx)*PT_TO_MM,y2:(l.y2+dy)*PT_TO_MM}));for(const k of Object.keys(curves))curves[k]=curves[k].map(c=>({...c,x1:(c.x1+dx)*PT_TO_MM,y1:(c.y1+dy)*PT_TO_MM,c1x:(c.c1x+dx)*PT_TO_MM,c1y:(c.c1y+dy)*PT_TO_MM,c2x:(c.c2x+dx)*PT_TO_MM,c2y:(c.c2y+dy)*PT_TO_MM,x2:(c.x2+dx)*PT_TO_MM,y2:(c.y2+dy)*PT_TO_MM}));const all2=Object.values(sets).flat(),allC2=Object.values(curves).flat(),b2=geomBounds(all2,allC2);return{width:Math.max(1,b2.maxX-b2.minX),height:Math.max(1,b2.maxY-b2.minY)}}

export async function parsePdfAiBytes(bytes,fileName='dieline.pdf'){
  const head=latin(bytes.slice(0,16)),isAi=/\.ai$/i.test(fileName);if(!head.startsWith('%PDF-')){if(isAi)throw new Error('该 AI 不是 PDF-compatible Illustrator 文件。请在 Illustrator 中开启 Create PDF Compatible File，或导出为 PDF/SVG。');throw new Error('不是有效 PDF 文件')}
  const full=latin(bytes),aliases=colorAliases(full),{streams,warnings}=await extractStreams(bytes);if(!streams.length)throw new Error('PDF 中没有可解析 content stream');const sets={CUT:[],CREASE:[],PERF:[],GLUE:[]},curves={CUT:[],CREASE:[],PERF:[],GLUE:[]};
  for(const stream of streams){const r=parseContent(stream,aliases);for(const k of Object.keys(sets)){sets[k].push(...r.sets[k]);curves[k].push(...r.curves[k])}}
  const size=normalizeSets(sets,curves),basis=Object.values(sets).flat().concat(flattenCurves(Object.values(curves).flat(),18)),panels=inferPanels(basis,size.width,size.height),foldCandidates=inferFoldCandidates(panels,sets.CREASE.concat(flattenCurves(curves.CREASE,18))),source=isAi?'AI / PDF-compatible':'PDF';
  const spotNames=[...new Set(Object.values(aliases))];return{width:size.width,height:size.height,cutLines:sets.CUT,creaseLines:sets.CREASE,perfLines:sets.PERF,glueLines:sets.GLUE,cutCurves:curves.CUT,creaseCurves:curves.CREASE,perfCurves:curves.PERF,glueCurves:curves.GLUE,panels,foldCandidates,foldRoot:panels[0]?.id||'artboard',source,warnings:[...warnings,`V0.7 PDF/AI importer 识别 ${streams.length} 个 content stream；仅导入矢量描边路径，不导入图片/文字作为刀线。`,...(spotNames.length?[`检测到 Separation spot names: ${spotNames.join(', ')}`]:['未检测到可解析 Separation 名称；线型将按描边颜色/虚线启发式分类，生产前必须复核。'])],spotNames};
}
