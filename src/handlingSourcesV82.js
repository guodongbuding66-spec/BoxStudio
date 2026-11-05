import {HANDLING_SOURCES_V73} from './handlingSourcesV73.js';
import {EXTRA_HANDLING_SYMBOLS_V82} from './handlingArtworkV82.js';
export const HANDLING_SOURCES_V82=Object.freeze([
 ...HANDLING_SOURCES_V73,
 ...EXTRA_HANDLING_SYMBOLS_V82.map(s=>Object.freeze({id:s.id,file:s.id+'.svg',source:'/assets/handling-v82/'+s.id+'.svg',author:'BoxStudio contributors',license:'CC0-1.0',addedIn:'0.82',adaptation:'Original general-purpose carton pictogram; editable vector artwork.'}))
]);
