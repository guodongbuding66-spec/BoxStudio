import assert from 'node:assert/strict';
import fs from 'node:fs';
import { defaultState } from '../src/model.js';
import { defaultsForTemplate, generateGeometry } from '../src/geometry.js';
import { buildFoldGraph } from '../src/foldgraph.js';
import { bendProfileV48, advancedStructureParamsV48, normalizeParametricStructureV48, validateParametricStructureV48, manufacturingControlsV48 } from '../src/parametricControlsV48.js';
import { runPreflightV48 } from '../src/preflightV48.js';

for(const template of ['side-seal-rsc','mailer-150010','fefco-0427','reverse-tuck-end','auto-lock-bottom']){
  const base=defaultsForTemplate(template),normalized=normalizeParametricStructureV48(base),valid=validateParametricStructureV48(normalized);assert.equal(valid.ok,true,`${template} V0.48 structure invalid`);assert.ok(valid.bend.radiusMm>0,`${template} bend radius missing`);assert.ok(valid.advanced.flapDepthMm>0,`${template} flap depth missing`);
  const geo=generateGeometry(normalized),graph=buildFoldGraph(geo),controls=manufacturingControlsV48(normalized);assert.equal(graph.manufacturingControls.bend.radiusMm,controls.bend.radiusMm,`${template} graph bend radius drift`);assert.ok(graph.edges.every(e=>e.bendRadiusMm===controls.bend.radiusMm),`${template} hinge bend radius drift`);assert.ok(graph.edges.every(e=>e.boardThicknessMm===controls.bend.thicknessMm),`${template} hinge thickness drift`);
}

const thin=normalizeParametricStructureV48(defaultsForTemplate('reverse-tuck-end'),{materialId:'sbs-paperboard',thickness:.45,bendRadiusMode:'auto'}),thick=normalizeParametricStructureV48(defaultsForTemplate('side-seal-rsc'),{materialId:'corrugated-kraft',flute:'BC',thickness:7,bendRadiusMode:'auto'});assert.ok(bendProfileV48(thick).radiusMm>bendProfileV48(thin).radiusMm,'Auto bend radius must increase for much thicker board');
const manual=normalizeParametricStructureV48(thin,{bendRadiusMode:'manual',bendRadiusMm:1.2,scoreAllowanceMm:.3});assert.equal(bendProfileV48(manual).mode,'manual');assert.equal(bendProfileV48(manual).radiusMm,1.2);assert.equal(bendProfileV48(manual).scoreAllowanceMm,.3);
const clamped=normalizeParametricStructureV48({...thin,width:100,height:40},{flapRatio:9,tuckRatio:-2,dustFlapRatio:4,wingRatio:-1});const adv=advancedStructureParamsV48(clamped);assert.ok(adv.flapRatio<=.78&&adv.flapRatio>=.18);assert.ok(adv.tuckRatio<=1.15&&adv.tuckRatio>=.28);assert.ok(adv.dustFlapRatio<=.9&&adv.dustFlapRatio>=.22);assert.ok(adv.wingRatio<=1.35&&adv.wingRatio>=.25);

const state=structuredClone(defaultState);state.structure=normalizeParametricStructureV48(state.structure,{materialId:'corrugated-kraft',flute:'B',thickness:3,bendRadiusMode:'auto'});const report=runPreflightV48(state);assert.equal(report.schema,'boxstudio-preflight-v48');assert.equal(report.errors.filter(x=>String(x.code).startsWith('V48_')).length,0,`V0.48 preflight errors: ${report.errors.map(x=>x.code).join(',')}`);assert.ok(report.checks.some(x=>x.code==='V48_2D_3D_BEND_PARAMETERS_SHARED'&&x.severity==='pass'));

const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8'),ui=fs.readFileSync(new URL('../src/v48ParametricStudio.js',import.meta.url),'utf8');for(const path of ['v48ParametricStudio.css','v48ParametricStudio.js'])assert.ok(index.includes(path),`${path} not wired`);for(const token of ['Shipping Mark Studio','data-v48-material','data-v48-bend-mode','data-v48-flap','data-v48-tuck','data-v48-open-mark'])assert.ok(ui.includes(token),`V0.48 UI missing ${token}`);
console.log(`BoxStudio V0.48 passed: thinR=${bendProfileV48(thin).radiusMm} thickR=${bendProfileV48(thick).radiusMm} manualR=${bendProfileV48(manual).radiusMm} graph=${report.v48.graphControls?.bend?.radiusMm}`);
