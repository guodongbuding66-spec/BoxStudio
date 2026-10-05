import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { defaultState } from '../src/model.js';
import { accessPolicyV40, canUseFeatureV40 } from '../src/freeAccessV40.js';
import { offsetPolygonV40, buildProductionZonesV40, polygonAreaV40 } from '../src/offsetEngineV40.js';
import { buildStructuralTopologyV39 } from '../src/structuralTopologyV39.js';
import { dielineDocumentFromStateV38 } from '../src/dielineCadV38.js';
import { runPreflightV40, productionGateV40 } from '../src/preflightV40.js';
import { buildProductionContextV40, buildProductionPdfV40, productionPdfV40Diagnostics } from '../src/productionPdfV40.js';

const clone=v=>structuredClone(v);
const rect=[[0,0],[100,0],[100,50],[0,50]];

// 1. V0.40 product mode is explicitly free and does not require login/approval/subscription.
const access=accessPolicyV40();assert.equal(access.mode,'free-public');assert.equal(access.price,0);assert.equal(access.requiresLogin,false);assert.equal(access.requiresApproval,false);assert.equal(access.requiresSubscription,false);for(const f of ['templates','dieline-cad','marks','3d-preview','preflight','production-pdf','production-offsets'])assert.equal(canUseFeatureV40(f),true,`Missing free capability ${f}`);

// 2. Exact rectangle offsets must expand bleed and inset safe area in millimeters.
const bleed=offsetPolygonV40(rect,3,{join:'miter'}),safe=offsetPolygonV40(rect,-5,{join:'miter'});assert.equal(bleed.ok,true,JSON.stringify(bleed.issues));assert.deepEqual(bleed.bounds,{x:-3,y:-3,w:106,h:56});assert.equal(Math.round(bleed.area),5936);assert.equal(safe.ok,true,JSON.stringify(safe.issues));assert.deepEqual(safe.bounds,{x:5,y:5,w:90,h:40});assert.equal(Math.round(safe.area),3600);assert.ok(bleed.area>Math.abs(polygonAreaV40(rect)));assert.ok(safe.area<Math.abs(polygonAreaV40(rect)));

// 3. Bevel and round joins are distinct production geometries, not aliases of miter.
const triangle=[[0,0],[80,0],[25,55]],miter=offsetPolygonV40(triangle,4,{join:'miter'}),bevel=offsetPolygonV40(triangle,4,{join:'bevel'}),round=offsetPolygonV40(triangle,4,{join:'round',roundSegments:10});for(const r of [miter,bevel,round])assert.equal(r.ok,true,JSON.stringify(r.issues));assert.ok(bevel.points.length>=triangle.length*2);assert.ok(round.points.length>bevel.points.length);assert.notDeepEqual(miter.points,bevel.points);

// 4. A real rebuilt RSC topology gets bleed + safe polygons for every bounded panel.
const state=clone(defaultState),doc=dielineDocumentFromStateV38(state),topology=buildStructuralTopologyV39(state,{doc,curveSteps:24});assert.equal(topology.ok,true,JSON.stringify(topology.errors));const zones=buildProductionZonesV40(topology,{bleedMm:3,safeMm:5,join:'miter'});assert.equal(zones.ok,true,JSON.stringify(zones.issues));assert.equal(zones.bleed.length,topology.panels.length);assert.equal(zones.safe.length,topology.panels.length);assert.ok(zones.bleed.every(z=>Array.isArray(z.points)&&z.points.length>=3));assert.ok(zones.safe.every(z=>Array.isArray(z.points)&&z.points.length>=3));

// 5. V0.40 preflight replaces the old polygon-offset warning with real offset checks.
const report=runPreflightV40(state,{doc,join:'miter'});assert.equal(report.ok,true,JSON.stringify(report.errors));assert.equal(report.summary.bleedZones,topology.panels.length);assert.equal(report.summary.safeZones,topology.panels.length);assert.equal(report.checks.some(x=>x.code==='POLYGON_OFFSET_REVIEW'),false);assert.ok(report.checks.some(x=>x.code==='BLEED_OFFSET_READY'));assert.ok(report.checks.some(x=>x.code==='SAFE_OFFSET_READY'));const gate=productionGateV40(state,{doc});assert.equal(gate.ok,true);assert.equal(gate.requiresApproval,false);assert.equal(gate.requiresLogin,false);assert.equal(gate.price,0);

// 6. Full Production PDF remains the mature V0.39/V0.27 path but is now gated by V0.40 offsets + preflight only.
const context=buildProductionContextV40(state,{doc});assert.equal(context.ok,true,JSON.stringify(context.errors));assert.equal(context.access.requiresApproval,false);assert.equal(context.summary.bleedZones,topology.panels.length);const pdf=buildProductionPdfV40(state,{doc}),text=new TextDecoder().decode(pdf);assert.ok(pdf.length>1000);assert.match(text,/%PDF-1\.7/);assert.match(text,/\/CutContour/);assert.match(text,/\/Crease/);const diag=productionPdfV40Diagnostics(state,{doc});assert.equal(diag.ok,true);assert.equal(diag.access.price,0);

const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));assert.equal(pkg.version,'0.40.0');assert.equal(pkg.scripts['test:v40'],'node tests/v40.mjs');
console.log(`BoxStudio V0.40 free access + production offsets passed: panels=${topology.panels.length}, bleed=${zones.bleed.length}, safe=${zones.safe.length}, pdf=${pdf.length}`);
