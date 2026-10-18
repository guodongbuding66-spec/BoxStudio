import assert from 'node:assert/strict';
import {buildProjectPackageV81,inspectProjectPackageV81,readPackageZipV81,packageReferencesV81,packageShaV81} from '../src/projectPackageV81.js';
import {zipStoredV74} from '../src/zipStoredV74.js';
import {defaultState} from '../src/model.js';
import {createMarkDocumentV67} from '../src/standaloneMarksV67.js';
import {syncMarkFacesV74,switchMarkFaceV74} from '../src/markFacesV74.js';
import {setMarkArtboardV67} from '../src/standaloneMarksV67.js';
const photo=new File(['photo fixture'],'实印照片.png',{type:'image/png',lastModified:1710000000000}),report=new File(['report fixture'],'检测报告.pdf',{type:'application/pdf',lastModified:1720000000000});
const ph=await packageShaV81(await photo.arrayBuffer()),rh=await packageShaV81(await report.arrayBuffer()),files=new Map([[ph,photo],[rh,report]]),state=structuredClone(defaultState);
state.projectName='纸盒迁移';state.printProofsV80=[{photoSha256:ph,photoName:photo.name,reportFile:{sha256:rh,name:report.name},isoGrade:null},{photoSha256:ph,photoName:photo.name}];
const bundle=await buildProjectPackageV81('box',state,r=>files.get(r.sha256)),restored=await inspectProjectPackageV81(bundle.bytes);
assert.equal(restored.assets.length,2);assert.equal(restored.state.printProofsV80.length,2);assert.equal(restored.state.projectName,state.projectName);assert.equal(restored.assets[0].lastModified,photo.lastModified);assert.equal(restored.assets[0].mime,photo.type);assert.equal(restored.assets[0].name,photo.name);assert.equal(restored.state.printProofsV80[0].isoGrade,null);
await assert.rejects(()=>buildProjectPackageV81('box',state,()=>null),/缺少原文件/);
await assert.rejects(()=>buildProjectPackageV81('box',state,()=>new File(['wrong'],'wrong')),/完整性校验失败/);
const broken=bundle.bytes.slice();broken[200]^=1;await assert.rejects(()=>inspectProjectPackageV81(broken));
for(const n of [0,1,10,21,22,bundle.bytes.length-1])assert.throws(()=>readPackageZipV81(bundle.bytes.slice(0,n)));
const original=readPackageZipV81(bundle.bytes),repack=entries=>zipStoredV74(entries.map(([name,bytes])=>({name,bytes}))),manifest=JSON.parse(new TextDecoder().decode(original.get('manifest.json')));
await assert.rejects(()=>inspectProjectPackageV81(repack([...original].filter(([n])=>!n.startsWith('evidence/')))),/不一致/);
await assert.rejects(()=>inspectProjectPackageV81(repack([...original,['extra.txt',new Uint8Array([1])]])),/不一致/);
await assert.rejects(()=>inspectProjectPackageV81(repack([...original].map(([n,b])=>[n,n===manifest.assets[0].path?new TextEncoder().encode('corrupt'):b]))),/完整性/);
for(const name of ['../project.json','/project.json','a/../b','a//b','a\\b','a/./b'])assert.throws(()=>readPackageZipV81(zipStoredV74([{name,bytes:'a'}])),/路径/);
assert.throws(()=>readPackageZipV81(zipStoredV74([{name:'a',bytes:'a'},{name:'a',bytes:'b'}])),/重复/);
for(const mutate of [m=>m.version=99,m=>m.assets.push(m.assets[0]),m=>m.assets[0].role='model',m=>m.assets[0].sha256='0'.repeat(64),m=>m.assets[0].lastModified=-1]){
 const m=structuredClone(manifest);mutate(m);await assert.rejects(()=>inspectProjectPackageV81(repack([...original].map(([n,b])=>[n,n==='manifest.json'?JSON.stringify(m):b]))));
}
for(const key of ['__proto__','constructor','prototype']){const s=structuredClone(state);Object.defineProperty(s,key,{value:{polluted:true},enumerable:true});assert.throws(()=>packageReferencesV81(s),/数据字段/);}
assert.equal({}.polluted,undefined);
const deep=structuredClone(state);let o=deep;for(let i=0;i<65;i++)o=o.deep={};assert.throws(()=>packageReferencesV81(deep),/层级/);
let marks=syncMarkFacesV74(createMarkDocumentV67());marks=switchMarkFaceV74(marks,'side',setMarkArtboardV67);marks.elements[0].template='SIDE {{sku}}';marks.printProofsV80=state.printProofsV80;marks=syncMarkFacesV74(marks);
const markBundle=await buildProjectPackageV81('marks',marks,r=>files.get(r.sha256)),markRestore=await inspectProjectPackageV81(markBundle.bytes);
assert.equal(markRestore.manifest.kind,'marks');assert.equal(markRestore.state.markFacesV74.side.elements[0].template,'SIDE {{sku}}');assert.equal(markRestore.state.markFacesV74.front.elements[0].template,'SKU: {{sku}}');assert.equal(markRestore.assets.length,2);
await assert.rejects(()=>buildProjectPackageV81('box',marks,()=>null),/纸盒项目无效/);
await assert.rejects(()=>buildProjectPackageV81('marks',state,()=>null),/独立唛头项目/);
await assert.rejects(()=>buildProjectPackageV81('box',{...state,elements:[{id:'bad',panelId:'none',w:1,h:1}]},()=>null),/目标面/);
console.log('PASS V81: portable boxes / both mark faces, attachment deduplication, exact metadata, hashes, CRC, truncation, traversal, duplicates, extra files, schema and bounded parsing');
