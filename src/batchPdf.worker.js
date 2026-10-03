import { buildWorkerPdfTask } from './batchWorkerCore.js';

self.onmessage=event=>{
  const {requestId,baseState,row,index}=event.data||{};
  const result=buildWorkerPdfTask(baseState,row,index);
  if(result.ok&&result.bytes instanceof Uint8Array){
    const bytes=result.bytes,buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
    self.postMessage({...result,bytes:buffer,requestId},[buffer]);
  }else self.postMessage({...result,requestId});
};
