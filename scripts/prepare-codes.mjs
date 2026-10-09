import {cp,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
await mkdir(new URL('vendor/',root),{recursive:true});
await cp(fileURLToPath(new URL('node_modules/@bwip-js/generic/dist/',root)),fileURLToPath(new URL('vendor/bwip-js/',root)),{recursive:true});
await cp(fileURLToPath(new URL('node_modules/@bwip-js/generic/LICENSE',root)),fileURLToPath(new URL('vendor/bwip-js/LICENSE',root)));
