# BoxStudio V0.11

浏览器内运行的纸盒结构设计、2D 刀版、唛头编辑、批量订单、3D 折叠、印前检查与生产文件导出原型。

当前主线目标是把 **参数化纸盒结构 + 唛头变量 + 客户规则 + Master Template + Excel 批量生成 + Preflight** 做成一套可复用的包装生产工作流。

## 当前能力

### 结构 / 刀版

- 参数化 Side-Seal / RSC 基础结构
- Mailer 150010 参考结构
- SVG / DXF / PDF / PDF-compatible AI 矢量刀版导入
- CUT / CREASE / PERF / GLUE 语义
- Bezier / Arc 原生控制点
- Polygon Panel
- Panel / Fold Graph
- CREASE → Fold Candidate 人工确认
- 基础拓扑修复、交叉线和自交检查
- Bleed / Safe Area

> 工厂压线补偿、刀模板补偿和设备公差必须来自已验证生产数据。BoxStudio 不自动编造这些参数。

### 唛头 / 条码

- 变量文本：SKU、N.W.、G.W.、Package Meas、CRN、Contract No.、Origin、Destination、Package No.
- 多包裹英文提示条件
- Code 39 / EAN-13 / UPC-A / ITF-14 / GS1-128
- QR Code
- Barcode + QR 锁定组合
- 250×80 mm / 200×64 mm 组合规格
- This Side Up / Fragile / Keep Dry 等运输标识

### Customer Profile / Packaging Rule

V0.11 增加可编辑生产 Profile：

- 客户默认变量
- 客户锁定变量
- 客户关联 Packaging Rule
- 客户首选 Mark Template
- 自定义必填字段
- 固定变量 `key=value`
- CRN 重复绑定数量
- Package index/count 规则
- Multi-package notice 规则
- Barcode+QR preset / ratio / aspect-lock 规则

### Mark Template

- 内置 US Side-Seal Master / Compact Marks
- 将当前唛头层保存为自定义 Mark Template
- 保存元素位置、尺寸、变量绑定、运输图标和 Barcode+QR 设置
- 自定义模板可重新应用到项目

### Master Template V2

Master Template 保存：

- 结构
- 唛头元素和位置
- Export Options
- Customer Profile ID
- Packaging Rule ID
- Mark Template ID
- Locked variables / groups
- 非订单变量默认值
- 自定义 Profile 快照

V0.11 支持：

- Rename
- Duplicate
- Save Revision
- Version History
- Restore older revision as a new revision
- JSON Import / Export
- 应用 Master 时保留当前 SKU / 重量 / CRN / Package No. 等实时订单数据

### Excel / CSV Batch

- `.xlsx` / `.csv` / `.tsv`
- 多 Sheet
- 自动字段识别
- 手工字段映射
- Package `1/3` 解析
- 批量 SVG / PDF 基础输出
- Master Template 批量管线
- Batch-wide Preflight
- Master Combined PDF
- Master PDF ZIP

批量 Master 的执行顺序：

1. Clone project state
2. Apply selected Master Template
3. Restore embedded custom profiles
4. Map Excel/CSV row to variables
5. Normalize variables
6. Run Preflight / Export

### 3D

- Panel / Fold Graph
- Hinge-pivot 折叠逻辑
- Fold 0–100%
- Three.js 优先
- CDN 不可用时离线 Canvas fallback

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

`PDF/X-4 Candidate` 是受约束的候选输出路径，不等于 Acrobat Preflight、callas pdfToolbox 或印厂 RIP 的第三方合规认证。

## Preflight

当前会检查：

- Customer Profile
- Packaging Rule Profile
- Mark Template
- 必填字段
- 固定字段
- Package index/count
- Multi-package notice
- CRN 重复变量绑定
- Barcode + QR 组合、比例、preset、aspect lock
- Barcode / GS1 语义
- QR 编码
- 对象是否超出 Panel
- Safe Area
- Bleed
- Fold Graph
- 导入刀版拓扑
- CUT crossing / Polygon self-intersection
- Spot / Overprint
- 文字转曲
- ICC / PDF/X Candidate gate

## 运行

项目是无构建依赖的浏览器 ES Module 应用。

```bash
python -m http.server 8080
```

然后打开：

```text
http://localhost:8080
```

不要直接使用 `file://` 打开，因为浏览器会限制 ES Module。

## 自动测试

GitHub Actions 当前执行：

```bash
node --check src/*.js
node --check tests/*.mjs
node tests/smoke.mjs
node tests/v10.mjs
node tests/v11.mjs
```

V0.11 回归覆盖包括 Master revision、Custom Packaging Rule、Custom Customer Profile、Custom Mark Template、portable Master embedded profiles 和 Batch Master pipeline。

## 数据存储

当前仍以浏览器 `localStorage` 为主：

```text
boxstudio-mvp-v11
```

V0.10 及更早 storage key 会作为迁移来源读取。

目前没有账号数据库 / 云端项目同步；这是后续版本的独立工作。

## 目录

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
  rules.js
  customerProfiles.js
  markTemplates.js
  masterTemplates.js
  profileUi.js
  v11BatchUi.js
  preflight.js
  export.js
  threePreview.js
  ...

tests/
  smoke.mjs
  v10.mjs
  v11.mjs

docs/
  V0.10_TEST_REPORT.md
  V0.11_TEST_REPORT.md
```

## 参考源边界

项目最初使用用户提供的“美线侧封箱印刷模板”作为真实业务规则参考。能够从源文件确认的字段、条码二维码组合要求、多包裹文字规则等可以进入规则层；源文件没有提供完整结构尺寸或纸箱厂补偿表的部分，不作为 PDF 原始规格伪造。

## 下一阶段

计划继续推进：

- 大批量 Job Queue / progress / cancel
- Profile / Master Template 云端持久化
- 更完整的 Mark Library Editor
- 客户模板导入导出包
- 工厂规则版本管理
- 结构补偿 Profile（仅使用已验证参数）
- 更完整的 3D 材质 / 印刷贴图预览
