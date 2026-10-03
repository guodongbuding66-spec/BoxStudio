# BoxStudio V0.23

BoxStudio 是浏览器内运行的纸盒结构设计、2D 刀版、唛头编辑、客户规则、Excel 批量订单、3D 折叠、印前检查、生产审批与生产文件导出原型。

当前主线：**参数化结构 + 唛头变量 + Customer / Packaging Rule + Master Template + Batch Worker + Recoverable Artifacts + Production Approval + Project Persistence + Granular Remote Merge + Folded Artwork Texture Proof + SVG Appearance + Cross-panel Artwork + Native SVG Gradient + Integrated Native PDF Gradient/Soft Mask + Object Z-order + Multi-select/Snap + Shared Transform + Graphical Clip Editing + Smart Spacing + Verified ICC DeviceLink Subset**。

## V0.23 新增

### 1. Native Gradient / Soft Mask 已进入完整 Production PDF

新增 `src/productionPdfV23.js`。

V0.23 新的 Production PDF 不再把 Native Gradient 只放在独立 Proof 文档里。当前单一 PDF serializer 同时包含：

- CUT / CREASE / PERF / GLUE
- Spot Separation / Overprint
- SKU / N.W. / G.W. / Package Meas / CRN / Contract No.
- Barcode + QR
- Shipping Icons
- Text / Notice / Shape / Line
- Technical Vector Text / User TTF Outline
- Panel-local SVG Outline
- Cross-panel SVG Outline Fragment
- PDF `/ShadingType 2` Linear Gradient
- PDF `/ShadingType 3` Radial Gradient
- Multi-stop Stitching Function
- Uniform Alpha `ExtGState`
- Varying Gradient Stop Alpha `/SMask`
- Editable Cross-panel Clip
- Object Z-order
- PDF/X-4 Candidate OutputIntent / XMP / TrimBox / BleedBox 路线

主导出：

```text
boxstudio-v0.23-production-native.pdf
```

V0.19 Tessellation Production PDF 仍保留为兼容回退。

### 2. 第一条可验证 ICC Artwork Conversion 路线

新增 `src/iccDeviceLinkV23.js`。

V0.23 不再把“加载了 CMYK OutputIntent”误写成“已经进行了 RGB→CMYK 转换”。真正转换只在加载并验证通过的 ICC DeviceLink 下启用。

当前支持范围严格限定为：

```text
Profile Class: link
Input: RGB
Output: CMYK
A2B0: LUT8 / mft1
Channels: 3 -> 4
```

实现包含：

- ICC Header / Tag Table 校验
- A2B0 查找
- LUT8 Input Tables
- 3×3 Matrix
- 3D CLUT Trilinear Interpolation
- Output Tables
- Native SVG Solid / Gradient RGB → CMYK
- PDF Native Shading `/DeviceCMYK`

普通 CMYK printer profile 仍然只是 OutputIntent，不会被静默当成转换引擎。

当前没有宣称支持 LUT16、mAB/mBA、任意 Source Profile + Output Profile CMM chaining、Black Point Compensation 或完整商业 CMM 行为。

### 3. 2D Canvas 可直接拖 Clip Points

新增：

- `src/clipEditorV23.js`
- `src/v23CanvasOverlay.js`

选中一个带 `crossClip` 的 Cross-panel Artwork 后，Design 画布会显示青色 Clip Handles。

支持：

- 直接拖动 Clip Point
- Document → Object Local 逆旋转
- 0..1 Normalized Coordinate 回写
- Rotated Artwork Clip 编辑
- Full Rect Clip 初始化
- 10% Inset Clip 初始化

Clip 继续同步进入：

```text
2D Artwork
→ Production Materialization
→ Native SVG
→ V0.23 Production PDF
→ Panel Artwork Atlas
→ Folded 3D Texture Proof
```

### 4. Drag-time Smart Spacing

新增 `src/smartSpacingV23.js`。

Cross-panel Artwork 拖动时现在可以识别：

- 左右等间距
- 上下等间距

接近配置容差时自动吸附，并显示橙色 Equal-gap Guide 和 mm 数值。

默认：

```text
Smart Spacing = true
Spacing Tolerance = 3 mm
```

原有 Panel Edge / Panel Center / Grid Snap 继续保留。按住 `Alt` 可以临时绕过 Snap。

### 5. V0.23 Workspace

新增：

- `src/v23Ui.js`
- `src/v23Ui.css`

提供：

- Export V0.23 Integrated Production PDF
- V0.22 Native Appearance Proof PDF
- Native Gradient SVG
- V0.19 Tessellation Fallback
- Native Axial / Radial / Soft-mask 统计
- 当前 Native Appearance PDF 色彩空间
- ICC DeviceLink 文件加载 / 校验
- Smart Spacing 设置
- Graphical Clip 初始化
- PDF/X / ICC 能力边界提示

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
- SVG Fill / Gradient / Clip / Mask Safe Subset
- Cross-panel Artwork
- Native SVG Gradient
- Object Z-order
- Native PDF Gradient / Soft Mask
- Shared Transform
- Align / Distribute
- Graphical Clip Points
- Live Smart Spacing

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

V0.23 单项目 Production PDF 已使用新 integrated native serializer；Batch Worker 仍使用现有批量生产 serializer，尚未切换到 V0.23 native PDF。

### Project / Collaboration Foundation

- Local Project Library
- Project Revision Envelope
- JSON Import / Export
- REST Adapter
- `If-Match` Revision Protection
- Three-way Remote Merge
- Object / Field-level Merge

当前仓库仍不包含真正托管的 BoxStudio Backend、Auth/SSO 或不可篡改服务器端 Audit。

## PDF/X 与 ICC 边界

### PDF/X

当前仍叫：

```text
PDF/X-4 Candidate
```

它不是 Acrobat Preflight、callas pdfToolbox 或印厂 RIP 的第三方认证结果。

### ICC

存在两条不同路径：

1. **CMYK OutputIntent**：用于 PDF/X Candidate 输出条件描述；
2. **RGB→CMYK DeviceLink LUT8**：用于 V0.23 Native SVG Appearance 的实际颜色数值转换。

两者不会混为一谈。

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
```

V0.23 Regression 覆盖：

- Integrated Production PDF 1.7
- Native Axial Shading
- Gradient Alpha Soft Mask
- Production Spot Separation
- 普通变量文字 + Native Appearance 同文档
- Synthetic ICC RGB→CMYK LUT8 DeviceLink
- Trilinear CLUT Conversion
- Invalid ICC Class Rejection
- DeviceCMYK Native Shading
- Rotated Clip Point Coordinate Round-trip
- Clip Drag Persistence
- Live Equal-gap Smart Spacing

详细报告：

```text
docs/V0.23_TEST_REPORT.md
```

## 数据存储

```text
boxstudio-mvp-v23
```

V0.22 及更早版本继续作为迁移来源。

附加存储保持：

```text
boxstudio-project-library-v1
boxstudio-remote-base-v1:<projectId>
IndexedDB: boxstudio-artifacts-v1
```

ICC DeviceLink 当前只保存在页面会话内，不写入 Project JSON / LocalStorage。

## V0.23 关键新增文件

```text
src/
  productionPdfV23.js
  iccDeviceLinkV23.js
  clipEditorV23.js
  smartSpacingV23.js
  v23CanvasOverlay.js
  v23Ui.js
  v23Ui.css

tests/
  v23.mjs

docs/
  V0.23_TEST_REPORT.md
```

## 当前边界 / 下一阶段

- 将 V0.23 Native Production PDF 接入 Batch Worker / Approval Export Gate
- 扩展 ICC LUT16 / mAB/mBA 与更完整 CMM 路线
- Clip Segment Insert / Delete / Bezier Handles
- 更完整 Illustrator-style Smart Guides
- Arbitrary SVG Luminance Mask / Pattern / Blend Mode
- Board Thickness / Bend Radius / Print Stretch Simulation
- Hosted Backend + Auth / SSO
- Server-side Immutable Audit / Approval Signatures
- Cloud Resumable Artifact / Object Storage
- Factory Compensation Profiles（仅使用已验证生产参数）
