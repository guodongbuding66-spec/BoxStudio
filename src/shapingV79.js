import bidiFactory from '../vendor/bidi/bidi.mjs';
const bidi=bidiFactory();let hb=null,pending=null;
export async function loadShapingV79(){return hb||(pending??=import('../vendor/harfbuzz/index.mjs').then(m=>hb=m).catch(e=>{pending=null;throw e;}));}
export function attachShapingV79(font,bytes){if(!hb)throw new Error('字形排版引擎尚未就绪。');const blob=new hb.Blob(bytes instanceof ArrayBuffer?bytes:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)),face=new hb.Face(blob),f=new hb.Font(face);font.shaperV79={blob,face,font:f};return font;}
export function shapeRunV79(font,text,{start=0,end=text.length,direction='horizontal',rtl=false,contextStart=0,contextEnd=text.length}={}){
 if(!font.shaperV79||!hb)throw new Error('该文字需要字形排版引擎，请等待字体加载。');
 const buffer=font.shaperV79.buffer??=new hb.Buffer();buffer.reset();buffer.addText(text.slice(contextStart,contextEnd),start-contextStart,end-start);buffer.guessSegmentProperties();buffer.setDirection(direction==='vertical-rl'?hb.Direction.TTB:rtl?hb.Direction.RTL:hb.Direction.LTR);
 hb.shape(font.shaperV79.font,buffer,direction==='vertical-rl'?[new hb.Feature('vert',1),new hb.Feature('vrt2',1)]:[]);
 const info=buffer.getGlyphInfos(),pos=buffer.getGlyphPositions();return info.map((g,i)=>({id:g.codepoint,cluster:g.cluster+contextStart,...pos[i]}));
}
export function bidiLevelsV79(text){return bidi.getEmbeddingLevels(text).levels;}
export function visualOrderV79(runs){const out=[...runs],max=Math.max(0,...out.map(r=>r.level)),min=Math.min(...out.filter(r=>r.level%2).map(r=>r.level));for(let n=max;n>=min;n--)for(let a=0;a<out.length;){if(out[a].level<n){a++;continue;}let b=a+1;while(b<out.length&&out[b].level>=n)b++;out.splice(a,b-a,...out.slice(a,b).reverse());a=b;}return out;}
