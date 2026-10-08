import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createMarkDocumentV67,buildMarkSvgV67,parseMarkDocumentV67} from '../src/standaloneMarksV67.js';
import {resizeStandaloneMarkV69 as resize} from '../src/standaloneTransformV69.js';
let checks=0;const check=fn=>{fn();checks++;};
const s=createMarkDocumentV67('blank');s.elements=[{id:'shape',type:'shape',panelId:'label',group:'marks',x:30,y:40,w:80,h:40,r:0}];s.selectedId='shape';
const original=JSON.stringify(s);
for(const corner of ['nw','ne','sw','se']){
 const e=resize(s,'shape',corner,corner.includes('w')?-10:10,corner.includes('n')?-20:20).elements[0];
 check(()=>assert.deepEqual([e.w,e.h],[90,60]));
 check(()=>assert.equal(corner.includes('w')?e.x+e.w:e.x,corner.includes('w')?110:30));
 check(()=>assert.equal(corner.includes('n')?e.y+e.h:e.y,corner.includes('n')?80:40));
}
check(()=>{const e=resize(s,'shape','se',1000,1000).elements[0];assert.deepEqual([e.w,e.h],[290,180]);});
check(()=>{const e=resize(s,'shape','nw',1000,1000).elements[0];assert.deepEqual([e.x,e.y,e.w,e.h],[106,76,4,4]);});
check(()=>{const e=resize(s,'shape','se',20,10,{preserveAspect:true}).elements[0];assert.deepEqual([e.w,e.h],[100,50]);});
check(()=>assert.equal(JSON.stringify(s),original));
for(const [corner,dx,dy] of [['se',123.456,12.345],['nw',-1000,-1000],['sw',-55.1,99.23],['ne',20,-30],['se',-1000,-1000]]){
 const state=createMarkDocumentV67(),e=resize(state,'label-barcode',corner,dx,dy).elements.find(e=>e.id==='label-barcode');
 check(()=>{assert.ok(e.w>=100&&e.h>=32);assert.equal(e.w/e.h,3.125);assert.ok(e.x>=-.001&&e.y>=-.001&&e.x+e.w<=320.001&&e.y+e.h<=220.001);parseMarkDocumentV67(JSON.stringify(resize(state,'label-barcode',corner,dx,dy)));});
}
check(()=>{const e=resize(createMarkDocumentV67(),'label-up','se',10,0).elements.find(e=>e.id==='label-up');assert.equal(e.w,e.h);});
check(()=>{const state=structuredClone(s);state.elements[0]={...state.elements[0],type:'image',src:'data:image/png;base64,AA=='};const e=resize(state,'shape','se',20,0).elements[0];assert.equal(e.w/e.h,2);});
check(()=>{const state=createMarkDocumentV67(),next=resize(state,'label-sku','se',10,10);assert.equal(next.elements[0].fontSize,7);assert.equal(next.elements[0].template,state.elements[0].template);assert.deepEqual(next.variables,state.variables);});
for(const patch of [{locked:true},{hidden:true},{x:-1},{w:400}])check(()=>{const state=structuredClone(s);Object.assign(state.elements[0],patch);assert.throws(()=>resize(state,'shape','se',1,1));});
check(()=>assert.throws(()=>resize(s,'missing','se',1,1)));
check(()=>assert.throws(()=>resize(s,'shape','xx',1,1)));
check(()=>assert.throws(()=>resize(s,'shape','se',NaN,1)));
check(()=>assert.throws(()=>resize(s,'shape','se',1,Infinity)));
check(()=>assert.equal((buildMarkSvgV67(s,{ui:true,resizeHandles:true}).match(/data-mark-resize=/g)||[]).length,4));
check(()=>assert.doesNotMatch(buildMarkSvgV67(s,{resizeHandles:true}),/data-mark-resize|selection-box/));
check(()=>assert.doesNotMatch(buildMarkSvgV67(s,{ui:true,resizeHandles:true,selectedIds:['shape','other']}),/data-mark-resize/));
check(()=>{const state=structuredClone(s);state.elements[0].locked=true;assert.doesNotMatch(buildMarkSvgV67(state,{ui:true,resizeHandles:true}),/data-mark-resize/);});
execFileSync(process.execPath,['scripts/build-site.mjs'],{stdio:'inherit'});
const html=readFileSync('dist/index.html','utf8'),release=JSON.parse(readFileSync('dist/release.json','utf8')),config=JSON.parse(readFileSync('vercel.json','utf8'));
check(()=>assert.equal(release.version,JSON.parse(readFileSync('package.json','utf8')).version));
check(()=>assert.equal(release.storage,'browser-local'));
check(()=>assert.deepEqual(config.rewrites.map(r=>[r.source,r.destination]),[['/marks','/index.html'],['/box','/index.html']]));
check(()=>assert.ok(!/="\.\/src\//.test(html)&&html.includes('src="/src/app.js"')));
check(()=>{for(const name of ['server','tests','docs','artifacts','.git','.env','package.json'])assert.ok(!existsSync('dist/'+name));});
// Check module dependency closure in the actual deploy output, including worker modules.
check(()=>{const files=readdirSync('dist/src',{recursive:true}).filter(f=>f.endsWith('.js'));for(const name of files){const path=resolve('dist/src',name),text=readFileSync(path,'utf8');for(const match of text.matchAll(/(?:from\s*|import\s*\(|new URL\s*\()\s*['"](\.[^'"]+)['"]/g)){assert.ok(existsSync(resolve(dirname(path),match[1])),`Missing deployed dependency ${name}: ${match[1]}`);}}});
mkdirSync('artifacts/v69',{recursive:true});writeFileSync('artifacts/v69/model-results.json',JSON.stringify({status:'PASS',checks}));
console.log(`PASS V0.69: ${checks} anchored resize, ratio, bounds, print guides and production build checks`);
