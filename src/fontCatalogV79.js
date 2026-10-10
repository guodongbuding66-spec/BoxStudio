export const FONTS_V79=Object.freeze([
 {id:'noto-sc-full',label:'全字库黑体',name:'BoxStudio Full Sans SC',kind:'中文 · 27778汉字',weights:[400,500,600,700],source:'https://github.com/google/fonts/tree/main/ofl/notosanssc'},
 {id:'noto-serif-full',label:'全字库宋体',name:'BoxStudio Full Serif SC',kind:'中文 · 完整上游字库',weights:[400,500,700],source:'https://github.com/google/fonts/tree/main/ofl/notoserifsc'},
 {id:'xiaowei',label:'站酷小薇体',name:'BoxStudio XiaoWei',kind:'中文 · 展示衬线',weights:[400],source:'https://github.com/google/fonts/tree/main/ofl/zcoolxiaowei'},
 {id:'mashan',label:'马善政毛笔楷书',name:'BoxStudio MaShan',kind:'中文 · 手写展示',weights:[400],source:'https://github.com/google/fonts/tree/main/ofl/mashanzheng'},
 {id:'arabic',label:'Noto 阿拉伯文',name:'BoxStudio Arabic',kind:'阿拉伯文 · 连写',weights:[400,700],source:'https://github.com/google/fonts/tree/main/ofl/notonaskharabic'},
 {id:'devanagari',label:'Noto 天城文',name:'BoxStudio Devanagari',kind:'印地语 · 连写',weights:[400,700],source:'https://github.com/google/fonts/tree/main/ofl/notosansdevanagari'}
]);
export const FONT_IDS_V79=new Set(['sans-sc','serif-sc','lato','manrope','lexend','oswald','playfair','slab','barlow','josefin','bitter','mono',...FONTS_V79.map(f=>f.id)]);
export const fontWeightV79=e=>Number(e.fontWeightV79)||(e.bold?700:400);
export function fontFaceKeyV79(id,weight,style={}){
 const available=FONTS_V79.find(f=>f.id===id)?.weights||[400,700];
 if(!available.includes(weight))throw new Error('该字体没有所选真实字重，请选择 '+available.join(' / ')+'。');
 return id+'-'+weight+(id==='lato'&&style.italic?'-italic':'');
}
