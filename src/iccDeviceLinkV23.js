let currentLink=null;

function copyBytes(source){if(source instanceof Uint8Array)return new Uint8Array(source);if(source instanceof ArrayBuffer)return new Uint8Array(source.slice(0));if(ArrayBuffer.isView(source))return new Uint8Array(source.buffer.slice(source.byteOffset,source.byteOffset+source.byteLength));throw new Error('ICC device-link source must be an ArrayBuffer or TypedArray.');}
function ascii(b,o,n){return String.fromCharCode(...b.slice(o,o+n));}
function u32(b,o){return (((b[o]<<24)|(b[o+1]<<16)|(b[o+2]<<8)|b[o+3])>>>0);}
function s32(b,o){const u=u32(b,o);return u>0x7fffffff?u-0x100000000:u;}
function fixed(b,o){return s32(b,o)/65536;}
function clamp(v,a=0,z=1){return Math.max(a,Math.min(z,Number(v)||0));}
function tableSample(table,v){const x=clamp(v)*(table.length-1),i=Math.floor(x),t=x-i,j=Math.min(table.length-1,i+1);return table[i]*(1-t)+table[j]*t;}
function matrixApply(m,v){if(!m)return v;return [m[0]*v[0]+m[1]*v[1]+m[2]*v[2],m[3]*v[0]+m[4]*v[1]+m[5]*v[2],m[6]*v[0]+m[7]*v[1]+m[8]*v[2]].map(x=>clamp(x));}
function clutIndex(r,g,b,grid,outChannels){return (((r*grid+g)*grid+b)*outChannels);}
function trilinear(clut,grid,outChannels,rgb){const p=rgb.map(v=>clamp(v)*(grid-1)),lo=p.map(Math.floor),hi=p.map((v,i)=>Math.min(grid-1,lo[i]+1)),t=p.map((v,i)=>v-lo[i]),out=new Array(outChannels).fill(0);for(let xr=0;xr<2;xr++)for(let yg=0;yg<2;yg++)for(let zb=0;zb<2;zb++){const ix=xr?hi[0]:lo[0],iy=yg?hi[1]:lo[1],iz=zb?hi[2]:lo[2],w=(xr?t[0]:1-t[0])*(yg?t[1]:1-t[1])*(zb?t[2]:1-t[2]),base=clutIndex(ix,iy,iz,grid,outChannels);for(let c=0;c<outChannels;c++)out[c]+=clut[base+c]*w;}return out;}

export function parseRgbCmykDeviceLink(source,name='device-link.icc'){
  const bytes=copyBytes(source);if(bytes.length<132)throw new Error('ICC device-link file is too small.');if(ascii(bytes,36,4)!=='acsp')throw new Error('ICC header signature is not acsp.');const deviceClass=ascii(bytes,12,4),inputColorSpace=ascii(bytes,16,4),outputColorSpace=ascii(bytes,20,4);if(deviceClass!=='link')throw new Error(`ICC profile class must be link, got ${deviceClass.trim()||'unknown'}.`);if(inputColorSpace!=='RGB ')throw new Error(`ICC device-link input must be RGB, got ${inputColorSpace.trim()||'unknown'}.`);if(outputColorSpace!=='CMYK')throw new Error(`ICC device-link output must be CMYK, got ${outputColorSpace.trim()||'unknown'}.`);
  const count=u32(bytes,128);let tag=null;for(let i=0;i<count;i++){const at=132+i*12;if(at+12>bytes.length)break;const sig=ascii(bytes,at,4),off=u32(bytes,at+4),size=u32(bytes,at+8);if(sig==='A2B0'){tag={sig,off,size};break;}}if(!tag)throw new Error('RGB→CMYK device-link has no A2B0 tag.');if(tag.off+tag.size>bytes.length)throw new Error('A2B0 tag exceeds ICC file bounds.');if(ascii(bytes,tag.off,4)!=='mft1')throw new Error(`V0.23 supports A2B0 LUT8 (mft1) device links only; found ${ascii(bytes,tag.off,4)}.`);
  const inCh=bytes[tag.off+8],outCh=bytes[tag.off+9],grid=bytes[tag.off+10];if(inCh!==3||outCh!==4)throw new Error(`LUT8 must have 3 input and 4 output channels; got ${inCh}→${outCh}.`);if(grid<2)throw new Error('LUT8 grid must contain at least 2 points per axis.');const matrix=Array.from({length:9},(_,i)=>fixed(bytes,tag.off+12+i*4));let at=tag.off+48;const inputTables=[];for(let c=0;c<3;c++){if(at+256>bytes.length)throw new Error('LUT8 input table is truncated.');inputTables.push(Array.from(bytes.slice(at,at+256),x=>x/255));at+=256;}const clutLen=(grid**3)*4;if(at+clutLen>bytes.length)throw new Error('LUT8 CLUT is truncated.');const clut=Array.from(bytes.slice(at,at+clutLen),x=>x/255);at+=clutLen;const outputTables=[];for(let c=0;c<4;c++){if(at+256>bytes.length)throw new Error('LUT8 output table is truncated.');outputTables.push(Array.from(bytes.slice(at,at+256),x=>x/255));at+=256;}
  return{name,size:bytes.length,deviceClass:'link',inputColorSpace:'RGB',outputColorSpace:'CMYK',tagType:'mft1',gridPoints:grid,matrix,inputTables,clut,outputTables,bytes};
}

export function createDeviceLinkTransform(profile){if(!profile||profile.tagType!=='mft1'||profile.inputColorSpace!=='RGB'||profile.outputColorSpace!=='CMYK')throw new Error('Unsupported ICC device-link transform.');return rgb=>{let v=[0,1,2].map(i=>tableSample(profile.inputTables[i],clamp(rgb?.[i])));v=matrixApply(profile.matrix,v);const c=trilinear(profile.clut,profile.gridPoints,4,v);return c.map((x,i)=>clamp(tableSample(profile.outputTables[i],x)));};}
export function loadRgbCmykDeviceLink(source,name='device-link.icc'){const profile=parseRgbCmykDeviceLink(source,name);currentLink={profile,transform:createDeviceLinkTransform(profile)};return getDeviceLinkInfo();}
export function clearRgbCmykDeviceLink(){currentLink=null;}
export function getRgbCmykDeviceLink(){return currentLink;}
export function getDeviceLinkInfo(){if(!currentLink)return null;const p=currentLink.profile;return{name:p.name,size:p.size,inputColorSpace:p.inputColorSpace,outputColorSpace:p.outputColorSpace,tagType:p.tagType,gridPoints:p.gridPoints};}
export function convertRgbToCmyk(rgb){return currentLink?currentLink.transform(rgb):null;}
