# BoxStudio V0.30 — 原始开发文档差距关闭进度

**日期**：2026-10-04  
**基线**：V1.0 / V2.0 / V3.0 开发前文档  
**总差距清单**：`docs/UNFINISHED_BASELINE_AUDIT.md`  
**上一轮**：`docs/BASELINE_PROGRESS_V0.29.md`

> V0.30 继续只关闭最初文档已经写明的 Excel / Batch 缺口，不新增无关功能。

## 1. 本轮对应的原始需求

V2.0 Phase 1.5 明确要求：Upload、Header Mapping、Alias、Fill Down、TOTAL Detection、Import Review、Dry Run、Batch Generation、Audit、ZIP。

V3.0 §31–35 / §98 进一步要求：Header Detection、Alias、Fill Down、Footer Stop、Formula Cell Error、Barcode Leading Zero、Mapping Profile、Import Review、Row Error、Partial Failure、`failed_rows.xlsx`。

## 2. V0.30 实际完成

### 2.1 Persistent Mapping Profile

新增 `src/mappingProfilesV30.js`。

当前支持：

- 保存当前 Header → Canonical Field Mapping；
- 按标准化 Header Signature 识别相同格式；
- 相同 Header 集合再次出现时自动套用一次；
- Apply / Delete；
- Mapping Profile 持久化在 BoxStudio 项目状态中；
- 手工修改后不会被当前会话持续强制覆盖。

当前仍是浏览器本地持久化，不是 Customer Master / Server Profile。

### 2.2 XLSX Leading-zero Protection

新增 `src/batchImportV30.js`，并接入 `src/batch.js`。

V0.30 会读取 `xl/styles.xml` 的：

- custom `numFmt`；
- `cellXfs` style index。

对于明确的纯零格式，例如：

```text
000000000000
```

如果单元格缓存数值是：

```text
123
```

导入值恢复为：

```text
000000000123
```

每次恢复都会记录：Cell / From / To / Format Code。

**边界**：当前只处理可确定的纯零 mask，不猜测 General / 科学计数法 / 日期 / 复杂自定义格式中的业务含义。

### 2.3 Import Review Table

新增 `src/importReviewV30.js` 与 V0.30 UI。

当前提供：

- All / Passed / Failed Filter；
- SKU / Row / Error / Cell Search；
- Source Row / SKU / Status Sort；
- Source Row；
- SKU；
- Error / Warning 摘要；
- 可推导时的 exact Cell Hint；
- Open Row，回到该 Batch Row 的变量数据。

Cell Hint 只有在 Preflight Issue 能可靠映射到一个 Canonical Field 时才显示，不把模糊错误伪装成精确单元格错误。

### 2.4 `failed_rows.xlsx`

新增 `src/failedRowsXlsxV30.js`。

失败行现在可以导出真正的 OpenXML `.xlsx`，包含：

- Source Row；
- SKU；
- Error Codes；
- Errors；
- Cell Hints；
- 原始导入列。

仍保留 V0.29 的 `failed_rows.csv` 和 Import Diagnostics JSON。

## 3. Phase 1.5 状态更新

| 原始要求 | V0.28 | V0.29 | V0.30 |
|---|---:|---:|---:|
| Upload / Multi-sheet | ✅ | ✅ | ✅ |
| Header Mapping | ✅ 基础 | ✅ | ✅ |
| Persistent Mapping Profile | ⬜ | ⬜ | ✅ 本地 |
| Alias | ✅ 基础 | ✅ 双语 | ✅ |
| Header Detection | ⬜ | ✅ | ✅ |
| Merge / Fill Down | ⬜ | ✅ 基础 | ✅ |
| TOTAL / Footer Stop | ⬜ | ✅ | ✅ |
| Formula no-cache diagnostics | 🟡 | ✅ 基础 | ✅ 基础 |
| Leading-zero protection | 🟡 | 🟡 | ✅ 明确 zero-mask subset |
| Cell lineage | ⬜ | 🟡 | 🟡 source lineage + issue hints |
| Import Review | 🟡 | 🟡 diagnostics | 🟡 table/filter/search/open row |
| failed rows export | ⬜ | 🟡 CSV | ✅ XLSX + CSV |
| Dry Run / Batch Preflight | ✅ | ✅ | ✅ |
| Partial Failure / Retry | ✅ | ✅ | ✅ |
| ZIP / Recoverable Artifact | ✅ | ✅ | ✅ |

## 4. Excel / Batch 仍未完全关闭的项目

V0.30 之后仍不标记为完整结束：

- Customer / Supplier 级服务端 Mapping Profile 与权限；
- 可配置 Alias Registry；
- 双语重复 Header 自动去重策略；
- 复杂 Excel Number Format / 科学计数法的受控恢复；
- 任意 Excel Formula Engine；
- 所有 Preflight Issue 的 Schema-level `field` 元数据，从源头消除启发式 Cell Hint；
- Import Review Inline Correction；
- Re-upload 后与旧 Import Job 的差异比较；
- server ImportJob / Audit / User / Idempotency；
- 大型 Workbook Streaming / memory benchmark；
- 浏览器交互 E2E。

## 5. 当前更高优先级的基线差距

完成上述 Excel 主路径后，下一优先级回到 V1/V2/V3 的生产验收项：

1. Production PDF Rasterize → Barcode/QR Digital Decode Required Check；
2. Preview/PDF 关键点几何误差 `<= 0.2 mm` 的独立验收工具；
3. Current US Template 的外部 RIP / K-only / PDF/X 验收；
4. Production Bundle + SHA-256 + immutable snapshot；
5. Hosted Backend + Auth/RBAC + Master Data / Content Library；
6. Template Publish / Artwork Workflow / Server Audit；
7. Compare / Impact Analysis / Search / Dashboard。

V0.30 仍不修改 Production PDF serializer；批准生产路线继续是 `v0.27-native-cubic-production`。
