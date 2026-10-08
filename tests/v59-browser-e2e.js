const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const waitFor=async(fn,label,timeout=45000)=>{const end=Date.now()+timeout;while(Date.now()<end){try{const v=fn();if(v)return v}catch{}await sleep(50)}throw new Error(`Timeout: ${label}`)};
const signal=async(kind,text)=>{try{await fetch(`/__v59_${kind}__`,{method:'POST',body:text})}catch{}};
const isMobile=()=>window.innerWidth<=500;
const noOverflow=label=>{if(isMobile()&&document.documentElement.scrollWidth>window.innerWidth+4)throw new Error(`${label} mobile overflow ${document.documentElement.scrollWidth}>${window.innerWidth}`)};
const setVal=(el,value)=>{el.value=String(value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))};

async function main(){
  try{
    const api=await waitFor(()=>window.BoxStudioV59,'V0.59 API',30000),phase=sessionStorage.getItem('boxstudio-v59-phase')||'template';
    if(!api.getAcceptance().ok)throw new Error(`V0.59 acceptance failed: ${JSON.stringify(api.getAcceptance())}`);

    if(phase==='template'){
      await waitFor(()=>document.querySelector('[data-v59-template-flow]'),'V0.59 template flow');
      await waitFor(()=>document.querySelector('[data-v47-template="fefco-0427"]'),'0427 card');
      document.querySelector('[data-v47-template="fefco-0427"]').click();
      const studio=await waitFor(()=>document.querySelector('.v59-template-studio'),'three-column template studio');
      const layout=studio.querySelector('.v59-template-layout');if(!layout)throw new Error('Template workbench layout missing.');
      if(!layout.querySelector('.v59-template-params')||!layout.querySelector('.v59-template-stage')||!layout.querySelector('.v59-template-result'))throw new Error('Template workbench must expose params/stage/result columns.');
      if(layout.querySelectorAll('[data-v59-size]').length!==3)throw new Error('Expected three size modes.');
      if(layout.querySelectorAll('.v59-output-grid>div').length!==4)throw new Error('Expected four real BoxStudio output formats.');
      if(layout.querySelectorAll('.v59-line-legend span').length!==3)throw new Error('Print-line legend incomplete.');
      layout.querySelector('[data-v59-size="external"]').click();await waitFor(()=>studio.querySelector('[data-v47-size-type]').value==='external','external size mode');
      setVal(studio.querySelector('[data-v47-l]'),360);setVal(studio.querySelector('[data-v47-w]'),240);setVal(studio.querySelector('[data-v47-h]'),95);
      await waitFor(()=>studio.querySelector('[data-v59-metric]')?.textContent.includes('外尺寸'),'three-size live summary');
      if(!studio.querySelector('[data-v59-stage-size]')?.textContent.includes('mm'))throw new Error('Live manufacturing size missing from stage header.');
      noOverflow('template-studio');sessionStorage.setItem('boxstudio-v59-phase','editor');studio.querySelector('[data-v59-generate-3d]').click();await main();return;
    }

    if(phase==='editor'){
      const rail=await waitFor(()=>document.querySelector('[data-v59-guided]'),'guided editor rail');
      await waitFor(()=>document.querySelector('.tabbar button.active')?.dataset.tab==='3D','generate-to-3D handoff');
      await waitFor(()=>rail.querySelector('[data-v59-tab="3D"]')?.classList.contains('active'),'guided 3D active state');
      if(document.body.dataset.v59Mode!=='simple')throw new Error(`Expected simple mode by default, got ${document.body.dataset.v59Mode}`);
      if(getComputedStyle(document.querySelector('.tabbar')).display!=='none')throw new Error('Legacy tabbar should be progressively disclosed in simple mode.');
      rail.querySelector('[data-v59-tab="Marks"]').click();
      const marks=await waitFor(()=>document.querySelector('[data-v58-marks-studio]'),'shipping marks studio');await waitFor(()=>document.querySelector('[data-v59-marks-steps]'),'marks guided steps');
      if(document.querySelectorAll('[data-v59-marks-steps] span').length!==4)throw new Error('Marks guided flow should expose four steps.');
      if(!marks.querySelector('[data-v58-mark="barcodeQr"]'))throw new Error('Barcode + QR mark preset missing.');
      const mode=await waitFor(()=>document.querySelector('[data-v59-mode="professional"]'),'professional mode toggle');mode.click();await waitFor(()=>document.body.dataset.v59Mode==='professional','professional mode');
      if(getComputedStyle(document.querySelector('.tabbar')).display==='none')throw new Error('Professional mode must restore full tabbar.');
      await waitFor(()=>document.querySelector('[data-v59-guided]'),'guided rail after professional toggle');document.querySelector('[data-v59-tab="Export"]').click();
      await waitFor(()=>document.querySelector('.tabbar button.active')?.dataset.tab==='Export','Export tab');if(document.querySelectorAll('.export-card').length<4)throw new Error('Production export cards missing.');
      noOverflow('editor');const text=`PASS V0.59 Pacdora-style template detail workbench, simple/pro progressive disclosure, direct 3D handoff, marks guidance and export flow, mobile=${isMobile()}`;document.body.dataset.pass=text;sessionStorage.removeItem('boxstudio-v59-phase');await signal('pass',text);return;
    }
    throw new Error(`Unknown V0.59 phase ${phase}`);
  }catch(error){const text=`FAIL ${error?.stack||error}`;document.body.dataset.fail=text;await signal('fail',text);throw error;}
}
await main();
