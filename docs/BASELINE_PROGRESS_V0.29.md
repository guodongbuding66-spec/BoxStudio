# BoxStudio V0.29 — 原始开发文档差距关闭进度

**日期**：2026-10-04  
**基线**：V1.0 / V2.0 / V3.0 开发前文档  
**关联总清单**：`docs/UNFINISHED_BASELINE_AUDIT.md`

> 本文件只记录 V0.29 实际关闭的差距，不把“有基础代码”写成完整业务闭环。

## 1. 原始需求

V1.0 的 Excel 路线要求：读取 Excel → 逐行校验 → 标记错误 → 批量生成 → ZIP，并且在后续 V2 路线中明确加入 `Header mapping / Alias / Fill down / TOTAL detection / Import review / Dry run / Batch generation / Audit / ZIP`。

V3.0 进一步把 Excel Import Engine 定义成正式模块，要求：

- Header Detection；
- Alias；
- Fill Down；
- Footer Stop（TOTAL / SUBTOTAL / 合计 / 总计）；
- Formula Cell 错误；
- Barcode leading-zero 保护；
- 错误定位到 Sheet / Row / Cell / Field；
- Import Review；
- Mapping Profile；
- Partial Failure；
- failed rows 导出。

## 2. V0.29 已完成

### 2.1 Header Detection

新增 `src/batchImportV29.js`。

导入不再强制第 1 行为 Header。前 24 行会按可识别业务字段打分，选择最可能的 Header；识别不足时才 fallback 到第一条非空行。

当前可识别字段覆盖现有 BoxStudio Canonical Variables，例如：

`SKU / NW / GW / Length / Width / Height / Package Meas / CRN / Contract / Origin / Destination / Package Index / Package Count / QR`。

### 2.2 XLSX Merge 展开 + Fill Down

XLSX parser 读取 `<mergeCell ref="...">`，先把合并区域的主值展开，再对适合继承的业务字段执行 fill-down。

当前 fill-down 字段：

- SKU；
- Dimension Unit；
- Weight Unit；
- CRN；
- Contract No.；
- Origin Country；
- Destination Country；
- Package Count。

不会对 G.W./N.W./Length/Width/Height 等数值字段盲目继承。

### 2.3 Footer Stop

识别并停止：

`TOTAL / SUBTOTAL / GRAND TOTAL / 合计 / 总计 / 小计 / 汇总`。

Footer 后面的内容不会继续进入 Batch Rows。

### 2.4 Formula cache diagnostics

XLSX 单元格存在公式 `<f>` 但没有缓存结果 `<v>` 时，记录：

`FORMULA_NO_CACHED_VALUE`

以及具体 Excel Cell Reference。

V0.29 只做诊断，不在浏览器里计算任意 Excel 公式。

### 2.5 Source Row / Cell Lineage

每条导入 Row 新增：

- `__row`：原始 Excel 行号；
- `__lineage`：原始 Header → Cell Reference；
- `__canonicalLineage`：Canonical Field → Cell Reference。

例如：

```json
{
  "__row": 5,
  "__canonicalLineage": {
    "sku": "A5",
    "gw": "B5",
    "contractNo": "C5"
  }
}
```

这为后续把 Preflight Issue 精确回指到 `Sheet / Row / Cell / Field` 建立了数据基础。

### 2.6 Import Review diagnostics

新增：

- `src/batchReviewV29.js`
- `src/v29Ui.js`
- `src/v29Ui.css`

当前 UI 可查看：

- Header Row；
- Recognized Header 数；
- Merge Range 数；
- Fill-down Cell 数；
- Footer Row；
- Formula cache warnings；
- Batch Preflight Passed / Failed / Warnings。

并可导出：

- `failed_rows.csv`；
- `boxstudio-import-diagnostics.json`。

`failed_rows.csv` 包含 source row、preflight errors、raw source columns 与 canonical cell-lineage。

## 3. V0.29 仍未完成

以下仍保持在 Gap Register 中，不能标记为完成：

- `failed_rows.xlsx` 原生 Excel 导出；
- 完整 Import Review：Filter / Sort / Jump to Row / Inline Correction / Re-upload；
- Persistent Mapping Profile（客户/供应商维度复用）；
- 客户可配置 Alias Registry；
- Excel 数值污染后的 leading-zero 恢复策略；
- Formula Engine（当前仅检测“公式无缓存值”）；
- Preflight Issue → Canonical Field → 精确 Cell 自动关联；
- Sheet-level / Workbook-level Import Audit；
- Server-side Import Job / Idempotency / User Identity；
- 大文件 streaming parser / memory benchmark。

## 4. 与总未完成清单的状态变化

V0.28 总清单中 Phase 1.5 的以下条目可以更新：

| 项目 | V0.28 | V0.29 |
|---|---:|---:|
| Header Detection | ⬜ | ✅ |
| Fill Down | ⬜ | ✅ 基础业务规则 |
| TOTAL / Footer Stop | ⬜ | ✅ |
| Formula Cell Error | 🟡 | 🟡 增加无缓存公式定位 |
| Cell-level lineage | ⬜ | 🟡 已有来源坐标，尚未自动绑定全部 Preflight Issue |
| Import Review | 🟡 | 🟡 增加 diagnostics / failed CSV，仍缺完整 review table |
| failed rows export | ⬜ | 🟡 CSV 已有，XLSX 未完成 |

## 5. 下一步

继续按最初开发文档收敛，而不是扩散功能：

1. 完成 Import Review Table + Cell-level Issue Link；
2. Mapping Profile 持久化；
3. leading-zero / numeric barcode normalization；
4. `failed_rows.xlsx`；
5. 然后转入 Barcode/QR Digital Decode Required Check 与 Preview/PDF Geometry Acceptance。

V0.29 没有修改 Production PDF serializer；当前批准生产路线仍是 `v0.27-native-cubic-production`。
