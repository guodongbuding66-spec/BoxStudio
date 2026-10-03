const CODE39_MAP = {
  '0':'nnnwwnwnn','1':'wnnwnnnnw','2':'nnwwnnnnw','3':'wnwwnnnnn','4':'nnnwwnnnw','5':'wnnwwnnnn','6':'nnwwwnnnn','7':'nnnwnnwnw','8':'wnnwnnwnn','9':'nnwwnnwnn',
  'A':'wnnnnwnnw','B':'nnwnnwnnw','C':'wnwnnwnnn','D':'nnnnwwnnw','E':'wnnnwwnnn','F':'nnwnwwnnn','G':'nnnnnwwnw','H':'wnnnnwwnn','I':'nnwnnwwnn','J':'nnnnwwwnn',
  'K':'wnnnnnnww','L':'nnwnnnnww','M':'wnwnnnnwn','N':'nnnnwnnww','O':'wnnnwnnwn','P':'nnwnwnnwn','Q':'nnnnnnwww','R':'wnnnnnwwn','S':'nnwnnnwwn','T':'nnnnwnwwn',
  'U':'wwnnnnnnw','V':'nwwnnnnnw','W':'wwwnnnnnn','X':'nwnnwnnnw','Y':'wwnnwnnnn','Z':'nwwnwnnnn','-':'nwnnnnwnw','.':'wwnnnnwnn',' ':'nwwnnnwnn','$':'nwnwnwnnn','/':'nwnwnnnwn','+':'nwnnnwnwn','%':'nnnwnwnwn','*':'nwnnwnwnn'
};

const EAN_L=['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
const EAN_G=['0100111','0110011','0011011','0100001','0011101','0111001','0000101','0010001','0001001','0010111'];
const EAN_R=['1110010','1100110','1101100','1000010','1011100','1001110','1010000','1000100','1001000','1110100'];
const EAN_PARITY=['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'];
const ITF_PAT=['nnwwn','wnnnw','nwnnw','wwnnn','nnwnw','wnwnn','nwwnn','nnnww','wnnwn','nwnwn'];

// ISO/IEC 15417 Code 128 symbol width patterns (0..106).
const C128=[
'212222','222122','222221','121223','121322','131222','122213','122312','132212','221213','221312','231212','112232','122132','122231','113222','123122','123221','223211','221132','221231','213212','223112','312131','311222','321122','321221','312212','322112','322211','212123','212321','232121','111323','131123','131321','112313','132113','132311','211313','231113','231311','112133','112331','132131','113123','113321','133121','313121','211331','231131','213113','213311','213131','311123','311321','331121','312113','312311','332111','314111','221411','431111','111224','111422','121124','121421','141122','141221','112214','112412','122114','122411','142112','142211','241211','221114','413111','241112','134111','111242','121142','121241','114212','124112','124211','411212','421112','421211','212141','214121','412121','111143','111341','131141','114113','114311','411113','411311','113141','114131','311141','411131','211412','211214','211232','2331112'
];

export const BARCODE_TYPES = [
  {value:'CODE39',label:'Code 39'},
  {value:'EAN13',label:'EAN-13'},
  {value:'UPCA',label:'UPC-A'},
  {value:'ITF14',label:'ITF-14'},
  {value:'GS1_128',label:'GS1-128'},
];

function digits(v){return String(v??'').replace(/\D/g,'')}
function mod10Check(body){
  let sum=0, odd=true;
  for(let i=body.length-1;i>=0;i--,odd=!odd) sum+=Number(body[i])*(odd?3:1);
  return String((10-(sum%10))%10);
}
function barsFromBits(bits,width,height,{quiet=0}={}){
  const total=bits.length+quiet*2, unit=width/Math.max(1,total), bars=[];
  let i=0;
  while(i<bits.length){if(bits[i]==='1'){let j=i+1;while(j<bits.length&&bits[j]==='1')j++;bars.push({x:(quiet+i)*unit,y:0,w:(j-i)*unit,h:height});i=j}else i++}
  return {bars,unit,totalModules:total};
}
function barsFromWidths(widths,width,height,{quiet=10}={}){
  const modules=widths.reduce((a,b)=>a+b,0), total=modules+quiet*2, unit=width/Math.max(1,total), bars=[];
  let x=quiet, bar=true;
  for(const w of widths){if(bar)bars.push({x:x*unit,y:0,w:w*unit,h:height});x+=w;bar=!bar}
  return {bars,unit,totalModules:total};
}

export function sanitizeCode39(value){return String(value||'').toUpperCase().replace(/[^0-9A-Z. \-$/+%]/g,'-')}
export function code39Layout(value,width,height){
  const clean=sanitizeCode39(value),data=`*${clean}*`,mods=[];
  for(const ch of data){const pat=CODE39_MAP[ch]||CODE39_MAP['-'];for(let i=0;i<pat.length;i++)mods.push({bar:i%2===0,wide:pat[i]==='w'});mods.push({bar:false,wide:false})}
  const total=mods.reduce((s,m)=>s+(m.wide?3:1),0)+20,unit=width/total,bars=[];let x=10*unit;
  for(const m of mods){const w=(m.wide?3:1)*unit;if(m.bar)bars.push({x,y:0,w:Math.max(.2,w),h:height});x+=w}
  return {bars,label:clean,unit,totalModules:total,type:'CODE39',valid:true};
}
export function code39Bars(value,width,height){const x=code39Layout(value,width,height);return{rects:barsToRects(x.bars),label:x.label}}

export function normalizeEAN13(value){
  let d=digits(value);if(d.length===12)d+=mod10Check(d);if(d.length!==13)throw new Error('EAN-13 需要 12 位数据或 13 位含校验码');
  if(mod10Check(d.slice(0,12))!==d[12])throw new Error('EAN-13 校验码错误');return d;
}
export function ean13Layout(value,width,height){
  const d=normalizeEAN13(value),par=EAN_PARITY[Number(d[0])];let bits='101';
  for(let i=1;i<=6;i++)bits+=(par[i-1]==='L'?EAN_L:EAN_G)[Number(d[i])];bits+='01010';for(let i=7;i<=12;i++)bits+=EAN_R[Number(d[i])];bits+='101';
  const x=barsFromBits(bits,width,height,{quiet:11});return {...x,label:d,type:'EAN13',valid:true};
}
export function normalizeUPCA(value){
  let d=digits(value);if(d.length===11)d+=mod10Check(d);if(d.length!==12)throw new Error('UPC-A 需要 11 位数据或 12 位含校验码');if(mod10Check(d.slice(0,11))!==d[11])throw new Error('UPC-A 校验码错误');return d;
}
export function upcaLayout(value,width,height){const d=normalizeUPCA(value),x=ean13Layout('0'+d,width,height);return {...x,label:d,type:'UPCA'}}

export function normalizeITF14(value){
  let d=digits(value);if(d.length===13)d+=mod10Check(d);if(d.length!==14)throw new Error('ITF-14 需要 13 位数据或 14 位含校验码');if(mod10Check(d.slice(0,13))!==d[13])throw new Error('ITF-14 校验码错误');return d;
}
export function itf14Layout(value,width,height){
  const d=normalizeITF14(value), widths=[1,1,1,1];
  for(let i=0;i<14;i+=2){const a=ITF_PAT[Number(d[i])],b=ITF_PAT[Number(d[i+1])];for(let j=0;j<5;j++){widths.push(a[j]==='w'?3:1);widths.push(b[j]==='w'?3:1)}}
  widths.push(3,1,1);const x=barsFromWidths(widths,width,height,{quiet:10});return {...x,label:d,type:'ITF14',valid:true,bearer:true};
}

const GS1_RULES={
  '00':{len:18,numeric:true,label:'SSCC',check:true},
  '01':{len:14,numeric:true,label:'GTIN',check:true},
  '02':{len:14,numeric:true,label:'GTIN of contained trade items',check:true},
  '10':{max:20,label:'Batch / Lot'},
  '11':{len:6,numeric:true,label:'Production date',date:true},
  '12':{len:6,numeric:true,label:'Due date',date:true},
  '13':{len:6,numeric:true,label:'Packaging date',date:true},
  '15':{len:6,numeric:true,label:'Best before date',date:true},
  '16':{len:6,numeric:true,label:'Sell by date',date:true},
  '17':{len:6,numeric:true,label:'Expiration date',date:true},
  '20':{len:2,numeric:true,label:'Variant'},
  '21':{max:20,label:'Serial'},
  '22':{max:20,label:'Consumer product variant'},
  '30':{max:8,numeric:true,label:'Variable count'},
  '37':{max:8,numeric:true,label:'Count of trade items'},
  '240':{max:30,label:'Additional product ID'},
  '241':{max:30,label:'Customer part number'},
  '242':{max:6,label:'Made-to-order variation'},
  '250':{max:30,label:'Secondary serial'},
  '251':{max:30,label:'Reference to source entity'},
  '400':{max:30,label:'Customer purchase order'},
  '401':{max:30,label:'GINC'},
  '402':{len:17,numeric:true,label:'GSIN',check:true},
  '410':{len:13,numeric:true,label:'Ship-to GLN',check:true},
  '411':{len:13,numeric:true,label:'Bill-to GLN',check:true},
  '412':{len:13,numeric:true,label:'Purchased-from GLN',check:true},
  '413':{len:13,numeric:true,label:'Ship-for GLN',check:true},
  '414':{len:13,numeric:true,label:'Physical location GLN',check:true},
  '415':{len:13,numeric:true,label:'Invoicing party GLN',check:true},
  '416':{len:13,numeric:true,label:'Production/service location GLN',check:true},
  '417':{len:13,numeric:true,label:'Party GLN',check:true},
  '420':{max:20,label:'Ship-to postal code'},
  '421':{max:12,label:'Ship-to postal code with country'},
  '422':{len:3,numeric:true,label:'Country of origin'},
  '423':{max:15,numeric:true,label:'Country of initial processing'},
  '424':{len:3,numeric:true,label:'Country of processing'},
  '425':{max:15,numeric:true,label:'Country of disassembly'},
  '426':{len:3,numeric:true,label:'Country covering full process'},
  '7003':{len:10,numeric:true,label:'Expiration date/time'},
};
function dynamicRule(ai){
  if(/^3[1-6]\d{2}$/.test(ai))return{len:6,numeric:true,label:'Measure / amount'};
  if(/^39[0-3]\d$/.test(ai))return{max:15,label:'Amount / price'};
  if(/^703\d$/.test(ai))return{max:30,label:'Processor approval'};
  return null;
}
function gs1Rule(ai){return GS1_RULES[ai]||dynamicRule(ai)}
function validGs1Date(v){if(!/^\d{6}$/.test(v))return false;const yy=Number(v.slice(0,2)),mm=Number(v.slice(2,4)),dd=Number(v.slice(4,6));if(mm<1||mm>12||dd<0||dd>31)return false;if(dd===0)return true;const y=2000+yy;return new Date(Date.UTC(y,mm-1,dd)).getUTCDate()===dd}
function validateCheckDigit(data){if(!/^\d+$/.test(data)||data.length<2)return false;return mod10Check(data.slice(0,-1))===data.slice(-1)}
function parseGs1(value){
  const src=String(value??'').trim();
  if(!src)throw new Error('GS1-128 数据为空');
  if(!src.includes('('))return {raw:src.replace(/\|/g,'\u00f1'),human:src,parts:[],warnings:['未使用 (AI)DATA 结构，无法执行 AI 语义校验']};
  const re=/\((\d{2,4})\)([^()]*)/g;let m,parts=[],human='',matched='';
  while((m=re.exec(src))){matched+=m[0];const ai=m[1],data=m[2].trim();if(!data)throw new Error(`AI (${ai}) 缺少数据`);const rule=gs1Rule(ai);if(!rule)throw new Error(`AI (${ai}) 暂不在 BoxStudio V0.7 GS1 规则表中`);if(rule.len!=null&&data.length!==rule.len)throw new Error(`AI (${ai}) ${rule.label} 长度应为 ${rule.len}`);if(rule.max!=null&&data.length>rule.max)throw new Error(`AI (${ai}) ${rule.label} 最大长度为 ${rule.max}`);if(rule.numeric&&!/^\d+$/.test(data))throw new Error(`AI (${ai}) ${rule.label} 必须为数字`);if(rule.date&&!validGs1Date(data))throw new Error(`AI (${ai}) 日期无效：${data}`);if(rule.check&&!validateCheckDigit(data))throw new Error(`AI (${ai}) ${rule.label} 校验码错误`);parts.push({ai,data,rule,fixed:rule.len!=null});human+=`(${ai})${data}`}
  if(!parts.length||matched.replace(/\s/g,'')!==src.replace(/\s/g,''))throw new Error('GS1-128 格式应为 (AI)DATA，例如 (01)09501101530003(10)ABC123');
  let raw='';parts.forEach((p,i)=>{raw+=p.ai+p.data;if(!p.fixed&&i<parts.length-1)raw+='\u00f1'});return{raw,human,parts,warnings:[]};
}
export function validateGS1Data(value){try{const p=parseGs1(value);return{ok:true,human:p.human,parts:p.parts.map(x=>({ai:x.ai,data:x.data,label:x.rule?.label||''})),warnings:p.warnings||[]}}catch(err){return{ok:false,error:String(err?.message||err),parts:[],warnings:[]}}}
function code128BValues(raw,gs1=false){
  const vals=[104];if(gs1)vals.push(102);
  for(const ch of raw){if(ch==='\u00f1'){vals.push(102);continue}const c=ch.charCodeAt(0);if(c<32||c>126)throw new Error('Code 128-B 仅支持 ASCII 32-126；GS1 分隔符请使用 | 或 AI 括号格式');vals.push(c-32)}
  let sum=vals[0];for(let i=1;i<vals.length;i++)sum+=vals[i]*i;vals.push(sum%103,106);return vals;
}
function code128Widths(vals){const out=[];for(const v of vals){const p=C128[v];if(!p)throw new Error(`Code128 pattern ${v} missing`);for(const ch of p)out.push(Number(ch))}return out}
export function gs1128Layout(value,width,height){const p=parseGs1(value),vals=code128BValues(p.raw,true),x=barsFromWidths(code128Widths(vals),width,height,{quiet:10});return{...x,label:p.human,type:'GS1_128',valid:true,codewords:vals}}

export function barcodeLayout(type,value,width,height){
  switch(String(type||'CODE39').toUpperCase()){
    case 'EAN13':return ean13Layout(value,width,height);
    case 'UPCA':return upcaLayout(value,width,height);
    case 'ITF14':return itf14Layout(value,width,height);
    case 'GS1_128':return gs1128Layout(value,width,height);
    default:return code39Layout(value,width,height);
  }
}
export function barsToRects(bars=[]){return bars.map(b=>`<rect x="${b.x.toFixed(3)}" y="${b.y.toFixed(3)}" width="${Math.max(.12,b.w).toFixed(3)}" height="${b.h.toFixed(3)}"/>`).join('')}
export function barcodeSvg(type,value,width,height){const l=barcodeLayout(type,value,width,height);return{...l,rects:barsToRects(l.bars)}}
export function validateBarcode(type,value){try{const l=barcodeLayout(type,value,100,30);return{ok:true,label:l.label,type:l.type}}catch(err){return{ok:false,error:String(err?.message||err),type:String(type||'CODE39')}}}
