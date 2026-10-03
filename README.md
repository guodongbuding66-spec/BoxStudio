# BoxStudio V0.25

BoxStudio 是浏览器内运行的纸盒结构设计、2D 刀版、唛头编辑、Cross-panel Artwork、3D 折叠校样、Excel 批量生产、印前检查、生产审批和生产文件导出原型。

当前主线：**参数化结构 + Master Template + Customer / Packaging Rules + Native SVG/PDF Appearance + Cross-panel Artwork + Folded 3D Texture Proof + Recoverable Web Worker Batch + Production Approval + Project Persistence + ICC DeviceLink Color Conversion + Bezier Clip Direct Selection + Smart Guides**。

## V0.25 新增

### 1. Cross-panel Clip 升级为 Bezier Direct Selection

新增：

```text
src/clipPathV25.js
src/v25CanvasOverlay.js
```

Cross-panel Clip 现在支持：

- Bezier Anchor Node
- Incoming / Outgoing Tangent Handles
- Smooth / Corner Node
- 直接拖 Anchor
- 直接拖 Bezier Handle
- Alt 拖 Handle 打破镜像对称
- 点击橙色 Segment Diamond 插入节点
- Alt + Click Anchor 删除节点
- 最少 3 节点保护
- Rotated Artwork 坐标转换

插入节点不是简单加一个点，而是通过 **De Casteljau subdivision** 拆分原来的 Cubic Segment，保持原曲线形状。

生产输出时 Bezier Clip 会确定性 Flatten 为 Polygon，然后继续进入：

```text
Object Clip
→ Panel Intersection
→ Production Fill / Outline Fragments
→ Native Production PDF
→ Panel Artwork Atlas / Folded Proof
```

V0.25 没有把它描述成 Native PDF Cubic Clip；生产裁切阶段仍是矢量多边形近似。

### 2. Illustrator-style Object Smart Guides

新增：

```text
src/smartGuidesV25.js
```

移动 Cross-panel Artwork 时新增对象之间的：

```text
Left / Center / Right
Top / Middle / Bottom
```

互相吸附。

Resize 时增加：

- Match Width
- Match Height
- Aspect-lock size match

Guide 颜色：

```text
Magenta = Object Alignment / Size Match
Orange  = Equal Gap
Green   = Panel / Grid Snap
```

默认：

```text
objectGuides = true
objectGuideToleranceMm = 3
smartSpacing = true
spacingToleranceMm = 3
```

按住 `Alt` 可以临时绕过 Smart Snap。

### 3. ICC DeviceLink 增加 LUT16 / mft2

`src/iccDeviceLinkV23.js` 的公开 API 保持兼容，但 V0.25 已扩展支持：

```text
A2B0 LUT8  / mft1 / 8-bit
A2B0 LUT16 / mft2 / 16-bit
```

仍严格要求：

```text
Profile Class = link
Input          = RGB
Output         = CMYK
Channels       = 3 -> 4
```

LUT16 路线实际解析：

- s15Fixed16 3×3 Matrix
- Input Table Entry Count
- Output Table Entry Count
- 16-bit Input Tables
- 16-bit 3D CLUT
- 16-bit Output Tables
- Trilinear CLUT Interpolation

项目 DeviceLink Binding 现在同时保留：

```text
tagType
precision
gridPoints
inputTableEntries
outputTableEntries
fingerprint
```

普通 CMYK Printer Profile 仍然只是 OutputIntent，不会被静默当成 RGB→CMYK 转换器。

### 4. V0.25 Production Output

新增：

```text
src/productionPdfV25.js
```

V0.25 Production PDF 继续复用 V0.24 已验证的：

- Approval Gate
- DeviceLink Binding
- Native Axial / Radial Shading
- Gradient Soft Mask
- Spot Dielines / Overprint
- Barcode + QR
- Text Outline / TTF Outline
- Cross-panel Native Appearance

并通过共享模块获得：

- Bezier Clip Flattening
- LUT16 RGB→CMYK DeviceLink

Diagnostic Serializer：

```text
v0.25-native-production
```

单项目主导出：

```text
boxstudio-v0.25-production-native.pdf
```

Approved V0.25 Export 继续进入生产 Audit Event。

### 5. V0.25 Workspace

新增：

```text
src/v25Ui.js
src/v25Ui.css
```

包含：

- Bezier Clip Diagnostics
- Convert / Create Bezier Clip
- Make Smooth / Make Corner
- Delete Selected Node
- Object Smart Guide Settings
- Equal-gap Settings
- LUT8 / LUT16 DeviceLink Loader
- RGB → CMYK 数值测试
- V0.25 Production PDF
- Approved V0.25 Production PDF

V0.24 Native Batch Workspace 继续保留，因为其 Frozen Context / Web Worker / IndexedDB Artifact Pipeline 仍是当前批量生产主线。

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
- SVG Fill / Gradient / Clip / Mask Safe Subset
- Cross-panel Artwork
- Object Z-order
- Multi-select / Align / Distribute
- Shared Transform
- Bezier Cross Clip
- Smart Guides / Equal-gap Guides

### 3D / Proof

- Hinge-pivot Fold 0–100%
- Polygon UV
- Panel Artwork Texture Atlas
- Cross-panel Fragment → Folded 3D Texture
- Fold Seam UV Diagnostics
- Fold Bleed Continuity Diagnostics

Folded Proof 仍是浏览器几何和印刷位置核对，不宣称校色显示器级 ICC Soft Proof。

### Batch / Production

- `.xlsx` / `.csv` / `.tsv`
- Multi-sheet / Mapping
- Batch Preflight
- Pause / Resume / Cancel / Retry
- Frozen Batch Context
- Web Worker PDF
- IndexedDB Recoverable Artifacts
- Recovered ZIP
- User TTF / Output ICC / DeviceLink Worker Transfer
- Production Job / Revision / Approval / Reject
- Viewer / Operator / Approver / Admin
- Approved Production PDF Gate
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

PDF/X 当前仍明确叫：

```text
PDF/X-4 Candidate
```

不是 Acrobat Preflight、callas pdfToolbox 或印厂 RIP 的第三方认证结果。

ICC 当前区分：

1. **CMYK OutputIntent ICC**：描述 PDF/X Candidate 输出条件；
2. **RGB→CMYK DeviceLink**：真正执行 Native SVG Appearance 的颜色数值转换。

当前 DeviceLink 支持：

```text
RGB -> CMYK LUT8  / mft1
RGB -> CMYK LUT16 / mft2
```

当前仍未宣称支持：

- mAB / mBA
- 任意 Source ICC + Destination ICC 的完整 CMM Linking
- Black Point Compensation
- 任意 Rendering Intent Pipeline
- RIP Trapping
- Calibrated Monitor Soft Proof

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

GitHub Actions 当前执行 Syntax、Smoke，以及 V0.10 → V0.25 全部 Regression：

```bash
node --check src/*.js
node --check tests/*.mjs
node tests/smoke.mjs
node tests/v10.mjs
...
node tests/v24.mjs
node tests/v25.mjs
```

V0.25 新测试覆盖：

- Synthetic LUT16 / mft2 Parsing
- 16-bit CLUT Conversion
- DeviceLink Precision Binding
- Legacy Polygon → Bezier Clip
- Smooth / Mirrored Handles
- De Casteljau Node Insertion
- Node Deletion
- Bezier Production Materialization
- Object Alignment Snap
- Width / Height Match
- V0.25 Production PDF

详细报告：

```text
docs/V0.25_TEST_REPORT.md
```

## 数据存储

```text
boxstudio-mvp-v25
```

V0.24 及之前版本继续作为迁移来源。

附加存储保持：

```text
boxstudio-project-library-v1
boxstudio-remote-base-v1:<projectId>
IndexedDB: boxstudio-artifacts-v1
```

## 当前边界 / 下一阶段

- Browser Interaction E2E 仍未纳入 CI
- Bezier Clip Production 目前是确定性 Polygon Flattening
- ICC mAB/mBA / General CMM 尚未实现
- Smart Guides 还可以继续增加 Text Baseline、Rotation Axis、Persistent User Guides
- Server-side Immutable Audit / Auth / SSO 未实现
- PDF/X 仍是 Candidate
- Board Thickness / Bend Radius / Verified Print Stretch 仍属于后续生产物理模型阶段
