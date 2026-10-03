import assert from 'node:assert/strict';
import { defaultState, cloneState } from '../src/model.js';
import { generateGeometry } from '../src/geometry.js';
import { buildFoldGraph } from '../src/foldgraph.js';
import { triangulatePolygon, panelUvMap, foldTextureSeamReport, buildTextureProofModel, buildFoldTransforms } from '../src/threeArtworkProof.js';

const concave=[[0,0],[100,0],[100,80],[50,35],[0,80]];
const tri=triangulatePolygon(concave);
assert.equal(tri.triangles.length,3,'5-point simple polygon should triangulate to n-2 triangles');
assert.equal(tri.fallback,false,'simple concave polygon should use ear clipping, not fan fallback');

const uv=panelUvMap({x:10,y:20,w:200,h:100});
assert.deepEqual(uv.uv[0],[0,0]);
assert.deepEqual(uv.uv[2],[1,1]);
assert.equal(uv.triangles.length,2);
assert.equal(uv.outside,0);

const state=cloneState(defaultState);
const geo=generateGeometry(state.structure);
const graph=buildFoldGraph(geo);
const seams=foldTextureSeamReport(graph,geo);
assert.equal(seams.total,graph.edges.length);
assert.equal(seams.warnings,0,'default verified RSC fold hinges should map inside both panel UV domains');

const model=buildTextureProofModel(state,geo,graph);
assert.equal(model.stats.panels,graph.nodes.length);
assert.ok(model.stats.texturedPanels>=4,'core RSC panels should carry artwork texture plans');
assert.ok(model.stats.triangles>=graph.nodes.length*2,'rectangular panels should produce at least two UV triangles each');
assert.ok(model.stats.artworkCommands>0,'texture model should contain real artwork commands');
assert.equal(model.stats.uvOutside,0);

const flat=buildFoldTransforms(graph,geo,0);
const folded=buildFoldTransforms(graph,geo,100);
assert.ok(flat.has(graph.root)&&folded.has(graph.root));
const child=graph.edges[0]?.to;
assert.ok(child&&flat.has(child)&&folded.has(child));
assert.notDeepEqual(flat.get(child),folded.get(child),'child panel transform should change between flat and folded states');

console.log('BoxStudio V0.17 texture-proof tests passed');
