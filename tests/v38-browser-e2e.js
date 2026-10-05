const log=document.getElementById('v38E2ELog');
async function signal(path,key,value){try{await fetch(`${path}?${key}=${encodeURIComponent(value)}`,{cache:'no-store'})}catch(error){console.error('E2E signal failed',error)}}
function must(selector){const el=document.querySelector(selector);if(!el)throw new Error(`Missing ${selector}`);return el}
function activate(el){el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}))}
await signal('/__v38_started__','detail','driver-loaded-after-ui');
try{
  must('#v38OpenCad').click();
  must('#boxstudio-v38-cad');must('#v38Canvas');
  const before=JSON.parse(localStorage.getItem('boxstudio-mvp-v32')||'null');if(!before?.dielineV38?.edges?.length)throw new Error('Dieline document was not persisted when CAD opened.');
  const firstEdge=must('[data-v38-edge]'),edgeId=firstEdge.dataset.v38Edge;activate(firstEdge);
  must('[data-v38-line-type="CREASE"]').click();
  let saved=JSON.parse(localStorage.getItem('boxstudio-mvp-v32')||'null');let edge=saved.dielineV38.edges.find(x=>x.id===edgeId);if(edge?.lineType!=='CREASE')throw new Error(`CUT→CREASE conversion did not persist: ${edge?.lineType}`);
  activate(must(`[data-v38-edge="${edgeId}"]`));must('[data-v38-curve="cubic"]').click();
  must('[data-v38-action="insert-node"]').click();
  saved=JSON.parse(localStorage.getItem('boxstudio-mvp-v32')||'null');if(saved.dielineV38.nodes.length!==before.dielineV38.nodes.length+1)throw new Error('Add Node did not increase node count.');if(saved.dielineV38.edges.length!==before.dielineV38.edges.length+1)throw new Error('Split edge did not increase edge count.');
  const x=must('[data-v38-node-prop="x"]');x.value='33';x.dispatchEvent(new Event('change',{bubbles:true}));
  saved=JSON.parse(localStorage.getItem('boxstudio-mvp-v32')||'null');if(!saved.dielineV38.nodes.some(n=>Math.abs(Number(n.x)-33)<.001))throw new Error('Exact node X edit did not persist.');const splitCrease=saved.dielineV38.edges.filter(e=>e.lineType==='CREASE'&&e.curve==='cubic');if(splitCrease.length<2)throw new Error('Cubic split did not preserve CREASE semantics.');
  must('[data-v38-action="preflight"]').click();must('.v38-counts');
  const {buildDxfV38,buildDielineSvgV38,buildDielinePdfV38}=await import('../src/productionExportV38.js');const dxf=buildDxfV38(saved.dielineV38),svg=buildDielineSvgV38(saved.dielineV38),pdf=buildDielinePdfV38(saved.dielineV38);if(!dxf.includes('2\nCREASE\n'))throw new Error('DXF lacks CREASE layer.');if(!svg.includes('data-spot-name="Crease"'))throw new Error('SVG lacks Crease spot metadata.');if(pdf.length<500)throw new Error('Dieline PDF output too small.');
  const detail=`PASS real-dieline-cad nodes=${saved.dielineV38.nodes.length} edges=${saved.dielineV38.edges.length} pdf=${pdf.length}`;document.body.dataset.v38E2e='pass';log.textContent=detail;await signal('/__v38_pass__','detail',detail);
}catch(error){const message=String(error?.stack||error);document.body.dataset.v38E2e='fail';log.textContent=`FAIL ${message}`;console.error(error);await signal('/__v38_fail__','message',message)}
