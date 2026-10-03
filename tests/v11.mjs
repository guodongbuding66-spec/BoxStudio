import assert from 'node:assert/strict';
import { defaultState } from '../src/model.js';
import {
  createMasterTemplate,
  applyMasterTemplate,
  renameMasterTemplate,
  duplicateMasterTemplate,
  createMasterRevision,
  restoreMasterRevision,
  listMasterRevisions,
  parseMasterTemplate,
  serializeMasterTemplate,
} from '../src/masterTemplates.js';
import { saveCustomPackagingRule, validatePackagingRuleState, getPackagingRuleProfile } from '../src/rules.js';
import { saveCustomCustomerProfile, applyCustomerProfile, validateCustomerProfile, getCustomerProfile } from '../src/customerProfiles.js';
import { createMarkTemplateFromState, saveCustomMarkTemplate, applyMarkTemplate, validateMarkTemplate, getMarkTemplate } from '../src/markTemplates.js';
import { buildBatchState, buildBatchStates, summarizeBatchPreflight } from '../src/batchTemplates.js';

const state=structuredClone(defaultState);
const master=createMasterTemplate(state,{id:'master-v11',label:'Master V11'});
assert.equal(master.revision,1);
assert.equal(master.schemaVersion,2);

const renamed=renameMasterTemplate(master,'Retail Master');
assert.equal(renamed.label,'Retail Master');
const duplicate=duplicateMasterTemplate(renamed,{id:'master-v11-copy'});
assert.equal(duplicate.parentId,'master-v11');
assert.equal(duplicate.revision,1);

const changed=structuredClone(state);
changed.elements.find(e=>e.id==='sku').x=88;
const rev2=createMasterRevision(renamed,changed,{note:'Move SKU block'});
assert.equal(rev2.revision,2);
assert.equal(rev2.versions.length,1);
assert.equal(listMasterRevisions(rev2).length,2);
assert.equal(rev2.elements.find(e=>e.id==='sku').x,88);
const restored=restoreMasterRevision(rev2,1);
assert.equal(restored.revision,3);
assert.equal(restored.restoredFromRevision,1);
assert.equal(restored.elements.find(e=>e.id==='sku').x,60);

const encoded=serializeMasterTemplate(rev2);
assert.equal(parseMasterTemplate(encoded).revision,2);
const legacy={...master,schemaVersion:1};delete legacy.revision;delete legacy.versions;
assert.equal(parseMasterTemplate(JSON.stringify(legacy)).schemaVersion,2);

let customState=saveCustomPackagingRule(structuredClone(defaultState),{
  id:'retailer-a',label:'Retailer A',requiredVariables:['sku','crn'],requireCrnBindings:2,
  fixedVariables:{destinationCountry:'US'},
  barcodeQr:{required:true,allowedPresets:['250x80'],ratio:3.125,ratioTolerance:.03,requireLockAspect:true},
});
customState.packagingRuleProfileId='retailer-a';
assert.equal(getPackagingRuleProfile('retailer-a',customState).custom,true);
assert.equal(validatePackagingRuleState(customState).some(x=>x.severity==='error'),false);
customState.variables.destinationCountry='CA';
assert.equal(validatePackagingRuleState(customState).some(x=>x.code==='rule.fixed.destinationCountry'&&x.severity==='error'),true);

customState.variables.destinationCountry='US';
customState=saveCustomCustomerProfile(customState,{
  id:'retailer-a-us',label:'Retailer A US',packagingRuleProfileId:'retailer-a',
  defaultVariables:{originCountry:'China',destinationCountry:'US',dimensionUnit:'INCH',weightUnit:'LBS'},
  lockedVariables:['originCountry','destinationCountry'],preferredMarkTemplateId:'us-side-seal-master',
});
assert.equal(getCustomerProfile('retailer-a-us',customState).custom,true);
let appliedCustomer=applyCustomerProfile(customState,'retailer-a-us',{overwriteDefaults:true});
assert.equal(appliedCustomer.packagingRuleProfileId,'retailer-a');
assert.equal(validateCustomerProfile(appliedCustomer).ok,true);
appliedCustomer=applyCustomerProfile(appliedCustomer,'generic',{overwriteDefaults:true});
assert.deepEqual(appliedCustomer.lockedVariables,[]);

let marksState=structuredClone(customState);
marksState.elements.find(e=>e.id==='sku').x=123;
const customMark=createMarkTemplateFromState(marksState,{id:'retailer-a-marks',label:'Retailer A Marks'});
marksState=saveCustomMarkTemplate(marksState,customMark);
marksState.markTemplateId='retailer-a-marks';
assert.equal(getMarkTemplate('retailer-a-marks',marksState).custom,true);
const marksApplied=applyMarkTemplate(structuredClone(defaultState),'retailer-a-marks');
assert.notEqual(marksApplied.markTemplateId,'retailer-a-marks');
const marksAppliedWithCatalog=applyMarkTemplate(marksState,'retailer-a-marks');
assert.equal(marksAppliedWithCatalog.elements.find(e=>e.id==='sku').x,123);
assert.equal(validateMarkTemplate(marksAppliedWithCatalog).ok,true);

marksState.customerProfileId='retailer-a-us';
marksState.packagingRuleProfileId='retailer-a';
const portableMaster=createMasterTemplate(marksState,{id:'portable-master',label:'Portable Master'});
assert.equal(portableMaster.embeddedProfiles.customer.id,'retailer-a-us');
assert.equal(portableMaster.embeddedProfiles.packagingRule.id,'retailer-a');
assert.equal(portableMaster.embeddedProfiles.markTemplate.id,'retailer-a-marks');
const portableApplied=applyMasterTemplate(structuredClone(defaultState),portableMaster,{preserveVariables:true});
assert.equal(portableApplied.customCustomerProfiles['retailer-a-us'].label,'Retailer A US');
assert.equal(portableApplied.customPackagingRules['retailer-a'].label,'Retailer A');
assert.equal(portableApplied.customMarkTemplates['retailer-a-marks'].label,'Retailer A Marks');

const batchBase=structuredClone(defaultState);
const batchMaster=createMasterTemplate(batchBase,{id:'batch-master',label:'Batch Master'});
batchMaster.elements.find(e=>e.id==='sku').x=99;
batchBase.masterTemplates=[batchMaster];
batchBase.batch={...batchBase.batch,masterTemplateId:'batch-master',columns:['SKU','CRN','Package'],mapping:{SKU:'sku',CRN:'crn'}};
const row={SKU:'BATCH-001',CRN:'CRN-001',Package:'1/2'};
const batchState=buildBatchState(batchBase,row,{headers:batchBase.batch.columns,mapping:batchBase.batch.mapping});
assert.equal(batchState.variables.sku,'BATCH-001');
assert.equal(batchState.variables.crn,'CRN-001');
assert.equal(batchState.elements.find(e=>e.id==='sku').x,99);
const pages=buildBatchStates(batchBase,[row,{SKU:'BATCH-002',CRN:'CRN-002',Package:'2/2'}],{headers:batchBase.batch.columns,mapping:batchBase.batch.mapping});
assert.equal(pages.length,2);
assert.equal(pages[1].variables.sku,'BATCH-002');
const summary=summarizeBatchPreflight(batchBase,[row],{headers:batchBase.batch.columns,mapping:batchBase.batch.mapping});
assert.equal(summary.total,1);
assert.equal(summary.failed,0);

console.log('BoxStudio V0.11 tests passed');
