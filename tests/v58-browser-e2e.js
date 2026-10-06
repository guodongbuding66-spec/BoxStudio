const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const waitFor=async(fn,label,timeout=45000)=>{const end=Date.now()+timeout;while(Date.now()<end){try{const v=fn();if(v)return v}catch{}await sleep(50)}throw new Error(`Timeout: ${label}`)};
const signal=async(kind,text)=>{try{await fetch(`/__v58_${kind}__`,{method:'POST',body:text})}catch{}};
const isMobile=()=>window.innerWidth<=500;
const noOverflow=label=>{if(isMobile()&&document.documentElement.scrollWidth>window.innerWidth+4)throw new Error(`${label} mobile overflow ${document.documentElement.scrollWidth}>${window.innerWidth}`)};

try{
  const api=await waitFor(()=>window.BoxStudioV58,'V0.58 API',30000),phase=sessionStorage.getItem('boxstudio-v58-phase')||'design';
  if(!api.getAcceptance().ok)throw new Error(`V0.58 acceptance failed: ${JSON.stringify(api.getAcceptance())}`);
  if(api.freePolicy.freeForEveryone!==true||api.freePolicy.loginRequired!==false||api.freePolicy.paywall!==false)throw new Error('Free-for-everyone policy regressed.');

  if(phase==='design'){
    await waitFor(()=>document.querySelector('.v58-quicknav'),'V0.58 quick nav');
    await waitFor(()=>document.querySelector('[data-v58-context]'),'context bar');
    await waitFor(()=>document.querySelector('[data-v58-mini3d-host] canvas'),'live mini 3D canvas',45000);
    const nav=[...document.querySelectorAll('.v58-quicknav [data-v58-go]')].map(x=>x.dataset.v58Go);for(const need of ['templates','Design','3D','Marks','Export'])if(!nav.includes(need))throw new Error(`Missing quick nav ${need}`);
    const tool=document.querySelector('.toolbar [data-tool="barcode"] span');if(!tool||!tool.textContent.includes('条码'))throw new Error('Labeled packaging toolbar missing barcode label.');
    if(document.body.dataset.v58Advanced!=='false')throw new Error('Advanced production should be collapsed by default.');
    noOverflow('design');sessionStorage.setItem('boxstudio-v58-phase','marks');api.go('editor','Marks');return;
  }

  if(phase==='marks'){
    const studio=await waitFor(()=>document.querySelector('[data-v58-marks-studio]'),'Shipping Mark Studio');
    await waitFor(()=>document.querySelector('[data-v58-mini3d-host] canvas'),'Marks mini 3D canvas',45000);
    const buttons=[...studio.querySelectorAll('[data-v58-mark]')];if(buttons.length<13)throw new Error(`Expected >=13 mark presets, got ${buttons.length}`);
    const panel=studio.querySelector('[data-v58-mark-panel]');if(!panel||panel.options.length<1)throw new Error('Mark target-panel selector missing.');
    const before=api.getSummary().markCount,r=api.addMark('package',panel.value);if(r.element.type!=='text'||!r.element.template.includes('packageIndex'))throw new Error('Package X/Y preset created wrong element.');
    sessionStorage.setItem('boxstudio-v58-mark-id',r.element.id);sessionStorage.setItem('boxstudio-v58-mark-before',String(before));sessionStorage.setItem('boxstudio-v58-phase','marks-reload');location.reload();return;
  }

  if(phase==='marks-reload'){
    const id=sessionStorage.getItem('boxstudio-v58-mark-id'),before=Number(sessionStorage.getItem('boxstudio-v58-mark-before')||0);if(!id)throw new Error('Missing inserted mark id.');
    await waitFor(()=>document.querySelector('[data-v58-marks-studio]'),'Marks studio after reload');
    await waitFor(()=>document.querySelector(`[data-element-id="${CSS.escape(id)}"]`),'inserted mark rendered on dieline');
    if(api.getSummary().markCount!==before+1)throw new Error(`Mark count did not persist: ${api.getSummary().markCount} vs ${before+1}`);
    const adv=document.querySelector('[data-v58-advanced]');adv.click();if(document.body.dataset.v58Advanced!=='true')throw new Error('Advanced-production toggle did not open.');adv.click();if(document.body.dataset.v58Advanced!=='false')throw new Error('Advanced-production toggle did not close.');
    noOverflow('marks');sessionStorage.setItem('boxstudio-v58-phase','templates');api.go('templates');return;
  }

  if(phase==='templates'){
    await waitFor(()=>document.querySelector('.v58-library-head'),'reference-aligned template library');
    const cards=await waitFor(()=>document.querySelectorAll('.v47-template-card').length>=5&&document.querySelectorAll('.v47-template-card'),'template cards');if(cards.length<5)throw new Error('Verified template library unexpectedly small.');
    const search=document.querySelector('[data-v47-search]');if(!search)throw new Error('Template search missing.');search.value='0427';search.dispatchEvent(new Event('input',{bubbles:true}));await waitFor(()=>document.querySelectorAll('.v47-template-card').length===1,'0427 filter');if(!document.body.textContent.includes('0427'))throw new Error('0427 search result missing.');
    noOverflow('templates');sessionStorage.setItem('boxstudio-v58-phase','export');api.go('editor','Export');return;
  }

  if(phase==='export'){
    await waitFor(()=>document.querySelector('.tabbar button.active')?.dataset.tab==='Export','Export tab');
    const cards=document.querySelectorAll('.export-card');if(cards.length<2)throw new Error(`Expected production export cards, got ${cards.length}`);
    if(!document.querySelector('.v58-quicknav [data-v58-go="Export"].active'))throw new Error('Quick nav Export state not active.');
    noOverflow('export');const text=`PASS V0.58 reference-aligned core workflow, live 3D quick preview, mark preset insertion/persistence, template search and export entry, mobile=${isMobile()} marks=${api.getSummary().markCount}`;document.body.dataset.pass=text;sessionStorage.removeItem('boxstudio-v58-phase');await signal('pass',text);return;
  }
  throw new Error(`Unknown V0.58 phase ${phase}`);
}catch(error){const text=`FAIL ${error?.stack||error}`;document.body.dataset.fail=text;await signal('fail',text);throw error;}
