import { createBatchJobQueue, normalizeBatchJobQueue, claimNextJob, completeJob, failJob, requestQueuePause, finalizeQueuePause, resumeQueue, requestQueueCancel, finalizeQueueCancel, queueProgress } from './jobQueue.js';
import { artifactCoverage, reconcileQueueArtifacts } from './artifactStore.js';

function clone(value){return structuredClone(value);}

export function preparePersistentQueue(state,artifacts=[],{restart=false,kind='persistent-pdf-zip'}={}){
  const rows=Array.isArray(state?.batch?.rows)?state.batch.rows:[];
  let queue=state?.batch?.queue;
  const incompatible=!queue||queue.kind!==kind||Number(queue.total)!==rows.length;
  if(restart||incompatible){queue=createBatchJobQueue(rows,{kind,masterTemplateId:state?.batch?.masterTemplateId||null});}
  else queue=normalizeBatchJobQueue(queue,rows);
  queue.kind=kind;
  queue=reconcileQueueArtifacts(queue,artifacts);
  return queue;
}

export function queueWithClaim(queue){return claimNextJob(queue);}
export function queueWithComplete(queue,index,fileName){return completeJob(queue,index,{fileName});}
export function queueWithFailure(queue,index,error){return failJob(queue,index,error);}
export function pausePersistentQueue(queue){return requestQueuePause(queue);}
export function finalizePersistentPause(queue){return finalizeQueuePause(queue);}
export function resumePersistentQueue(queue){return resumeQueue(queue);}
export function cancelPersistentQueue(queue){return requestQueueCancel(queue);}
export function finalizePersistentCancel(queue){return finalizeQueueCancel(queue);}
export function persistentQueueProgress(queue,artifacts=[]){return {...queueProgress(queue),...artifactCoverage(queue,artifacts)};}

export function completedArtifactManifest(queue,artifacts=[]){
  const byIndex=new Map((artifacts||[]).map(record=>[Number(record.index),record]));
  return (queue?.items||[]).filter(item=>item.status==='completed').map(item=>{
    const artifact=byIndex.get(Number(item.index));
    return artifact?{index:item.index,fileName:artifact.fileName,mime:artifact.mime,byteLength:artifact.byteLength,fingerprint:artifact.fingerprint}:null;
  }).filter(Boolean);
}

export function persistentQueueState(state,queue){
  const next=clone(state||{});next.batch={...(next.batch||{}),queue:clone(queue)};return next;
}
