import assert from 'node:assert/strict';
import { defaultState } from '../src/model.js';
import { createBatchJobQueue, claimNextJob, completeJob, failJob, requestQueueCancel, finalizeQueueCancel, queueProgress, retryFailedJobs } from '../src/jobQueue.js';
import { createWorkspaceBundle, validateWorkspaceBundle, serializeWorkspaceBundle, parseWorkspaceBundle, applyWorkspaceBundle } from '../src/profileBundles.js';
import { createMarkAssetFromElement, saveCustomMarkAsset, insertMarkAsset, deleteCustomMarkAsset, getMarkAssetCatalog } from '../src/markAssets.js';
import { saveCustomPackagingRule, getPackagingRuleProfile, listPackagingRuleRevisions, restorePackagingRuleRevision } from '../src/rules.js';

const rows=[{SKU:'A'},{SKU:'B'},{SKU:'C'}];
let queue=createBatchJobQueue(rows,{id:'q1',masterTemplateId:'m1'});
assert.equal(queue.total,3);
assert.equal(queueProgress(queue).pending,3);
let claimed=claimNextJob(queue);queue=claimed.queue;
assert.equal(claimed.item.index,0);
assert.equal(queueProgress(queue).running,1);
queue=completeJob(queue,0,{fileName:'A.pdf'});
claimed=claimNextJob(queue);queue=claimed.queue;
queue=failJob(queue,1,'Preflight error');
assert.equal(queueProgress(queue).failed,1);
queue=requestQueueCancel(queue);
queue=finalizeQueueCancel(queue);
assert.equal(queue.status,'cancelled');
assert.equal(queueProgress(queue).cancelled,1);
queue=retryFailedJobs(queue);
assert.equal(queueProgress(queue).pending,2);

let state=structuredClone(defaultState);
const selected=state.elements.find(element=>element.id==='thisSideUp');
const asset=createMarkAssetFromElement(selected,{id:'warehouse-up',label:'Warehouse Up'});
state=saveCustomMarkAsset(state,asset);
assert.equal(getMarkAssetCatalog(state)['warehouse-up'].label,'Warehouse Up');
const before=state.elements.length;
state=insertMarkAsset(state,'warehouse-up',{panelId:'front',x:12,y:15});
assert.equal(state.elements.length,before+1);
assert.equal(state.elements.at(-1).panelId,'front');
assert.equal(state.elements.at(-1).icon,'up');
state=deleteCustomMarkAsset(state,'warehouse-up');
assert.equal(Boolean(state.customMarkAssets['warehouse-up']),false);

state=saveCustomPackagingRule(state,{
  id:'factory-a',label:'Factory A Rule',requiredVariables:['sku','crn'],requireCrnBindings:2,
  fixedVariables:{destinationCountry:'US'},barcodeQr:{required:true,allowedPresets:['250x80'],ratio:3.125,ratioTolerance:.03,requireLockAspect:true},
},{note:'Initial verified rule'});
assert.equal(getPackagingRuleProfile('factory-a',state).revision,1);
state=saveCustomPackagingRule(state,{
  id:'factory-a',label:'Factory A Rule',requiredVariables:['sku','crn','contractNo'],requireCrnBindings:2,
  fixedVariables:{destinationCountry:'US'},barcodeQr:{required:true,allowedPresets:['250x80','200x64'],ratio:3.125,ratioTolerance:.03,requireLockAspect:true},
},{note:'Add contract requirement'});
let rule=getPackagingRuleProfile('factory-a',state);
assert.equal(rule.revision,2);
assert.equal(rule.versions.length,1);
assert.equal(listPackagingRuleRevisions(rule).length,2);
state=restorePackagingRuleRevision(state,'factory-a',1);
rule=getPackagingRuleProfile('factory-a',state);
assert.equal(rule.revision,3);
assert.equal(rule.requiredVariables.includes('contractNo'),false);
assert.equal(rule.revisionNote,'Restored from revision 1');

state.customMarkAssets={sample:{id:'sample',label:'Sample',element:{type:'icon',icon:'dry',group:'marks'},builtIn:false}};
const bundle=createWorkspaceBundle(state,{label:'Portable Workspace'});
assert.equal(validateWorkspaceBundle(bundle).ok,true);
assert.equal(bundle.customPackagingRules['factory-a'].revision,3);
assert.equal(bundle.customMarkAssets.sample.label,'Sample');
const roundTrip=parseWorkspaceBundle(serializeWorkspaceBundle(bundle));
assert.equal(roundTrip.label,'Portable Workspace');
let target=structuredClone(defaultState);
target=applyWorkspaceBundle(target,roundTrip,{strategy:'replace',applyActive:true});
assert.equal(target.customPackagingRules['factory-a'].revision,3);
assert.equal(target.customMarkAssets.sample.element.icon,'dry');

console.log('BoxStudio V0.12 tests passed');
