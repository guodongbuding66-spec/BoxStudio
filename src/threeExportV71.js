import {buildTextureProofModel} from './threeArtworkProof.js';
import {buildFoldTransformsV50} from './threeArtworkProofV50.js';
import {renderPanelArtworkCanvas} from './panelArtwork.js';

const apply=(m,p)=>[m[0]*p[0]+m[1]*p[1]+m[2]*p[2]+m[3],m[4]*p[0]+m[5]*p[1]+m[6]*p[2]+m[7],m[8]*p[0]+m[9]*p[1]+m[10]*p[2]+m[11]];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const normal=(a,b,c)=>{const n=cross(sub(b,a),sub(c,a)),l=Math.hypot(...n)||1;return n.map(v=>v/l);};
const pad4=n=>Math.ceil(n/4)*4;
export function foldedMeshesV71(state,geo,graph,{progress=100,authoring={}}={}){
 const model=buildTextureProofModel(state,geo,graph),transforms=buildFoldTransformsV50(graph,geo,progress,authoring);
 const panels=model.panels.map(p=>{const m=transforms.get(p.nodeId),points=p.uvMap.points.map(q=>apply(m,[q[0]-geo.width/2,-(q[1]-geo.height/2),0]));return{...p,points,normal:normal(...p.uvMap.triangles[0].map(i=>points[i]))};});
 if(!panels.length)throw new Error('没有可导出的 3D 面板。');
 const all=panels.flatMap(p=>p.points);if(all.some(p=>p.some(v=>!Number.isFinite(v))))throw new Error('3D 坐标无效。');
 const min=[0,1,2].map(i=>Math.min(...all.map(p=>p[i]))),max=[0,1,2].map(i=>Math.max(...all.map(p=>p[i]))),center=min.map((v,i)=>(v+max[i])/2);
 return{panels,min,max,center,span:Math.max(...max.map((v,i)=>v-min[i])),upAxis:geo.foldRoot==='base'?'Z':'Y',progress};
}
export async function artworkTexturesV71(meshes,{maxPixels=1024,background='#ffffff'}={}){
 if(typeof document==='undefined')throw new Error('图文贴图需要浏览器。');await document.fonts?.ready;
 const sources=[...new Set(meshes.panels.flatMap(p=>p.plan?.commands.filter(c=>c.type==='image').map(c=>c.src)||[]))];
 // Prime the shared renderer cache, then wait for actual pixel data. A failed
 // artwork image is an export error rather than a silently blank texture.
 for(const p of meshes.panels)if(p.plan)renderPanelArtworkCanvas(p.plan,{maxPixels,background});
 await Promise.all(sources.map(src=>new Promise((resolve,reject)=>{const image=new Image(),timer=setTimeout(()=>reject(new Error('图片加载超时，无法生成完整贴图。')),12000);image.onload=()=>{clearTimeout(timer);resolve();};image.onerror=()=>{clearTimeout(timer);reject(new Error('图片无法加载，无法生成完整贴图。'));};image.src=src;})));
 await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
 return new Map(meshes.panels.map(p=>[p.nodeId,renderPanelArtworkCanvas(p.plan,{maxPixels,background})]));
}
export function encodeGlbV71(meshes,{textures=new Map(),name='BoxStudio',thicknessMm=0}={}){
 const json={asset:{version:'2.0',generator:'BoxStudio V0.71'},scene:0,scenes:[{name,nodes:[]}],nodes:[],meshes:[],accessors:[],bufferViews:[],buffers:[],materials:[],images:[],textures:[],samplers:[{magFilter:9729,minFilter:9729,wrapS:33071,wrapT:33071}],extras:{units:'meters',sourceUnits:'mm',foldProgress:meshes.progress,boardThicknessMm:thicknessMm}},chunks=[];let offset=0;
 const view=(bytes,target)=>{const data=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes.buffer,bytes.byteOffset,bytes.byteLength),index=json.bufferViews.length;json.bufferViews.push({buffer:0,byteOffset:offset,byteLength:data.length,...(target?{target}:{})});chunks.push({offset,data});offset+=pad4(data.length);return index;};
 const accessor=(values,size,type)=>{const arr=new Float32Array(values),index=json.accessors.length;json.accessors.push({bufferView:view(arr,34962),componentType:5126,count:arr.length/size,type,...(type==='VEC3'?{min:[0,1,2].map(i=>Math.min(...Array.from(arr).filter((_,j)=>j%3===i))),max:[0,1,2].map(i=>Math.max(...Array.from(arr).filter((_,j)=>j%3===i)))}:{})});return index;};
 for(const panel of meshes.panels){
  const positions=[],normals=[],uvs=[],n=panel.normal,half=Math.max(0,Number(thicknessMm)||0)/2;
  const emit=(indices,normalValue,shift)=>{for(const i of indices){const q=panel.points[i].map((v,k)=>(v-meshes.center[k]+normalValue[k]*shift)/1000);positions.push(...q);normals.push(...normalValue);uvs.push(...panel.uvMap.uv[i]);}};
  for(const tri of panel.uvMap.triangles){emit(tri,n,half);if(half>0)emit([...tri].reverse(),n.map(v=>-v),half);}
  if(half>0){for(let i=0;i<panel.points.length;i++){const j=(i+1)%panel.points.length,a=panel.points[i],b=panel.points[j],edgeNormal=normal(a,b,a.map((v,k)=>v+n[k]));const corners=[[i,half],[j,half],[j,-half],[i,-half]];for(const k of [0,1,2,0,2,3]){const[v,shift]=corners[k];positions.push(...panel.points[v].map((p,d)=>(p-meshes.center[d]+n[d]*shift)/1000));normals.push(...edgeNormal);uvs.push(...panel.uvMap.uv[v]);}}}
  if(meshes.upAxis==='Z'){for(let i=0;i<positions.length;i+=3){const y=positions[i+1];positions[i+1]=positions[i+2];positions[i+2]=-y;const ny=normals[i+1];normals[i+1]=normals[i+2];normals[i+2]=-ny;}}
  const material={name:panel.label,doubleSided:true,pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],metallicFactor:0,roughnessFactor:.85}};
  const texture=textures.get(panel.nodeId);if(texture){if(!(texture instanceof Uint8Array)||texture.length<8||texture[0]!==137||texture[1]!==80)throw new Error('3D 贴图必须是有效 PNG。');const image=json.images.length;json.images.push({bufferView:view(texture),mimeType:'image/png',name:panel.nodeId});const ti=json.textures.length;json.textures.push({source:image,sampler:0});material.pbrMetallicRoughness.baseColorTexture={index:ti};}
  const mi=json.materials.length;json.materials.push(material);const mesh=json.meshes.length;json.meshes.push({name:panel.nodeId,primitives:[{attributes:{POSITION:accessor(positions,3,'VEC3'),NORMAL:accessor(normals,3,'VEC3'),TEXCOORD_0:accessor(uvs,2,'VEC2')},material:mi,mode:4}]});json.scenes[0].nodes.push(json.nodes.length);json.nodes.push({name:panel.label,mesh,extras:{panelId:panel.panelId}});
 }
 if(!json.images.length){delete json.images;delete json.textures;delete json.samplers;}
 json.buffers.push({byteLength:offset});const encoded=new TextEncoder().encode(JSON.stringify(json)),jlen=pad4(encoded.length),length=12+8+jlen+8+offset,out=new Uint8Array(length),dv=new DataView(out.buffer);dv.setUint32(0,0x46546c67,true);dv.setUint32(4,2,true);dv.setUint32(8,length,true);dv.setUint32(12,jlen,true);dv.setUint32(16,0x4e4f534a,true);out.fill(32,20,20+jlen);out.set(encoded,20);dv.setUint32(20+jlen,offset,true);dv.setUint32(24+jlen,0x004e4942,true);for(const c of chunks)out.set(c.data,28+jlen+c.offset);return out;
}
export async function buildArtworkGlbV71(state,geo,graph,options={}){
 const meshes=foldedMeshesV71(state,geo,graph,options),canvases=await artworkTexturesV71(meshes,options),textures=new Map();
 for(const[id,canvas]of canvases){const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('3D 贴图编码失败。')),'image/png'));textures.set(id,new Uint8Array(await blob.arrayBuffer()));}
 return encodeGlbV71(meshes,{textures,name:state.projectName||'BoxStudio',thicknessMm:geo.manufacturing?.T||state.structure?.thickness||0});
}
