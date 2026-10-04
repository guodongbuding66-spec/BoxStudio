# BoxStudio V0.29

BoxStudio 是浏览器内运行的纸盒结构设计、2D 刀版、唛头编辑、Cross-panel Artwork、3D 折叠校样、Excel 批量生产、印前检查、生产审批和生产文件导出原型。

当前主线：**参数化结构 + Customer / Packaging Rules + Master Template + Native SVG/PDF Appearance + Cross-panel Artwork + Folded 3D Texture Proof + Recoverable Web Worker Batch + Production Approval + Project Persistence + ICC DeviceLink + Bezier Clip Direct Selection + Smart Guides + Persistent User Guides + Native Cubic Production PDF + Original-plan Gap Register + Resilient Excel Import**。

## V0.29 新增

### 1. Resilient Excel / CSV Import Core

新增：

```text
src/batchImportV29.js
src/batchReviewV29.js
src/v29Ui.js
src/v29Ui.css
```

V0.29 直接针对最初 V1/V2/V3 开发文档中尚未关闭的 Excel Import Engine 差距，新增：

- Header 不在第 1 行时的自动识别；
- 英文 / 中文常用字段 Alias；
- XLSX merged-cell expansion；
- 受控业务字段 Fill Down；
- `TOTAL / SUBTOTAL / GRAND TOTAL / 合计 / 总计 / 小计 / 汇总` Footer Stop；
- 公式单元格没有 cached value 时的 Cell Reference 诊断；
- 原始 Excel `__row`；
- Header → Cell 的 `__lineage`；
- Canonical Field → Cell 的 `__canonicalLineage`。

Header Detection 默认扫描前 24 行，并按识别到的 canonical business field 数量打分；识别不足时才 fallback 到第一条非空行。

### 2. Import Review Diagnostics

Batch Marks 中新增 V0.29 Import Review：

- Header Row；
- Recognized Header Count；
- Merged Range Count；
- Fill-down Cell Count；
- Footer Row；
- Formula cache warnings；
- Batch Preflight Passed / Failed / Warnings。

可导出：

```text
failed_rows.csv
boxstudio-import-diagnostics.json
```

`failed_rows.csv` 会包含 source row、错误码/错误标题、原始列数据和 canonical cell-lineage。

这仍不等同于 V3.0 要求的完整 Import Review；`failed_rows.xlsx`、Filter/Sort/Jump/Inline Correction、Persistent Mapping Profile 和 leading-zero 修复仍未完成。

### 3. 原始开发文档对照进度

V0.28 建立了总 Gap Register：

```text
docs/UNFINISHED_BASELINE_AUDIT.md
```

V0.29 增加本轮差距关闭记录：

```text
docs/BASELINE_PROGRESS_V0.29.md
```

V0.29 可以把总清单中的这些条目从“未完成”推进到“已完成/部分完成”：

- Header Detection → ✅
- Merge / Fill Down → ✅ 基础业务规则
- TOTAL / Footer Stop → ✅
- Formula Cell Error → 🟡 更完整
- Cell-level lineage → 🟡 已有来源坐标
- failed rows export → 🟡 CSV 已有，XLSX 未完成

### 4. V0.29 不改变 Production Serializer

V0.29 是 Import / Review hardening，不改变生产 PDF bytes 的主路线。

当前 production serializer 仍为：

```text
v0.27-native-cubic-production
```

因此单纯升级 Import Engine 不会让已经批准的生产 Serializer 身份发生静默变化。

## V0.28 基线能力

### Group Rotation Object-relative Live Assist

V0.28 已把 object-relative rotation assist 补到多对象 Shared Group Rotation：

- 选中 2 个或以上 Cross-panel Artwork；
- 整组围绕 shared center 旋转；
- 可吸附到未选中 Artwork 的角度；
- 可吸附到目标角度 +90° / +180° / +270°；
- object-relative target 与普通 angle grid 同距离时优先 object-relative；
- `Alt` 临时绕过 current live assist；
- 最终提交仍走统一 `rotateCrossSelection()` domain transform。

V0.28 同时建立：

```text
docs/UNFINISHED_BASELINE_AUDIT.md
```

对照最初：

```text
在线唛头网站_开发文档_V1.0.md
在线唛头网站_开发文档_V2.0_开源项目调研版.md
在线唛头网站_开发文档_V3.0_集百家之长终版.md
```

按：

```text
✅ 已完成
🟡 部分完成
⬜ 未完成
🚫 初始明确非优先
```

持续收敛，而不是继续无序扩需求。

## V0.27 Production 基线

V0.27 已把 Native Cubic Bezier Clip 接入完整 Production PDF。对于带 Bezier Clip Nodes 的 Cross-panel Appearance，可直接输出：

```text
m / l / c / h / W n
```

并继续保留：

- CUT / CREASE / PERF / GLUE；
- Spot Separation / Overprint；
- Barcode + QR；
- Text / Notice / Shipping Icons；
- Technical / User TTF Outline；
- Native axial/radial gradient；
- multi-stop gradient function；
- varying-alpha soft mask；
- Panel / Primitive Clip；
- DeviceRGB 或已验证 DeviceLink DeviceCMYK；
- PDF/X-4 Candidate OutputIntent / XMP 路线。

当前边界仍然是：Cross-panel Fill / Gradient / Soft Mask Object Clip 已支持 Native Cubic；SVG Outline Fragment 的 object-clip 仍使用确定性 flattened materialization。

## 现有主要能力

### Structure / Dieline

- Side-Seal / RSC 参数化结构；
- Mailer 150010；
- SVG / DXF / PDF / PDF-compatible AI 导入；
- CUT / CREASE / PERF / GLUE；
- Bezier / Arc；
- Polygon Panel；
- Panel / Fold Graph；
- CREASE → Fold Candidate；
- Bleed / Safe Area；
- Topology Repair。

### Marks / Artwork

- SKU / N.W. / G.W. / Package Meas / CRN / Contract No.；
- Origin / Destination / Package Notice；
- Code 39 / EAN-13 / UPC-A / ITF-14 / GS1-128；
- QR Code；
- Barcode + QR Locked Group；
- Shipping Icons；
- Safe SVG Import；
- SVG Fill / Gradient / Clip safe subset；
- Cross-panel Artwork；
- Object Z-order；
- Multi-select / Align / Distribute；
- Shared Transform；
- Bezier Cross Clip；
- Smart Guides / Equal-gap Guides；
- Persistent User Guides；
- Text Baseline Assist；
- single-object + group object-relative Rotation Assist；
- Native Cubic Appearance Clip in Production PDF。

### 3D / Proof

- Hinge-pivot Fold 0–100%；
- Polygon UV；
- Panel Artwork Texture Atlas；
- Cross-panel Fragment → Folded 3D Texture；
- Fold Seam UV Diagnostics；
- Fold Bleed Continuity Diagnostics。

Folded Proof 用于几何与印刷位置核对，不宣称校色显示器级 ICC Soft Proof。

### Batch / Production

- `.xlsx` / `.csv` / `.tsv`；
- Multi-sheet / Mapping；
- Header Detection；
- Bilingual Alias；
- XLSX Merge expansion；
- controlled Fill Down；
- Footer Stop；
- Formula cache diagnostics；
- source row / cell lineage；
- failed-row CSV / import diagnostics；
- Batch Preflight；
- Pause / Resume / Cancel / Retry；
- Frozen Batch Context；
- V0.27 Web Worker Native Cubic PDF；
- IndexedDB Recoverable Artifacts；
- Recovered ZIP；
- User TTF / Output ICC / DeviceLink Worker Transfer；
- Production Job / Revision / Approval / Reject；
- Viewer / Operator / Approver / Admin 的本地角色模型；
- Approved Production PDF Gate；
- Production Serializer Fingerprint Binding；
- Export Audit Event。

### Project / Collaboration Foundation

- Local Project Library；
- Revision Envelope；
- JSON Import / Export；
- REST Adapter；
- `If-Match` Revision Protection；
- Three-way Remote Merge；
- Object / Field-level Merge。

这些属于 collaboration foundation，不等同于 hosted backend / Auth / server audit 已完成。

## 与最初开发文档对照后的主要未完成项

完整总清单：

```text
docs/UNFINISHED_BASELINE_AUDIT.md
```

V0.29 更新：

```text
docs/BASELINE_PROGRESS_V0.29.md
```

当前高优先级未完成项：

- Browser Interaction E2E；
- Production PDF rasterize → Barcode/QR Digital Decode Required Check；
- Preview/PDF `<= 0.2 mm` 独立几何验收；
- Current US Template 外部 RIP / K-only / PDF/X 验收；
- Excel Import：Persistent Mapping Profile / leading-zero normalization / exact issue→cell linking / `failed_rows.xlsx` / full review table；
- Production Bundle + cryptographic SHA-256 output hash；
- Hosted Backend + Auth/RBAC + server DB；
- Factory / Country / Customer / Product Master Data；
- Content Library；
- immutable Artwork/Template Revision；
- append-only server Audit；
- Template Publish Pipeline；
- Search / Compare / Impact Analysis / Dashboard；
- Blocking Comment / Two-step Approval / Notification / External Proof Link；
- ICC mAB/mBA / General Source→Destination CMM；
- ERP/PIM/PLM/API/Webhook/SSO/SCIM；
- S3/R2 artifact storage + server queue；
- board thickness / bend radius / factory-verified print stretch compensation。

## PDF/X 与 ICC 边界

### PDF/X

当前仍明确称为：

```text
PDF/X-4 Candidate
```

不是 Acrobat Preflight、callas pdfToolbox 或印厂 RIP 的第三方认证结果。

### ICC DeviceLink

当前验证过的颜色转换子集：

```text
RGB → CMYK A2B0 LUT8  / mft1
RGB → CMYK A2B0 LUT16 / mft2
```

普通 CMYK OutputIntent ICC 不会被误当成 RGB→CMYK 转换引擎。

尚未宣称：

- mAB / mBA；
- 任意 Source ICC → Destination ICC CMM；
- Rendering Intent Pipeline；
- Black Point Compensation；
- Proof Device Simulation。

## 运行

```bash
python -m http.server 8080
```

打开：

```text
http://localhost:8080
```

不要直接使用 `file://`。

## 自动测试

GitHub Actions 当前执行：

```text
Syntax
Smoke
V0.10
...
V0.27
V0.28
V0.29
```

V0.29 Regression 覆盖：

- bilingual canonical aliases；
- column / merge reference parsing；
- header detection after title rows；
- merged-cell expansion；
- controlled fill-down；
- footer stop；
- formula warning preservation；
- source-row / source-cell lineage；
- header fallback；
- batch review summary；
- failed-row CSV；
- diagnostics JSON；
- V0.29 storage migration；
- V0.29 UI wiring；
- package version；
- production serializer remains stable。

详细报告：

```text
docs/V0.29_TEST_REPORT.md
```

## 数据存储

主状态：

```text
boxstudio-mvp-v29
```

V0.28 以及之前支持的版本继续作为 Migration Source。

附加存储保持：

```text
boxstudio-project-library-v1
boxstudio-remote-base-v1:<projectId>
IndexedDB: boxstudio-artifacts-v1
```

## 下一阶段优先级

继续以原始 V1/V2/V3 开发文档为收敛基线：

```text
V0.30  Import Review table + persistent Mapping Profile + leading-zero + failed_rows.xlsx
V0.31  Browser E2E + Digital Decode + PDF/Geometry Acceptance
V0.32  Production Bundle + SHA-256 + immutable snapshot schema
V0.33  Master Data + Content Library domain
V0.34  Hosted Backend + Auth/RBAC + DB
V0.35  Template Publish + Artwork Workflow + server audit
V0.36  Compare + Impact Analysis + Search/Dashboard
V0.37  External Preflight + advanced ICC/CMM
V0.38  ERP/API/Webhook/SSO enterprise adapters
```

这里的“完成”只以真实实现和测试证据为准。浏览器 E2E、第三方 PDF/X 认证、实体条码 ISO Grade、印厂验收在完成前都不会被描述为已完成。