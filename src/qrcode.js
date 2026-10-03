// Small QR encoder for BoxStudio.
// Supports QR versions 1-4, error correction level L, byte mode.
// This keeps the app self-contained and produces real scannable SVG modules.

const VERSIONS = [
  null,
  { size:21, data:19, ecc:7, capacity:17, align:[] },
  { size:25, data:34, ecc:10, capacity:32, align:[6,18] },
  { size:29, data:55, ecc:15, capacity:53, align:[6,22] },
  { size:33, data:80, ecc:20, capacity:78, align:[6,26] },
];

const EXP = new Array(512).fill(0);
const LOG = new Array(256).fill(0);
(function initGf(){
  let x=1;
  for(let i=0;i<255;i++){
    EXP[i]=x; LOG[x]=i;
    x <<= 1;
    if(x & 0x100) x ^= 0x11d;
  }
  for(let i=255;i<512;i++) EXP[i]=EXP[i-255];
})();

function gfMul(a,b){
  if(a===0 || b===0) return 0;
  return EXP[LOG[a]+LOG[b]];
}

function polyMul(a,b){
  const out=new Array(a.length+b.length-1).fill(0);
  for(let i=0;i<a.length;i++) for(let j=0;j<b.length;j++) out[i+j]^=gfMul(a[i],b[j]);
  return out;
}

function generatorPoly(degree){
  let g=[1];
  for(let i=0;i<degree;i++) g=polyMul(g,[1,EXP[i]]);
  return g;
}

function reedSolomon(data,eccCount){
  const gen=generatorPoly(eccCount);
  const msg=[...data,...new Array(eccCount).fill(0)];
  for(let i=0;i<data.length;i++){
    const factor=msg[i];
    if(factor===0) continue;
    for(let j=0;j<gen.length;j++) msg[i+j]^=gfMul(gen[j],factor);
  }
  return msg.slice(data.length);
}

function pushBits(bits,value,count){
  for(let i=count-1;i>=0;i--) bits.push((value>>>i)&1);
}

function bitsToBytes(bits){
  const out=[];
  for(let i=0;i<bits.length;i+=8){
    let v=0;
    for(let j=0;j<8;j++) v=(v<<1)|(bits[i+j]||0);
    out.push(v);
  }
  return out;
}

function utf8Bytes(text){
  return Array.from(new TextEncoder().encode(String(text ?? '')));
}

function chooseVersion(byteLength){
  for(let v=1;v<=4;v++) if(byteLength<=VERSIONS[v].capacity) return v;
  throw new Error(`QR content is too long for the built-in encoder (${byteLength} bytes; max 78).`);
}

function makeDataCodewords(bytes,version){
  const spec=VERSIONS[version];
  const bits=[];
  pushBits(bits,0b0100,4); // byte mode
  pushBits(bits,bytes.length,8); // versions 1-9
  for(const b of bytes) pushBits(bits,b,8);
  const maxBits=spec.data*8;
  const terminator=Math.min(4,maxBits-bits.length);
  for(let i=0;i<terminator;i++) bits.push(0);
  while(bits.length%8) bits.push(0);
  const data=bitsToBytes(bits);
  let pad=0;
  while(data.length<spec.data){data.push(pad%2===0?0xEC:0x11);pad++;}
  return data;
}

function blankMatrix(size){return Array.from({length:size},()=>Array(size).fill(null));}

function setFinder(m,row,col){
  const n=m.length;
  for(let r=-1;r<=7;r++){
    if(row+r<0||row+r>=n) continue;
    for(let c=-1;c<=7;c++){
      if(col+c<0||col+c>=n) continue;
      const rr=row+r,cc=col+c;
      const dark=(r>=0&&r<=6&&c>=0&&c<=6&&(r===0||r===6||c===0||c===6||(r>=2&&r<=4&&c>=2&&c<=4)));
      m[rr][cc]=dark;
    }
  }
}

function setAlignment(m,row,col){
  for(let r=-2;r<=2;r++) for(let c=-2;c<=2;c++) m[row+r][col+c]=(Math.max(Math.abs(r),Math.abs(c))!==1);
}

function setupPatterns(m,version){
  const n=m.length;
  setFinder(m,0,0); setFinder(m,n-7,0); setFinder(m,0,n-7);
  for(let i=8;i<n-8;i++){
    if(m[i][6]===null) m[i][6]=(i%2===0);
    if(m[6][i]===null) m[6][i]=(i%2===0);
  }
  const pos=VERSIONS[version].align;
  for(const r of pos) for(const c of pos){
    if(m[r][c]!==null) continue;
    setAlignment(m,r,c);
  }
}

function bchFormat(data5){
  let d=data5<<10;
  const g=0x537;
  const degree=x=>31-Math.clz32(x);
  while(degree(d)>=10) d ^= g << (degree(d)-10);
  return (((data5<<10)|d)^0x5412)&0x7fff;
}

function writeFormat(m,mask,test=false){
  // ECL L has format bits 01 => numeric 1.
  const bits=bchFormat((1<<3)|mask);
  const n=m.length;
  for(let i=0;i<15;i++){
    const mod=test?false:(((bits>>i)&1)!==0);
    if(i<6) m[i][8]=mod;
    else if(i<8) m[i+1][8]=mod;
    else m[n-15+i][8]=mod;

    if(i<8) m[8][n-i-1]=mod;
    else if(i<9) m[8][15-i]=mod;
    else m[8][15-i-1]=mod;
  }
  m[n-8][8]=!test;
}

function mask0(row,col){return (row+col)%2===0;}

function mapData(m,codewords){
  const n=m.length;
  let byteIndex=0,bitIndex=7,row=n-1,inc=-1;
  for(let col=n-1;col>0;col-=2){
    if(col===6) col--;
    while(true){
      for(let c=0;c<2;c++){
        const cc=col-c;
        if(m[row][cc]===null){
          let dark=false;
          if(byteIndex<codewords.length) dark=((codewords[byteIndex]>>>bitIndex)&1)!==0;
          if(mask0(row,cc)) dark=!dark;
          m[row][cc]=dark;
          bitIndex--;
          if(bitIndex<0){byteIndex++;bitIndex=7;}
        }
      }
      row+=inc;
      if(row<0||row>=n){row-=inc;inc=-inc;break;}
    }
  }
}

export function qrMatrix(text){
  const bytes=utf8Bytes(text);
  const version=chooseVersion(bytes.length);
  const spec=VERSIONS[version];
  const data=makeDataCodewords(bytes,version);
  const ecc=reedSolomon(data,spec.ecc);
  const codewords=[...data,...ecc];
  const m=blankMatrix(spec.size);
  setupPatterns(m,version);
  writeFormat(m,0,true); // reserve cells
  mapData(m,codewords);
  writeFormat(m,0,false);
  return {matrix:m,version,size:spec.size,bytes:bytes.length,errorCorrection:'L'};
}

export function qrSvgRects(text,width,height,{quiet=4}={}){
  const qr=qrMatrix(text);
  const modules=qr.size+quiet*2;
  const cell=Math.min(width,height)/modules;
  const ox=(width-cell*modules)/2+quiet*cell;
  const oy=(height-cell*modules)/2+quiet*cell;
  const rects=[];
  for(let r=0;r<qr.size;r++) for(let c=0;c<qr.size;c++) if(qr.matrix[r][c]){
    rects.push(`<rect x="${(ox+c*cell).toFixed(4)}" y="${(oy+r*cell).toFixed(4)}" width="${(cell+0.002).toFixed(4)}" height="${(cell+0.002).toFixed(4)}"/>`);
  }
  return {rects:rects.join(''),...qr,cell,quiet};
}
