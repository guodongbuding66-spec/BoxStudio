import {foldedMeshesV71} from './threeExportV71.js';
import {renderSceneV71,sceneSettingsV71} from './scene3dV71.js';

export function sceneAnimationFrameV72(t,{mode='assembly',settings={},progress=100}={}){t=Math.max(0,Math.min(1,Number(t)||0));const s=sceneSettingsV71(settings);return{progress:mode==='assembly'?100*(.5-Math.cos(Math.PI*t)/2):progress,settings:{...s,yaw:mode==='turntable'?s.yaw+Math.PI*2*t:s.yaw}};}
export function animationMimeV72(){if(typeof MediaRecorder==='undefined')return null;return['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(type=>MediaRecorder.isTypeSupported(type))||null;}
async function encodeTimedFrames(canvas,frame,{seconds,width,height,signal,onProgress}){
 if(typeof VideoEncoder==='undefined')return null;
 const {Output,WebMOutputFormat,BufferTarget,CanvasSource,Quality,getFirstEncodableVideoCodec}=await import('../vendor/mediabunny/mediabunny.min.mjs'),quality=new Quality({bitrate:5_000_000}),fps=12;
 const codec=await getFirstEncodableVideoCodec(['vp9','vp8'],{width,height,frameRate:fps,quality});if(!codec)return null;
 const output=new Output({format:new WebMOutputFormat(),target:new BufferTarget()}),source=new CanvasSource(canvas,{codec,quality,keyFrameInterval:1});output.addVideoTrack(source,{frameRate:fps});
 const canceled=()=>new DOMException('已取消动画导出。','AbortError'),abort=()=>{output.cancel().catch(()=>{});};signal?.addEventListener('abort',abort,{once:true});
 try{if(signal?.aborted)throw canceled();await output.start();const count=seconds*fps;
  for(let i=0;i<count;i++){if(signal?.aborted)throw canceled();frame(i/(count-1));await source.add(i/fps,1/fps);onProgress(Math.round((i+1)/count*100));await new Promise(resolve=>setTimeout(resolve,0));}
  if(signal?.aborted)throw canceled();await output.finalize();if(signal?.aborted)throw canceled();return new Blob([output.target.buffer],{type:'video/webm'});
 }catch(e){if(signal?.aborted)throw canceled();throw e;}finally{signal?.removeEventListener('abort',abort);if(!['finalized','canceled'].includes(output.state))await output.cancel();}
}
async function finalizeRecordedWebm(blob,seconds,signal){
 // MediaRecorder streams may omit duration/cues or use an encoder clock that
 // differs from the render clock. Preserve all encoded frames in decode order
 // and write an indexed file with the requested presentation timeline.
 const {Input,BlobSource,WEBM,Output,WebMOutputFormat,BufferTarget,EncodedPacketSink,EncodedVideoPacketSource}=await import('../vendor/mediabunny/mediabunny.min.mjs');
 const input=new Input({formats:[WEBM],source:new BlobSource(blob)});let output;
 try{const track=await input.getPrimaryVideoTrack();if(!track)throw new Error('动画文件没有视频轨道。');const codec=await track.getCodec(),config=await track.getDecoderConfig(),packets=[];for await(const packet of new EncodedPacketSink(track).packets())packets.push(packet);if(packets.length<2)throw new Error('动画文件没有足够的视频帧。');
  output=new Output({format:new WebMOutputFormat(),target:new BufferTarget()});const source=new EncodedVideoPacketSource(codec);output.addVideoTrack(source);await output.start();
  for(let i=0;i<packets.length;i++){if(signal?.aborted)throw new DOMException('已取消动画导出。','AbortError');await source.add(packets[i].clone({timestamp:i*seconds/packets.length,duration:seconds/packets.length}),i===0?{decoderConfig:config}:undefined);}
  await output.finalize();if(signal?.aborted)throw new DOMException('已取消动画导出。','AbortError');return new Blob([output.target.buffer],{type:'video/webm'});
 }finally{input.dispose();if(output&&!['finalized','canceled'].includes(output.state))await output.cancel();}
}
export async function recordSceneAnimationV72({state,geo,graph,textures,settings,progress=100,authoring={},mode='assembly',seconds=6,width=1280,height=960,signal,onProgress=()=>{}}){
 const mimeType=animationMimeV72();if(!mimeType)throw new Error('当前浏览器不支持 WebM 录制，请使用 Chrome、Edge 或 Firefox。');
 if(!['assembly','turntable'].includes(mode)||![6,10].includes(seconds))throw new Error('动画参数无效。');
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const snapshot=structuredClone(state),base=sceneSettingsV71(settings);if(!base.background){base.preset='paper';base.background='#ffffff';}
 const frame=(t)=>{const f=sceneAnimationFrameV72(t,{mode,settings:base,progress}),meshes=foldedMeshesV71(snapshot,geo,graph,{progress:f.progress,authoring});renderSceneV71(meshes,textures,f.settings,width,height,canvas);};
 const timed=await encodeTimedFrames(canvas,frame,{seconds,width,height,signal,onProgress});if(timed)return timed;
 if(typeof canvas.captureStream!=='function')throw new Error('当前浏览器不能录制画布。');
 // A slow renderer must still visit every animation pose. Manual capture
 // records one requested pose at a time; the final mux assigns fixed
 // presentation timestamps independently of the encoder's wall clock.
 frame(0);let stream=canvas.captureStream(0),track=stream.getVideoTracks()[0];if(typeof track.requestFrame!=='function'){stream.getTracks().forEach(t=>t.stop());stream=canvas.captureStream(12);track=stream.getVideoTracks()[0];}
 const chunks=[],recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:5_000_000});let timer=null,done=false,ready=false,index=0;
 try{const recorded=await new Promise((resolve,reject)=>{
  const cleanup=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);};
  const fail=e=>{if(done)return;done=true;cleanup();if(recorder.state!=='inactive')recorder.stop();reject(e);};
  const abort=()=>fail(new DOMException('已取消动画导出。','AbortError'));if(signal?.aborted){abort();return;}signal?.addEventListener('abort',abort,{once:true});
  recorder.ondataavailable=e=>{if(e.data.size){chunks.push(e.data);ready=true;}};recorder.onerror=e=>fail(e.error||new Error('动画编码失败。'));
  recorder.onstop=()=>{if(done)return;done=true;cleanup();const blob=new Blob(chunks,{type:'video/webm'});if(blob.size<1024)reject(new Error('动画文件没有有效视频内容。'));else resolve(blob);};
  recorder.start(250);const waitingSince=performance.now();
  const count=seconds*12;
  const tick=()=>{if(done)return;try{if(!ready&&performance.now()-waitingSince>10000)throw new Error('动画编码器未输出有效视频帧。');const t=ready?index/(count-1):0;frame(t);track.requestFrame?.();onProgress(Math.round(t*100));if(ready&&++index===count){timer=setTimeout(()=>recorder.stop(),500);}else timer=setTimeout(tick,250);}catch(e){fail(e);}};tick();
 });return await finalizeRecordedWebm(recorded,seconds,signal);}finally{clearTimeout(timer);stream.getTracks().forEach(track=>track.stop());}
}
