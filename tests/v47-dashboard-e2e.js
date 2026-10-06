const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const waitFor=async(fn,label,timeout=12000)=>{const end=Date.now()+timeout;while(Date.now()<end){try{const v=fn();if(v)return v}catch{}await sleep(40)}throw new Error(`Timeout: ${label}`)};
const click=el=>el?.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
const signal=async(kind,text)=>{try{await fetch(`/__v47_${kind}__`,{method:'POST',body:text})}catch{}};
try{
  await waitFor(()=>window.BoxStudioV47,'V0.47 API');
  await waitFor(()=>document.querySelector('.v47-home-hero'),'dashboard hero');
  await waitFor(()=>document.querySelector('[data-v47-free]'),'free badge');
  const starts=document.querySelectorAll('.v47-home-start [data-v47-go]');if(starts.length!==3)throw new Error(`Expected 3 dashboard start actions, got ${starts.length}.`);
  if(document.documentElement.scrollWidth>window.innerWidth+2)throw new Error(`Dashboard horizontal overflow: ${document.documentElement.scrollWidth} > ${window.innerWidth}.`);
  click(document.querySelector('.v47-home-start [data-v47-go="templates"]'));
  await waitFor(()=>document.querySelector('[data-v47-search]'),'templates page from dashboard');
  if(document.querySelectorAll('[data-v47-template]').length<5)throw new Error('Template center does not expose all verified engines.');
  click(document.querySelector('.nav [data-nav="marks"]'));
  await waitFor(()=>document.querySelector('.v47-mark-groups'),'marks hub');
  if(document.querySelectorAll('.v47-mark-groups article').length!==4)throw new Error('Marks hub must expose four mark groups.');
  if(!document.querySelector('[data-v47-open-marks]'))throw new Error('Marks editor entry point is missing.');
  if(document.documentElement.scrollWidth>window.innerWidth+2)throw new Error(`Marks hub horizontal overflow: ${document.documentElement.scrollWidth} > ${window.innerWidth}.`);
  const text=`PASS dashboard=true templates>=5 marks=4 viewport=${window.innerWidth} overflow=none`;document.body.dataset.pass=text;await signal('pass',text);
}catch(error){const text=`FAIL ${error?.stack||error}`;document.body.dataset.fail=text;await signal('fail',text);throw error;}
