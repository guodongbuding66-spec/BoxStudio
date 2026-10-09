import {openArtworkLibraryV75 as openArtworkLibraryV74,openFontLibraryV75 as openFontLibraryV74} from './resourceUiV75.js';
import {prepareFontsV74,getFontV74} from './fontSystemV74.js';
import {standaloneMarkUiV67} from './standaloneMarkUiV67.js';
const inMarks=()=>window.BoxStudioEditor.getState().page==='mark-studio';
const state=()=>inMarks()?standaloneMarkUiV67.getState():window.BoxStudioEditor.getState();
export {openArtworkLibraryV74,openFontLibraryV74};
let loadingKey='';
function enhance(){if(!window.BoxStudioEditor)return;const s=state(),nav=document.querySelector('[data-v66-navigation]');if(nav&&!nav.querySelector('[data-v74-resources]')){const b=document.createElement('button');b.dataset.v74Resources='true';b.textContent='素材库';b.onclick=openArtworkLibraryV74;nav.append(b);const f=document.createElement('button');f.dataset.v74Fonts='true';f.textContent='字体';f.onclick=openFontLibraryV74;nav.append(f);}
 const needs=(s.elements||[]).filter(e=>e.fontIdV74&&!getFontV74(e.fontIdV74,e.bold)),key=needs.map(e=>e.fontIdV74+e.bold).sort().join(',');if(key&&key!==loadingKey){loadingKey=key;prepareFontsV74(s).then(()=>{loadingKey='';if(inMarks())standaloneMarkUiV67.refresh();else window.BoxStudioEditor.reloadFromStorage({history:false});}).catch(()=>{loadingKey='';});}
}
window.BoxStudioUiRuntimeV64?.register('v74',enhance);
window.BoxStudioV74={openArtworkLibrary:openArtworkLibraryV74,openFontLibrary:openFontLibraryV74,switchMarkFace:face=>standaloneMarkUiV67.switchFace(face)};
