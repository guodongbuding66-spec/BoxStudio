# BoxStudio V0.20

BoxStudio 是浏览器内运行的纸盒结构设计、2D 刀版、唛头编辑、客户规则、Excel 批量订单、3D 折叠、印前检查、生产审批与生产文件导出原型。

当前主线：**参数化结构 + 唛头变量 + Customer / Packaging Rule + Master Template + Batch Worker + Recoverable Artifacts + Production Approval + Project Persistence + Granular Remote Merge + Folded Artwork Texture Proof + SVG Appearance + Cross-panel Artwork + Native SVG Gradient + Object Z-order**。

## V0.20 新增

### 1. Native SVG Gradient Production Export

新增 `src/nativeSvgV20.js`。

V0.20 的 SVG 生产路径可以把当前安全 SVG Appearance 子集中的：

- Linear Gradient
- Radial Gradient
- Gradient Stops / Stop Opacity
- Solid Fill
- Basic ClipPath
- Basic Binary Geometric Mask
- Rotation / Non-uniform Scale

作为原生 SVG 定义写回生产 SVG，而不是把所有 Gradient 都细分成 V0.19 的大量 flat-color triangle。

对于 `cross-panel-artwork`，V0.20 使用 document-global artwork + carton panel union clip，因此同一个 gradient coordinate system 可以跨多个 Panel 保持连续。

这条 Native SVG 路线仍不等同完整 Illustrator Appearance：CSS selector cascade、filter、pattern、blend mode、raster image、复杂 luminance mask 和未支持的 curved filled path 仍不宣称完整支持。

### 2. Cross-panel Artwork 直接进入 Folded 3D Atlas

`src/panelArtwork.js` 已经接入 `cross-panel-artwork` materialization。

现在链路为：

```text
Cross-panel Artwork
→ Panel Intersection / Clipping
→ Panel-local Fill + Outline Fragments
→ Panel Artwork Atlas
→ Folded Artwork Texture Proof
```

新增 `crossPanelFragments` 统计。

Panel texture renderer 也已经支持 `production-polygon`，所以跨面 Fill Fragment 可以直接出现在折叠 3D texture 中，而不是只存在于 V0.19 PDF/SVG exporter。

### 3. 主 2D Canvas 直接编辑 Cross-panel Artwork

新增 `src/v20CanvasOverlay.js`。

Design 画布现在会为跨面对象显示：

- SVG Outline Preview
- Cross-panel Bounds
- Selected Highlight
- 直接拖动移动
- 右下角 Resize Handle
- Aspect Lock

位置和尺寸修改会写回当前 V0.20 项目状态。

### 4. Object Z-order

新增 `src/objectOrder.js`。

支持：

- Send to Back
- Backward
- Forward
- Bring to Front
- Normalize Z-order
- Stable ordering for legacy objects without explicit `zIndex`

Cross-panel fragment 会继承源对象的 `zIndex`，Panel Artwork Atlas 也会按对象顺序生成 Commands。

### 5. V0.20 Workspace

新增：

- `src/v20Ui.js`
- `src/v20Ui.css`

提供：

- `Export V0.20 Native Gradient SVG`
- 当前 Native Gradient / Fill Primitive 统计
- Cross-panel Object / 3D Atlas Fragment 统计
- Selected Object Z-order Controls
- V0.19 PDF Tessellation Fallback

V0.19 的独立 Production Workspace 在 V0.20 下隐藏，V0.18 Folded Proof 继续保留，并自动使用 V0.20 的 cross-panel-enabled Panel Artwork Atlas。

## 生产边界

### PDF Gradient

V0.20 **没有**把当前 PDF 输出错误标成 Native PDF Gradient。

PDF 继续使用已经回归测试过的 V0.19 Vector Triangle Tessellation 路线。Native PDF Axial / Radial Shading 仍属于下一阶段。

### ICC Color Conversion

当前 ICC 仍主要用于 OutputIntent / PDF-X Candidate 路线。

V0.20 不宣称已经把 imported RGB SVG artwork 通过真正的 ICC Device → PCS → Output CMYK color-management engine 转换。

### PDF/X

`PDF/X-4 Candidate` 仍不等同 Acrobat Preflight、callas pdfToolbox 或印厂 RIP 的第三方认证。

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
- V0.20 Native SVG Gradient
- V0.20 Z-order

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
- Create / Submit / Approve / Reject / Revise
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

然后打开：

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
```

V0.20 Regression 覆盖：

- Cross-panel Artwork → Panel Artwork Atlas
- Folded Panel Plan Cross Fragments
- Native Linear Gradient Definition
- Native Cross-panel Clip Markup
- V0.20 SVG Layer Injection
- Z-order Normalize / Send-to-Back
- Cross-panel Canvas Overlay Data

详细报告：

```text
docs/V0.20_TEST_REPORT.md
```

## 数据存储

```text
boxstudio-mvp-v20
```

V0.19 和更早版本继续作为迁移来源。

附加存储保持：

```text
boxstudio-project-library-v1
boxstudio-remote-base-v1:<projectId>
IndexedDB: boxstudio-artifacts-v1
```

## V0.20 关键新增文件

```text
src/
  nativeSvgV20.js
  objectOrder.js
  v20CanvasOverlay.js
  v20Ui.js
  v20Ui.css

tests/
  v20.mjs

docs/
  V0.20_TEST_REPORT.md
```

## 下一阶段

- Native PDF Axial / Radial Shading
- 真正的 ICC RGB → CMYK Artwork Conversion Engine
- PDF Transparency Group / Alpha / Luminance Mask
- Cross-panel Rotation Handle / Multi-select / Snap
- Primary Renderer 内建 Cross-panel Editing（替代 overlay）
- Per-object Clip-path Editor
- Board Thickness / Bend Radius / Print Stretch Simulation
- Hosted BoxStudio Backend + Auth / SSO
- Server-side Immutable Audit / Approval Signatures
- Cloud Resumable Artifact / Object Storage
- Factory Compensation Profiles（仅使用已验证生产参数）
