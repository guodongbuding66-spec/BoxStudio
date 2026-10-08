# BoxStudio V0.68

免费纸盒设计与唛头编辑网站：选择盒型 → 配置毫米尺寸 / 材料 / 纸厚 → 2D 图文和唛头 → 3D 校样 → 印前检查 → 导出。

所有已实现的设计功能无需登录、试用期或付费墙。当前有 8 个参数化盒型，支持结构化唛头、多位置变量绑定、Excel / CSV 批量数据以及 PDF / SVG / DXF 输出。

V0.67 按 ui-skills、interface-design 与 better-ui 重排工作台。顶部可直接切换纸盒设计与独立唛头设计；独立唛头拥有毫米画布、模板、变量、拖动、图层、图片、撤销、项目及 PDF / SVG / PNG / JSON 导出。两种设计的结构、对象、数据和历史分别保留。项目保存在浏览器，可下载 JSON 备份；在线多人同步仍需单独部署验收。

V0.68 增加独立唛头多选与框选、6 向对齐、等间距分布、整体拖动与毫米微移、图层锁定、10 mm 网格吸附和 Ctrl+D 复制。图层锁定保护排版，运输数据仍同步更新；多选只占一条撤销记录，选取和边缘无效移动不会增加历史。

运行：`npm run dev`。测试：`node tests/full-entry.mjs`、`npm run test:v68`、`npm run test:v67`、`npm run test:v66`。数据库测试需要 `BOXSTUDIO_DATABASE_URL`。

本轮排版交互与测试范围见 [V0.68 唛头排版](docs/V0.68_MARK_LAYOUT.md)。前一轮参考核对、测试范围与未完成事项见 [V0.67 界面与独立唛头验收](docs/V0.67_UI_AND_INDEPENDENT_MARKS.md)。产品范围仍以 [当前开发主基准](docs/BOXSTUDIO_DEVELOPMENT_SPEC_CURRENT.md) 为准。

---

# V0.31 历史验收记录

BoxStudio 是浏览器内运行的包装纸盒结构、2D 刀版、唛头 Artwork、3D 折叠校样、Excel 批量生产、印前检查、生产审批与生产文件导出原型。

当前主线：**参数化结构 + Panel-aware Geometry + Rules / Master Templates + Cross-panel Artwork + Folded 3D Proof + Recoverable Web Worker Batch + Production Approval + ICC / Spot / Overprint + Resilient Excel Import + Production PDF Required Checks**。

## V0.31：Production Acceptance

V0.31 对照最初 V1/V2/V3 开发文档，关闭了两个长期 P0 数字稿检查缺口。

### 1. Barcode / QR Digital Decode Required Check

新增：

```text
src/digitalDecodeV31.js
src/digitalDecodeGateV31.js
```

流程不是只验证编码器输入，而是：

```text
Production PDF bytes
→ 解析实际 Barcode / QR 矢量矩形
→ 对码区进行内存栅格化
→ 独立解码
→ 与源数据比较
→ PASS / blocking ERROR
```

当前回归覆盖：

- Code 39
- EAN-13
- UPC-A
- ITF-14
- GS1-128 / Code128-B + FNC1 + checksum
- QR Version 1–4 / ECL L / byte mode

GS1-128 使用 canonical Code128 symbol table 做逐符号 raster-run pattern fitting，避免简单最小线宽量化造成的误判。

**边界：**这是生成 PDF 数字稿的 artifact check，不是实体印刷条码 ISO Grade，也不是硬件扫描枪验收。

### 2. Preview / PDF Geometry Acceptance

新增：

```text
src/geometryAcceptanceV31.js
```

系统会从当前 Preview 的 mm Geometry 建立关键点，再从生成后的 Production PDF 中重新解析坐标进行比较：

- MediaBox 物理尺寸
- Barcode/QR Group 等核心矩形
- Text / Notice anchor（非转曲模式）
- Artwork line
- CUT / CREASE / PERF / GLUE key lines

默认验收阈值：

```text
<= 0.2 mm
```

这对应最初 V3 PoC E 的 Preview/PDF Fidelity 目标。

### 3. Required Checks 进入生产链路

新增：

```text
src/preflightV31.js
```

required checks：

```text
DIGITAL_DECODE_V31
PREVIEW_PDF_GEOMETRY_V31
```

并已接入：

- Production Job create / revise preflight
- Production submit / approve blocking gate
- Batch preflight
- V0.31 Production Acceptance UI

### 4. V0.31 Workspace

新增：

```text
src/v31Ui.js
src/v31Ui.css
```

提供：

- Run Required Checks
- Digital Decode PASS / FAIL
- Geometry PASS / FAIL
- 最大几何误差显示
- Export Checked PDF
- Export Approved Checked PDF
- Approved export audit event

旧 V0.27 直接生产按钮在当前 V0.31 Workspace 下隐藏，当前可见生产路径要求先通过 V0.31 acceptance。

## V0.30 / V0.29 Excel & Batch

当前已经具备：

- `.xlsx` / `.csv` / `.tsv`
- Multi-sheet
- Header Detection
- 双语 Alias
- Mapping
- Persistent local Mapping Profiles
- merged-cell expansion
- controlled Fill Down
- TOTAL / SUBTOTAL / 合计 footer stop
- formula-without-cache diagnostics
- XLSX pure-zero `numFmt` leading-zero recovery subset
- Import Review
- source row / cell lineage
- Dry Run
- Web Worker Batch PDF
- Pause / Resume / Cancel / Retry
- Partial Failure
- `failed_rows.csv` / `failed_rows.xlsx`
- IndexedDB recoverable artifacts
- Recovered ZIP

## Structure / Dieline

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
- Single mm Geometry Source of Truth

## Marks / Artwork

- SKU / N.W. / G.W. / Package Meas / CRN / Contract No.
- Origin / Destination / multi-package notice
- Barcode + QR locked group
- Shipping Icons
- Variables / rules
- Safe SVG Import
- SVG Fill / Gradient / Clip subset
- Cross-panel Artwork
- Z-order
- Multi-select / Align / Distribute
- Shared transform
- Bezier Cross Clip
- Smart spacing / alignment / size / rotation guides
- Persistent user guides
- text baseline assist

## 3D / Proof

- hinge-pivot Fold 0–100%
- polygon UV
- panel texture atlas
- Cross-panel Fragment → Folded 3D Texture
- seam / bleed continuity diagnostics

3D 只用于 Review / Orientation Check；2D Geometry / Production PDF 才是生产源。

## Production PDF / Prepress

当前生产 serializer：

```text
v0.27-native-cubic-production
```

支持路线包括：

- Vector Barcode / QR
- Text / Notice / Icons
- user TTF glyf outline subset
- CUT / CREASE / PERF / GLUE
- Spot Separation
- Overprint
- Native axial / radial gradient
- varying-alpha Soft Mask
- Cross-panel clipping
- native cubic Bezier clip
- OutputIntent
- RGB→CMYK DeviceLink verified subset: `mft1/LUT8`, `mft2/LUT16`

PDF/X 当前仍严格称为：

```text
PDF/X-4 Candidate
```

未经过 Acrobat / callas / 印厂 RIP 第三方认证前，不称正式 PDF/X 合规。

## Approval / Persistence

已有：

- Production Job Draft / Submitted / Approved / Rejected
- revision
- stale-approval fingerprint gate
- local Viewer / Operator / Approver / Admin permissions
- approved export audit events
- Local Project Library
- Revision Envelope
- JSON import/export
- REST adapter foundation
- `If-Match` revision protection
- three-way merge foundation

当前仍是浏览器/本地协作基础，不等于 hosted Auth / RBAC / server immutable audit。

## 自动测试

GitHub Actions 当前执行：

```text
Syntax
Smoke
V0.10
...
V0.31
```

V0.31 已验证：

- 5 类 Barcode Production-PDF round trip
- QR Production-PDF round trip
- GS1-128 canonical pattern matching + checksum
- Preview/PDF key-point geometry acceptance `<=0.2 mm`
- stale PDF geometry failure
- required checks进入 preflight
- Production Job blocking integration
- storage migration / UI wiring

验证通过的 V0.31 run：

```text
37181531606
```

详细报告：

```text
docs/V0.31_TEST_REPORT.md
```

## 数据存储

当前主状态：

```text
boxstudio-mvp-v31
```

V0.30 及支持的更早版本继续作为 Migration Source。

## 对照最初开发文档的未完成清单

持续维护：

```text
docs/UNFINISHED_BASELINE_AUDIT_CURRENT.md
```

该文档明确区分：

- 已完成；
- 部分完成；
- 未实现；
- 必须依赖第三方 / 印厂 / 实体样品的 EXT 验收。

下一主线：

```text
V0.32  Production Bundle + SHA-256 + immutable snapshot schema
V0.33  Master Data + Content Library domain
V0.34  Hosted Backend + Auth/RBAC + Database
V0.35  Template Publish + Artwork Workflow + Server Audit
V0.36  Compare + Impact Analysis + Search + Dashboard
V0.37  External Preflight + advanced ICC/CMM
V0.38  ERP / API / Webhook / SSO enterprise adapters
```

并行质量轨：Browser Interaction E2E、当前美线真实样稿叠加验收、外部 PDF/X/RIP、实体 Barcode/QR 扫描、工厂纸板折弯/印刷补偿验证。

## 运行

```bash
python -m http.server 8080
```

打开：

```text
http://localhost:8080
```

不要直接使用 `file://`。
