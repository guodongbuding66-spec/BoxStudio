import assert from 'node:assert/strict';
import { defaultState } from '../src/model.js';
import { getPackagingRuleProfile, validatePackagingRuleState, countVariableBindings } from '../src/rules.js';
import { applyCustomerProfile, validateCustomerProfile } from '../src/customerProfiles.js';
import { applyMarkTemplate, validateMarkTemplate } from '../src/markTemplates.js';
import { createMasterTemplate, applyMasterTemplate, serializeMasterTemplate, parseMasterTemplate, validateMasterTemplate } from '../src/masterTemplates.js';
import { runPreflight } from '../src/preflight.js';

assert.equal(getPackagingRuleProfile('us-side-seal').label, 'US Side-Seal Carton');
assert.equal(countVariableBindings(defaultState.elements, 'crn'), 2);

const ruleChecks = validatePackagingRuleState(defaultState);
assert.equal(ruleChecks.some(check => check.severity === 'error'), false);
assert.equal(ruleChecks.some(check => check.code === 'rule.crn.bindings' && check.severity === 'pass'), true);
assert.equal(ruleChecks.some(check => check.code === 'rule.barcodeQr.lock' && check.severity === 'pass'), true);

const missingCrn = structuredClone(defaultState);
missingCrn.variables.crn = '';
assert.equal(validatePackagingRuleState(missingCrn).some(check => check.code === 'rule.required.crn' && check.severity === 'error'), true);

const badPackage = structuredClone(defaultState);
badPackage.variables.packageIndex = '4';
badPackage.variables.packageCount = '3';
assert.equal(validatePackagingRuleState(badPackage).some(check => check.code === 'rule.package.index' && check.severity === 'error'), true);

const profiled = applyCustomerProfile(structuredClone(defaultState), 'us-export-master', { overwriteDefaults: true });
assert.equal(profiled.packagingRuleProfileId, 'us-side-seal');
assert.equal(profiled.variables.destinationCountry, 'US');
assert.equal(validateCustomerProfile(profiled).ok, true);
profiled.variables.destinationCountry = 'CA';
assert.equal(validateCustomerProfile(profiled).ok, false);

const compact = applyMarkTemplate(structuredClone(defaultState), 'us-side-seal-compact');
const compactGroup = compact.elements.find(element => element.type === 'barcode-qr-group');
assert.deepEqual([compactGroup.w, compactGroup.h], [200, 64]);
assert.equal(compactGroup.lockAspect, true);
assert.equal(validateMarkTemplate(compact).ok, true);

const source = structuredClone(defaultState);
source.variables.sku = 'MASTER-SOURCE-SKU';
const master = createMasterTemplate(source, { id:'us-master-v1', label:'US Master V1' });
assert.equal(validateMasterTemplate(master).ok, true);
assert.equal(master.packagingRuleProfileId, 'us-side-seal');
const encoded = serializeMasterTemplate(master);
assert.equal(parseMasterTemplate(encoded).id, 'us-master-v1');
const target = structuredClone(defaultState);
target.variables.sku = 'LIVE-SKU-002';
const applied = applyMasterTemplate(target, master, { preserveVariables: true });
assert.equal(applied.variables.sku, 'LIVE-SKU-002');
assert.equal(applied.elements.length, master.elements.length);
assert.equal(applied.packagingRuleProfileId, master.packagingRuleProfileId);

const preflight = runPreflight(defaultState);
assert.equal(preflight.some(check => check.title === 'Packaging Rule Profile'), true);
assert.equal(preflight.some(check => check.title === 'Customer Profile' && check.severity === 'pass'), true);
assert.equal(preflight.some(check => check.title === 'Mark Template' && check.severity === 'pass'), true);

console.log('BoxStudio V0.10 profile/master-template tests passed');
