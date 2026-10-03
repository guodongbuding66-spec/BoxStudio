# BoxStudio V0.22

BoxStudio 是浏览器内运行的纸盒结构设计、2D 刀版、唛头编辑、客户规则、Excel 批量订单、3D 折叠、印前检查、生产审批与生产文件导出原型。

当前主线：**参数化结构 + 唛头变量 + Customer / Packaging Rule + Master Template + Batch Worker + Recoverable Artifacts + Production Approval + Project Persistence + Granular Remote Merge + Folded Artwork Texture Proof + SVG Appearance + Cross-panel Artwork + Native SVG Gradient + Native PDF Gradient/Soft-mask Proof + Object Z-order + Multi-select/Snap + Shared Transform + Editable Clip Polygon**。

## V0.22 新增

### 1. Native PDF Gradient Soft-mask Proof

新增 `src/nativePdfV22.js`。

V0.22 在 V0.21 Native PDF Shading Proof 基础上继续支持：

- Linear Gradient → PDF `/ShadingType 2`
- Radial Gradient → PDF `/ShadingType 3`
- Multi-stop Gradient → Type 3 Stitching Function
- Uniform Alpha → `ExtGState`
- **Varying Gradient Stop Opacity → PDF Luminosity Soft Mask**
- `/SMask << /S /Luminosity ... >>`
- DeviceGray transparency Form XObject
- Panel Clip / Cross-panel Clip

导出文件：

```text
boxstudio-v22-native-gradient-softmask-proof.pdf
```

这仍是 Native Appearance Proof / Serializer Validation 路线，不会错误替换现有完整生产 PDF。Production PDF 继续保留已回归验证的 V0.19 appearance-aware serializer。

### 2. Cross-panel Shared Transform

新增：

- `src/crossPanelTransformV22.js`
- `src/v22CanvasOverlay.js`

多选 Cross-panel Artwork 现在支持：

- Shared Group Resize
- Shared Group Rotation
- Common Transform Origin
- Rotation Snap
- Group Selection Bounds
- 单对象 Resize / Rotate 继续保留
- Shift-click Add / Remove Selection
- Group Move + Panel/Grid Snap 继续保留

### 3. Align / Distribute

V0.22 Workspace 新增：

- Align Left
- Center X
- Align Right
- Align Top
- Center Y
- Align Bottom
- Distribute X
- Distribute Y

Distribution 使用当前选择范围内的等间距 Gap。

### 4. Editable Cross-panel Clip Polygon

Cross-panel Artwork 新增 `crossClip`。

Clip Polygon 使用归一化对象坐标，例如：

```text
0,0 1,0 1,1 0,1
```

支持：

- 自定义 Polygon Clip
- 10% Inset Preset
- Clear Clip
- 随对象 Scale
- 随对象 Rotate
- Fill Fragment Clip
- SVG Outline Segment Clip
- Panel Clip 之前执行
- Folded 3D Panel Artwork Atlas 同步使用
- Native SVG Export 同步保留 editable clipPath

这是几何 Clip，不等同 RIP Trapping 或完整 SVG Luminance Mask Editor。

### 5. V0.22 Workspace

新增：

- `src/v22Ui.js`
- `src/v22Ui.css`

提供：

- Export V0.22 Soft-mask Proof PDF
- Export Native Gradient SVG
- Stable V0.19 Production PDF
- Axial / Radial / Soft-mask / Alpha 统计
- Shared Transform / Align / Distribution
- Editable Clip Polygon
- 当前 Cross-panel Selection / Clip 状态

V0.21 / V0.20 Workspace 在 V0.22 下隐藏，Folded 3D Artwork Proof 继续保留。

## 已有核心能力

### 结构 / 刀版

- Parametric Side-Seal / RSC
- Mailer 150010
- SVG / DXF / PDF / PDF-compatible AI 导入
- CUT / CREASE / PERF / GLUE
- Bezier / Arc
- Polygon Panel
- Panel / Fold Graph
- CREASE → Fold Candidate
- CUT Crossing / Polygon Self-intersection
- Bleed / Safe Area
- Topology Repair

工厂压线补偿、刀模板补偿和设备公差只接受已验证生产数据，不自动编造。

### 唛头 / Artwork

- SKU / N.W. / G.W. / Package Meas / CRN / Contract No.
- Origin / Destination / Package No.
- Multi-package Notice
- Code 39 / EAN-13 / UPC-A / ITF-14 / GS1-128
- QR Code
- Barcode + QR Locked Group
- 250×80 mm / 200×64 mm
- This Side Up / Fragile / Keep Dry
- Custom Mark Template / Mark Asset
- Panel-local mm Layout Editor
- Safe SVG Import
- SVG Fill / Gradient / Clip / Mask Proof Subset
- V0.19 Appearance Production Materialization
- Cross-panel Artwork
- Native SVG Gradient
- Object Z-order
- Native PDF Gradient / Soft-mask Proof
- Cross-panel Shared Transform
- Editable Clip Polygon

### 3D / Proof

- Hinge-pivot Fold 0–100%
- Polygon UV
- Panel Artwork Texture Atlas
- Cross-panel Fragment → Folded 3D Texture
- Fold Seam UV Diagnostics
- Fold Bleed Continuity Diagnostics

当前 Folded Proof 仍是浏览器 Canvas/sRGB 几何与印刷位置核对，不宣称 monitor-calibrated ICC soft proof。

### Batch / Production

- `.xlsx` / `.csv` / `.tsv`
- Multi-sheet / Mapping
- Batch Preflight
- Combined PDF / ZIP
- Queue / Pause / Resume / Cancel
- IndexedDB Artifact Cache
- Recovered ZIP
- Web Worker PDF
- User TTF / ICC Worker Transfer
- Production Job / Revision / Approval / Reject
- Audit Trail
- Production Fingerprint
- Viewer / Operator / Approver / Admin
- Approved Production PDF Gate

### Project / Collaboration Foundation

- Local Project Library
- Project Revision Envelope
- JSON Import / Export
- REST Adapter
- `If-Match` Revision Protection
- Three-way Remote Merge
- Object / Field-level Merge

当前仓库仍不包含真正托管的 BoxStudio Backend、Auth/SSO 或不可篡改服务器端 Audit。

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
```

V0.22 Regression 覆盖：

- Gradient Stop Opacity → PDF Soft Mask
- `/S /Luminosity`
- DeviceGray Transparency Form
- Shared Multi-object Scale
- Shared Rotation Snap
- Align
- Equal-gap Distribution
- Normalized Clip Parsing
- Cross-panel Clip Materialization
- Clip Area Reduction
- Clip Diagnostics

详细报告：

```text
docs/V0.22_TEST_REPORT.md
```

## 数据存储

```text
boxstudio-mvp-v22
```

V0.21 及更早版本继续作为迁移来源。

附加存储保持：

```text
boxstudio-project-library-v1
boxstudio-remote-base-v1:<projectId>
IndexedDB: boxstudio-artifacts-v1
```

## V0.22 关键新增文件

```text
src/
  nativePdfV22.js
  crossPanelTransformV22.js
  v22CanvasOverlay.js
  v22Ui.js
  v22Ui.css

tests/
  v22.mjs

docs/
  V0.22_TEST_REPORT.md
```

## 当前边界 / 下一阶段

- 将 Native PDF Shading + Soft Mask 真正并入完整 Production PDF Serializer
- 真正的 ICC RGB → CMYK Artwork Conversion Engine
- Arbitrary SVG Luminance Mask
- 2D Canvas Graphical Clip-point Editing
- Drag-time Smart Spacing Guides
- Board Thickness / Bend Radius / Print Stretch Simulation
- Hosted Backend + Auth / SSO
- Server-side Immutable Audit / Approval Signatures
- Cloud Resumable Artifact / Object Storage
- Factory Compensation Profiles（仅使用已验证生产参数）
