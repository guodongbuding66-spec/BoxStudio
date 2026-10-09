import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';

// Page success text reports that a download was requested, not that Chrome
// finished writing it. Match the native download GUID, then read the complete
// file and confirm its byte count before letting the context close.
export async function nativeDownloadsV74(browser,context,directory){
 const client=await browser.target().createCDPSession();
 await client.send('Browser.setDownloadBehavior',{behavior:'allow',browserContextId:context.id,downloadPath:directory,eventsEnabled:true});
 return{
  async capture(filename,action,timeout=30000){
   let guid,timer;
   let begin,progress;
   const completion=new Promise((resolveDownload,reject)=>{
    begin=e=>{if(e.suggestedFilename===filename)guid=e.guid;};
    progress=e=>{if(e.guid!==guid)return;if(e.state==='completed')resolveDownload(e);else if(e.state==='canceled')reject(new Error('Native download canceled: '+filename));};
    client.on('Browser.downloadWillBegin',begin);client.on('Browser.downloadProgress',progress);
    timer=setTimeout(()=>reject(new Error('Native download did not complete: '+filename)),timeout);
   });
   completion.catch(()=>{});
   try{
    await action();const event=await completion,deadline=Date.now()+10000,path=resolve(directory,filename);
    while(Date.now()<deadline){
     try{const bytes=await readFile(path);if(bytes.length>0&&bytes.length===event.receivedBytes)return bytes;}catch(e){if(e.code!=='ENOENT')throw e;}
     await new Promise(r=>setTimeout(r,100));
    }
    throw new Error('Native file missing or byte count incomplete: '+filename);
   }finally{clearTimeout(timer);client.off('Browser.downloadWillBegin',begin);client.off('Browser.downloadProgress',progress);}
  },
  dispose:()=>client.detach()
 };
}
