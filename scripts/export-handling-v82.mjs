import {mkdir,writeFile} from 'node:fs/promises';
import {EXTRA_HANDLING_SYMBOLS_V82} from '../src/handlingArtworkV82.js';
import {handlingSvgV72} from '../src/handlingSymbolsV72.js';
import {HANDLING_SOURCES_V82} from '../src/handlingSourcesV82.js';
const dir=new URL('../assets/handling-v82/',import.meta.url);
await mkdir(dir,{recursive:true});
for(const s of EXTRA_HANDLING_SYMBOLS_V82){
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><title>${s.label.replaceAll('&','&amp;')}</title><desc>Original BoxStudio carton pictogram. CC0-1.0.</desc>${handlingSvgV72({icon:s.id,w:100,h:100})}</svg>\n`;
 await writeFile(new URL(s.id+'.svg',dir),svg);
}
await writeFile(new URL('sources.json',dir),JSON.stringify(HANDLING_SOURCES_V82.filter(s=>s.addedIn==='0.82'),null,2)+'\n');
console.log('Exported '+EXTRA_HANDLING_SYMBOLS_V82.length+' original carton SVG pictograms.');
