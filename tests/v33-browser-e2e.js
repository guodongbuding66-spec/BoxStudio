const log=document.getElementById('v33E2ELog');
async function signal(path,key,value){try{await fetch(`${path}?${key}=${encodeURIComponent(value)}`,{cache:'no-store'})}catch(error){console.error('E2E signal failed',error)}}
function must(selector){const el=document.querySelector(selector);if(!el)throw new Error(`Missing ${selector}`);return el}

await signal('/__v33_started__','detail','driver-loaded-after-ui');
try{
  localStorage.clear();
  const open=must('#v33OpenProfessional');
  open.click();
  must('#boxstudio-v33-workspace');
  must('#v33Canvas');

  const rowsBefore=document.querySelectorAll('[data-object-row]').length;
  if(rowsBefore<2)throw new Error('Expected default project objects.');

  const firstRow=must('[data-object-row]');
  firstRow.click();
  if(document.querySelectorAll('.v33-object-row.selected').length<1)throw new Error('Object selection did not update.');

  must('[data-action="duplicate"]').click();
  const rowsAfterDuplicate=document.querySelectorAll('[data-object-row]').length;
  if(rowsAfterDuplicate<=rowsBefore)throw new Error('Duplicate did not add an object.');

  const xInput=must('[data-v33-prop="x"]');
  xInput.value='77';
  xInput.dispatchEvent(new Event('change',{bubbles:true}));
  const saved=JSON.parse(localStorage.getItem('boxstudio-mvp-v32')||'null');
  const selected=saved?.elements?.find(x=>x.id===saved.selectedId);
  if(!selected||Math.abs(Number(selected.x)-77)>.001)throw new Error(`Numeric inspector did not persist x=77; got ${selected?.x}`);

  const beforeTable=saved.elements.length;
  must('[data-action="add-table"]').click();
  const savedTable=JSON.parse(localStorage.getItem('boxstudio-mvp-v32')||'null');
  if(savedTable.elements.length<beforeTable+14)throw new Error('Table tool did not create flattened production primitives.');

  must('[data-action="undo"]');
  must('[data-action="group"]');
  must('#v33PanelFocus');

  const detail=`PASS isolated-real-ui rows=${rowsAfterDuplicate} tableElements=${savedTable.elements.length}`;
  document.body.dataset.v33E2e='pass';
  log.textContent=detail;
  await signal('/__v33_pass__','detail',detail);
}catch(error){
  const message=String(error?.stack||error);
  document.body.dataset.v33E2e='fail';
  log.textContent=`FAIL ${message}`;
  console.error(error);
  await signal('/__v33_fail__','message',message);
}