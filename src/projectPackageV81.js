import {zipStoredV74,zipCrcV74} from './zipStoredV74.js';
import {defaultState} from './model.js';
import {validateProjectStateV66} from './shippingMarkLayoutV66.js';
import {parseMarkDocumentV67} from './standaloneMarksV67.js';
import {sceneObjectsV79} from './sceneObjectsV79.js';

export const PACKAGE_LIMIT_V81=128*1024*1024;
const JSON_LIMIT=50*1024*1024,encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
const schema='boxstudio-portable-project',hex=/^[a-f0-9]{64}$/;
const fail=message=>{throw new Error(message);};
export async function packageShaV81(bytes){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');}

// Intentionally accepts the bounded, uncompressed format we export. No extraction
// onto a filesystem, decompression, external URLs, or partial ZIP recovery.
export function readPackageZipV81(input){
 const bytes=new Uint8Array(input),v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),end=bytes.length-22;
 if(bytes.length>PACKAGE_LIMIT_V81)fail('项目包不能超过 128 MB。');
 if(end<0||v.getUint32(end,true)!==0x06054b50)fail('项目包不完整，请选择 BoxStudio 导出的 ZIP。');
 const count=v.getUint16(end+10,true),size=v.getUint32(end+12,true),start=v.getUint32(end+16,true);
 if(v.getUint16(end+4,true)||v.getUint16(end+6,true)||v.getUint16(end+8,true)!==count||v.getUint16(end+20,true)||!count||count>200||start+size!==end)fail('项目包目录无效或文件过多。');
 const files=new Map();let p=start,local=0;
 for(let i=0;i<count;i++){
  if(p+46>end||v.getUint32(p,true)!==0x02014b50)fail('项目包目录损坏。');
  const flags=v.getUint16(p+8,true),method=v.getUint16(p+10,true),sum=v.getUint32(p+16,true),packed=v.getUint32(p+20,true),length=v.getUint32(p+24,true),n=v.getUint16(p+28,true),extra=v.getUint16(p+30,true),comment=v.getUint16(p+32,true),offset=v.getUint32(p+42,true);
  if(flags!==0x800||method||packed!==length||extra||comment||v.getUint16(p+34,true)||offset!==local||p+46+n>end||n>160)fail('请使用 BoxStudio 导出的未修改项目包。');
  const name=decoder.decode(bytes.subarray(p+46,p+46+n));
  if(!/^[a-zA-Z0-9_.\-/]+$/.test(name)||name.startsWith('/')||name.split('/').some(x=>!x||x==='.'||x==='..')||files.has(name))fail('项目包文件路径无效或重复。');
  if(local+30+n>start||v.getUint32(local,true)!==0x04034b50||v.getUint16(local+6,true)!==flags||v.getUint16(local+8,true)!==method||v.getUint32(local+14,true)!==sum||v.getUint32(local+18,true)!==length||v.getUint32(local+22,true)!==length||v.getUint16(local+26,true)!==n||v.getUint16(local+28,true)||decoder.decode(bytes.subarray(local+30,local+30+n))!==name)fail('项目包文件头损坏。');
  local+=30+n;
  if(local+length>start)fail('项目包文件被截断。');
  const data=bytes.subarray(local,local+length);
  if(zipCrcV74(data)!==sum)fail('文件校验失败：'+name);
  files.set(name,data);local+=length;p+=46+n;
 }
 if(p!==end||local!==start)fail('项目包目录与文件长度不一致。');
 return files;
}

function walk(value,callback,depth=0,budget={left:300000}){
 if(--budget.left<0||depth>60)fail('项目数据层级或对象数量过多。');
 if(!value||typeof value!=='object')return;
 callback(value);
 for(const [key,v] of Object.entries(value)){
  if(['__proto__','prototype','constructor'].includes(key))fail('项目包含不支持的数据字段。');
  walk(v,callback,depth+1,budget);
 }
}
export function packageReferencesV81(state){
 const refs=new Map();
 function add(role,hash,name){
  if(!hex.test(hash))fail('项目附件编号无效。');
  const path=role==='model'?`models/${hash}.glb`:`evidence/${hash}.bin`;
  if(!refs.has(path))refs.set(path,{role,sha256:hash,path,name:String(name||path).slice(0,200)});
 }
 walk(state,o=>{
  if(o.type==='model'){
   if(!/^model-[a-f0-9]{64}$/.test(o.assetV80?.id))fail('场景模型编号无效。');
   add('model',o.assetV80.id.slice(6),o.assetV80.name||o.name);
  }
  if(o.printProofsV80!==undefined){
   if(!Array.isArray(o.printProofsV80)||o.printProofsV80.length>20)fail('印刷校验记录无效。');
   for(const r of o.printProofsV80){add('evidence',r?.photoSha256,r?.photoName);if(r?.reportFile)add('evidence',r.reportFile.sha256,r.reportFile.name);}
  }
 });
 if(refs.size>198)fail('项目附件过多，请拆分项目后再打包。');
 return [...refs.values()];
}

export function normalizePackageStateV81(kind,state){
 if(!['box','marks'].includes(kind))fail('项目包类型不受支持。');
 packageReferencesV81(state);
 if(kind==='marks')return{...parseMarkDocumentV67(JSON.stringify(state)),page:'mark-studio',editorTab:'Marks'};
 if(!state||state.schema==='boxstudio-standalone-mark'||!Array.isArray(state.elements)||state.elements.length>500||typeof state.projectName!=='string'||!state.projectName.trim()||state.projectName.length>160)fail('纸盒项目无效。');
 const next={...structuredClone(defaultState),...structuredClone(state),page:'editor',editorTab:'Design'};
 validateProjectStateV66(next);
 sceneObjectsV79(next.sceneV71?.objectsV79||[]);
 return next;
}

export async function buildProjectPackageV81(kind,state,readAsset){
 const snapshot=structuredClone(state);normalizePackageStateV81(kind,snapshot);
 const json=encoder.encode(JSON.stringify(snapshot));
 if(json.length>JSON_LIMIT)fail('项目 JSON 不能超过 50 MB。');
 const files=[{name:'project.json',bytes:json}],assets=[];let total=json.length+65536;
 for(const ref of packageReferencesV81(snapshot)){
  const asset=await readAsset(ref);
  if(!asset)fail(`缺少原文件：${ref.name}。请重新导入模型或恢复照片 / 报告后再打包。`);
  const data=asset instanceof ArrayBuffer?new Uint8Array(asset):ArrayBuffer.isView(asset)?new Uint8Array(asset.buffer,asset.byteOffset,asset.byteLength):new Uint8Array(await asset.arrayBuffer());
  if(!data.length||data.length>(ref.role==='model'?30:20)*1024*1024)fail('附件为空或超过允许的文件大小：'+ref.name);
  total+=data.byteLength;
  if(total>PACKAGE_LIMIT_V81)fail('项目包超过 128 MB，请减少模型或印刷附件。');
  if(await packageShaV81(data)!==ref.sha256)fail('原文件完整性校验失败：'+ref.name);
  assets.push({...ref,bytes:data.length,mime:typeof asset.type==='string'?asset.type:'model/gltf-binary',lastModified:Number(asset.lastModified)||0});
  files.push({name:ref.path,bytes:data});
 }
 const manifest={schema,version:1,kind,name:snapshot.projectName,createdAt:new Date().toISOString(),project:{path:'project.json',sha256:await packageShaV81(json),bytes:json.length},assets};
 const manifestJson=JSON.stringify(manifest,null,2);
 if(encoder.encode(manifestJson).length>65536)fail('项目附件清单过大，请拆分项目后再打包。');
 files.unshift({name:'manifest.json',bytes:manifestJson});
 const bytes=zipStoredV74(files);
 if(bytes.length>PACKAGE_LIMIT_V81)fail('项目包超过 128 MB，请减少附件。');
 return{bytes,manifest};
}

export async function inspectProjectPackageV81(input){
 const files=readPackageZipV81(input),manifestBytes=files.get('manifest.json');
 if(!manifestBytes||manifestBytes.length>65536)fail('缺少有效的项目包清单。');
 const manifest=JSON.parse(decoder.decode(manifestBytes));
 if(manifest.schema!==schema||manifest.version!==1||!['box','marks'].includes(manifest.kind)||manifest.project?.path!=='project.json'||!Array.isArray(manifest.assets)||manifest.assets.length>198)fail('项目包版本或清单无效。');
 const json=files.get('project.json');
 if(!json||json.length>JSON_LIMIT||json.length!==manifest.project.bytes||await packageShaV81(json)!==manifest.project.sha256)fail('项目 JSON 完整性校验失败。');
 const state=normalizePackageStateV81(manifest.kind,JSON.parse(decoder.decode(json))),refs=packageReferencesV81(state),byPath=new Map(refs.map(r=>[r.path,r]));
 if(manifest.assets.length!==refs.length||files.size!==refs.length+2)fail('附件清单与项目引用不一致。');
 const assets=[];
 for(const a of manifest.assets){
  const ref=byPath.get(a.path),data=files.get(a.path);
  if(!ref||a.role!==ref.role||a.sha256!==ref.sha256||!data||a.bytes!==data.length||data.length>(a.role==='model'?30:20)*1024*1024||!data.length||await packageShaV81(data)!==ref.sha256)fail('附件缺失或完整性校验失败。');
  if(typeof a.name!=='string'||a.name.length>200||typeof a.mime!=='string'||a.mime.length>100||!Number.isFinite(a.lastModified)||a.lastModified<0||a.lastModified>8640000000000000)fail('附件元数据无效。');
  assets.push({...a,bytes:data.slice()});byPath.delete(a.path);
 }
 return{manifest,state,assets};
}
