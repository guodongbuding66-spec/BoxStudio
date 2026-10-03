# BoxStudio V0.26

BoxStudio 是浏览器内运行的纸盒结构设计、2D 刀版、唛头编辑、Cross-panel Artwork、3D 折叠校样、Excel 批量生产、印前检查、生产审批和生产文件导出原型。

当前主线：**参数化结构 + Customer / Packaging Rules + Master Template + Native SVG/PDF Appearance + Cross-panel Artwork + Folded 3D Texture Proof + Recoverable Web Worker Batch + Production Approval + Project Persistence + ICC DeviceLink + Bezier Clip Direct Selection + Smart Guides + Persistent User Guides + Native Cubic PDF Clip Proof**。

## V0.26 新增

### 1. Persistent User Guides

新增：

```text
src/smartGuidesV26.js
src/v26GuideOverlay.js
```

项目现在可以保存真正的用户辅助线：

```text
userGuides[]
```

支持：

- Vertical / Horizontal Guide
- 精确 mm 坐标
- 数值修改
- 删除
- Design Canvas 持久显示
- 未锁定辅助线直接拖动
- Cross-panel Artwork 手动吸附到最近 User Guide

User Guide 属于编辑辅助信息，不进入生产印刷稿。

### 2. Text Baseline Assist

V0.26 会根据当前 Text / Notice 对象、Panel 原点、Y 坐标、字号以及 BoxStudio 当前行距规则生成可重复的 Baseline Candidate。

可以：

- 在画布中显示淡紫色 Baseline
- 把选中 Cross-panel Artwork 的 Top / Middle / Bottom 吸附到附近 Baseline
- 单独配置 Baseline Tolerance

当前是 BoxStudio Layout Baseline，不宣称完整字体 Metrics / Typographic Baseline Engine。

### 3. Rotation Assist

新增角度候选：

```text
Angle Grid
Other Artwork Rotation
Other Artwork + 90°
Other Artwork + 180°
Other Artwork + 270°
```

如果 Grid Angle 与另一个对象角度距离完全相同，优先 Object-to-object Rotation Match。

V0.26 Workspace 提供确定性的 Rotation Snap Action；V0.25 原有实时对象对齐、Size Match 和 Equal-gap Guide 继续保留。

### 4. Bezier Clip Numeric Inspector

新增：

```text
src/clipPathV26.js
```

现在选中的 Clip Node 可以直接输入：

```text
Anchor X / Y
Incoming Handle X / Y
Outgoing Handle X / Y
Smooth / Corner
Outgoing Segment = Line / Curve
```

Line Segment 会清除当前节点 Out Handle 与下一节点 In Handle。

Straight → Curve 时，如果原来没有控制柄，会生成确定性的 1/3 Chord Cubic Handle Pair。

V0.25 已有的：

- Canvas Anchor Drag
- Tangent Drag
- De Casteljau Insert Node
- Delete Node
- Smooth / Corner

继续保留。

### 5. Native Cubic PDF Clip Proof

新增：

```text
src/nativeCubicPdfV26.js
```

对于 Bezier Cross-panel Clip，新的 Proof Serializer 会直接输出 PDF Path：

```text
m   move-to
l   line-to
c   cubic Bezier
h   close
W n clip
```

它同时保留：

- Native Axial Gradient
- Native Radial Gradient
- Multi-stop Functions
- Varying Alpha Soft Mask
- Panel / Primitive Clip
- RGB 或当前验证过的 DeviceLink CMYK Appearance

输出：

```text
*-v26-cubic-clip-proof.pdf
```

**边界：** V0.26 主 Production PDF 仍使用经过验证的 Flattened Bezier Clip Production Path。Native Cubic 目前是独立 Proof Serializer，还没有替换 Approved Production PDF 的 Clip Path。

### 6. V0.26 Production Wrapper

新增：

```text
src/productionPdfV26.js
```

继续继承：

- Approval Gate
- DeviceLink Binding
- Native Linear / Radial Gradient
- Gradient Soft Mask
- Spot Dieline / Overprint
- Barcode + QR
- User TTF / Technical Outline
- LUT8 / LUT16 RGB→CMYK DeviceLink
- Bezier Clip Production Flattening

Serializer：

```text
v0.26-native-production
```

### 7. V0.26 Workspace

新增：

```text
src/v26Ui.js
src/v26Ui.css
src/v26GuideOverlay.js
```

功能包括：

- Bezier Node Numeric Inspector
- Segment Line / Curve Switch
- Persistent User Guides
- Canvas Guide Drag
- Text Baseline Visibility / Snap
- Rotation Assist
- Native Cubic Clip Proof PDF
- LUT8 / LUT16 DeviceLink Loader
- RGB → CMYK Numerical Test
- V0.26 Production PDF
- Approved V0.26 Production PDF

V0.25 Workspace 在 V0.26 下自动隐藏；V0.24 Batch Workspace 继续保留，因为 Frozen Context / Web Worker / IndexedDB Artifact Pipeline 仍是批量生产主线。

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
- Text Baseline / Rotation Assist

### 3D / Proof

- Hinge-pivot Fold 0–100%
- Polygon UV
- Panel Artwork Texture Atlas
- Cross-panel Fragment → Folded 3D Texture
- Fold Seam UV Diagnostics
- Fold Bleed Continuity Diagnostics

Folded Proof 仍用于浏览器几何和印刷位置核对，不宣称校色显示器级 ICC Soft Proof。

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

### PDF/X

当前仍明确称为：

```text
PDF/X-4 Candidate
```

不是 Acrobat Preflight、callas pdfToolbox 或印厂 RIP 的第三方认证结果。

### ICC DeviceLink

已验证子集：

```text
RGB → CMYK A2B0 LUT8  / mft1
RGB → CMYK A2B0 LUT16 / mft2
```

普通 CMYK OutputIntent ICC 不会被误当成颜色转换引擎。

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

GitHub Actions 当前执行 Syntax、Smoke，并从：

```text
V0.10
...
V0.25
V0.26
```

全部顺序回归。

V0.26 Regression 覆盖：

- Numeric Bezier Anchor / Handle
- Line ↔ Curve Segment
- User Guide CRUD
- User Guide Snap
- Text Baseline Extraction / Snap
- Rotation Match Priority
- Native Cubic PDF `c` Operator
- PDF `W n` Clip
- Cubic Clip Diagnostics
- V0.26 Production PDF Bytes
- V0.26 Serializer Diagnostics

详细报告：

```text
docs/V0.26_TEST_REPORT.md
```

## 数据存储

主状态：

```text
boxstudio-mvp-v26
```

V0.25 以及之前支持的版本继续作为 Migration Source。

附加存储保持：

```text
boxstudio-project-library-v1
boxstudio-remote-base-v1:<projectId>
IndexedDB: boxstudio-artifacts-v1
```

## 当前边界 / 下一阶段

- 将 Native Cubic Clip 从 Proof 合并进完整 Production / Approved PDF
- 将 User Guide / Baseline / Rotation Assist 合并进完整 live drag gesture
- ICC mAB / mBA Verified Subset
- 更完整 Source ICC → Destination ICC CMM
- Text Baseline 使用实际字体 Metrics
- Hosted Backend + Auth / SSO
- Server-side Immutable Approval Audit
- Cryptographic Approval Signature
- Cloud Resumable Artifact Storage
- Factory Compensation Profiles（只使用已验证生产参数）
