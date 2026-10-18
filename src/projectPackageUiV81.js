import {buildProjectPackageV81,inspectProjectPackageV81,packageReferencesV81,PACKAGE_LIMIT_V81} from './projectPackageV81.js';
import {readModelAssetV81,stageModelAssetV81} from './externalModelV80.js';
import {readPrintFileV80,savePrintFileV80} from './printEvidenceV80.js';
import {standaloneMarkUiV67 as marks} from './standaloneMarkUiV67.js';
import {downloadBytes} from './export.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const size=n=>n<1024*1024?`${Math.ceil(n/1024)} KB`:`${(n/1024/1024).toFixed(1)} MB`;
const editor=()=>window.BoxStudioEditor;
function current(){const kind=editor().getState().page==='mark-studio'?'marks':'box';return{kind,state:kind==='marks'?marks.getState():editor().getState()};}
export async function restoreProjectPackageV81(bundle){
 // Validate all models before any persistence. Content-addressed writes may be
 // reused after a quota error; the active document is committed only at the end.
 const writes=[];
 for(const a of bundle.assets)if(a.role==='model')writes.push(await stageModelAssetV81('model-'+a.sha256,a.bytes));
 for(const write of writes)await write();
 for(const a of bundle.assets)if(a.role==='evidence')await savePrintFileV80(a.sha256,new File([a.bytes],a.name,{type:a.mime,lastModified:a.lastModified}));
 if(bundle.manifest.kind==='marks'){
  if(editor().getState().page!=='mark-studio')editor().navigate('mark-studio',null,()=>marks.commit(bundle.state));
  else marks.commit(bundle.state);
  marks.fit();
 }else{editor().commitState(bundle.state);editor().fitCanvas();}
}
export function openProjectPackageV81(){
 const active=document.querySelector('[data-v81-project-package]');if(active){active.focus();return active;}
 let source=current();const refs=packageReferencesV81(source.state),models=refs.filter(a=>a.role==='model').length,evidence=refs.length-models;
 const d=document.createElement('dialog');d.dataset.v81ProjectPackage='true';d.className='v77-dialog v81-package';d.setAttribute('aria-label','项目包 · 备份与迁移');
 d.innerHTML=`<header><div><small>PORTABLE PROJECT</small><h2>项目包 · 备份与迁移</h2></div><button data-close aria-label="关闭项目包窗口">×</button></header><main><section aria-labelledby="v81-export-title"><span class="v81-kind">${source.kind==='marks'?'独立唛头 · 正唛与侧唛':'纸盒设计 · 包装与场景'}</span><h3 id="v81-export-title">${esc(source.state.projectName)}</h3><p>设计 JSON、嵌入图片、材质参数和场景布局，与导入的模型、实印照片及检测仪报告一起保存。</p><dl class="v81-package-summary"><div><dt>3D 模型</dt><dd>${models} 份</dd></div><div><dt>校验原文件</dt><dd>${evidence} 份</dd></div><div><dt>存储方式</dt><dd>本地 ZIP</dd></div></dl><button class="primary" data-v81-export>下载完整项目包</button><p class="v81-note">最多 128 MB。附件按内容去重并校验 SHA-256。临时加载的自有 TTF、ICC 文件需在新设备重新加载；内置字体与素材由网站提供。</p></section><section aria-labelledby="v81-import-title"><h3 id="v81-import-title">打开项目包</h3><p>先检查清单与附件，再打开到对应的纸盒或独立唛头工作区。原工作区设计可通过撤销恢复。</p><label class="v81-file">选择 BoxStudio 项目包<input data-v81-file type="file" accept=".zip,application/zip"></label><div data-v81-preview hidden></div><button data-v81-open disabled>检查后打开项目</button></section><p data-v81-status role="status" aria-live="polite"></p></main>`;
 document.body.append(d);d.showModal();let prepared=null,busy=false;
 const status=(message,error=false)=>{const p=d.querySelector('[data-v81-status]');p.textContent=message;p.dataset.error=String(error);};
 const controls=()=>d.querySelectorAll('[data-v81-export],[data-v81-file],[data-close]');
 const refreshSource=()=>{source=current();const refs=packageReferencesV81(source.state),models=refs.filter(r=>r.role==='model').length;d.querySelector('.v81-kind').textContent=source.kind==='marks'?'独立唛头 · 正唛与侧唛':'纸盒设计 · 包装与场景';d.querySelector('#v81-export-title').textContent=source.state.projectName;const values=d.querySelectorAll('.v81-package-summary dd');values[0].textContent=models+' 份';values[1].textContent=(refs.length-models)+' 份';};
 const lock=value=>{busy=value;d.setAttribute('aria-busy',String(value));controls().forEach(b=>b.disabled=value);d.querySelector('[data-v81-open]').disabled=value||!prepared;};
 const close=()=>{if(!busy)d.close();};d.querySelector('[data-close]').onclick=close;d.addEventListener('cancel',e=>{if(busy)e.preventDefault();});d.addEventListener('close',()=>d.remove(),{once:true});
 d.querySelector('[data-v81-export]').onclick=async()=>{lock(true);status('正在收集附件并校验…');try{
  const result=await buildProjectPackageV81(source.kind,source.state,ref=>ref.role==='model'?readModelAssetV81('model-'+ref.sha256):readPrintFileV80(ref.sha256));
  downloadBytes('boxstudio-'+source.kind+'-project.zip',result.bytes,'application/zip');status(`项目包已生成并下载 · ${size(result.bytes.length)} · ${result.manifest.assets.length} 份附件。`);
 }catch(e){status(e.message,true);}finally{lock(false);}};
 d.querySelector('[data-v81-file]').onchange=async e=>{const f=e.target.files[0];prepared=null;d.querySelector('[data-v81-open]').textContent='检查后打开项目';const preview=d.querySelector('[data-v81-preview]');preview.hidden=true;preview.replaceChildren();if(!f){lock(false);return;}lock(true);status('正在检查项目包与原文件…');try{
  if(f.size>PACKAGE_LIMIT_V81)throw new Error('项目包不能超过 128 MB。');
  const bundle=await inspectProjectPackageV81(await f.arrayBuffer());
  preview.innerHTML=`<h4>${esc(bundle.state.projectName)}</h4><p>${bundle.manifest.kind==='marks'?'独立唛头 · 正唛与侧唛':'纸盒设计 · 包装与场景'} · ${size(f.size)}</p><ul>${bundle.assets.map(a=>`<li><span>${a.role==='model'?'3D 模型':'校验附件'} · ${esc(a.name)}</span><small>${size(a.bytes.length)}</small></li>`).join('')||'<li>图文与材质保存在项目 JSON，无外部附件。</li>'}</ul>`;
  prepared=bundle;preview.hidden=false;status('完整性检查通过。点击“检查后打开项目”继续。');
 }catch(error){status(error.message,true);}finally{lock(false);}};
 d.querySelector('[data-v81-open]').onclick=async()=>{if(!prepared||busy)return;lock(true);status('正在恢复原文件并打开项目…');try{
  await restoreProjectPackageV81(prepared);refreshSource();status('项目与原文件已恢复，可以继续编辑。');d.querySelector('[data-v81-open]').textContent='项目已打开';prepared=null;
 }catch(e){status(`未打开项目：${e.message}。原设计已保留，请释放浏览器存储空间后重试。`,true);}finally{lock(false);}};
 return d;
}
