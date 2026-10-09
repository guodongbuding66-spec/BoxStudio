import {cp,mkdir,copyFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
await mkdir(new URL('vendor/',root),{recursive:true});
await cp(fileURLToPath(new URL('node_modules/@bwip-js/generic/dist/',root)),fileURLToPath(new URL('vendor/bwip-js/',root)),{recursive:true});
await cp(fileURLToPath(new URL('node_modules/@bwip-js/generic/LICENSE',root)),fileURLToPath(new URL('vendor/bwip-js/LICENSE',root)));

// Pin and bundle the physical studio renderer for offline production use.
await mkdir(new URL('../vendor/three/',import.meta.url),{recursive:true});
for(const file of ['three.module.min.js','three.core.min.js'])await copyFile(new URL('../node_modules/three/build/'+file,import.meta.url),new URL('../vendor/three/'+file,import.meta.url));

await copyFile(new URL('../node_modules/three/LICENSE',import.meta.url),new URL('../vendor/three/LICENSE',import.meta.url));
