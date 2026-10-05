import { STORAGE_KEY, defaultState } from './model.js';
import { generateGeometry } from './geometry.js';
import { setEdgeCurveV38, edgeByIdV38 } from './dielineCadV38.js';
import { closeCad, openDielineCadV38 } from './v38Ui.js';

const VERSION='V0.43';
const clone=v=>structuredClone(v);
let observer=null,queued=false;
function readState(){try{const p=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');return p?{...clone(defaultState),...p,structure:{...defaultState.structure,...(p.structure||{})}}:clone(defaultState)}catch{return clone(defaultState)}}
function writeState(state){state.savedAt=new Date().toISOString();localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function currentGeometry(){try{return generateGeometry(readState().structure||{})}catch{return null}}

function decorateAdvanced(){
  const input=document.querySelector('[data-v42-advanced="cornerRadius"]'),label=input?.closest('label');if(label&&!label.dataset.v43Native){label.dataset.v43Native='true';label.classList.remove('metadata-only');label.classList.add('v43-native-control');const title=label.querySelector(':scope > span');if(title&&!title.querySelector('.v43-native-badge'))title.insertAdjacentHTML('beforeend',' <b class="v43-native-badge">NATIVE</b>');const help=label.querySelector('small');if(help)help.textContent='Production-native cubic fillets. SVG/PDF preserve cubic vectors; DXF exports SPLINE.'}
  document.querySelectorAll('.v42-legend span').forEach(span=>{if(span.querySelector('.meta'))span.innerHTML='<i class="meta v43-native-dot"></i> native curve production enabled in V0.43'});
  const host=document.querySelector('.v42-advanced');if(host&&!host.querySelector('.v43-advanced-status')){const badge=document.createElement('div');badge.className='v43-advanced-status';badge.innerHTML='<b>V0.43 Curve Engine</b><span>Corner radius now changes production CUT geometry.</span>';host.appendChild(badge)}
}

function decorateTemplateDetail(){
  const host=document.querySelector('#boxstudio-v42-detail');if(!host)return;const g=currentGeometry();if(g?.advancedV43?.cornerRadiusMode==='production-native-cubic'){const warning=host.querySelector('.v42-warning');if(warning){warning.classList.add('v43-native-warning');warning.textContent=`V0.43 production curve active: ${g.advancedV43.curvesAdded} native cubic CUT fillets are generated from the ${g.advancedV43.cornerRadius} mm radius setting.`}host.querySelectorAll('.v42-cap').forEach(row=>{if(row.querySelector('span')?.textContent?.includes('Corner radius')){row.classList.add('v43-native-cap');const small=row.querySelector('small');if(small)small.textContent='production-native cubic CUT geometry'}})}
}

function selectedArcId(){return document.querySelector('#boxstudio-v38-cad .v38-edge.selected[data-v38-edge]')?.dataset.v38Edge||null}
function applyArcPatch(id,patch){
  if(!id)return;closeCad();const state=readState(),doc=state.dielineV38;if(!doc)return;const edge=edgeByIdV38(doc,id);if(!edge||edge.curve!=='arc')return;const arc={...edge.arc,...patch};state.dielineV38=setEdgeCurveV38(doc,id,'arc',arc);writeState(state);openDielineCadV38();document.querySelector(`#boxstudio-v38-cad [data-v38-edge="${CSS.escape(id)}"]`)?.click();
}
function decorateCad(){
  const cad=document.querySelector('#boxstudio-v38-cad');if(!cad)return;const brand=cad.querySelector('.v38-brand span');if(brand&&!brand.dataset.v43){brand.dataset.v43='true';brand.textContent='Professional Dieline CAD · V0.43 Native Curves'}
  cad.querySelectorAll('[data-v38-export]').forEach(button=>{if(button.dataset.v43)return;button.dataset.v43='true';if(button.dataset.v38Export==='dxf')button.title='Native DXF: LINE / ARC / SPLINE';if(button.dataset.v38Export==='pdf')button.title='Native vector PDF: line + cubic curve operators';if(button.dataset.v38Export==='svg')button.title='Native SVG: L / A / C path commands'});
  const id=selectedArcId();if(!id||cad.querySelector('.v43-arc-advanced'))return;const state=readState(),edge=edgeByIdV38(state.dielineV38,id);if(!edge||edge.curve!=='arc')return;const section=[...cad.querySelectorAll('.v38-right section')].find(s=>s.querySelector('.v38-section-head h3')?.textContent==='Edge');if(!section)return;const box=document.createElement('div');box.className='v43-arc-advanced';box.innerHTML=`<div class="v43-curve-head"><b>Native Arc</b><span>DXF ARC when circular · cubic PDF serialization</span></div><div class="v38-grid2"><label>Rotation °<input data-v43-arc="rotation" type="number" step="1" value="${Number(edge.arc?.rotation||0)}"></label><label class="v43-check">Sweep<input data-v43-arc="sweep" type="checkbox" ${edge.arc?.sweep?'checked':''}></label><label class="v43-check">Large arc<input data-v43-arc="largeArc" type="checkbox" ${edge.arc?.largeArc?'checked':''}></label></div>`;section.appendChild(box);box.querySelectorAll('[data-v43-arc]').forEach(input=>input.onchange=()=>{const key=input.dataset.v43Arc,value=input.type==='checkbox'?input.checked:Number(input.value||0);applyArcPatch(id,{[key]:value})});
}
function decorate(){document.title='BoxStudio V0.43';document.body.dataset.v43NativeCurves='true';decorateAdvanced();decorateTemplateDetail();decorateCad()}
function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;decorate()})}
observer=new MutationObserver(schedule);observer.observe(document.body,{subtree:true,childList:true});decorate();

window.BoxStudioV43={version:VERSION,nativeCurves:true,cornerRadiusProductionCurve:true,dxfNativeArcSpline:true,pdfNativeCubic:true,topologyPolicy:'sample-native-curves-for-mesh'};
