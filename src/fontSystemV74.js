import {FONTS_V79,fontWeightV79,fontFaceKeyV79} from './fontCatalogV79.js';
import {loadShapingV79,attachShapingV79} from './shapingV79.js';
import {resolveTextElementV79} from './textResolveV79.js';
import {registerRichFontV77} from './richTextLayoutV77.js';
import {layoutTextV76,moveTextCommandsV76} from './textLayoutV76.js';
import {parseTrueTypeFont,textOutlineCommands,commandsToSvgPath} from './ttfOutline.js';
export const FONTS_V74=Object.freeze([
 {id:'sans-sc',label:'纸工黑体',name:'BoxStudio Sans SC',kind:'中英 · GB2312',source:'https://github.com/google/fonts/tree/main/ofl/notosanssc'},
 {id:'serif-sc',label:'纸工宋体',name:'BoxStudio Serif SC',kind:'中英 · GB2312',source:'https://github.com/google/fonts/tree/main/ofl/notoserifsc'},
 {id:'lato',label:'Lato 人文无衬线',name:'BoxStudio Lato',kind:'拉丁字母',source:'https://github.com/google/fonts/tree/main/ofl/lato'},
 {id:'manrope',label:'Manrope 几何无衬线',name:'BoxStudio Manrope',kind:'拉丁 · 无衬线',source:'https://github.com/google/fonts/tree/main/ofl/manrope'},
 {id:'lexend',label:'Lexend 阅读字体',name:'BoxStudio Lexend',kind:'拉丁 · 无衬线',source:'https://github.com/google/fonts/tree/main/ofl/lexend'},
 {id:'oswald',label:'Oswald 紧凑标题',name:'BoxStudio Oswald',kind:'拉丁 · 展示',source:'https://github.com/google/fonts/tree/main/ofl/oswald'},
 {id:'playfair',label:'Playfair 编辑衬线',name:'BoxStudio Playfair',kind:'拉丁 · 衬线',source:'https://github.com/google/fonts/tree/main/ofl/playfairdisplay'},
 {id:'slab',label:'Source Serif 4 书籍衬线',name:'BoxStudio Serif4',kind:'拉丁 · 衬线',source:'https://github.com/google/fonts/tree/main/ofl/sourceserif4'},
 {id:'barlow',label:'Barlow Condensed 窄体',name:'BoxStudio Barlow',kind:'拉丁 · 展示',source:'https://github.com/google/fonts/tree/main/ofl/barlowcondensed'},
 {id:'josefin',label:'Josefin Sans 品牌字',name:'BoxStudio Josefin',kind:'拉丁 · 无衬线',source:'https://github.com/google/fonts/tree/main/ofl/josefinsans'},
 {id:'bitter',label:'Bitter 人文衬线',name:'BoxStudio Bitter',kind:'拉丁 · 衬线',source:'https://github.com/google/fonts/tree/main/ofl/bitter'},
 {id:'mono',label:'Roboto Mono 等宽',name:'BoxStudio Mono',kind:'编码与数字',source:'https://github.com/google/fonts/tree/main/ofl/robotomono'}
]);
export const FONTS_ALL_V79=Object.freeze([...FONTS_V74,...FONTS_V79]);
const fonts=new Map(),pending=new Map();
export function getFontV74(id,bold=false,style={}){const weight=typeof bold==='number'?bold:bold?700:400;return fonts.get(fontFaceKeyV79(id,weight,style))||(id==='lato'&&style?.italic?fonts.get(id+'-'+weight):null)||null;}
export function registerFontV74(id,weight,bytes,style={}){if(!FONTS_ALL_V79.some(f=>f.id===id))throw new Error('字体不存在。');const key=fontFaceKeyV79(id,weight,style),font=parseTrueTypeFont(bytes,key);font.italicV79=id==='lato'&&!!style.italic;fonts.set(key,font);registerRichFontV77(id,weight,font,style);return font;}
export async function loadFontV74(id,bold=false,style={}){
 if(!id||id==='system')return null;
 const family=FONTS_ALL_V79.find(f=>f.id===id);if(!family)throw new Error('字体不存在。');
 const weight=typeof bold==='number'?bold:bold?700:400,key=fontFaceKeyV79(id,weight,style);if(pending.has(key))return pending.get(key);if(fonts.has(key))return fonts.get(key);
 pending.set(key,(async()=>{const modern=FONTS_V79.some(f=>f.id===id)||(id==='lato'&&style.italic),url=modern?new URL('../assets/fonts-v79/'+key+'.ttf.gz',import.meta.url):new URL('../assets/fonts-v74/'+key+'.ttf',import.meta.url),res=await fetch(url);if(!res.ok)throw new Error('字体下载失败，请重试。');const packed=await res.arrayBuffer(),bytes=modern?await new Response(new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer():packed,font=registerFontV74(id,weight,bytes,style);await loadShapingV79();attachShapingV79(font,bytes);if(typeof FontFace!=='undefined'&&typeof document!=='undefined'){const face=new FontFace(family.name,bytes,{weight:String(weight),style:font.italicV79?'italic':'normal'});await face.load();document.fonts.add(face);}return font;})().catch(e=>{fonts.delete(key);pending.delete(key);throw e;}));return pending.get(key);
}
export function fontGlyphIssuesV74(el,text,variables={}){
 el=resolveTextElementV79(el,variables);
 if(!el.fontIdV74)return el.textStyleV76?['请为排版文字选择已加载的字体。']:[];
 const font=getFontV74(el.fontIdV74,fontWeightV79(el),el.textStyleV76);if(!font)return ['所选字体尚未加载，请等待或重新选择字体。'];
 if(el.textRunsV77?.length){try{const layout=layoutTextV76(font,text,el);return layout.overflow?['文字超出文字框，请增大框宽高或缩小字号。']:[];}catch(e){return[e.message];}}
 const missing=[...new Set([...String(text)].filter(c=>c.codePointAt(0)>32&&!/[\u200c\u200d\u202a-\u202e\u2066-\u2069]/.test(c)&&!font.cmap(c.codePointAt(0))))];
 if(el.textStyleV76&&!missing.length){try{if(layoutTextV76(font,text,el).overflow)return ['文字超出文字框，请增大框宽高或缩小字号。'];}catch(e){return [e.message];}}
 return missing.length?['所选字体缺少字符：'+missing.slice(0,12).join('')+'。请选择中英字体或导入完整字体。']:[];
}
export async function prepareFontsV74(state){await Promise.all((state.elements||[]).flatMap(e=>[...(e.fontIdV74?[loadFontV74(e.fontIdV74,fontWeightV79(e),e.textStyleV76)]:[]),...(e.textRunsV77||[]).map(r=>loadFontV74(r.fontId,fontWeightV79(r),r))]));}
export function fontTextSvgV74(el,text,x=3,y=0,variables={}){
 el=resolveTextElementV79(el,variables);
 const font=getFontV74(el.fontIdV74,fontWeightV79(el),el.textStyleV76);if(!font)return null;
 const issues=fontGlyphIssuesV74(el,text);if(issues.length&&!el.textStyleV76)return null;
 const layout=el.textStyleV76?layoutTextV76(font,text,el):{commands:textOutlineCommands(font,text,x,y,el.fontSize||5),color:'#111'};
 return (layout.paintRuns||[{commands:layout.commands,color:layout.color}]).map(r=>'<path data-font-v74="'+(r.fontId||el.fontIdV74)+'" d="'+commandsToSvgPath(r.commands)+'" fill="'+r.color+'"/>').join('');
}
export function paintFontV74(ctx,el,text,x,y,scale=1){
 const font=getFontV74(el.fontIdV74,fontWeightV79(el),el.textStyleV76);if(!font)return false;
 const layout=el.textStyleV76?layoutTextV76(font,text,el):{commands:textOutlineCommands(font,text,x,y,el.fontSize||5),color:'#111'};
 ctx.save();ctx.scale(scale,scale);for(const r of layout.paintRuns||[{commands:layout.commands,color:layout.color}]){ctx.fillStyle=r.color;ctx.fill(new Path2D(commandsToSvgPath(el.textStyleV76?moveTextCommandsV76(r.commands,el.x,el.y):r.commands)));}ctx.restore();return true;
}
export function fontOptionsV74(id=''){return '<option value="">系统字体</option>'+FONTS_ALL_V79.map(f=>'<option value="'+f.id+'" '+(id===f.id?'selected':'')+'>'+f.label+' · '+f.kind+'</option>').join('');}
