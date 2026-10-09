import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {HANDLING_SOURCES_V73} from '../src/handlingSourcesV73.js';
import {HANDLING_SYMBOLS_V72,handlingPrimitivesV73,handlingSvgV72} from '../src/handlingSymbolsV72.js';
import {createMarkDocumentV67,setMarkArtboardV67,buildMarkPdfV67,buildMarkSvgV67,parseMarkDocumentV67} from '../src/standaloneMarksV67.js';
import {dropBoxSymbolV73} from '../src/symbolPlacementV73.js';
import {defaultState} from '../src/model.js';
import {generateGeometry} from '../src/geometry.js';
let checks=0;const check=(value,label)=>{assert.ok(value,label);checks++;};
const sources=JSON.parse(readFileSync('assets/handling-v73/sources.json'));
assert.deepEqual(sources,HANDLING_SOURCES_V73);checks++;
check(sources.filter(s=>s.file).length===14,'Fourteen genuine downloaded originals');
for(const s of sources.filter(s=>s.file)){const file=readFileSync('assets/handling-v73/'+s.file);check(createHash('sha256').update(file).digest('hex')===s.sha256,'Original hash '+s.id);check(['CC0-1.0','Public domain'].includes(s.license),'Free license '+s.id);check(file.toString().includes('<svg')&&s.source.startsWith('https://commons.wikimedia.org/wiki/File:'),'Real SVG and source '+s.id);}
mkdirSync('artifacts/v73/symbols',{recursive:true});
for(const symbol of HANDLING_SYMBOLS_V72){
 const el={id:symbol.id,type:'icon',icon:symbol.id,panelId:'label',group:'marks',x:20,y:20,w:40,h:40,r:0};
 const paths=handlingPrimitivesV73(el);
 check(paths.length>0&&paths.some(p=>p.fill),'Filled imported geometry '+symbol.id);
 check(paths.every(p=>p.ops.flatMap(o=>o.slice(1)).every(Number.isFinite)),'Finite source curves '+symbol.id);
 const square=handlingSvgV72(el),wide=handlingSvgV72({...el,w:60});
 const numbers=svg=>[...svg.matchAll(/d="([^"]+)"/g)].flatMap(m=>m[1].match(/-?\d+(?:\.\d+)?/g).map(Number));
 const a=numbers(square),b=numbers(wide);check(a.length===b.length&&a.every((n,i)=>Math.abs(b[i]-n-(i%2?0:10))<.00002),'Rectangular object preserves symbol ratio '+symbol.id);
 let doc=setMarkArtboardV67(createMarkDocumentV67('blank'),80,80);doc.elements=[el];doc.selectedId=el.id;
 check(parseMarkDocumentV67(JSON.stringify(doc)).elements[0].icon===el.icon,'Existing project remains editable '+symbol.id);
 writeFileSync(`artifacts/v73/symbols/${symbol.id}.svg`,buildMarkSvgV67(doc));writeFileSync(`artifacts/v73/symbols/${symbol.id}.pdf`,buildMarkPdfV67(doc));
}
for(const [icon,key,value]of[['stackLimit','stackLimit',7],['stackHeight','stackHeight',2.4],['stackWeight','stackWeight',1200],['temperature','temperatureMin',-20]])check(handlingSvgV72({icon,w:40,h:40})!==handlingSvgV72({icon,w:40,h:40,[key]:value}),'Outline numbers update '+key);
const base=structuredClone(defaultState);base.elements=[];const panel=generateGeometry(base.structure).panels.find(p=>p.w>80&&p.h>80),point={x:panel.x+panel.w/2,y:panel.y+panel.h/2};
const dropped=dropBoxSymbolV73(base,'fragile',point),el=dropped.elements[0];check(el.panelId===panel.id,'Drop hits actual box face');check(Math.abs(el.x+el.w/2-panel.w/2)<.001&&Math.abs(el.y+el.h/2-panel.h/2)<.001,'Drop is placed at cursor');
const crowded=dropBoxSymbolV73(dropped,'dry',point),second=crowded.elements[1];check(second.x!==el.x||second.y!==el.y,'Crowded drop uses safe free space');assert.throws(()=>dropBoxSymbolV73(base,'dry',{x:-100,y:-100}));checks++;assert.throws(()=>dropBoxSymbolV73(base,'bad',point));checks++;
writeFileSync('artifacts/v73/model-results.json',JSON.stringify({status:'PASS',checks,originals:14,symbols:17}));
console.log(`PASS V0.73: ${checks} original-asset, license, vector, editable-parameter and safe-placement checks`);
