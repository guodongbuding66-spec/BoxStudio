import {iconV67} from './uiIconsV67.js';
import {standaloneMarkUiV67 as marks} from './standaloneMarkUiV67.js';
const editor=()=>window.BoxStudioEditor,esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let cartonInspector='data',lastSelection='',focusMode=false,lastPage='';const fitted=new WeakSet();
function entryRoute(page){if(['','/marks','/box'].includes(location.pathname.replace(/\/$/,''))){const path=page==='mark-studio'?'/marks':'/';if(location.pathname!==path)history.pushState(null,'',path+location.search+location.hash);}}
function openMarkStudio(){entryRoute('mark-studio');editor().navigate('mark-studio');}
function setCanvasFocus(value){
 focusMode=value;document.body.dataset.v69Focus=String(value);
 document.querySelectorAll('[data-v69-focus-toggle]').forEach(b=>{b.setAttribute('aria-pressed',String(value));b.setAttribute('aria-label',value?'恢复工作区面板':'专注画布');b.title=value?'恢复工作区面板 · Escape':'专注画布';});
 requestAnimationFrame(()=>{if(editor().getState().page==='mark-studio')marks.fit();else editor().fitCanvas();});
}
function canvasFocus(){
 const s=editor().getState(),eligible=s.page==='mark-studio'||s.page==='editor'&&['Design','Marks','Structure','3D'].includes(s.editorTab);
 if(lastPage!==s.page||!eligible){if(focusMode)setCanvasFocus(false);lastPage=s.page;}
 const bar=document.querySelector(s.page==='mark-studio'?'.v67-mark-status':'.workspace .tabbar');
 if(!eligible||!bar||bar.querySelector('[data-v69-focus-toggle]'))return;
 const b=document.createElement('button');b.dataset.v69FocusToggle='true';b.className='v69-focus-button';b.innerHTML=iconV67('focus',18);b.setAttribute('aria-label',focusMode?'恢复工作区面板':'专注画布');b.title=focusMode?'恢复工作区面板 · Escape':'专注画布';b.setAttribute('aria-pressed',String(focusMode));b.onclick=()=>setCanvasFocus(!focusMode);const spacer=bar.querySelector('.spacer');if(spacer)spacer.before(b);else bar.prepend(b);
}
function header(){
 const top=document.querySelector('.topbar');if(!top)return;const state=editor().getState(),independent=state.page==='mark-studio';
 if(!top.dataset.v67Header){top.dataset.v67Header='true';const brand=top.querySelector('.brand');for(const node of [...brand.childNodes])if(node.nodeType===Node.TEXT_NODE)node.remove();const word=document.createElement('span');word.className='v67-brand';word.innerHTML=`${iconV67('box',24)}<b>BoxStudio</b>`;brand.prepend(word);
  const modes=document.createElement('nav');modes.className='v67-modes';modes.setAttribute('aria-label','设计工作台');modes.innerHTML=`<button data-v67-mode="box">${iconV67('box',18)}<span>纸盒设计</span></button><button data-v67-mode="mark">${iconV67('label',18)}<span>唛头设计</span></button>`;brand.after(modes);modes.querySelector('[data-v67-mode="box"]').onclick=()=>{entryRoute('editor');editor().navigate('editor','Design');};modes.querySelector('[data-v67-mode="mark"]').onclick=openMarkStudio;
  const badge=document.createElement('span');badge.dataset.v67Version='true';badge.className='v67-version';badge.textContent='V0.70';brand.append(badge);
  const save=document.createElement('button');save.dataset.v67Save='true';save.title='保存项目 · Ctrl / Cmd + S';save.innerHTML=iconV67('save',18)+'<span>保存</span>';save.onclick=()=>{try{editor().getState().page==='mark-studio'?marks.saveProject():window.BoxStudioV66.saveProject();}catch(e){const t=document.querySelector('[data-v67-toast]');t.textContent=e.message;t.dataset.show='true';}};top.querySelector('#quickExport').before(save);
  const advanced=document.createElement('details');advanced.className='v67-advanced-menu';advanced.innerHTML=`<summary aria-label="工作台设置">${iconV67('settings',18)}</summary><div data-v67-settings><b data-v67-settings-title>工作台设置</b><p data-v67-settings-hint>切换界面复杂度与印刷配置</p><section data-v67-mark-settings><button data-v67-size>画布尺寸</button><button data-v67-font>导出与字体</button></section></div>`;top.querySelector('#quickExport').before(advanced);advanced.querySelector('[data-v67-size]').onclick=()=>{advanced.open=false;const options=document.querySelector('.v67-artboard-options');if(options){options.open=true;options.scrollIntoView({block:'nearest'});options.querySelector('input').focus();}};advanced.querySelector('[data-v67-font]').onclick=()=>{advanced.open=false;marks.openExport();};
 }
 const settings=top.querySelector('[data-v67-settings]');settings.querySelector('[data-v67-mark-settings]').hidden=!independent;const heading=settings.querySelector('[data-v67-settings-title]'),hint=settings.querySelector('[data-v67-settings-hint]');const title=independent?'唛头设置':'工作台设置',help=independent?'设置物理画布与导出字体':'切换界面复杂度与印刷配置';if(heading.textContent!==title)heading.textContent=title;if(hint.textContent!==help)hint.textContent=help;
 top.querySelectorAll('[data-v67-mode]').forEach(b=>{const active=(b.dataset.v67Mode==='mark')===independent;b.setAttribute('aria-pressed',String(active));});
 const nav=top.querySelector('[data-v66-navigation]');if(nav){const project=nav.querySelector('[data-v66-projects]');project.onclick=()=>independent?marks.openProjects():window.BoxStudioV66.openProjects();const title=nav.querySelector('[data-v66-project-title]');title.title=independent?marks.getState().projectName:state.projectName;nav.querySelector('[data-v66-library]').hidden=independent;}
 top.querySelector('#quickExport').onclick=()=>independent?marks.openExport():editor().navigate('editor','Export');
 for(const selector of['[data-v59-mode-switch]','#boxstudio-profile-manager-button']){const node=top.querySelector(selector),target=top.querySelector('[data-v67-settings]');if(node&&node.parentElement!==target)target.append(node);}
 if(!document.querySelector('[data-v67-toast]')){const toast=document.createElement('div');toast.dataset.v67Toast='true';toast.className='v67-toast';toast.setAttribute('role','status');document.body.append(toast);}
}
function openCartonLibraryV68(){
 const tab=editor().getState().editorTab,palette=document.querySelector(tab==='Marks'?'[data-v58-marks-studio]':'[data-v61-studio]');
 if(!palette)return;
 const title=tab==='Marks'?'唛头组件':'图案与面板',d=document.createElement('dialog'),placeholder=document.createComment('palette');
 d.className='v67-dialog v67-mobile-library';d.innerHTML=`<header><h2>${title}</h2><button data-close aria-label="关闭组件窗口">${iconV67('close')}</button></header>`;
 palette.before(placeholder);d.append(palette);document.body.append(d);let restored=false;
 const restore=()=>{if(!restored){placeholder.replaceWith(palette);restored=true;}};
 const close=()=>{restore();d.close();d.remove();document.querySelector('[data-v67-library-open]')?.focus();};
 d.addEventListener('close',()=>{restore();d.remove();},{once:true});d.addEventListener('cancel',e=>{e.preventDefault();close();});d.querySelector('[data-close]').onclick=close;d.showModal();
}
function carton(){
 const s=editor().getState(),workspace=document.querySelector('.workspace');if(!workspace||s.page!=='editor')return;workspace.dataset.v67Tab=s.editorTab;
 const main=workspace.querySelector('.main'),palette=document.querySelector(s.editorTab==='Marks'?'[data-v58-marks-studio]':'[data-v61-studio]');
 if(['Design','Marks'].includes(s.editorTab)&&palette){let library=workspace.querySelector('[data-v67-carton-library]');if(!library){library=document.createElement('aside');library.dataset.v67CartonLibrary='true';library.className='v67-library v67-carton-library';library.innerHTML='<div class="v67-library-head"><span class="v67-eyebrow"></span><h2></h2><p></p></div><div data-v67-library-body></div>';main.before(library);}const title=s.editorTab==='Marks'?'唛头组件':'图案与面板',hint=s.editorTab==='Marks'?'选择目标面，将运输信息放到纸盒上。':'选择印刷面，添加文字、图片与底色。';const h=library.querySelector('h2');if(h.textContent!==title){h.textContent=title;library.querySelector('.v67-eyebrow').textContent=s.editorTab==='Marks'?'SHIPPING MARKS':'ARTWORK LIBRARY';library.querySelector('p').textContent=hint;}const slot=library.querySelector('[data-v67-library-body]');if(palette.parentElement!==slot&&!palette.closest('dialog'))slot.append(palette);workspace.dataset.v67Library='true';
  if(!main.querySelector('[data-v67-library-open]')){const b=document.createElement('button');b.dataset.v67LibraryOpen='true';b.innerHTML=iconV67('layers',18)+'<span>组件与设置</span>';main.querySelector('.tabbar').prepend(b);b.onclick=openCartonLibraryV68;}
 }
 for(const [id,icon,label] of[['undo','undo','撤销'],['redo','redo','重做']]){const b=main.querySelector(`#${id}`);if(b&&!b.dataset.v67Icon){b.dataset.v67Icon='true';b.innerHTML=iconV67(icon,18);b.setAttribute('aria-label',label);}}
 const bar=main.querySelector('.tabbar');if(bar&&!bar.querySelector('[data-v67-canvas-more]')){const more=document.createElement('details');more.dataset.v67CanvasMore='true';more.className='v67-canvas-more';more.innerHTML=`<summary aria-label="更多编辑工具">${iconV67('more',18)}</summary><div></div>`;bar.prepend(more);}for(const id of['v33OpenProfessional','v34OpenMarksStudio','v38OpenCad']){const b=main.querySelector(`#${id}`),slot=main.querySelector('[data-v67-canvas-more]>div');if(b&&slot&&b.parentElement!==slot)slot.append(b);}
 const stage=main.querySelector('[data-v63-stagebar]');if(stage&&!stage.dataset.v67Decorated){stage.dataset.v67Decorated='true';const names={Structure:'dieline',Design:'image',Marks:'label','3D':'box',Preflight:'check',Export:'download'};stage.querySelectorAll('[data-v63-stage] i').forEach(n=>{n.innerHTML=iconV67(names[n.parentElement.dataset.v63Stage]||'file',17);});}
 if(s.editorTab==='Marks'){
  const right=workspace.querySelector('.rightpanel');if(!right.querySelector('[data-v67-carton-tabs]')){const tabs=document.createElement('div');tabs.dataset.v67CartonTabs='true';tabs.className='v67-inspector-tabs';tabs.innerHTML='<button data-carton-inspector="data">唛头数据</button><button data-carton-inspector="object">对象属性</button><button data-carton-inspector="batch">批量数据</button>';right.prepend(tabs);tabs.querySelectorAll('button').forEach(b=>b.onclick=()=>{cartonInspector=b.dataset.cartonInspector;carton();});}
  if(s.selectedId&&s.selectedId!==lastSelection){cartonInspector='object';lastSelection=s.selectedId;}
  right.dataset.v67Inspector=cartonInspector;if(cartonInspector==='data'){const card=right.querySelector('[data-v66-mark-data]');if(card&&!card.open)card.open=true;}right.querySelectorAll('[data-carton-inspector]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.cartonInspector===cartonInspector)));
  right.querySelectorAll('.panel-section').forEach(p=>{const t=p.querySelector('h3')?.textContent||'';p.dataset.v67Section=/Properties|属性/i.test(t)?'object':/Batch|批量/i.test(t)?'batch':'other';});
  const edit=document.querySelector('[data-v66-edit-data]');if(edit)edit.onclick=()=>{cartonInspector='data';carton();const card=right.querySelector('[data-v66-mark-data]');card.open=true;card.querySelector('[name="sku"]').focus();};
 }
 if(!fitted.has(workspace)){fitted.add(workspace);requestAnimationFrame(()=>{if(workspace.isConnected)editor().fitCanvas();});}
}
function enhance(){if(!editor())return;document.body.dataset.v67='true';const s=editor().getState();document.body.dataset.v67Page=s.page;header();if(s.page==='mark-studio'){const page=document.querySelector('[data-v67-mark-page]');if(page&&!page.dataset.mounted){page.dataset.mounted='true';marks.mount(page);}}else carton();canvasFocus();}
window.BoxStudioV67={version:'V0.70',getMarkState:marks.getState,openMarkStudio,saveMarkProject:marks.saveProject,openMarkProjects:marks.openProjects,openMarkExport:marks.openExport,commitMarkState:marks.commit};
window.BoxStudioV68={...window.BoxStudioV67,getMarkSelection:marks.getSelection,getMarkHistory:marks.getHistory,selectMarks:marks.select};
window.BoxStudioV69={...window.BoxStudioV68,setCanvasFocus,getCanvasFocus:()=>focusMode};
window.addEventListener('keydown',e=>{if(e.key!=='Escape'||!focusMode||e.target?.closest?.('input,textarea,select,[contenteditable="true"]')||document.querySelector('dialog[open]'))return;e.preventDefault();e.stopImmediatePropagation();if(editor().getState().page==='mark-studio'&&marks.cancelGesture())return;setCanvasFocus(false);},true);
window.addEventListener('popstate',()=>{const path=location.pathname.replace(/\/$/,'');if(path==='/marks')editor().navigate('mark-studio');else if(path===''||path==='/box')editor().navigate('editor','Design');});
window.BoxStudioUiRuntimeV64.register('v67',enhance);
