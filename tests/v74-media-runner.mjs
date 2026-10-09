import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import puppeteer from 'puppeteer-core';
import {nativeDownloadsV74} from './native-download-v74.mjs';
const chrome=process.argv[2];assert.ok(chrome);
const only=process.argv[3];assert.ok(!only||['compatible','fixed-10s'].includes(only));
const browser=await puppeteer.launch({executablePath:chrome,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-background-networking','--use-gl=angle','--use-angle=swiftshader']});
const results=[];
try{for(const fallback of [false,true].filter(f=>!only||(f?'compatible':'fixed-10s')===only)){
 const name=fallback?'compatible':'fixed-10s',folder=resolve('artifacts/v74/media-'+name);await mkdir(folder,{recursive:true});
 const context=await browser.createBrowserContext({downloadBehavior:{policy:'allow',downloadPath:folder}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const native=await nativeDownloadsV74(browser,context,folder);
 if(fallback)await page.evaluateOnNewDocument(()=>{const native=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'?null:native.call(this,type,...args);};Object.defineProperty(window,'VideoEncoder',{value:undefined,configurable:true});});
 try{
  await page.goto('http://127.0.0.1:8795/index.html',{waitUntil:'load'});await page.waitForFunction(()=>Boolean(window.BoxStudioV74));
  await page.evaluate(async()=>{const {createArtworkProjectV71}=await import('/src/designTemplatesV71.js');window.BoxStudioEditor.commitState(createArtworkProjectV71(window.BoxStudioEditor.getState(),'coffee-roast',{templateId:'hinged-roll-end-box'}));await window.BoxStudioV71.openScene();});
  await page.waitForSelector('[data-v71-render]:not([disabled])');
  assert.equal(await page.$eval('[data-v71-scene-canvas] canvas',e=>e.dataset.renderer),fallback?'software2d':'physical-webgl');
  assert.equal(await page.$$eval('[data-v74-rig],[data-v74-light]',a=>a.every(e=>e.disabled)),fallback);
  if(fallback)assert.match(await page.$eval('[data-v74-light-status]',e=>e.textContent),/基础预览/);
  await page.$eval('.v72-animation-controls',e=>e.open=true);await page.select('[data-v72-seconds]',fallback?'6':'10');await page.select('[data-v72-animation-mode]',fallback?'assembly':'turntable');
  const video=await native.capture('boxstudio-animation.webm',async()=>{await page.click('[data-v72-video]');await page.waitForFunction(()=>document.querySelector('[data-v71-scene-status]').textContent.includes('WebM 已导出'),{timeout:120000});},150000);
  assert.ok(video.length>10000);assert.equal(errors.length,0,errors.join('\n'));
  results.push({name,status:'PASS',renderer:fallback?'software2d':'physical-webgl',seconds:fallback?6:10,errors});console.log('PASS '+name+': actual native video and renderer capabilities');
 }finally{await page.screenshot({path:resolve(folder,'scene.png')});await native.dispose();await context.close();}
}}finally{await writeFile('artifacts/v74/media-results.json',JSON.stringify(results,null,2));await browser.close();}
