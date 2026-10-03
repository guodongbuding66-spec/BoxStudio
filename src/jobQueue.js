function clone(value){ return structuredClone(value); }
function nowIso(){ return new Date().toISOString(); }

export function createBatchJobQueue(rows=[], {
  id=`batch-${Date.now()}`,
  kind='pdf-zip',
  masterTemplateId=null,
}={}){
  const list=Array.isArray(rows)?rows:[];
  const createdAt=nowIso();
  return {
    id,
    kind,
    masterTemplateId:masterTemplateId||null,
    status:list.length?'ready':'empty',
    cancelRequested:false,
    createdAt,
    updatedAt:createdAt,
    total:list.length,
    items:list.map((_,index)=>({index,status:'pending',startedAt:null,finishedAt:null,error:null,fileName:null})),
  };
}

export function normalizeBatchJobQueue(queue, rows=[]){
  if(!queue || typeof queue!=='object') return createBatchJobQueue(rows);
  const next=clone(queue);
  const total=Array.isArray(rows)&&rows.length?rows.length:Number(next.total)||0;
  next.total=total;
  next.items=Array.isArray(next.items)?next.items.slice(0,total):[];
  for(let i=next.items.length;i<total;i++) next.items.push({index:i,status:'pending',startedAt:null,finishedAt:null,error:null,fileName:null});
  next.items=next.items.map((item,index)=>({index,status:['pending','running','completed','failed','cancelled'].includes(item?.status)?item.status:'pending',startedAt:item?.startedAt||null,finishedAt:item?.finishedAt||null,error:item?.error||null,fileName:item?.fileName||null}));
  if(next.items.some(item=>item.status==='running')) next.items=next.items.map(item=>item.status==='running'?{...item,status:'pending',startedAt:null}:item);
  next.cancelRequested=Boolean(next.cancelRequested);
  next.status=next.status||'ready';
  next.updatedAt=next.updatedAt||nowIso();
  return next;
}

export function queueProgress(queue){
  const items=queue?.items||[];
  const count=status=>items.filter(item=>item.status===status).length;
  const completed=count('completed'), failed=count('failed'), cancelled=count('cancelled'), running=count('running'), pending=count('pending');
  const processed=completed+failed+cancelled;
  return {
    total:items.length,
    completed,failed,cancelled,running,pending,processed,
    percent:items.length?Math.round((processed/items.length)*100):0,
    done:items.length>0 && pending===0 && running===0,
  };
}

export function claimNextJob(queue){
  const next=clone(queue);
  if(next.cancelRequested) return {queue:next,item:null};
  const item=next.items?.find(entry=>entry.status==='pending');
  if(!item){
    next.status=queueProgress(next).done?'completed':'idle';
    next.updatedAt=nowIso();
    return {queue:next,item:null};
  }
  item.status='running';
  item.startedAt=nowIso();
  item.finishedAt=null;
  item.error=null;
  next.status='running';
  next.updatedAt=nowIso();
  return {queue:next,item:clone(item)};
}

function settle(queue,index,status,{error=null,fileName=null}={}){
  const next=clone(queue);
  const item=next.items?.find(entry=>entry.index===Number(index));
  if(!item) throw new Error(`Queue item ${index} was not found.`);
  item.status=status;
  item.finishedAt=nowIso();
  item.error=error?String(error):null;
  item.fileName=fileName||item.fileName||null;
  const p=queueProgress(next);
  next.status=p.done?(p.failed?'completed-with-errors':'completed'):'running';
  next.updatedAt=nowIso();
  return next;
}

export function completeJob(queue,index,meta={}){ return settle(queue,index,'completed',meta); }
export function failJob(queue,index,error){ return settle(queue,index,'failed',{error}); }

export function requestQueueCancel(queue){
  const next=clone(queue);
  next.cancelRequested=true;
  next.status='cancelling';
  next.updatedAt=nowIso();
  return next;
}

export function finalizeQueueCancel(queue){
  const next=clone(queue);
  next.items=(next.items||[]).map(item=>item.status==='pending'||item.status==='running'?{...item,status:'cancelled',finishedAt:nowIso()}:item);
  next.status='cancelled';
  next.cancelRequested=true;
  next.updatedAt=nowIso();
  return next;
}

export function retryFailedJobs(queue){
  const next=clone(queue);
  next.items=(next.items||[]).map(item=>item.status==='failed'||item.status==='cancelled'?{...item,status:'pending',startedAt:null,finishedAt:null,error:null,fileName:null}:item);
  next.cancelRequested=false;
  next.status=next.items.some(item=>item.status==='pending')?'ready':'completed';
  next.updatedAt=nowIso();
  return next;
}
