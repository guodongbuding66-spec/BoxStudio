const wait=async(fn)=>{const end=Date.now()+60000;while(Date.now()<end){if(fn())return;await new Promise(r=>setTimeout(r,50))}throw new Error('Capture target did not become ready')};
try{
 const shot=new URLSearchParams(location.search).get('shot')||'artwork';
 // The central artboard remains visible when the contextual library is collapsed on mobile.
 const targets={templates:'[data-v75-library] .v47-hero',structure:'#designSvg',artwork:'#designSvg',marks:'[data-v58-marks-studio]','3d':'#threeCanvas',preflight:'.preflight',export:'#exportPdf',manufacturing:'section[data-v55-manufacturing]',factory:'section[data-v56-factory]',routing:'section[data-v57-routing]',mobile:'#designSvg'};
 await wait(()=>window.BoxStudioV65&&document.querySelector(targets[shot]));
 await wait(()=>document.querySelector(targets[shot])?.getBoundingClientRect().height>0);
 await document.fonts.load('14px "BoxStudio UI SC"','纸盒设计唛头出血安全区');await document.fonts.ready;
 if(['artwork','mobile','structure','marks'].includes(shot)){await new Promise(r=>setTimeout(r,100));window.BoxStudioEditor.fitCanvas()}
 if(['export','manufacturing','factory','routing'].includes(shot))document.querySelector(targets[shot]).scrollIntoView({block:'start'});
 const shell=document.querySelector('.canvas-shell');
 if(['artwork','mobile'].includes(shot)&&shell?.getBoundingClientRect().height<160)throw new Error('Canvas too small');
 if(innerWidth<=500&&document.documentElement.scrollWidth>innerWidth+4)throw new Error('Mobile overflow');
 await new Promise(r=>setTimeout(r,100));
 document.body.dataset.captureReady=shot;
}catch(error){document.body.dataset.captureError=error.stack;console.error(error)}
