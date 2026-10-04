# BoxStudio V0.30

BoxStudio 是浏览器内运行的纸盒结构设计、2D 刀版、唛头编辑、Cross-panel Artwork、3D 折叠校样、Excel 批量生产、印前检查、生产审批和生产文件导出原型。

当前主线：**参数化结构 + Customer / Packaging Rules + Master Template + Native SVG/PDF Appearance + Cross-panel Artwork + Folded 3D Texture Proof + Recoverable Web Worker Batch + Production Approval + Project Persistence + ICC DeviceLink + Bezier Clip Direct Selection + Smart Guides + Original-plan Gap Register + Resilient Excel Import**。

## V0.30 新增

### Persistent Mapping Profiles

新增 `src/mappingProfilesV30.js`。当前可保存 Header → Canonical Field 映射，并按标准化 Header Signature 识别相同文件格式。再次导入完全相同的 Header 集合时可自动套用一次；用户随后仍可手工修改，不会被持续强制覆盖。

当前 Mapping Profile 是浏览器本地状态，不等同于 Customer/Supplier 级服务端配置。

### XLSX Leading-zero Protection

新增 `src/batchImportV30.js`，并接入 `src/batch.js`。导入 XLSX 时读取 `xl/styles.xml` 的 custom `numFmt` 与 `cellXfs`。对明确的纯零格式，例如：

```text
000000000000
```

如果缓存值是 `123`，可恢复为 `000000000123`，并记录 Cell / From / To / Format Code。

当前只处理可确定的 zero-mask subset，不猜测 General、日期、科学计数法或复杂格式的业务语义。

### Import Review Table

新增 `src/importReviewV30.js` 与 `src/v30Ui.js`：

- All / Passed / Failed Filter；
- SKU / Source Row / Error / Cell Search；
- Source Row / SKU / Status Sort；
- Source Row、SKU、Issue、Cell Hint；
- Open Row 并把该行数据重新装入当前变量；
- Cell Hint 只在错误能映射到一个 Canonical Field 时显示。

### `failed_rows.xlsx`

新增 `src/failedRowsXlsxV30.js`，直接生成 OpenXML `.xlsx`。失败行工作簿包含：

- Source Row；
- SKU；
- Error Codes；
- Errors；
- Cell Hints；
- 原始导入列。

V0.29 的 `failed_rows.csv` 与 Import Diagnostics JSON 继续保留。

### 基线差距文档

历史首轮总审计：

```text
docs/UNFINISHED_BASELINE_AUDIT.md
```

V0.29 / V0.30 增量：

```text
docs/BASELINE_PROGRESS_V0.29.md
docs/BASELINE_PROGRESS_V0.30.md
```

当前继续开发使用的最新版未完成清单：

```text
docs/UNFINISHED_BASELINE_AUDIT_CURRENT.md
```

它直接对照最初的：

```text
在线唛头网站_开发文档_V1.0.md
在线唛头网站_开发文档_V2.0_开源项目调研版.md
在线唛头网站_开发文档_V3.0_集百家之长终版.md
```

并持续区分 `✅ / 🟡 / ⬜ / EXT`，不会因为已经存在按钮、基础函数或本地模拟流程就把完整生产闭环写成完成。

## V0.29 Resilient Import 基线

V0.29 已加入：

- Header Detection，不再要求 Header 位于第 1 行；
- 英文 / 中文常用字段 Alias；
- XLSX merged-cell expansion；
- 受控业务字段 Fill Down；
- TOTAL / SUBTOTAL / GRAND TOTAL / 合计 / 总计 / 小计 / 汇总 Footer Stop；
- Formula cell 无 cached value 时的 Cell Reference 诊断；
- `__row`；
- Header → Cell 的 `__lineage`；
- Canonical Field → Cell 的 `__canonicalLineage`；
- Import diagnostics；
- `failed_rows.csv`。

## V0.28 编辑器基线

V0.28 为多对象 Shared Group Rotation 增加 object-relative live assist：目标对象角度、目标 +90° / +180° / +270°，并保留 `Alt` 临时绕过。

## V0.27 Production 基线

当前正式 Production PDF serializer 仍是：

```text
v0.27-native-cubic-production
```

V0.27 把 Native Cubic Bezier Clip 接入完整 Production PDF，并继续保留：

- CUT / CREASE / PERF / GLUE；
- Spot Separation / Overprint；
- Barcode + QR；
- Text / Notice / Shipping Icons；
- Technical / User TTF Outline；
- Native axial/radial gradient；
- multi-stop gradient；
- varying-alpha soft mask；
- Panel / Primitive Clip；
- DeviceRGB 或已验证 DeviceLink DeviceCMYK；
- PDF/X-4 Candidate OutputIntent / XMP 路线。

V0.28–V0.30 都没有静默修改 Production serializer。

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
- Smart Guides / Equal-gap / User Guide / Text Baseline；
- single-object + group object-relative Rotation Assist；
- Native Cubic Appearance Clip in Production PDF。

### 3D / Proof

- Hinge-pivot Fold 0–100%；
- Polygon UV；
- Panel Artwork Texture Atlas；
- Cross-panel Fragment → Folded 3D Texture；
- Fold Seam UV Diagnostics；
- Fold Bleed Continuity Diagnostics。

3D 只用于几何、面向和 Artwork 位置校样，不是 Production Source，也不宣称校色显示器级 ICC Soft Proof。

### Excel / Batch

- `.xlsx` / `.csv` / `.tsv`；
- Multi-sheet；
- Header Detection；
- bilingual Alias；
- merged-cell expansion；
- controlled Fill Down；
- Footer Stop；
- Formula cache diagnostics；
- leading-zero zero-mask restoration；
- source row / cell lineage；
- persistent local Mapping Profile；
- Import Review Filter / Search / Sort / Open Row；
- `failed_rows.csv` / `failed_rows.xlsx` / diagnostics JSON；
- Batch Preflight；
- Pause / Resume / Cancel / Retry；
- Frozen Batch Context；
- Web Worker Production PDF；
- IndexedDB Recoverable Artifacts；
- Recovered ZIP；
- TTF / Output ICC / DeviceLink Worker Transfer。

### Approval / Collaboration Foundation

- Production Job / Revision / Submit / Approve / Reject；
- local Viewer / Operator / Approver / Admin role model；
- stale approval fingerprint；
- Approved Production PDF Gate；
- Export Audit Event；
- Local Project Library；
- Revision Envelope；
- JSON Import / Export；
- REST Adapter foundation；
- `If-Match` revision protection；
- Three-way remote merge；
- Object / Field-level merge。

这些仍是 collaboration foundation，不等同于 Hosted Backend / Auth / Server Audit 已完成。

## 当前未完成的最高优先级

完整清单：`docs/UNFINISHED_BASELINE_AUDIT_CURRENT.md`。

当前 P0/P1 主要剩余：

- Production PDF rasterize → Barcode/QR Digital Decode Required Check；
- Preview/PDF 关键点 `<= 0.2 mm` 独立几何验收；
- Current US Template 真实原稿对比与外部 RIP / K-only / PDF/X 验收；
- Browser Interaction E2E；
- Production Bundle + cryptographic SHA-256 + immutable snapshot；
- Hosted Backend + Auth/RBAC + Server DB；
- Factory / Country / Customer / Product Master Data；
- Content Library；
- Template Publish Pipeline；
- immutable Artwork/Template Revision + append-only server Audit；
- Blocking Comment / Two-step Approval / Scheduled Publish / Notification / External Proof Link；
- Search / Revision Compare / Impact Analysis / Dashboard；
- ICC mAB/mBA / General Source→Destination CMM；
- ERP/PIM/PLM/API/Webhook/SSO/SCIM；
- S3/R2 server artifact storage + server queue；
- board thickness / bend radius / factory-verified print stretch compensation。

## PDF/X 与 ICC 边界

当前仍明确称：

```text
PDF/X-4 Candidate
```

不是 Acrobat Preflight、callas pdfToolbox 或印厂 RIP 的第三方认证结果。

当前验证过的 DeviceLink subset：

```text
RGB → CMYK A2B0 LUT8  / mft1
RGB → CMYK A2B0 LUT16 / mft2
```

尚未宣称 mAB / mBA、任意 Source ICC → Destination ICC CMM、Rendering Intent Pipeline、Black Point Compensation 或 Proof Device Simulation。

## 运行

```bash
python -m http.server 8080
```

打开 `http://localhost:8080`。不要直接使用 `file://`。

## 自动测试

CI 配置当前包含：

```text
Syntax
Smoke
V0.10
...
V0.28
V0.29
V0.30
```

V0.30 Regression 覆盖：

- zero-mask detection / leading-zero restoration；
- XLSX custom numFmt / cellXfs；
- Mapping Profile save / resolve / apply / exact-header auto-apply；
- mismatch blocking；
- preflight field inference + source-cell hint；
- Import Review filter/search；
- `failed_rows.xlsx` OpenXML parts；
- V0.30 storage migration；
- V0.29 migration source retention；
- V0.30 UI wiring；
- Production serializer stability。

详细报告：`docs/V0.30_TEST_REPORT.md`。

## 数据存储

主状态：

```text
boxstudio-mvp-v30
```

V0.29 以及之前支持的版本继续作为 Migration Source。

附加存储：

```text
boxstudio-project-library-v1
boxstudio-remote-base-v1:<projectId>
IndexedDB: boxstudio-artifacts-v1
```

## 下一阶段

继续按最初 V1/V2/V3 文档收敛：

```text
V0.31  Digital Barcode/QR Decode + Preview/PDF Geometry Acceptance
V0.32  Production Bundle + SHA-256 + immutable snapshot schema
V0.33  Master Data + Content Library domain
V0.34  Hosted Backend + Auth/RBAC + Database
V0.35  Template Publish + Artwork Workflow + Server Audit
V0.36  Compare + Impact Analysis + Search + Dashboard
V0.37  External Preflight + advanced ICC/CMM
V0.38  ERP / API / Webhook / SSO enterprise adapters
```

浏览器 E2E、第三方 PDF/X 认证、实体条码 ISO Grade、印厂验收在实际完成前都不会被描述为已完成。
