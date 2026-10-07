import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const index=readFileSync('index.html','utf8');
const modules=html=>[...html.matchAll(/<script type="module" src="(?:\.\/|\.\.\/)(src\/[^"\s]+)"/g)].map(x=>x[1]);
const styles=html=>[...html.matchAll(/<link rel="stylesheet" href="(?:\.\/|\.\.\/)(src\/[^"\s]+)"/g)].map(x=>x[1]);
for(const path of ['tests/studio-screenshots.html','tests/artwork-live.html']){
 const fixture=readFileSync(path,'utf8');
 assert.deepEqual(modules(fixture),modules(index),`${path} must load every production module in order`);
 assert.deepEqual(styles(fixture),styles(index),`${path} must load production styles in order`);
 assert.ok(fixture.includes('data-studio-shell="unified"'));
}
console.log(`PASS full-entry fixtures: ${modules(index).length} production modules and ${styles(index).length} styles each`);
