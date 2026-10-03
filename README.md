# BoxStudio V0.13

浏览器内运行的纸盒结构设计、2D 刀版、唛头编辑、批量订单、3D 折叠、印前检查、生产审批与生产文件导出原型。

当前主线：**参数化纸盒结构 + 唛头变量 + Customer / Packaging Rule + Master Template + Excel 批量生成 + Preflight + Production Approval**。

## V0.13 新增

### Large Batch Queue Pause / Resume

在 V0.12 Large Batch Queue 基础上新增：

- `pauseRequested`
- Pause
- Resume
- `paused / pausing` 状态
- 只在安全行边界暂停，不中断正在序列化的一张 PDF
- 同页面会话中保留已生成的 JSZip 数据并继续运行

> 页面刷新后不会伪装成二进制 PDF 仍然存在。刷新后应使用 Start / Restart 重新生成。

### Mark Layout Editor

新增 Panel-local mm 编辑画布：

- Panel 切换
- Safe Area 可视化
- 点击 / 拖动
- 1 mm Nudge
- Left / Center / Right / Top / Middle / Bottom 对齐
- ±90° 旋转
- Duplicate / Delete
- 所有提交后的坐标经过 Panel 边界约束

该画布编辑的是 BoxStudio 已支持的 mark 对象，不宣称是通用 Illustrator / 任意 SVG 编辑器。

### Production Job / Approval / Audit

新增本地生产快照：

- Create Snapshot
- Submit
- Approve
- Reject
- New Revision
- Audit trail
- Production fingerprint
- Approved Production PDF gate

Approved Production PDF 只有在以下条件同时成立时放行：

1. 当前 Production Job 已 Approved；
2. 审批快照没有 Preflight error；
3. 当前结构、变量、唛头、Profile、Export Options 的 fingerprint 与审批版本完全一致。

修改 SKU、结构、唛头、Profile 或导出设置后，旧审批自动失效，必须建立新 revision 并重新审批。

> 当前审批记录仍保存在浏览器项目中，不等同于账号认证、电子签名或法规合规审批系统。

## 现有核心能力

### 结构 / 刀版

- 参数化 Side-Seal / RSC 基础结构
- Mailer 150010 参考结构
- SVG / DXF / PDF / PDF-compatible AI 矢量刀版导入
- CUT / CREASE / PERF / GLUE 语义
- Bezier / Arc 原生控制点
- Polygon Panel
- Panel / Fold Graph
- CREASE → Fold Candidate 人工确认
- 基础拓扑修复、CUT crossing / Polygon self-intersection 检查
- Bleed / Safe Area

> 工厂压线补偿、刀模板补偿和设备公差必须来自已验证生产数据。BoxStudio 不自动编造这些参数。

### 唛头 / 条码

- SKU、N.W.、G.W.、Package Meas、CRN、Contract No.、Origin、Destination、Package No.
- 多包裹英文提示条件
- Code 39 / EAN-13 / UPC-A / ITF-14 / GS1-128
- QR Code
- Barcode + QR 锁定组合
- 250×80 mm / 200×64 mm 组合规格
- This Side Up / Fragile / Keep Dry
- Custom Mark Template
- Mark Asset Library

### Customer Profile / Packaging Rule

- 客户默认变量 / 锁定变量
- Origin / Destination / INCH / MM / LBS / KG
- Packaging Rule 绑定
- 默认 Mark Template
- 自定义必填字段
- 固定变量 `key=value`
- CRN 重复绑定数量
- Package index/count
- Multi-package notice
- Barcode+QR preset / ratio / aspect lock
- Packaging Rule revision history / restore

### Master Template V2

Master Template 保存结构、唛头元素和位置、Export Options、Customer / Packaging Rule / Mark Template IDs、Locked variables / groups、非订单变量默认值及自定义 Profile 快照。

支持 Rename、Duplicate、Save Revision、Version History、Restore、JSON Import / Export，并可在批量订单中先套 Master 再填 Excel 行变量。

### Excel / CSV Batch

- `.xlsx` / `.csv` / `.tsv`
- 多 Sheet
- 自动字段识别 + 手工映射
- Package `1/3` 解析
- 批量 SVG / PDF 基础输出
- Master Template 批量管线
- Batch-wide Preflight
- Combined PDF / PDF ZIP
- Large Batch Queue
- completed / failed / cancelled / pending 状态
- Preflight Error 行不会被伪装为成功
- Pause / Resume
- Cancel 在安全行边界停止，并输出真实已完成的 partial ZIP

### Workspace Bundle

可一次性迁移：

- Custom Customer Profiles
- Packaging Rules + revisions
- Mark Templates
- Mark Assets
- Master Templates
- 当前激活的 Profile IDs

当前仍是本地 JSON Bundle，不是云端账号同步。

### 3D

- Panel / Fold Graph
- Hinge-pivot 折叠逻辑
- Fold 0–100%
- Three.js 优先
- runtime 不可用时离线 Canvas fallback
- Three.js 路径可将 BoxStudio 支持的文字 / 图标 / Barcode+QR 对象绘制到矩形 Panel texture

当前不宣称任意复杂印刷稿、Polygon Panel 和离线 fallback 已达到完整包装贴图校样精度。

### Production Export

- SVG 1:1 mm
- PNG preview
- R12 ASCII DXF
- Production PDF
- Spot Separation：CUT / CREASE / PERF / GLUE
- Overprint
- Technical vector text
- 用户 TTF glyf 转曲
- 用户 CMYK ICC OutputIntent
- PDF/X-4 Candidate gate

`PDF/X-4 Candidate` 是受约束候选输出路径，不等于 Acrobat Preflight、callas pdfToolbox 或印厂 RIP 的第三方认证。

## Preflight

当前检查包括 Customer Profile、Packaging Rule Profile、Mark Template、必填/固定字段、Package index/count、Multi-package notice、CRN 重复绑定、Barcode+QR 组合与比例、Barcode/GS1、QR、Panel/Safe Area/Bleed、Fold Graph、导入刀版拓扑、CUT crossing / Polygon self-intersection、Spot / Overprint、文字转曲、ICC / PDF/X Candidate gate。

## 运行

```bash
python -m http.server 8080
```

然后打开：

```text
http://localhost:8080
```

不要直接使用 `file://`，浏览器会限制 ES Module。

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
```

V0.13 回归覆盖 Batch Pause/Resume、Mark Layout 边界/对齐/复制删除、Production Snapshot、Submit/Approve/Reject、fingerprint 失效、新 revision 与 audit。

## 数据存储

当前 browser storage key：

```text
boxstudio-mvp-v13
```

V0.12 及更早 key 继续作为迁移来源。目前仍没有账号数据库 / 云端项目同步。

## 关键目录

```text
src/
  app.js
  geometry.js
  foldgraph.js
  importDieline.js
  pdfAiImport.js
  repair.js
  barcode.js
  qrcode.js
  batch.js
  batchTemplates.js
  jobQueue.js
  rules.js
  customerProfiles.js
  markTemplates.js
  markAssets.js
  markLayout.js
  masterTemplates.js
  productionJobs.js
  profileBundles.js
  profileUi.js
  v11BatchUi.js
  v12Ui.js
  v13Ui.js
  preflight.js
  export.js
  threePreview.js
  ...

tests/
  smoke.mjs
  v10.mjs
  v11.mjs
  v12.mjs
  v13.mjs

docs/
  V0.10_TEST_REPORT.md
  V0.11_TEST_REPORT.md
  V0.12_TEST_REPORT.md
  V0.13_TEST_REPORT.md
```

## 参考源边界

项目最初使用用户提供的“美线侧封箱印刷模板”作为真实业务规则参考。能够从源文件确认的字段、条码二维码组合要求、多包裹文字规则等可以进入规则层；源文件没有提供完整结构尺寸或纸箱厂补偿表的部分，不作为 PDF 原始规格伪造。

## 下一阶段

- authenticated backend project persistence
- approval roles / permissions / server-side audit
- batch queue resumable binary artifacts
- general SVG mark symbol import/editor
- 更完整的 3D print-artwork texture mapping
- factory compensation profiles（只接受已验证生产参数）
