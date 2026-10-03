# BoxStudio V0.21

BoxStudio 是浏览器内运行的纸盒结构设计、2D 刀版、唛头编辑、客户规则、Excel 批量订单、3D 折叠、印前检查、生产审批与生产文件导出原型。

当前主线：**参数化结构 + 唛头变量 + Customer / Packaging Rule + Master Template + Batch Worker + Recoverable Artifacts + Production Approval + Project Persistence + Granular Remote Merge + Folded Artwork Texture Proof + SVG Appearance + Cross-panel Artwork + Native SVG Gradient + Native PDF Gradient Proof + Object Z-order + Multi-select/Snap**。

## V0.21 新增

### 1. Native PDF Axial / Radial Shading Proof

新增 `src/nativePdfV21.js`。

V0.21 增加真正的 PDF Shading 对象验证路径：

- Linear Gradient → PDF `/ShadingType 2`
- Radial Gradient → PDF `/ShadingType 3`
- 2-stop Gradient → Type 2 interpolation function
- Multi-stop Gradient → Type 3 stitching function
- Uniform Alpha → PDF `ExtGState`
- Solid vector fill
- Panel clipping
- Cross-panel clipping
- Object z-order traversal

导出文件：

```text
boxstudio-v21-native-gradient-proof.pdf
```

这是一条 **Native Gradient Proof / Serializer Validation** 路线，不替换现有完整生产 PDF。Production PDF 仍继续使用已经完整回归测试的 V0.19 appearance-aware vector tessellation serializer。

当前仍不宣称：

- Native Gradient 已并入完整生产 PDF；
- varying gradient-stop alpha 已通过 PDF Soft Mask 完整实现；
- imported RGB artwork 已通过 ICC engine 转换为 Output CMYK；
- PDF/X 已通过 Acrobat/callas/RIP 第三方认证。

### 2. Cross-panel Multi-select

新增：

- `src/crossPanelTransformV21.js`
- `src/v21CanvasOverlay.js`

Design 画布现在支持：

- Shift-click 多选 Cross-panel Artwork
- Shift-click 取消某个对象
- 多对象整体拖动
- 选择框
- 单对象 Resize
- Aspect Lock
- Rotation Handle
- Rotation Snap
- Selection 持久化

### 3. Smart Snap 基础

拖动 Cross-panel Artwork 时现在会检查：

- Panel Left / Right Edge
- Panel Top / Bottom Edge
- Panel Center
- mm Grid

默认：

```text
Grid = 5 mm
Tolerance = 3 mm
Angle Step = 15°
```

按住 `Alt` 可以临时绕过 Move / Rotate Snap。

### 4. V0.21 Workspace

新增：

- `src/v21Ui.js`
- `src/v21Ui.css`

提供：

- Export V0.21 Native Gradient Proof PDF
- Export V0.20 Native Gradient SVG
- V0.19 Production PDF
- Axial / Radial / Solid / Alpha 统计
- PDF Gradient Warning
- Snap 开关
- Grid / Tolerance / Angle Step
- 当前 Cross-panel 多选对象

V0.20 Workspace 在 V0.21 下自动隐藏；Folded 3D Artwork Proof 继续保留。

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
- Native PDF Gradient Proof

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
```

V0.21 Regression 覆盖：

- PDF ShadingType 2
- PDF ShadingType 3
- Multi-stop Type 3 Stitching Function
- ExtGState Uniform Alpha
- PDF Shading Resource Invocation
- Cross-panel Additive Multi-select
- Grid Snap
- Panel-edge Snap Diagnostics
- Rotation Snap
- Selection Removal

详细报告：

```text
docs/V0.21_TEST_REPORT.md
```

## 数据存储

```text
boxstudio-mvp-v21
```

V0.20 及更早版本继续作为迁移来源。

附加存储保持：

```text
boxstudio-project-library-v1
boxstudio-remote-base-v1:<projectId>
IndexedDB: boxstudio-artifacts-v1
```

## V0.21 关键新增文件

```text
src/
  nativePdfV21.js
  crossPanelTransformV21.js
  v21CanvasOverlay.js
  v21Ui.js
  v21Ui.css

tests/
  v21.mjs

docs/
  V0.21_TEST_REPORT.md
```

## 下一阶段

- 将 Native PDF Shading 合并进完整 Production PDF Serializer
- PDF Soft Mask / Luminance Mask
- 真正的 ICC RGB → CMYK Artwork Conversion Engine
- Multi-object Shared Transform Origin
- Alignment / Distribution Smart Guides
- Per-object Clip-path Editor
- Board Thickness / Bend Radius / Print Stretch Simulation
- Hosted Backend + Auth / SSO
- Server-side Immutable Audit / Approval Signatures
- Cloud Resumable Artifact / Object Storage
- Factory Compensation Profiles（仅使用已验证生产参数）
