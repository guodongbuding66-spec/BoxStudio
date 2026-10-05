const frame=document.getElementById('appFrame');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const waitFor=async(fn,label,timeout=20000)=>{const end=Date.now()+timeout;while(Date.now()<end){try{const v=fn();if(v)return v}catch{}await sleep(80)}throw new Error(`Timeout: ${label}`)};
const signal=async(kind,text)=>{try{await fetch(`/__v41_${kind}__`,{method:'POST',body:text})}catch{}};
const state=()=>JSON.parse(frame.contentWindow.localStorage.getItem('boxstudio-mvp-v32')||'null');
async function afterReload(previousDocument,label){
  await waitFor(()=>frame.contentDocument&&frame.contentDocument!==previousDocument,`${label} document replacement`);
  await waitFor(()=>frame.contentWindow?.BoxStudioV41,label);
  await waitFor(()=>frame.contentDocument?.querySelector('.workspace'),`${label} workspace`);
}
try{
  await signal('started','started');
  await waitFor(()=>frame.contentWindow?.BoxStudioV41,'V0.41 API');
  const w=frame.contentWindow,d=frame.contentDocument;
  if(w.BoxStudioV41.freeAccess!==true||w.BoxStudioV41.approvalRequired!==false)throw new Error('Free-access policy is not active.');
  if(!d.querySelector('.v40-shell'))throw new Error('V0.40 professional shell missing.');
  if(!d.querySelector('[data-v41-template-top]'))throw new Error('Template Center launcher missing.');
  w.BoxStudioV41.openTemplateCenter();
  const overlay=await waitFor(()=>d.querySelector('#boxstudio-v41-templates'),'Template Center');
  const search=overlay.querySelector('[data-v41-search]');search.value='0427';search.dispatchEvent(new Event('input',{bubbles:true}));
  const card=await waitFor(()=>overlay.querySelector('[data-v41-template="fefco-0427"]'),'0427 result');
  const beforeTemplateReload=frame.contentDocument;card.click();
  await afterReload(beforeTemplateReload,'0427 reload');
  let s=state();if(s.structure.template!=='fefco-0427')throw new Error(`Template did not persist: ${s.structure.template}`);
  let doc=frame.contentDocument;
  const generator=await waitFor(()=>frame.contentDocument.querySelector('[data-v41-generator]'),'Generator');
  const external=generator.querySelector('[data-v41-mode="external"]');external.click();
  const fields=Object.fromEntries([...generator.querySelectorAll('[data-v41-size]')].map(i=>[i.dataset.v41Size,i]));fields.length.value='320';fields.width.value='210';fields.height.value='80';
  const kraft=generator.querySelector('[data-v41-material="corrugated-kraft"]');kraft.click();
  const beforeApplyReload=frame.contentDocument;generator.querySelector('[data-v41-apply]').click();
  await afterReload(beforeApplyReload,'generator apply reload');
  s=state();
  if(s.structure.sizeType!=='external')throw new Error(`Dimension mode mismatch: ${s.structure.sizeType}`);
  if(Number(s.structure.length)!==320||Number(s.structure.width)!==210||Number(s.structure.height)!==80)throw new Error('Generator dimensions did not persist.');
  if(s.structure.materialId!=='corrugated-kraft')throw new Error(`Material did not persist: ${s.structure.materialId}`);
  doc=frame.contentDocument;
  doc.querySelector('.tabbar [data-tab="Design"]')?.click();
  await waitFor(()=>frame.contentDocument.querySelector('.v41-face-scope'),'Design scope');
  doc=frame.contentDocument;doc.querySelector('[data-v41-scope="multi"]').click();
  if(doc.body.dataset.v41Scope!=='multi')throw new Error('Multi-face scope did not activate.');
  const fold=doc.querySelector('[data-v41-fold]');fold.value='55';fold.dispatchEvent(new Event('input',{bubbles:true}));await sleep(50);
  if(Number(state().foldProgress)!==55)throw new Error('Fold slider did not persist.');
  doc.querySelector('[data-v41-review]').click();
  await waitFor(()=>frame.contentDocument.querySelector('#boxstudio-v35-review'),'2D↔3D review');
  const text=`PASS template=${state().structure.template} mode=${state().structure.sizeType} material=${state().structure.materialId} fold=${state().foldProgress}`;
  document.body.dataset.pass=text;await signal('pass',text);
}catch(error){const text=`FAIL ${error?.stack||error}`;document.body.dataset.fail=text;await signal('fail',text);throw error;}
