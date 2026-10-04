import { STORAGE_KEY, defaultState } from '../src/model.js';

const log=document.getElementById('v34E2ELog');
async function signal(path,key,value){try{await fetch(`${path}?${key}=${encodeURIComponent(value)}`,{cache:'no-store'})}catch(error){console.error('V0.34 E2E signal failed',error)}}
function requireEl(selector){const el=document.querySelector(selector);if(!el)throw new Error(`Missing ${selector}`);return el}
function saved(){return JSON.parse(localStorage.getItem(STORAGE_KEY)||'null')}

await signal('/__v34_started__','detail','driver-loaded');
try{
  localStorage.clear();
  const seed=structuredClone(defaultState);seed.page='marks';seed.editorTab='Marks';
  localStorage.setItem(STORAGE_KEY,JSON.stringify(seed));
  await import('../src/v34Ui.js');
  await Promise.resolve();await Promise.resolve();
  requireEl('#v34OpenMarksStudio').click();
  requireEl('#boxstudio-v34-marks');requireEl('#v34Canvas');
  const before=saved().elements.length;
  requireEl('[data-add-component="sku"]').click();
  let state=saved();if(state.elements.length!==before+1)throw new Error('Component insertion did not persist.');
  const added=state.elements.at(-1);if(added.group!=='marks'||added.type!=='text')throw new Error('Inserted component is not a mark text primitive.');

  const sku=requireEl('[data-var-key="sku"]');sku.value='V34-E2E-SKU';sku.dispatchEvent(new Event('change',{bubbles:true}));
  state=saved();if(state.variables.sku!=='V34-E2E-SKU')throw new Error('Variable editing did not persist.');

  requireEl('[data-right-tab="rules"]').click();
  const target=requireEl('#v34RuleTarget');target.value=added.id;
  const field=requireEl('#v34RuleField');field.value='packageCount';
  const op=requireEl('#v34RuleOp');op.value='gt';
  const value=requireEl('#v34RuleValue');value.value='1';
  const effect=requireEl('#v34RuleEffect');effect.value='show';
  requireEl('[data-action="create-rule"]').click();
  state=saved();if(!(state.markRulesV34||[]).length)throw new Error('Rule creation did not persist.');

  requireEl('[data-right-tab="variables"]').click();
  let pkg=requireEl('[data-var-key="packageCount"]');pkg.value='1';pkg.dispatchEvent(new Event('change',{bubbles:true}));
  state=saved();if(state.elements.find(x=>x.id===added.id)?.hidden!==true)throw new Error('SHOW rule did not hide target for packageCount=1.');
  pkg=requireEl('[data-var-key="packageCount"]');pkg.value='3';pkg.dispatchEvent(new Event('change',{bubbles:true}));
  state=saved();if(state.elements.find(x=>x.id===added.id)?.hidden!==false)throw new Error('SHOW rule did not reveal target for packageCount=3.');

  const beforeBlock=state.elements.length;
  requireEl('[data-add-block="handling-icons"]').click();
  state=saved();if(state.elements.length<beforeBlock+3)throw new Error('Reusable block did not insert flat mark primitives.');
  if(!document.querySelector('.v34-vars')||!document.querySelector('[data-action="save-block"]'))throw new Error('Marks Studio professional controls missing.');
  const detail=`PASS marks-studio component=${added.id} rules=${state.markRulesV34.length} elements=${state.elements.length}`;
  document.body.dataset.v34E2e='pass';log.textContent=detail;await signal('/__v34_pass__','detail',detail);
}catch(error){const message=String(error?.stack||error);document.body.dataset.v34E2e='fail';log.textContent=`FAIL ${message}`;console.error(error);await signal('/__v34_fail__','message',message)}
