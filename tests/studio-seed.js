import {STORAGE_KEY,defaultState,stateForTemplate} from '../src/model.js';
const shot=new URLSearchParams(location.search).get('shot')||'artwork';
const stages={structure:'Structure',artwork:'Design',marks:'Marks','3d':'3D',preflight:'Preflight',export:'Export',manufacturing:'3D',factory:'3D',routing:'3D',mobile:'Design'};
const preset=stateForTemplate('fefco-0427',defaultState.variables),state=structuredClone(defaultState);
Object.assign(state,{structure:preset.structure,elements:preset.elements,variables:preset.variables,selectedId:preset.selectedId,foldProgress:100,page:shot==='templates'?'templates':'editor',editorTab:stages[shot]||'Design'});
// Use disposable browser test storage only.
localStorage.clear();localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
if(['manufacturing','factory','routing'].includes(shot))localStorage.setItem('boxstudio-v58-advanced','1');
