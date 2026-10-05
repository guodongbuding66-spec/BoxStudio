const log=document.getElementById('v39E2ELog');
async function signal(path,key,value){try{await fetch(`${path}?${key}=${encodeURIComponent(value)}`,{cache:'no-store'})}catch(error){console.error('E2E signal failed',error)}}
function must(selector){const el=document.querySelector(selector);if(!el)throw new Error(`Missing ${selector}`);return el}
function activate(el){el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}))}
await signal('/__v39_started__','detail','driver-loaded-after-v38-v39-ui');
try{
  must('#v38OpenCad').click();must('#boxstudio-v38-cad');must('#v38Canvas');
  let saved=JSON.parse(localStorage.getItem('boxstudio-mvp-v32')||'null');if(!saved?.dielineV38?.nodes?.length)throw new Error('V0.38 dieline was not persisted.');
  const target=saved.dielineV38.nodes.find(n=>n.id==='n3')||saved.dielineV38.nodes[0],beforeX=Number(target.x),nextX=beforeX+1.5;
  activate(must(`[data-v38-node="${target.id}"]`));const x=must('[data-v38-node-prop="x"]');x.value=String(nextX);x.dispatchEvent(new Event('change',{bubbles:true}));
  saved=JSON.parse(localStorage.getItem('boxstudio-mvp-v32')||'null');const edited=saved.dielineV38.nodes.find(n=>n.id===target.id);if(Math.abs(Number(edited?.x)-nextX)>.001)throw new Error(`CAD edit did not persist ${target.id}: ${edited?.x}`);
  must('[data-v38-action="close"]').click();

  must('#v39RebuildTopology').click();
  saved=JSON.parse(localStorage.getItem('boxstudio-mvp-v32')||'null');if(saved?.topologyV39?.schema!=='boxstudio-structural-topology-v39')throw new Error('V0.39 topology state was not persisted.');if((saved.topologyV39.stats?.faces||0)<13)throw new Error(`Unexpected rebuilt face count: ${saved.topologyV39.stats?.faces}`);if((saved.topologyV39.graph?.edges?.length||0)<11)throw new Error(`Unexpected rebuilt fold count: ${saved.topologyV39.graph?.edges?.length}`);const persisted=saved.dielineV38.nodes.find(n=>n.id===target.id);if(Math.abs(Number(persisted?.x)-nextX)>.001)throw new Error('Topology rebuild lost the CAD edit.');if(document.body.dataset.v39Topology!=='pass')throw new Error(`Topology UI is blocked: ${must('[data-v39-status]').textContent}`);

  const full=must('#v39FullProduction');if(full.disabled)throw new Error('Full Production PDF stayed disabled after successful rebuild.');full.click();if(document.body.dataset.v39Pdf!=='pass')throw new Error('Full Production PDF UI did not complete successfully.');const bytes=Number(document.body.dataset.v39PdfBytes||0);if(bytes<1000)throw new Error(`Full Production PDF too small: ${bytes}`);
  const context=window.BoxStudioV39?.getLastContext?.();if(!context?.ok)throw new Error('Exposed V0.39 production context is not production-ready.');if(context.summary?.panels<13||context.summary?.folds<11)throw new Error('Exposed V0.39 production summary lost topology.');

  const detail=`PASS cad-node=${target.id}:${beforeX.toFixed(1)}→${nextX.toFixed(1)} panels=${saved.topologyV39.stats.faces} folds=${saved.topologyV39.graph.edges.length} pdf=${bytes}`;document.body.dataset.v39E2e='pass';log.textContent=detail;await signal('/__v39_pass__','detail',detail);
}catch(error){const message=String(error?.stack||error);document.body.dataset.v39E2e='fail';log.textContent=`FAIL ${message}`;console.error(error);await signal('/__v39_fail__','message',message)}
