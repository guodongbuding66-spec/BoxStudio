# BoxStudio V0.28

BoxStudio 是浏览器内运行的纸盒结构设计、2D 刀版、唛头编辑、Cross-panel Artwork、3D 折叠校样、Excel 批量生产、印前检查、生产审批和生产文件导出原型。

当前主线：**参数化结构 + Customer / Packaging Rules + Master Template + Native SVG/PDF Appearance + Cross-panel Artwork + Folded 3D Texture Proof + Recoverable Web Worker Batch + Production Approval + Project Persistence + ICC DeviceLink + Bezier Clip Direct Selection + Smart Guides + Persistent User Guides + Native Cubic Production PDF + Original-plan Gap Register**。

## V0.28 新增

### 1. Group Rotation Object-relative Live Assist

V0.27 的单对象旋转已经支持：

```text
Angle Grid
Other Artwork Rotation
Other Artwork + 90° / 180° / 270°
```

V0.28 把同一逻辑补到 **多对象 Shared Group Rotation**：

- 选中 2 个或以上 Cross-panel Artwork；
- 使用已有 shared rotate handle；
- 整组围绕 shared center 旋转；
- 可以吸附到未选中 Artwork 的角度；
- 可以吸附到该目标角度 +90° / +180° / +270°；
- object-relative target 与普通 angle grid 同距离时优先 object-relative；
- `Alt` 临时绕过当前 live assist；
- 最终提交仍走统一 `rotateCrossSelection()` domain transform。

新增：

```text
src/liveAssistV28.js
src/v28GroupRotationPatch.js
```

### 2. 与最初开发文档的“未完成清单”正式入库

新增持续 Gap Register：

```text
docs/UNFINISHED_BASELINE_AUDIT.md
```

这份文档不是重新写一个新 roadmap，而是对照项目最开始的：

```text
在线唛头网站_开发文档_V1.0.md
在线唛头网站_开发文档_V2.0_开源项目调研版.md
在线唛头网站_开发文档_V3.0_集百家之长终版.md
```

逐项把当前状态分成：

```text
✅ 已完成
🟡 部分完成
⬜ 未完成
🚫 初始明确非优先
```

重点重新核对：

- Phase 1 Production MVP；
- Phase 1.5 Excel & Batch；
- Phase 2 Template Designer；
- Phase 2.5 Workflow；
- Phase 3 Compare + Content；
- Phase 3.5 3D；
- Phase 4 Enterprise；
- PoC A–H；
- MVP Definition of Done；
- Production Bundle / Deterministic Rendering；
- Template Publication / Regression；
- Preflight / PDF / ICC / Barcode Quality Boundary。

以后不再因为“已经有一个按钮/函数/原型”就把完整业务闭环写成已完成。

### 3. V0.28 没有改变 Production Serializer

V0.28 是编辑器交互和开发基线审计版本，不改变生产 PDF bytes 的主路线。

当前正式 production serializer 仍为：

```text
v0.27-native-cubic-production
```

这样不会因为单纯升级 UI/version 就使旧的 Approved Production Fingerprint 无意义失效。

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

完整清单见：

```text
docs/UNFINISHED_BASELINE_AUDIT.md
```

当前最高优先级未完成项：

- Browser Interaction E2E；
- Production PDF rasterize → Barcode/QR Digital Decode Required Check；
- Preview/PDF `<= 0.2 mm` 独立几何验收；
- Current US Template 外部 RIP / K-only / PDF/X 验收；
-完整 Excel Import Engine：Header Detection / Fill Down / TOTAL / Cell lineage / failed_rows.xlsx；
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
```

V0.28 Regression 覆盖：

- Group object-relative rotation matching；
- external target remains unchanged；
- object-relative tie priority；
- +90° orthogonal group assist；
- live-assist bypass；
- V0.28 storage migration；
- V0.27 production serializer remains stable；
- V0.28 UI/patch load；
- unfinished baseline gap-register presence。

详细报告：

```text
docs/V0.28_TEST_REPORT.md
```

## 数据存储

主状态：

```text
boxstudio-mvp-v28
```

V0.27 以及之前支持的版本继续作为 Migration Source。

附加存储保持：

```text
boxstudio-project-library-v1
boxstudio-remote-base-v1:<projectId>
IndexedDB: boxstudio-artifacts-v1
```

## 下一阶段优先级

从 V0.29 起优先关闭原始开发文档的 P0/P1 差距，不继续无序增加边缘功能。推荐顺序：

```text
V0.29  Browser E2E + Digital Decode + PDF/Geometry Acceptance
V0.30  Excel Import Engine completion
V0.31  Production Bundle + SHA-256 + immutable snapshot schema
V0.32  Master Data + Content Library domain
V0.33  Hosted Backend + Auth/RBAC + DB
V0.34  Template Publish + Artwork Workflow + server audit
V0.35  Compare + Impact Analysis + Search/Dashboard
V0.36  External Preflight + advanced ICC/CMM
V0.37  ERP/API/Webhook/SSO enterprise adapters
```

这里的“完成”只以真实实现和测试证据为准。浏览器 E2E、第三方 PDF/X 认证、实体条码 ISO Grade、印厂验收在完成前都不会被描述为已完成。
