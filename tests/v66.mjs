import assert from 'node:assert/strict';
import { defaultState,stateForTemplate } from '../src/model.js';
import { generateGeometry } from '../src/geometry.js';
import { addMarkPresetV66,rectanglesOverlapV66,applyMarkDataV66,validateMarkDataV66,validateProjectStateV66 } from '../src/shippingMarkLayoutV66.js';
import { V58_MARK_PRESETS,addMarkPresetV58 } from '../src/productExperienceV58.js';
import { prepareTemplateStateV47 } from '../src/productExperienceV47.js';
import { previewSvgForTemplateV48 } from '../src/productExperienceV48.js';
import { buildProductionPdf } from '../src/export.js';
import { renderTemplate } from '../src/variables.js';

let insertions=0;
for(const id of ['side-seal-rsc','mailer-150010','fefco-0427','reverse-tuck-end','auto-lock-bottom','fefco-0203','straight-tuck-end','sleeve-carton']){
  const s={...structuredClone(defaultState),...stateForTemplate(id)},geo=generateGeometry(s.structure);
  for(const p of geo.bodyPanels.filter(p=>p.kind==='panel')){
    let work={...structuredClone(s),elements:[]};
    for(const markId of Object.keys(V58_MARK_PRESETS)){
      const before=JSON.stringify(work);
      try{
        const r=addMarkPresetV66(work,markId,{panelId:p.id}),e=r.element;
        assert(e.x+e.w<=p.w-(work.structure.safe||2)+.001);
        assert(e.y+e.h<=p.h-(work.structure.safe||2)+.001);
        assert(!work.elements.some(old=>rectanglesOverlapV66(e,old,3)),`${id}/${p.id}/${markId} overlap`);
        if(e.type==='barcode-qr-group')assert(Math.abs(e.w/e.h-3.125)<1e-8,'Barcode + QR aspect');
        work=r.state;insertions++;
      }catch(error){if(error.code!=='MARK_NO_SPACE')throw error;assert.equal(JSON.stringify(work),before,'failed insertion must not mutate project');}
    }
  }
  // All insertion paths must reject a face that cannot fit the smaller fixed size.
  const target=geo.bodyPanels.find(p=>p.kind==='panel');
  if(target.w-2*Math.max(2,s.structure.safe)>=200&&target.h-2*Math.max(2,s.structure.safe)>=64){const group=addMarkPresetV58(s,'barcodeQr',{panelId:target.id}).element;assert([200,250].includes(group.w));assert(Math.abs(group.w/group.h-3.125)<1e-8);}else assert.throws(()=>addMarkPresetV58(s,'barcodeQr',{panelId:target.id}),e=>e.code==='MARK_NO_SPACE');
}
const initial=structuredClone(defaultState),updated=applyMarkDataV66(initial,{sku:'ISUNOR-001',nw:'12.5',gw:'14',crn:'NEW-CRN',packageIndex:'1',packageCount:'1'});
assert.equal(initial.variables.sku,'KF210215US-02PM-001');
const crns=updated.elements.filter(e=>e.template?.includes('{{crn}}')).map(e=>renderTemplate(e.template,updated.variables));
assert.deepEqual(crns,['CRN: NEW-CRN','CRN: NEW-CRN']);
assert.equal(updated.variables.length,'47.24');
assert.throws(()=>applyMarkDataV66(initial,{nw:'20',gw:'5'}),/毛重不能小于净重/);
assert.throws(()=>applyMarkDataV66(initial,{packageIndex:'4',packageCount:'3'}),/箱号不能大于/);
assert.throws(()=>applyMarkDataV66(initial,{packageCount:'1.5'}),/正整数/);
assert.throws(()=>applyMarkDataV66(initial,{sku:''}),/填写 SKU/);
assert.throws(()=>applyMarkDataV66(initial,{dimensionUnit:'BAD'}),/尺寸单位/);
assert(validateMarkDataV66({...initial.variables,nw:''}).length);
const custom=applyMarkDataV66(initial,{length:'42',width:'24',height:'8'},{syncDimensions:false});assert.equal(custom.variables.length,'42');
const template=prepareTemplateStateV47({...initial,projectId:'existing'},'mailer-150010',{length:320,width:220,height:80});
assert.equal(template.projectId,'');assert.equal(template.variables.length,'12.60');
assert.notEqual(previewSvgForTemplateV48('mailer-150010'),previewSvgForTemplateV48('mailer-150010',{structure:{length:450,width:120,height:100}}),'preview must regenerate from parameters');
assert.equal(validateProjectStateV66(updated),true);
assert.throws(()=>validateProjectStateV66({...updated,elements:[{...updated.elements[0],panelId:'absent'}]}),/目标面不存在/);
assert.throws(()=>validateProjectStateV66({...updated,elements:[{...updated.elements[0],w:NaN}]}),/位置或尺寸无效/);
assert.throws(()=>validateProjectStateV66({...updated,structure:{...updated.structure,length:-1}}),/结构尺寸/);
assert.equal(validateProjectStateV66({...updated,elements:[{id:'horizontal-line',type:'line',panelId:updated.elements[0].panelId,x:10,y:10,w:30,h:0,r:0}]}),true,'A horizontal artwork line is a valid project object');
const pdf=buildProductionPdf(updated);assert(pdf.length>10000);
console.log(`PASS V0.66: ${insertions} safe nonoverlapping placements across 8 structures, barcode aspect, bound data validation, new-project identity, parametric preview, project import and Production PDF (${pdf.length} bytes)`);
