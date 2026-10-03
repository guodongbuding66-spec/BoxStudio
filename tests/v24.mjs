import assert from 'node:assert/strict';
import { defaultState } from '../src/model.js';
import { loadRgbCmykDeviceLink, clearRgbCmykDeviceLink } from '../src/iccDeviceLinkV23.js';
import { currentDeviceLinkReference, deviceLinkBindingStatus, buildProductionPdfV24 } from '../src/productionPdfV24.js';
import { collectWorkerAssetsV24, workerAssetAvailabilityV24, transferableWorkerAssetsV24, hydrateWorkerAssetsV24 } from '../src/workerAssetsV24.js';
import { workerBatchEligibility, buildWorkerPdfTask } from '../src/batchWorkerCore.js';
import { createBatchJobQueue } from '../src/jobQueue.js';
import { attachBatchRunContextV24, batchRunCompatibilityV24, batchRunBaseStateV24 } from '../src/batchRunV24.js';
import { createProductionJob, submitProductionJob, approveProductionJob, recordProductionExport } from '../src/productionJobs.js';
import { productionOutputGateV24 } from '../src/productionOutputV24.js';
import { createMemoryArtifactStore } from '../src/artifactStore.js';

function putAscii(bytes,at,text){for(let i=0;i<text.length;i++)bytes[at+i]=text.charCodeAt(i)}
function putU32(bytes,at,v){bytes[at]=(v>>>24)&255;bytes[at+1]=(v>>>16)&255;bytes[at+2]=(v>>>8)&255;bytes[at+3]=v&255}
function putFixed(bytes,at,v){putU32(bytes,at,Math.round(v*65536)>>>0)}
function syntheticRgbCmykLink(){const tagOff=160,tagSize=48+3*256+(2**3)*4+4*256,total=tagOff+tagSize,bytes=new Uint8Array(total);putU32(bytes,0,total);putAscii(bytes,12,'link');putAscii(bytes,16,'RGB ');putAscii(bytes,20,'CMYK');putAscii(bytes,36,'acsp');putU32(bytes,128,1);putAscii(bytes,132,'A2B0');putU32(bytes,136,tagOff);putU32(bytes,140,tagSize);putAscii(bytes,tagOff,'mft1');bytes[tagOff+8]=3;bytes[tagOff+9]=4;bytes[tagOff+10]=2;[1,0,0,0,1,0,0,0,1].forEach((v,i)=>putFixed(bytes,tagOff+12+i*4,v));let at=tagOff+48;for(let c=0;c<3;c++)for(let i=0;i<256;i++)bytes[at++]=i;for(let r=0;r<2;r++)for(let g=0;g<2;g++)for(let b=0;b<2;b++){bytes[at++]=Math.round((1-r)*255);bytes[at++]=Math.round((1-g)*255);bytes[at++]=Math.round((1-b)*255);bytes[at++]=0;}for(let c=0;c<4;c++)for(let i=0;i<256;i++)bytes[at++]=i;return bytes;}

clearRgbCmykDeviceLink();
const raw=syntheticRgbCmykLink();loadRgbCmykDeviceLink(raw,'batch-link.icc');const ref=currentDeviceLinkReference();assert.ok(ref?.fingerprint&&ref.fingerprint.length===16,'V0.24 should expose deterministic DeviceLink content identity');
let state=structuredClone(defaultState);state.exportOptions={...state.exportOptions,deviceLinkRef:ref};assert.equal(deviceLinkBindingStatus(state).ok,true);
const assets=collectWorkerAssetsV24(),availability=workerAssetAvailabilityV24(assets);assert.equal(availability.hasDeviceLink,true);assert.equal(availability.deviceLinkFingerprint,ref.fingerprint);assert.equal(workerBatchEligibility(state,availability).ok,true);
const tx=transferableWorkerAssetsV24(assets);clearRgbCmykDeviceLink();assert.equal(deviceLinkBindingStatus(state).ok,false);hydrateWorkerAssetsV24(tx.payload);assert.equal(deviceLinkBindingStatus(state).ok,true,'worker hydration should restore the declared DeviceLink identity');

state.batch={...state.batch,rows:[{sku:'BATCH-001',qrValue:'BATCH-001'},{sku:'BATCH-002',qrValue:'BATCH-002'}]};let queue=createBatchJobQueue(state.batch.rows,{kind:'worker-pdf-zip-v24'});queue=attachBatchRunContextV24(queue,state);assert.equal(batchRunCompatibilityV24(state,queue).ok,true);const frozen=batchRunBaseStateV24(queue);state.projectName='Edited after batch start';assert.notEqual(frozen.projectName,state.projectName,'batch base state must remain frozen after project edits');state.batch.rows[1].sku='CHANGED';assert.equal(batchRunCompatibilityV24(state,queue).ok,false,'row edits must invalidate a running batch context');state.batch.rows[1].sku='BATCH-002';

const task=buildWorkerPdfTask(frozen,state.batch.rows[0],0,{assets:availability});assert.equal(task.ok,true);assert.equal(task.serializer,'v0.24-native-production');assert.equal(task.deviceLinkFingerprint,ref.fingerprint);const pdfText=new TextDecoder().decode(task.bytes);assert.ok(pdfText.includes('BoxStudio V0.23 Integrated Production PDF'),'V0.24 pipeline should use the integrated V0.23 native PDF serializer');

const store=createMemoryArtifactStore();const saved=await store.put({queueId:'q24',index:0,fileName:task.fileName,mime:'application/pdf',bytes:task.bytes,fingerprint:task.fingerprint,serializer:task.serializer,colorSpace:task.colorSpace,deviceLinkFingerprint:task.deviceLinkFingerprint});assert.equal(saved.serializer,'v0.24-native-production');assert.equal(saved.deviceLinkFingerprint,ref.fingerprint);assert.equal((await store.get('q24',0)).colorSpace,task.colorSpace);

let approvalState=structuredClone(defaultState);approvalState.exportOptions={...approvalState.exportOptions,deviceLinkRef:ref};let job=createProductionJob(approvalState,{actor:'operator-1',role:'operator'});job=submitProductionJob(job,{actor:'operator-1',role:'operator'});job=approveProductionJob(job,{actor:'approver-1',role:'approver'});assert.equal(productionOutputGateV24(approvalState,job).ok,true);clearRgbCmykDeviceLink();assert.equal(productionOutputGateV24(approvalState,job).stage,'color-binding');loadRgbCmykDeviceLink(raw,'batch-link.icc');assert.equal(productionOutputGateV24(approvalState,job).ok,true);
const before=job.audit.length;job=recordProductionExport(job,{actor:'operator-1',role:'operator',format:'pdf',fileName:'approved-v24.pdf',serializer:'v0.24-native-production'});assert.equal(job.audit.length,before+1);assert.equal(job.audit.at(-1).action,'exported');assert.equal(job.audit.at(-1).serializer,'v0.24-native-production');
const boundBytes=buildProductionPdfV24(approvalState);assert.ok(boundBytes.byteLength>1000);

clearRgbCmykDeviceLink();
console.log('BoxStudio V0.24 tests passed');
