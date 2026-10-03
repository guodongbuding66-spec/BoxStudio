# BoxStudio V0.27

BoxStudio 是浏览器内运行的纸盒结构设计、2D 刀版、唛头编辑、Cross-panel Artwork、3D 折叠校样、Excel 批量生产、印前检查、生产审批和生产文件导出原型。

当前主线：**参数化结构 + Customer / Packaging Rules + Master Template + Native SVG/PDF Appearance + Cross-panel Artwork + Folded 3D Texture Proof + Recoverable Web Worker Batch + Production Approval + Project Persistence + ICC DeviceLink + Bezier Clip Direct Selection + Smart Guides + Persistent User Guides + Native Cubic Production PDF**。

## V0.27 新增

### 1. Native Cubic Clip 进入完整 Production PDF

V0.26 的 Native Cubic Clip 只存在于独立 Proof Serializer。V0.27 已把这条路径接入完整生产 PDF。

对于带 Bezier Clip Nodes 的 Cross-panel Artwork，生产 PDF 的 Appearance Clip 现在可以直接输出：

```text
m   move-to
l   line-to
c   cubic Bezier
h   close path
W n apply clip
```

新的 V0.27 Production 路线继续保留：

- CUT / CREASE / PERF / GLUE
- Spot Separation / Overprint
- Barcode + QR
- Text / Notice / Shipping Icons
- Technical / User TTF Outline
- Native Axial Gradient
- Native Radial Gradient
- Multi-stop Gradient Function
- Varying-alpha Soft Mask
- Panel / Primitive Clip
- DeviceRGB 或验证过的 DeviceLink DeviceCMYK
- PDF/X-4 Candidate OutputIntent / XMP 路线

V0.27 Serializer：

```text
v0.27-native-cubic-production
```

主导出：

```text
*-v27-production-native-cubic.pdf
```

**当前边界：** Native Cubic 已用于 Cross-panel Appearance 的 Fill / Gradient / Soft Mask 对象裁切；SVG Outline Fragment 仍经过现有确定性 Flattened Object-clip Materialization，没有把这部分描述成 Native Cubic。

### 2. Approved Production 绑定 Serializer 身份

V0.27 默认状态新增：

```text
exportOptions.productionSerializer = v0.27-native-cubic-production
```

生产审批指纹本来就包含完整 `exportOptions`，因此 V0.27 的 Serializer 身份会自动进入 Approved Revision Fingerprint。

这意味着：

- 用旧 Serializer 批准的 Revision 不会静默授权 V0.27 Approved PDF；
- Production Serializer 发生变化后，Approval Gate 会检测到 Fingerprint 不匹配；
- 需要重新 Revision / Submit / Approve；
- 成功导出 Approved V0.27 PDF 后，Audit Event 会记录：

```text
serializer = v0.27-native-cubic-production
```

### 3. V0.27 Native Cubic Web Worker Batch

新增：

```text
src/batchRunV27.js
```

并升级：

```text
src/batchWorkerCore.js
src/batchPdf.worker.js
src/v27Ui.js
```

V0.27 Batch 现在使用同一条 Native Cubic Production Serializer，而不是停留在 V0.24 Production Path。

Frozen Context 保存：

```text
serializer = v0.27-native-cubic-production
batchPipeline = v27-native-cubic
nativeCubicClip = true
rowsFingerprint
DeviceLink declaration
frozen base production state
```

继续支持：

- Excel / CSV / TSV
- Pause / Resume / Cancel / Retry
- Frozen Base State
- Row Fingerprint Change Blocking
- Web Worker PDF
- TTF Transfer
- Output ICC Transfer
- DeviceLink Binary + Fingerprint Validation
- IndexedDB Recoverable Artifacts
- Recovered ZIP

V0.27 Artifact Metadata 额外保存：

```text
serializer
colorSpace
deviceLinkFingerprint
nativeCubicClipObjects
```

已有 V0.24 Batch Job 仍保持原 Serializer，不会静默升级。

### 4. User Guide / Baseline 正式进入 Live Move Gesture

新增：

```text
src/liveAssistV27.js
src/v27CanvasOverlay.js
```

Cross-panel Artwork 拖动时，当前实时吸附链路为：

```text
Panel / Grid Snap
→ Object Alignment
→ Equal Spacing
→ Persistent User Guide Snap
→ Text Baseline Snap
```

Guide 语义：

```text
Cyan    = Persistent User Guide
Violet  = Text Baseline
Magenta = Object Alignment / Size Match
Orange  = Equal Spacing
Green   = Panel / Grid
```

同一 Y 方向同时接近 Persistent User Guide 和 Text Baseline 时，User Guide 优先。

按住 `Alt` 可以临时绕过当前 Gesture 的 Live Assist。

### 5. Rotation Assist 进入 Live Rotate Gesture

单对象旋转时现在实时参与：

```text
Angle Grid
Other Artwork Rotation
Other Artwork + 90°
Other Artwork + 180°
Other Artwork + 270°
```

对象角度与普通 Grid Angle 同距离时，继续优先 Object-to-object Rotation Match。

当前多对象 Group Rotation 仍使用已有 Shared Transform / Angle Grid 路线；V0.27 没有宣称 Group Rotation 已拥有完整 Object-relative Rotation Assist。

### 6. V0.27 Workspace

新增：

```text
src/v27Ui.js
src/v27Ui.css
src/v27CanvasOverlay.js
```

提供：

- V0.27 Native Cubic Production PDF
- Approved V0.27 PDF
- Native Cubic Production Diagnostics
- Live Assist Diagnostics
- V0.27 Recoverable Worker Batch
- Pause / Resume / Cancel / Retry
- Recovered ZIP
- Worker TTF / ICC / DeviceLink Diagnostics

V0.26 Precision Workspace 继续保留，用于：

- Bezier Node Numeric Inspector
- Segment Line / Curve
- Persistent User Guide 管理
- DeviceLink 文件加载与 RGB→CMYK 数值测试

旧 V0.24 / V0.25 / V0.26 Production Export 按钮在 V0.27 下隐藏，避免把旧 Serializer 当成当前 Approved Production 路线。

## 现有主要能力

### Structure / Dieline

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

### Marks / Artwork

- SKU / N.W. / G.W. / Package Meas / CRN / Contract No.
- Origin / Destination / Package Notice
- Code 39 / EAN-13 / UPC-A / ITF-14 / GS1-128
- QR Code
- Barcode + QR Locked Group
- Shipping Icons
- Safe SVG Import
- SVG Fill / Gradient / Clip Safe Subset
- Cross-panel Artwork
- Object Z-order
- Multi-select / Align / Distribute
- Shared Transform
- Bezier Cross Clip
- Smart Guides / Equal-gap Guides
- Persistent User Guides
- Text Baseline Assist
- Rotation Assist
- Native Cubic Appearance Clip in Production PDF

### 3D / Proof

- Hinge-pivot Fold 0–100%
- Polygon UV
- Panel Artwork Texture Atlas
- Cross-panel Fragment → Folded 3D Texture
- Fold Seam UV Diagnostics
- Fold Bleed Continuity Diagnostics

Folded Proof 用于几何与印刷位置核对，不宣称校色显示器级 ICC Soft Proof。

### Batch / Production

- `.xlsx` / `.csv` / `.tsv`
- Multi-sheet / Mapping
- Batch Preflight
- Pause / Resume / Cancel / Retry
- Frozen Batch Context
- V0.27 Web Worker Native Cubic PDF
- IndexedDB Recoverable Artifacts
- Recovered ZIP
- User TTF / Output ICC / DeviceLink Worker Transfer
- Production Job / Revision / Approval / Reject
- Viewer / Operator / Approver / Admin
- Approved Production PDF Gate
- Production Serializer Fingerprint Binding
- Export Audit Event

### Project / Collaboration Foundation

- Local Project Library
- Revision Envelope
- JSON Import / Export
- REST Adapter
- `If-Match` Revision Protection
- Three-way Remote Merge
- Object / Field-level Merge

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

- mAB / mBA
- 任意 Source ICC → Destination ICC CMM
- Rendering Intent Pipeline
- Black Point Compensation
- Proof Device Simulation

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
V0.26
V0.27
```

V0.27 Regression 覆盖：

- Full Production PDF Native Cubic `c` Operator
- Production `W n` Clip
- CutContour Spot Retention
- Native Gradient / Soft Mask Retention
- V0.27 Serializer Diagnostics
- Frozen V0.27 Batch Context
- Row Change Blocking
- V0.27 Worker Production PDF
- Worker Native Cubic Output
- Live User Guide Move Snap
- Live Text Baseline Move Snap
- Live Object Rotation Match
- Serializer Identity Approval Fingerprint

详细报告：

```text
docs/V0.27_TEST_REPORT.md
```

## 数据存储

主状态：

```text
boxstudio-mvp-v27
```

V0.26 以及之前支持的版本继续作为 Migration Source。

附加存储保持：

```text
boxstudio-project-library-v1
boxstudio-remote-base-v1:<projectId>
IndexedDB: boxstudio-artifacts-v1
```

## 当前边界 / 下一阶段

- SVG Outline Fragment 的 Cross-panel Object Clip 仍使用确定性 Flattened Materialization
- Group Rotation 尚未接入完整 Object-relative Live Rotation Assist
- ICC mAB / mBA Verified Subset
- 更完整 Source ICC → Destination ICC CMM
- Text Baseline 使用实际字体 Metrics
- Browser Interaction E2E
- Hosted Backend + Auth / SSO
- Server-side Immutable Approval Audit
- Cryptographic Approval Signature
- Cloud Resumable Artifact Storage
- Board Thickness / Bend Radius / Verified Print Stretch Compensation
