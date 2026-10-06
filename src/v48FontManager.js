import { loadUserTtf, userTtfInfo, clearUserTtf } from './fontRegistry.js';

let observer=null,queued=false;
function activeTab(){return document.querySelector('.tabbar [data-tab].active')?.dataset.tab||null}
function rightPanel(){return document.querySelector('.workspace .rightpanel')}
function fmtBytes(v){const n=Number(v)||0;if(n<1024)return`${n} B`;if(n<1024*1024)return`${(n/1024).toFixed(1)} KB`;return`${(n/1024/1024).toFixed(2)} MB`}
function statusText(){const info=userTtfInfo();return info?`已加载：${info.name}\n${info.numGlyphs} glyphs · ${info.unitsPerEm} UPM · ${fmtBytes(info.sourceBytes)}`:'当前使用默认字体。可上传你有权使用的 .TTF 文件。'}
function inject(){const tab=activeTab();if(!['Design','Marks'].includes(tab))return;const right=rightPanel();if(!right||right.querySelector('.v48-font-manager'))return;const host=document.createElement('section');host.className='v48-font-manager';host.innerHTML=`<div class="head"><b>Font Manager · 字体</b><span>本地会话</span></div><div class="v48-font-status" data-v48-font-status></div><input data-v48-font-file type="file" accept=".ttf,font/ttf,application/x-font-ttf" hidden><div class="v48-font-actions"><button class="primary" data-v48-font-upload>上传 TTF</button><button data-v48-font-clear>恢复默认</button></div><div class="v48-font-note">字体仅在当前浏览器会话解析，不上传到服务器。请只使用你拥有合法授权的字体。生产导出/轮廓化继续复用现有字体引擎。</div>`;right.prepend(host);const status=host.querySelector('[data-v48-font-status]'),file=host.querySelector('[data-v48-font-file]'),refresh=()=>status.textContent=statusText();host.querySelector('[data-v48-font-upload]').onclick=()=>file.click();file.onchange=async()=>{const picked=file.files?.[0];if(!picked)return;try{if(!/\.ttf$/i.test(picked.name))throw new Error('仅支持 TTF 字体。');if(picked.size>12*1024*1024)throw new Error('字体文件超过 12 MB，本地解析已阻止。');loadUserTtf(await picked.arrayBuffer(),picked.name);refresh()}catch(error){alert(error?.message||String(error))}finally{file.value=''}};host.querySelector('[data-v48-font-clear]').onclick=()=>{clearUserTtf();refresh()};refresh()}
function decorate(){inject()}
function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;decorate()})}
observer=new MutationObserver(schedule);observer.observe(document.body,{subtree:true,childList:true});decorate();
window.BoxStudioV48Fonts={version:'V0.48',info:userTtfInfo,clear:clearUserTtf,free:true,localOnly:true};
