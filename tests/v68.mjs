import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createMarkDocumentV67,parseMarkDocumentV67,patchStandaloneElementV67,buildMarkSvgV67,buildMarkPdfV67} from '../src/standaloneMarksV67.js';
import {markSelectionV68,markBoundsV68,boundedMarkMoveV68,moveMarkSelectionV68,alignMarkSelectionV68,distributeMarkSelectionV68,lockMarkSelectionV68,deleteMarkSelectionV68,duplicateMarkSelectionV68,reorderMarkSelectionV68} from '../src/standaloneLayoutV68.js';
import {applyMarkDataV66} from '../src/shippingMarkLayoutV66.js';
let checks=0;const check=fn=>{fn();checks++;};
const s=createMarkDocumentV67('blank');s.elements=[
 {id:'a',type:'shape',panelId:'label',group:'marks',x:20,y:40,w:20,h:10,r:0},
 {id:'b',type:'shape',panelId:'label',group:'marks',x:80,y:60,w:30,h:20,r:0},
 {id:'c',type:'shape',panelId:'label',group:'marks',x:140,y:80,w:40,h:30,r:0}
];const ids=['a','b','c'],original=JSON.stringify(s);
check(()=>assert.deepEqual(markBoundsV68(s.elements),{x:20,y:40,w:160,h:70,right:180,bottom:110}));
check(()=>assert.equal(markBoundsV68([]),null));
check(()=>assert.deepEqual(markSelectionV68(s,['c','a','a','missing']).map(e=>e.id),['a','c']));
for(const direction of ['left','center','right','top','middle','bottom']){
 const aligned=alignMarkSelectionV68(s,ids,direction),horizontal=['left','center','right'].includes(direction),axis=horizontal?'x':'y',size=horizontal?'w':'h';
 const measure=e=>e[axis]+(['right','bottom'].includes(direction)?e[size]:['center','middle'].includes(direction)?e[size]/2:0);
 check(()=>assert.equal(new Set(aligned.elements.map(measure)).size,1));
 check(()=>assert.deepEqual(aligned.elements.map(e=>[e.w,e.h]),s.elements.map(e=>[e.w,e.h])));
}
check(()=>assert.deepEqual(alignMarkSelectionV68(s,['a'],'right',{target:'safe'}).elements[0].x,292));
check(()=>assert.equal(alignMarkSelectionV68(s,['a'],'bottom',{target:'safe'}).elements[0].y,202));
check(()=>assert.throws(()=>alignMarkSelectionV68(s,['a'],'left'),/2/));
check(()=>assert.throws(()=>alignMarkSelectionV68(s,ids,'bad'),/方向/));
check(()=>assert.throws(()=>alignMarkSelectionV68(s,ids,'left',{target:'unknown'}),/范围/));
for(const axis of ['x','y']){
 const result=distributeMarkSelectionV68(s,ids,axis),size=axis==='x'?'w':'h',e=result.elements;
 check(()=>assert.equal(e[1][axis]-e[0][axis]-e[0][size],e[2][axis]-e[1][axis]-e[1][size]));
 check(()=>assert.equal(e[0][axis],s.elements[0][axis]));
 check(()=>assert.equal(e[2][axis],s.elements[2][axis]));
}
check(()=>assert.throws(()=>distributeMarkSelectionV68(s,['a','b'],'x'),/3/));
const overlap=structuredClone(s);overlap.elements[1].x=60;overlap.elements[2].x=65;
check(()=>assert.throws(()=>distributeMarkSelectionV68(overlap,ids,'x'),/不足/));
for(const [dx,dy]of [[50,30],[1000,1000],[-1000,-1000],[.125,-.125]]){
 const moved=moveMarkSelectionV68(s,ids,dx,dy);
 check(()=>{for(const e of moved.elements){assert.ok(e.x>=0&&e.y>=0&&e.x+e.w<=320&&e.y+e.h<=220);}});
 check(()=>assert.deepEqual(moved.elements.slice(1).map(e=>[e.x-moved.elements[0].x,e.y-moved.elements[0].y]),[[60,20],[120,40]]));
}
check(()=>assert.deepEqual(boundedMarkMoveV68(s,ids,1,1,{snap:10}),{dx:0,dy:0}));
check(()=>assert.deepEqual(boundedMarkMoveV68(s,ids,7,7,{snap:10}),{dx:10,dy:10}));
check(()=>assert.throws(()=>boundedMarkMoveV68(s,ids,NaN,0),/数字/));
const huge=structuredClone(s);huge.elements[2].w=400;
check(()=>assert.throws(()=>moveMarkSelectionV68(huge,ids,1,1),/大于画布/));
const hidden=structuredClone(s);hidden.elements[1].hidden=true;
check(()=>assert.equal(moveMarkSelectionV68(hidden,ids,5,5).elements[1].x,80));
const locked=lockMarkSelectionV68(s,['a'],true);
for(const fn of [()=>moveMarkSelectionV68(locked,ids,1,1),()=>alignMarkSelectionV68(locked,ids,'left'),()=>distributeMarkSelectionV68(locked,ids,'x'),()=>deleteMarkSelectionV68(locked,ids),()=>reorderMarkSelectionV68(locked,ids,'up'),()=>patchStandaloneElementV67(locked,'a',{x:40})])check(()=>assert.throws(fn,/锁定/));
check(()=>assert.equal(markSelectionV68(locked,ids,{editable:true}).length,2));
check(()=>assert.equal(lockMarkSelectionV68(locked,ids,false).elements[0].locked,false));
check(()=>assert.equal(parseMarkDocumentV67(JSON.stringify(locked)).elements[0].locked,true));
const bad=structuredClone(s);bad.elements[0].locked='false';
check(()=>assert.throws(()=>parseMarkDocumentV67(JSON.stringify(bad)),/锁定/));
check(()=>assert.equal(applyMarkDataV66(locked,{crn:'STILL-BOUND'},{syncDimensions:false}).variables.crn,'STILL-BOUND'));
const copies=duplicateMarkSelectionV68(locked,ids);
check(()=>assert.equal(copies.state.elements.length,6));
check(()=>assert.equal(new Set(copies.state.elements.map(e=>e.id)).size,6));
check(()=>assert.ok(copies.state.elements.slice(3).every(e=>!e.locked)));
check(()=>assert.deepEqual(copies.state.elements.slice(3).map(e=>[e.x,e.y]),[[26,46],[86,66],[146,86]]));
check(()=>assert.equal(deleteMarkSelectionV68(s,['a','b']).elements.length,1));
check(()=>assert.deepEqual(reorderMarkSelectionV68(s,['a','b'],'up').elements.map(e=>e.id),['c','a','b']));
check(()=>assert.deepEqual(reorderMarkSelectionV68(s,['b','c'],'down').elements.map(e=>e.id),['b','c','a']));
check(()=>assert.equal((buildMarkSvgV67(locked,{ui:true,selectedIds:ids}).match(/selection-box/g)||[]).length,3));
check(()=>assert.doesNotMatch(buildMarkSvgV67(locked,{selectedIds:ids}),/selection-box|is-locked|v68-marquee/));
const pdf=buildMarkPdfV67(locked);
check(()=>assert.match(new TextDecoder().decode(pdf),/MediaBox \[0 0 907\.087 623\.622\]/));
check(()=>assert.equal(JSON.stringify(s),original));
mkdirSync('artifacts/v68',{recursive:true});writeFileSync('artifacts/v68/model-results.json',JSON.stringify({status:'PASS',checks}));
console.log(`PASS V0.68: ${checks} multi-selection, alignment, distribution, lock, bounds and export checks`);
