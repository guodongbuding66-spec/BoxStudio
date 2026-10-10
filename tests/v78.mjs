import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createFoldClockV78,foldPlanV78,motionAuthoringV78,foldEaseV78} from '../src/foldMotionV78.js';
import {ARTWORK_CATALOG_ALL_V78,ARTWORK_CATALOG_V78,createArtworkV74,artworkPrimitivesV74,artworkSvgV74,artworkPdfV74} from '../src/artworkLibraryV74.js';
import {generateGeometry,defaultsForTemplate} from '../src/geometry.js';
import {buildFoldGraph} from '../src/foldgraph.js';
import {buildFoldTransformsV50} from '../src/threeArtworkProofV50.js';
import {foldedMeshesV71} from '../src/threeExportV71.js';
import {defaultState} from '../src/model.js';
let checks=0;const check=(v,m)=>{assert.ok(v,m);checks++;};
let callback,id=0,frames=[],commits=[];const clock=createFoldClockV78({progress:0,raf:fn=>{callback=fn;return ++id},cancel:()=>callback=null,onFrame:p=>frames.push(p),onCommit:p=>commits.push(p)});const tick=t=>{const fn=callback;callback=null;fn?.(t)};
clock.play();tick(0);tick(1000);check(clock.getState().progress===20,'Real timestamp advances by exactly one second');clock.pause();check(!callback&&!clock.getState().running,'Pause cancels RAF');clock.play();tick(9000);tick(9500);check(clock.getState().progress===30,'Resume excludes time spent paused');clock.configure({speed:2});tick(10000);tick(10500);check(clock.getState().progress===50,'Live speed changes preserve current pose');clock.configure({direction:-1});tick(11000);tick(11500);check(clock.getState().progress===30,'Reverse changes direction without jumping');clock.seek(80);check(clock.getState().progress===80&&!clock.getState().running,'Scrubbing pauses and commits an exact pose');clock.configure({direction:1,loop:true});clock.play();tick(12000);tick(13000);check(clock.getState().progress===100&&clock.getState().direction===-1,'Loop reverses at closed endpoint');tick(13300);tick(13800);check(clock.getState().progress===80,'Loop continues backwards instead of teleporting to flat');clock.dispose();check(!callback,'Dispose releases playback');
const reduced=createFoldClockV78({progress:0,reducedMotion:true,onFrame:p=>frames.push(p)});reduced.play();check(reduced.getState().progress===100&&!reduced.getState().running,'Reduced motion respects user preference');
check(foldEaseV78(0)===0&&foldEaseV78(1)===1&&foldEaseV78(.5)===.5,'Continuous ease endpoints');
const apply=(m,q)=>[m[0]*q[0]+m[1]*q[1]+m[2]*q[2]+m[3],m[4]*q[0]+m[5]*q[1]+m[6]*q[2]+m[7],m[8]*q[0]+m[9]*q[1]+m[10]*q[2]+m[11]];
for(const template of ['roll-lock-mailer','roll-lock-tray'])for(const thickness of [.5,1.5,3]){
 const state=structuredClone(defaultState);state.structure={...defaultsForTemplate(template),thickness};state.elements=[];const geo=generateGeometry(state.structure),graph=buildFoldGraph(geo),plan=foldPlanV78(graph);
 check(graph.unreached.length===0&&graph.edges.every(e=>e.hinge&&!e.hinge.fallback),'Every new panel has a physical crease');
 for(const progress of [0,10,30,50,65,80,90,100]){
  const pose=motionAuthoringV78(graph,progress),transforms=buildFoldTransformsV50(graph,geo,progress,pose),mesh=foldedMeshesV71(state,geo,graph,{progress});check(mesh.panels.every(p=>p.points.every(q=>q.every(Number.isFinite))),'Finite real assembly geometry');
  for(const edge of graph.edges)for(const q of [[edge.hinge.x1,edge.hinge.y1],[edge.hinge.x2,edge.hinge.y2]]){const local=[q[0]-geo.width/2,geo.height/2-q[1],0],a=apply(transforms.get(edge.from),local),b=apply(transforms.get(edge.to),local);check(Math.hypot(...a.map((v,i)=>v-b[i]))<1e-6,'Shared hinge remains connected through every phase');}
 }
 const closed=foldedMeshesV71(state,geo,graph),outer=closed.panels.find(p=>p.panelId==='left'),inner=closed.panels.find(p=>p.panelId==='left-inner-wall'),foot=closed.panels.find(p=>p.panelId==='left-floor-lock');check(inner.points.every(q=>Math.abs(q[0]-outer.points[0][0]-thickness)<1e-6),'Inner wall is offset by exact board caliper');check(foot.points.every(q=>Math.abs(q[2]+thickness)<1e-6),'Lock foot lies inside on the carton floor');
 const mid=motionAuthoringV78(graph,35);if(template==='roll-lock-mailer')check(mid.edgeProgress['back->lid']===0,'Lid waits while body walls form');check(plan.phases.some(p=>p.id==='inner-walls'),'Dedicated roll-over phase');
}
const originals=JSON.parse(readFileSync('assets/artwork-v78/originals.json','utf8'));check(ARTWORK_CATALOG_V78.length===944&&ARTWORK_CATALOG_ALL_V78.length===2488,'Complete pinned filled inventory, no duplicates');check(new Set(ARTWORK_CATALOG_ALL_V78.map(r=>r.id)).size===2488,'Source namespaces stay unique');check(readFileSync('assets/artwork-v78/LICENSE','utf8').includes('MIT'),'MIT license retained');
for(const r of ARTWORK_CATALOG_V78){check(createHash('sha256').update(originals[r.id]).digest('hex')===r.sha256,'Exact original SVG '+r.id);const el=createArtworkV74(r.id,{id:'label',w:320,h:220}),paths=artworkPrimitivesV74(el);check(paths.length>0&&paths.every(p=>p.fill&&p.ops.every(([op,...v])=>['M','L','C','Z'].includes(op)&&v.every(Number.isFinite))),'Solid editable source geometry '+r.id);check(artworkSvgV74(el).includes('<path')&&artworkPdfV74(el,0,0,220,72/25.4).length>2,'Original paths survive SVG/PDF '+r.id);}
mkdirSync('artifacts/v78',{recursive:true});writeFileSync('artifacts/v78/model-results.json',JSON.stringify({status:'PASS',checks,assets:2488,filled:944,newPhysicalStructures:2},null,2));console.log('PASS V78: '+checks+' actual clock, hinge continuity, finite caliper, complete source/vector/export assertions');
