const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const waitFor=async(fn,label,timeout=45000)=>{const end=Date.now()+timeout;while(Date.now()<end){try{const v=fn();if(v)return v}catch{}await sleep(50)}throw new Error(`Timeout: ${label}`)};
const signal=async(kind,text)=>{try{await fetch(`/__v63_${kind}__`,{method:'POST',body:text})}catch{}};
const activeStage=()=>document.querySelector('[data-v63-stagebar] [data-v63-stage].active')?.dataset.v63Stage;
try{
  const api=await waitFor(()=>window.BoxStudioV63,'V0.63 API',30000);
  await waitFor(()=>document.querySelector('[data-v63-stagebar]'),'unified stagebar');
  await waitFor(()=>document.querySelector('[data-v63-inspector]'),'context inspector');
  if(document.body.dataset.v63Acceptance!=='pass')throw new Error('V0.63 acceptance failed.');
  const summary=api.getSummary();if(summary.panels<=0||summary.preflight.total<=0)throw new Error('Studio summary missing panels/preflight.');
  if(getComputedStyle(document.querySelector('.v58-quicknav')).display!=='none')throw new Error('Legacy V0.58 quicknav still visible.');
  if(getComputedStyle(document.querySelector('.v58-contextbar')).display!=='none')throw new Error('Legacy V0.58 contextbar still visible.');
  if(document.querySelector('.tabbar [data-tab="Design"]')&&getComputedStyle(document.querySelector('.tabbar [data-tab="Design"]')).display!=='none')throw new Error('Legacy tab buttons still visually duplicated.');

  const imageTool=document.querySelector('.toolbar [data-tool="image"]');if(!imageTool||imageTool.disabled||imageTool.dataset.v63Image!=='true')throw new Error('Image toolbar was not re-enabled.');
  const fileInput=await waitFor(()=>document.querySelector('#v60ArtworkFile'),'V0.60 artwork file input');let imageClicks=0;fileInput.addEventListener('click',e=>{imageClicks++;e.preventDefault()},{once:true});imageTool.click();if(imageClicks!==1)throw new Error('Image toolbar did not hand off to V0.60 upload input.');

  const dataPanel=[...document.querySelectorAll('.rightpanel .v63-secondary-panel')].find(x=>x.querySelector('h3')?.textContent?.trim()==='Data');if(!dataPanel)throw new Error('Data panel was not classified as secondary.');if(getComputedStyle(dataPanel).display!=='none')throw new Error('Secondary Data panel should start collapsed.');document.querySelector('[data-v63-advanced]')?.click();await waitFor(()=>getComputedStyle(dataPanel).display!=='none','advanced inspector expansion');

  document.querySelector('[data-v63-stage="Marks"]')?.click();await waitFor(()=>activeStage()==='Marks','Marks stage');await waitFor(()=>document.querySelector('[data-v58-marks-studio]'),'Shipping Mark Studio');
  document.querySelector('[data-v63-stage="3D"]')?.click();await waitFor(()=>activeStage()==='3D','3D stage');await waitFor(()=>document.querySelector('#threeCanvas'),'3D canvas');
  document.querySelector('[data-v63-stage="Preflight"]')?.click();await waitFor(()=>activeStage()==='Preflight','Preflight stage');await waitFor(()=>document.querySelector('.preflight-list, .preflight-page, [data-preflight], .canvas-shell'),'Preflight surface');
  document.querySelector('[data-v63-stage="Export"]')?.click();await waitFor(()=>activeStage()==='Export','Export stage');await waitFor(()=>document.querySelector('#exportPdf'),'Production PDF action');
  document.querySelector('[data-v63-stage="Design"]')?.click();await waitFor(()=>activeStage()==='Design','Artwork stage return');await waitFor(()=>document.querySelector('[data-v61-studio].v63-consolidated-artwork'),'consolidated Artwork Workspace');

  const isMobile=window.innerWidth<=500;if(isMobile&&document.documentElement.scrollWidth>window.innerWidth+4)throw new Error(`Mobile overflow ${document.documentElement.scrollWidth}>${window.innerWidth}`);
  const final=api.getSummary(),text=`PASS V0.63 unified stage navigation + compact inspector + live preflight status + V0.60 image handoff + legacy-nav suppression, mobile=${isMobile} panels=${final.panels} checks=${final.preflight.total}`;document.body.dataset.pass=text;await signal('pass',text);
}catch(error){const text=`FAIL ${error?.stack||error}`;document.body.dataset.fail=text;await signal('fail',text);throw error;}
