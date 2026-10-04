import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { defaultState, LEGACY_STORAGE_KEYS } from '../src/model.js';
import { leadingZeroWidthV30, restoreLeadingZerosV30, parseXlsxStylesV30, formatCodeForStyleV30, restoreCellNumericTextV30, matrixToDatasetV30 } from '../src/batchImportV30.js';
import { mappingHeaderSignatureV30, saveMappingProfileV30, resolveMappingProfileV30, applyMappingProfileV30, autoApplyMappingProfileV30 } from '../src/mappingProfilesV30.js';
import { fieldFromPreflightIssueV30, issueCellHintV30, buildImportReviewRowsV30, filterImportReviewRowsV30 } from '../src/importReviewV30.js';
import { failedRowsTableV30, failedRowsXlsxPartsV30 } from '../src/failedRowsXlsxV30.js';

assert.equal(leadingZeroWidthV30('000000000000'),12);
assert.equal(leadingZeroWidthV30('0.00'),0);
assert.equal(restoreLeadingZerosV30('123','000000'), '000123');
assert.equal(restoreLeadingZerosV30('123','General'), '123');
const styles=parseXlsxStylesV30('<?xml version="1.0"?><styleSheet><numFmts count="1"><numFmt numFmtId="164" formatCode="000000000000"/></numFmts><cellXfs count="2"><xf numFmtId="0"/><xf numFmtId="164"/></cellXfs></styleSheet>');
assert.equal(formatCodeForStyleV30(styles,1),'000000000000');
assert.deepEqual(restoreCellNumericTextV30('123',{styleIndex:'1',styles}),{value:'000000000123',restored:true,formatCode:'000000000000'});
const ds=matrixToDatasetV30([['SKU','G.W.'],['000123','80.7']],{leadingZeroRestorations:[{cell:'A2',from:'123',to:'000123',formatCode:'000000'}]});
assert.equal(ds.rows[0].SKU,'000123');
assert.equal(ds.importDiagnostics.leadingZeroRestorationCount,1);

let state=structuredClone(defaultState);state.batch={...state.batch,columns:['SKU','G.W.'],mapping:{SKU:'sku','G.W.':'gw'},rows:[{__row:5,SKU:'000123','G.W.':'',__canonicalLineage:{sku:'A5',gw:'B5'}}]};
assert.equal(mappingHeaderSignatureV30(['SKU','G.W.']),'sku\u001fg.w.');
const saved=saveMappingProfileV30(state,{label:'ACME PL'});state=saved.state;assert.equal(state.batchMappingProfiles.length,1);assert.equal(saved.profile.label,'ACME PL');assert.equal(resolveMappingProfileV30(state,['SKU','G.W.']).id,saved.profile.id);
let fresh=structuredClone(state);fresh.batch={...fresh.batch,mapping:{},mappingProfileId:''};const auto=autoApplyMappingProfileV30(fresh);assert.equal(auto.applied,true);assert.deepEqual(auto.state.batch.mapping,{SKU:'sku','G.W.':'gw'});assert.equal(auto.state.batch.mappingProfileId,saved.profile.id);
const mismatch=structuredClone(state);mismatch.batch={...mismatch.batch,columns:['Different'],mapping:{},mappingProfileId:''};assert.equal(autoApplyMappingProfileV30(mismatch).applied,false);
const applied=applyMappingProfileV30(fresh,saved.profile.id);assert.equal(applied.batch.mapping.SKU,'sku');
assert.throws(()=>applyMappingProfileV30(mismatch,saved.profile.id),/headers do not match/i);

assert.equal(fieldFromPreflightIssueV30({code:'GW_MISSING',title:'Gross Weight missing'}),'gw');
assert.equal(issueCellHintV30(state.batch.rows[0],{code:'GW_MISSING'}),'B5');
const fakeSummary={total:1,passed:0,failed:1,warnings:0,results:[{index:0,sku:'000123',ok:false,errorCount:1,warningCount:0,errors:[{code:'GW_MISSING',title:'Gross Weight missing',detail:'Required'}]}]};
const reviewRows=buildImportReviewRowsV30(state,{preflightSummary:fakeSummary});assert.equal(reviewRows.length,1);assert.equal(reviewRows[0].sourceRow,5);assert.equal(reviewRows[0].issues[0].cell,'B5');
assert.equal(filterImportReviewRowsV30(reviewRows,{status:'failed',query:'B5'}).length,1);assert.equal(filterImportReviewRowsV30(reviewRows,{status:'passed'}).length,0);
const table=failedRowsTableV30(state,{preflightSummary:fakeSummary});assert.equal(table.length,2);assert.ok(table[1].includes('B5'));
const parts=failedRowsXlsxPartsV30(state,{preflightSummary:fakeSummary});assert.ok(parts['xl/workbook.xml'].includes('Failed Rows'));assert.ok(parts['xl/worksheets/sheet1.xml'].includes('B5'));assert.ok(parts['xl/worksheets/sheet1.xml'].includes('000123'));

assert.ok(LEGACY_STORAGE_KEYS.includes('boxstudio-mvp-v30'),'V0.30 projects must remain migratable after later releases');
const index=await readFile(new URL('../index.html',import.meta.url),'utf8');assert.ok(index.includes('v30Ui.css'));assert.ok(index.includes('v30Ui.js'));
const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));assert.ok(Number(pkg.version.split('.')[1])>=30);
console.log('BoxStudio V0.30 tests passed');
