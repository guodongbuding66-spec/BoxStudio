# BoxStudio V0.24

BoxStudio 是浏览器内运行的纸盒结构设计、2D 刀版、唛头编辑、客户规则、Excel 批量订单、3D 折叠、印前检查、生产审批与生产文件导出原型。

当前主线：**参数化结构 + 唛头变量 + Customer / Packaging Rule + Master Template + Web Worker Batch + Recoverable Artifacts + Production Approval + Project Persistence + Folded Artwork Texture Proof + SVG Appearance + Cross-panel Artwork + Native SVG Gradient + Integrated Native PDF Gradient/Soft Mask + Graphical Clip Editing + Smart Spacing + Verified ICC DeviceLink Subset + Deterministic Batch Context + Approved-output Color Binding**。

## V0.24 新增

### 1. V0.23 Integrated Native Production PDF 已接入 Batch Worker

V0.24 批量生产不再固定走旧的 V0.19 tessellation serializer。

V0.24 Native Batch 会使用：

```text
V0.23 Integrated Native Production PDF
+ V0.24 DeviceLink Binding
+ V0.24 Frozen Batch Context
```

每个批量 PDF 可继续包含：

- CUT / CREASE / PERF / GLUE
- Spot Separation / Overprint
- 唛头变量
- Barcode + QR
- Shipping Icons
- Technical Vector / User TTF Outline
- Panel-local / Cross-panel SVG
- Native Linear / Radial Gradient
- Multi-stop Gradient
- Uniform Alpha
- Varying Gradient Alpha Soft Mask
- Cross-panel Clip
- Object Z-order
- PDF/X-4 Candidate OutputIntent 路线

旧版 Worker serializer 仍保留，旧 V0.19 回归不会被破坏；只有明确标记为 V0.24 Native Batch 的冻结任务才切换新 pipeline。

### 2. Deterministic Batch Run Context

新增：

```text
src/batchRunV24.js
```

批量开始时冻结 Base Production State。

队列记录：

```text
serializer
createdAt
rowCount
rowsFingerprint
masterTemplateId
deviceLinkRef
baseState
```

之后即使用户修改当前项目，已经开始的批次不会在后续订单里偷偷混入新配置。

如果 Excel / CSV 行数据发生变化，BoxStudio 会检测 `rowsFingerprint` 不一致并阻止继续，需要 Restart，而不是静默继续。

### 3. DeviceLink 正式进入 Worker Binary Asset Pipeline

新增：

```text
src/workerAssetsV24.js
```

Worker 启动时可一次性传输：

```text
User TTF
CMYK OutputIntent ICC
RGB -> CMYK DeviceLink ICC
```

如果项目声明了 DeviceLink，但 Worker 没有对应二进制文件，或者内容指纹不一致，批量生成会被阻止。

### 4. DeviceLink Project Binding

`iccDeviceLinkV23.js` 现在会为加载的 DeviceLink 生成确定性的 64-bit FNV-1a 内容指纹，并保留一份 session source bytes 用于 Worker Transfer。

项目可以记录：

```text
exportOptions.deviceLinkRef
```

包含：

```text
name
size
fingerprint
inputColorSpace
outputColorSpace
tagType
gridPoints
```

规则变为：

- 项目没有声明 DeviceLink → Native Appearance 保持 RGB；
- 项目声明 DeviceLink，但当前未加载 → 阻止 Production Export；
- 加载的 DeviceLink 指纹不一致 → 阻止 Production Export；
- 指纹完全一致 → 允许使用该 RGB→CMYK 转换。

这个指纹用于**确定性变更检测**，不是数字签名，也不是安全认证。

### 5. Approved Production Export 也绑定颜色转换资产

新增：

```text
src/productionOutputV24.js
src/productionPdfV24.js
```

Approved Production PDF 现在同时检查：

```text
Approved Job
Production Fingerprint
Preflight State
Role Permission
Declared DeviceLink Identity
Loaded DeviceLink Identity
```

当成功导出 Approved PDF 后，会新增 `exported` Audit Event，记录：

```text
revision
actor
role
fileName
format
serializer
```

当前 Audit 仍是浏览器本地数据，不宣称服务器不可篡改审计。

### 6. Recoverable Batch Artifact Metadata

IndexedDB Artifact 现在额外保留：

```text
serializer
colorSpace
deviceLinkFingerprint
productionJobId
```

Recovered ZIP Manifest 也会写入当前 Serializer、Rows Fingerprint 与 DeviceLink 信息。

### 7. V0.24 Workspace

新增：

```text
src/v24Ui.js
src/v24Ui.css
```

功能包括：

- Export V0.24 Production PDF
- Export Approved V0.24 PDF
- Load & Bind DeviceLink
- Unload DeviceLink Session
- Remove DeviceLink Binding
- Binding / Approval Gate Diagnostics
- Start / Restart Native Batch
- Pause / Resume / Cancel
- Retry Failed / Cancelled
- IndexedDB Recovered ZIP
- Artifact Serializer / Color Space 信息
- Frozen Batch Context 状态

## 现有主要能力

### 结构 / 刀版

- Side-Seal / RSC 参数化结构
- Mailer 150010
- SVG / DXF / PDF / PDF-compatible AI 导入
- CUT / CREASE / PERF / GLUE
- Bezier / Arc
- Polygon Panel
- Panel / Fold Graph
- CREASE → Fold Candidate
- Bleed / Safe Area
- Topology Repair

### 唛头 / Artwork

- SKU / N.W. / G.W. / Package Meas / CRN / Contract No.
- Origin / Destination / Package No.
- Multi-package Notice
- Code 39 / EAN-13 / UPC-A / ITF-14 / GS1-128
- QR Code
- Barcode + QR Locked Group
- 250×80 / 200×64 mm Presets
- This Side Up / Fragile / Keep Dry
- Custom Mark Templates / Assets
- Safe SVG Import
- SVG Fill / Gradient / Clip Safe Subset
- Cross-panel Artwork
- Native SVG Gradient
- Native PDF Gradient / Soft Mask
- Shared Transform / Align / Distribute
- Graphical Clip Points
- Live Equal-gap Smart Spacing

### 3D / Proof

- Hinge-pivot Fold 0–100%
- Polygon UV
- Panel Artwork Texture Atlas
- Cross-panel Fragment → Folded 3D Texture
- Fold Seam UV Diagnostics
- Fold Bleed Continuity Diagnostics

Folded 3D 仍属于浏览器几何 / 印刷位置 Proof，不宣称校色显示器级 ICC Soft Proof。

### Batch / Production

- `.xlsx` / `.csv` / `.tsv`
- Multi-sheet / Mapping
- Batch Preflight
- Combined PDF / ZIP
- Pause / Resume / Cancel / Retry
- IndexedDB Recoverable Artifacts
- Web Worker PDF
- User TTF / ICC / DeviceLink Worker Transfer
- Production Job / Revision / Approval / Reject
- Viewer / Operator / Approver / Admin
- Approved Production PDF Gate
- Export Audit Event

### Project / Collaboration Foundation

- Local Project Library
- Project Revision Envelope
- JSON Import / Export
- REST Adapter
- `If-Match` Revision Protection
- Three-way Remote Merge
- Object / Field-level Merge

仓库当前仍不包含真正托管的 BoxStudio Backend、Auth/SSO 或不可篡改服务器端 Audit。

## PDF/X 与 ICC 边界

### PDF/X

当前仍明确叫：

```text
PDF/X-4 Candidate
```

不是 Acrobat Preflight、callas pdfToolbox 或印厂 RIP 的第三方认证结果。

### ICC

当前有两条不同用途：

1. **CMYK OutputIntent ICC**：描述 PDF/X Candidate 的输出条件；
2. **RGB→CMYK DeviceLink LUT8**：实际转换 Native SVG Appearance 的 RGB 数值。

当前 DeviceLink 支持范围：

```text
Profile Class: link
Input: RGB
Output: CMYK
A2B0: LUT8 / mft1
Channels: 3 -> 4
```

尚未宣称支持 LUT16、mAB/mBA、任意 Source ICC + Destination ICC 的完整 CMM chaining、Black Point Compensation 或商业 CMM 等价行为。

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

```bash
node --check src/*.js
node --check tests/*.mjs
node tests/smoke.mjs
node tests/v10.mjs
node tests/v11.mjs
node tests/v12.mjs
node tests/v13.mjs
node tests/v14.mjs
node tests/v15.mjs
node tests/v16.mjs
node tests/v17.mjs
node tests/v18.mjs
node tests/v19.mjs
node tests/v20.mjs
node tests/v21.mjs
node tests/v22.mjs
node tests/v23.mjs
node tests/v24.mjs
```

V0.24 Regression 覆盖：

- DeviceLink deterministic identity
- DeviceLink Worker transfer / hydration
- Worker exact-asset eligibility
- Frozen Batch Base State
- Row mutation detection
- Legacy V0.19 Worker compatibility
- V0.24 Native Worker routing
- Integrated PDF bytes
- Artifact serializer/color metadata
- Approved-output DeviceLink gate
- Missing DeviceLink block
- DeviceLink re-bind
- Approved export audit event

详细报告：

```text
docs/V0.24_TEST_REPORT.md
```

## 数据存储

```text
boxstudio-mvp-v24
```

V0.23 及更早版本继续作为迁移来源。

附加存储保持：

```text
boxstudio-project-library-v1
boxstudio-remote-base-v1:<projectId>
IndexedDB: boxstudio-artifacts-v1
```

DeviceLink ICC 二进制当前只保存在页面会话内；项目持久化的是轻量 `deviceLinkRef` 身份信息，不保存 ICC 文件本体。

## V0.24 关键新增 / 更新文件

```text
src/
  productionPdfV24.js
  productionOutputV24.js
  batchRunV24.js
  workerAssetsV24.js
  v24Ui.js
  v24Ui.css
  batchWorkerCore.js
  batchPdf.worker.js
  artifactStore.js
  productionJobs.js
  iccDeviceLinkV23.js

tests/
  v24.mjs

docs/
  V0.24_TEST_REPORT.md
```

## 当前边界 / 下一阶段

- ICC LUT16 / mAB / mBA
- Source Profile + Destination Profile CMM Pipeline
- Clip Point Insert / Delete / Bezier Handles
- 更完整 Illustrator-style Smart Guides
- Arbitrary SVG Luminance Mask / Pattern / Blend Mode
- Board Thickness / Bend Radius / Print Stretch Simulation
- Hosted Backend + Auth / SSO
- Server-side Immutable Audit / Approval Signatures
- Cloud Resumable Artifact / Object Storage
- Factory Compensation Profiles（只接受已验证生产参数）
