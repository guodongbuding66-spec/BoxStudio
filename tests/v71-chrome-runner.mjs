import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import puppeteer from 'puppeteer-core';

// Run asynchronous canvas encoding and native downloads on real browser time.
const [view='desktop',chrome]=process.argv.slice(2);
assert.ok(chrome,'Pass the installed Chrome executable path.');
assert.ok(['desktop','mobile'].includes(view),'Unknown viewport.');
const width=view==='desktop'?1280:390,height=view==='desktop'?900:844;
const downloads=resolve(`artifacts/v71/native-${view}`);
await mkdir(downloads,{recursive:true});
const browser=await puppeteer.launch({executablePath:chrome,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-background-networking','--use-gl=angle','--use-angle=swiftshader'],defaultViewport:{width,height}});
const context=await browser.createBrowserContext({downloadBehavior:{policy:'allow',downloadPath:downloads}});
const page=await context.newPage(),messages=[];
page.on('pageerror',error=>messages.push(error.stack||error.message));
page.on('console',message=>{if(message.type()==='error')messages.push(message.text());});
try{
 await page.goto('http://127.0.0.1:8795/tests/v71-browser-e2e.html',{waitUntil:'load',timeout:30000});
 await page.waitForFunction(()=>Boolean(document.body.dataset.v71Result),{timeout:90000,polling:100});
 const result=await page.evaluate(()=>JSON.parse(document.body.dataset.v71Result));
 console.log(JSON.stringify(result));
 assert.equal(result.status,'PASS',result.error);
 // Independently verify the files Chrome actually wrote, not just generated Blobs.
 for(const extension of ['glb','png']){
  const path=resolve(downloads,`boxstudio-scene.${extension}`),expected=await readFile(`artifacts/v71/browser.${extension}`);
  let actual;
  const deadline=Date.now()+10000;
  while(Date.now()<deadline){try{actual=await readFile(path);if(actual.equals(expected))break;}catch{}await new Promise(r=>setTimeout(r,100));}
  assert.ok(actual?.equals(expected),`Native ${extension.toUpperCase()} download must match the generated file bytes.`);
  await writeFile(`artifacts/v71/browser.${extension}`,actual);
 }
 console.log(`PASS ${view}: native PNG and GLB bytes match generated artwork exports`);
}catch(error){
 const progress=await page.evaluate(()=>document.body.dataset.v71Progress||'No page progress').catch(()=> 'Page unavailable');
 console.error('V0.71 browser progress:',progress);
 throw error;
}finally{
 await writeFile(`artifacts/v71/${view}.html`,await page.content());
 await writeFile(`artifacts/v71/${view}-console.json`,JSON.stringify(messages,null,2));
 await page.screenshot({path:`artifacts/v71/${view}.png`});
 await browser.close();
}
