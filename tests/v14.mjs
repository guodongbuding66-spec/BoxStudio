import assert from 'node:assert/strict';
import { defaultState } from '../src/model.js';
import { canProductionAction, assertProductionPermission, normalizeProductionRole } from '../src/permissions.js';
import { createProductionJob, submitProductionJob, approveProductionJob, deleteProductionJob } from '../src/productionJobs.js';
import { createProjectEnvelope, reviseProjectEnvelope, serializeProjectEnvelope, parseProjectEnvelope, applyProjectEnvelope, createLocalProjectLibrary, createRestProjectStore } from '../src/projectStore.js';
import { createMemoryArtifactStore, artifactCoverage, reconcileQueueArtifacts } from '../src/artifactStore.js';
import { createBatchJobQueue, completeJob } from '../src/jobQueue.js';
import { preparePersistentQueue, persistentQueueProgress } from '../src/persistentBatch.js';

assert.equal(normalizeProductionRole('ADMIN'),'admin');
assert.equal(canProductionAction('operator','submit'),true);
assert.equal(canProductionAction('operator','approve'),false);
assert.equal(canProductionAction('approver','approve'),true);
assert.equal(canProductionAction('viewer','export-approved'),false);
assert.throws(()=>assertProductionPermission('viewer','create'),/cannot perform/);

let state=structuredClone(defaultState);
let job=createProductionJob(state,{id:'role-job',actor:'alice',role:'operator'});
job=submitProductionJob(job,{actor:'alice',role:'operator'});
assert.throws(()=>approveProductionJob(job,{actor:'alice',role:'operator'}),/cannot perform/);
job=approveProductionJob(job,{actor:'bob',role:'approver'});
assert.equal(job.status,'approved');
state.productionJobs=[job];state.activeProductionJobId=job.id;
assert.throws(()=>deleteProductionJob(state,job.id,{role:'operator'}),/cannot perform/);
state=deleteProductionJob(state,job.id,{role:'admin'});
assert.equal(state.productionJobs.length,0);

const storageMap=new Map();
const storage={getItem:key=>storageMap.has(key)?storageMap.get(key):null,setItem:(key,value)=>storageMap.set(key,String(value)),removeItem:key=>storageMap.delete(key)};
const library=createLocalProjectLibrary(storage);
const envelope=createProjectEnvelope(defaultState,{id:'demo-project',label:'Demo Project',updatedBy:'qa'});
const saved=library.save(envelope);
assert.equal(saved.id,'demo-project');
assert.equal(library.list().length,1);
const revised=reviseProjectEnvelope(saved,{...defaultState,projectName:'Revision 2'},{updatedBy:'qa'});
assert.equal(revised.revision,2);
library.save(revised);
assert.equal(library.load('demo-project').revision,2);
const parsed=parseProjectEnvelope(serializeProjectEnvelope(revised));
assert.equal(parsed.label,'Demo Project');
const applied=applyProjectEnvelope(defaultState,parsed);
assert.equal(applied.projectId,'demo-project');
assert.equal(applied.projectRemoteRevision,2);

let captured=null;
const fakeFetch=async(url,options={})=>{
  captured={url,options};
  const body=JSON.parse(options.body);
  return new Response(JSON.stringify(body),{status:200,headers:{'content-type':'application/json'}});
};
const remote=createRestProjectStore({baseUrl:'https://example.test/boxstudio',fetchImpl:fakeFetch});
const remoteSaved=await remote.save(revised,{expectedRevision:1});
assert.equal(remoteSaved.id,'demo-project');
assert.equal(captured.url,'https://example.test/boxstudio/projects/demo-project');
assert.equal(captured.options.method,'PUT');
assert.equal(captured.options.headers['if-match'],'1');

const artifacts=createMemoryArtifactStore();
let queue=createBatchJobQueue([{SKU:'A'},{SKU:'B'}],{id:'artifact-q',kind:'persistent-pdf-zip'});
await artifacts.put({queueId:queue.id,index:0,fileName:'A.pdf',mime:'application/pdf',bytes:Uint8Array.from([1,2,3])});
let listed=await artifacts.list(queue.id);
assert.equal(listed.length,1);
let reconciled=reconcileQueueArtifacts(queue,listed);
assert.equal(reconciled.items[0].status,'completed');
assert.equal(reconciled.items[1].status,'pending');
assert.equal(artifactCoverage(reconciled,listed).completedWithArtifact,1);
reconciled=completeJob(reconciled,1,{fileName:'B.pdf'});
assert.equal(artifactCoverage(reconciled,listed).completedMissingArtifact,1);
reconciled=reconcileQueueArtifacts(reconciled,listed);
assert.equal(reconciled.items[1].status,'pending','completed item without persisted bytes must return to pending');

state=structuredClone(defaultState);state.batch.rows=[{SKU:'A'},{SKU:'B'}];state.batch.queue=reconciled;
const prepared=preparePersistentQueue(state,listed,{kind:'persistent-pdf-zip'});
const progress=persistentQueueProgress(prepared,listed);
assert.equal(progress.artifactCount,1);
assert.equal(progress.completed,1);
assert.equal(progress.pending,1);
await artifacts.clearQueue(queue.id);
assert.equal((await artifacts.list(queue.id)).length,0);

console.log('BoxStudio V0.14 tests passed');
