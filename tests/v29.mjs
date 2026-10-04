import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { defaultState, STORAGE_KEY, LEGACY_STORAGE_KEYS } from '../src/model.js';
import { canonicalHeaderKeyV29, columnIndexV29, columnLettersV29, parseMergeRefV29, expandMergedCellsV29, detectHeaderRowV29, isFooterRowV29, matrixToDatasetV29, importDiagnosticsSummaryV29 } from '../src/batchImportV29.js';
import { batchImportReviewV29, failedRowsCsvV29, batchDiagnosticsJsonV29 } from '../src/batchReviewV29.js';

assert.equal(canonicalHeaderKeyV29('G.W.'),'gw');
assert.equal(canonicalHeaderKeyV29('合同编号'),'contractNo');
assert.equal(canonicalHeaderKeyV29('包装尺寸'),'__packageMeas');
assert.equal(columnIndexV29('AA19'),26);
assert.equal(columnLettersV29(26),'AA');
assert.deepEqual(parseMergeRefV29('A4:A5'),{r1:3,c1:0,r2:4,c2:0});
assert.equal(isFooterRowV29(['TOTAL','','']),true);
assert.equal(isFooterRowV29(['A001','80.7']),false);

const matrix=[
  ['PACKING LIST'],
  ['Customer: ACME'],
  ['SKU','G.W.','Contract No.','CRN','Package Count'],
  ['A001','80.7','HT-001','CRN-A','2'],
  ['','81.2','','',''],
  ['A003','82.0','HT-003','CRN-C','1'],
  ['TOTAL','243.9','','',''],
  ['SHOULD NOT IMPORT','999','','',''],
];
const expanded=expandMergedCellsV29(matrix,['A4:A5']);
assert.equal(expanded[4][0],'A001');
const header=detectHeaderRowV29(expanded);
assert.equal(header.index,2);
assert.ok(header.recognized>=5);

const formulaWarnings=[{cell:'B5',code:'FORMULA_NO_CACHED_VALUE',message:'Formula cell has no cached value in the XLSX package.'}];
const ds=matrixToDatasetV29(matrix,{mergeRefs:['A4:A5'],formulaWarnings});
assert.equal(ds.headerRow,3);
assert.equal(ds.footerRow,7);
assert.equal(ds.rows.length,3);
assert.equal(ds.rows[1].SKU,'A001','merged SKU should fill into the second package row');
assert.equal(ds.rows[1]['Contract No.'],'HT-001','eligible business fields should fill down');
assert.equal(ds.rows[1].CRN,'CRN-A');
assert.equal(ds.rows[1]['Package Count'],'2');
assert.equal(ds.rows[1].__row,5);
assert.equal(ds.rows[1].__lineage['G.W.'],'B5');
assert.equal(ds.rows[1].__canonicalLineage.gw,'B5');
assert.equal(ds.rows[1].__canonicalLineage.contractNo,'C5');
assert.equal(ds.importDiagnostics.mergedRanges,1);
assert.equal(ds.importDiagnostics.fillDownCells,3);
assert.equal(ds.importDiagnostics.footerDetected,true);
assert.equal(ds.importDiagnostics.formulaWarnings.length,1);
assert.equal(ds.importDiagnostics.dataStartRow,4);
assert.equal(ds.importDiagnostics.dataEndRow,6);
assert.deepEqual(importDiagnosticsSummaryV29(ds),{headerRow:3,footerRow:7,rows:3,recognizedHeaders:5,mergedRanges:1,fillDownCells:3,formulaWarningCount:1,headerFallback:false,footerDetected:true,dataStartRow:4,dataEndRow:6});

const fallback=matrixToDatasetV29([['Unknown A','Unknown B'],['x','y']],{minRecognized:2});
assert.equal(fallback.headerRow,1);
assert.equal(fallback.importDiagnostics.headerFallback,true);
assert.equal(fallback.rows.length,1);

const state=structuredClone(defaultState);
state.batch={...state.batch,fileName:'packing-list.xlsx',sheets:[{name:'Sheet 1',...ds}],sheetIndex:0,rows:ds.rows,columns:ds.headers,mapping:{}};
const fakeSummary={total:3,passed:2,failed:1,warnings:1,results:[
  {index:0,sku:'A001',ok:true,errorCount:0,warningCount:0,errors:[]},
  {index:1,sku:'A001',ok:false,errorCount:1,warningCount:1,errors:[{code:'GW_MISSING',title:'Gross Weight missing',detail:'G.W. is required'}]},
  {index:2,sku:'A003',ok:true,errorCount:0,warningCount:0,errors:[]},
]};
const review=batchImportReviewV29(state,{preflightSummary:fakeSummary});
assert.equal(review.fileName,'packing-list.xlsx');
assert.equal(review.sheetName,'Sheet 1');
assert.equal(review.diagnostics.headerRow,3);
assert.equal(review.preflight.failed,1);
const csv=failedRowsCsvV29(state,{preflightSummary:fakeSummary});
assert.ok(csv.includes('Source Row,SKU,Error Codes,Errors,Cell Lineage'));
assert.ok(csv.includes('GW_MISSING'));
assert.ok(csv.includes('Gross Weight missing'));
assert.ok(csv.includes('B5'),'failed row export should preserve canonical source-cell lineage');
const json=batchDiagnosticsJsonV29(state,{preflightSummary:fakeSummary});
assert.ok(json.includes('formulaWarningCount'));
assert.ok(json.includes('packing-list.xlsx'));

assert.ok(STORAGE_KEY.startsWith('boxstudio-mvp-v'));
assert.ok(STORAGE_KEY==='boxstudio-mvp-v29'||LEGACY_STORAGE_KEYS.includes('boxstudio-mvp-v29'),'V0.29 state must remain a supported migration source after later releases');
assert.equal(defaultState.exportOptions.productionSerializer,'v0.27-native-cubic-production','import hardening must not silently change production PDF serializer');
const index=await readFile(new URL('../index.html',import.meta.url),'utf8');
assert.ok(index.includes('v29Ui.css'));
assert.ok(index.includes('v29Ui.js'));

console.log('BoxStudio V0.29 tests passed');
