const log=document.getElementById('v38E2ELog');
async function signal(path,key,value){try{await fetch(`${path}?${key}=${encodeURIComponent(value)}`,{cache:'no-store'})}catch(error){console.error('E2E signal failed',error)}}
function must(selector){const el=document.querySelector(selector);if(!el)throw new Error(`Missing ${selector}`);return el}
function activate(el){el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}))}
function clientFor(svg,x,y){const p=svg.createSVGPoint();p.x=x;p.y=y;const m=svg.getScreenCTM();if(!m)throw new Error('SVG screen transform unavailable.');const q=p.matrixTransform(m);return{x:q.x,y:q.y}}
function dragPointer(downEl,upEl,from,to,pointerId=17){downEl.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,view:window,pointerId,clientX:from.x,clientY:from.y,buttons:1,button:0}));upEl.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,cancelable:true,view:window,pointerId,clientX:to.x,clientY:to.y,buttons:0,button:0}))}
await signal('/__v38_started__','detail','driver-loaded-after-ui');
try{
  must('#v38OpenCad').click();
  must('#boxstudio-v38-cad');must('#v38Canvas');
  const before=JSON.parse(localStorage.getItem('boxstudio-mvp-v32')||'null');if(!before?.dielineV38?.edges?.length)throw new Error('Dieline document was not persisted when CAD opened.');
  const beforeNodeIds=new Set(before.dielineV38.nodes.map(n=>n.id));
  const firstEdge=must('[data-v38-edge]'),edgeId=firstEdge.dataset.v38Edge;activate(firstEdge);
  must('[data-v38-line-type="CREASE"]').click();
  let saved=JSON.parse(localStorage.getItem('boxstudio-mvp-v32')||'null');let edge=saved.dielineV38.edges.find(x=>x.id===edgeId);if(edge?.lineType!=='CREASE')throw new Error(`CUT→CREASE conversion did not persist: ${edge?.lineType}`);
  activate(must(`[data-v38-edge="${edgeId}"]`));must('[data-v38-curve="cubic"]').click();
  must('[data-v38-action="insert-node"]').click();
  saved=JSON.parse(localStorage.getItem('boxstudio-mvp-v32')||'null');if(saved.dielineV38.nodes.length!==before.dielineV38.nodes.length+1)throw new Error('Add Node did not increase node count.');if(saved.dielineV38.edges.length!==before.dielineV38.edges.length+1)throw new Error('Split edge did not increase edge count.');
  const inserted=saved.dielineV38.nodes.find(n=>!beforeNodeIds.has(n.id));if(!inserted)throw new Error('Inserted node could not be identified.');
  const x=must('[data-v38-node-prop="x"]');x.value='33';x.dispatchEvent(new Event('change',{bubbles:true}));
  saved=JSON.parse(localStorage.getItem('boxstudio-mvp-v32')||'null');let persistedNode=saved.dielineV38.nodes.find(n=>n.id===inserted.id);if(Math.abs(Number(persistedNode?.x)-33)>.001)throw new Error('Exact node X edit did not persist.');let splitCrease=saved.dielineV38.edges.filter(e=>e.lineType==='CREASE'&&e.curve==='cubic');if(splitCrease.length<2)throw new Error('Cubic split did not preserve CREASE semantics.');

  // Real canvas node drag: SVG logical target 44 mm at the same Y must persist through the domain model.
  let svg=must('#v38Canvas'),nodeEl=must(`[data-v38-node="${inserted.id}"]`),host=must('#boxstudio-v38-cad');persistedNode=saved.dielineV38.nodes.find(n=>n.id===inserted.id);const fromNode=clientFor(svg,persistedNode.x,persistedNode.y),toNode=clientFor(svg,44,persistedNode.y);dragPointer(nodeEl,host,fromNode,toNode,21);
  saved=JSON.parse(localStorage.getItem('boxstudio-mvp-v32')||'null');persistedNode=saved.dielineV38.nodes.find(n=>n.id===inserted.id);if(Math.abs(Number(persistedNode?.x)-44)>.08)throw new Error(`Direct node drag did not persist x≈44; got ${persistedNode?.x}`);

  // Select a real split cubic edge, expose its C1 handle, drag it, and verify the saved control point moves.
  splitCrease=saved.dielineV38.edges.filter(e=>e.lineType==='CREASE'&&e.curve==='cubic');const cubicId=splitCrease[0].id;activate(must(`[data-v38-edge="${cubicId}"]`));saved=JSON.parse(localStorage.getItem('boxstudio-mvp-v32')||'null');let cubic=saved.dielineV38.edges.find(e=>e.id===cubicId);svg=must('#v38Canvas');const c1El=must('[data-v38-control="c1"]'),c1Target={x:cubic.c1.x+12,y:cubic.c1.y+7};dragPointer(c1El,must('#boxstudio-v38-cad'),clientFor(svg,cubic.c1.x,cubic.c1.y),clientFor(svg,c1Target.x,c1Target.y),22);
  saved=JSON.parse(localStorage.getItem('boxstudio-mvp-v32')||'null');cubic=saved.dielineV38.edges.find(e=>e.id===cubicId);if(Math.abs(cubic.c1.x-c1Target.x)>.08||Math.abs(cubic.c1.y-c1Target.y)>.08)throw new Error(`Bezier C1 drag did not persist target ${c1Target.x},${c1Target.y}; got ${cubic.c1.x},${cubic.c1.y}`);

  must('[data-v38-action="preflight"]').click();must('.v38-counts');
  const {buildDxfV38,buildDielineSvgV38,buildDielinePdfV38}=await import('../src/productionExportV38.js');const dxf=buildDxfV38(saved.dielineV38),svgText=buildDielineSvgV38(saved.dielineV38),pdf=buildDielinePdfV38(saved.dielineV38);if(!dxf.includes('2\nCREASE\n'))throw new Error('DXF lacks CREASE layer.');if(!svgText.includes('data-spot-name="Crease"'))throw new Error('SVG lacks Crease spot metadata.');if(pdf.length<500)throw new Error('Dieline PDF output too small.');
  const detail=`PASS real-dieline-cad nodeDrag=${persistedNode.x.toFixed(1)} c1=${cubic.c1.x.toFixed(1)},${cubic.c1.y.toFixed(1)} nodes=${saved.dielineV38.nodes.length} pdf=${pdf.length}`;document.body.dataset.v38E2e='pass';log.textContent=detail;await signal('/__v38_pass__','detail',detail);
}catch(error){const message=String(error?.stack||error);document.body.dataset.v38E2e='fail';log.textContent=`FAIL ${message}`;console.error(error);await signal('/__v38_fail__','message',message)}
