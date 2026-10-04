# BoxStudio 产品开发文档（当前主基准）

**版本**：2026-10-04 Reset Baseline  
**项目**：BoxStudio 纸盒设计与唛头编辑平台  
**状态**：当前唯一主开发基准  
**优先级原则**：先把纸盒设计软件本体做完整，再扩展企业后台、审批、SSO、ERP 等能力。

---

## 0. 文档定位与优先级

BoxStudio 的最初需求不是企业审批平台，也不是单纯的印前检查工具，而是一个浏览器内完成的：

> **参数化纸盒结构设计 + 2D 包装设计 + 3D 成盒预览 + 唛头编辑 + 印前检查 + 生产文件导出平台。**

核心参考方向：

- Pacdora：盒型模板、参数化尺寸、结构生成、3D 预览、在线设计、生产文件导出；
- Packform / `ds.mxder.com`：毫米级包装 CAD、结构节点编辑、直线/圆弧/Bezier、2D/3D 联动；
- BoxStudio 差异化：结构化唛头、变量绑定、条件规则、批量 Excel、生产规则与 Preflight。

从本版本起，开发优先级固定为：

1. **纸盒结构与参数化生成**；
2. **专业 2D 编辑器**；
3. **唛头编辑与变量规则**；
4. **2D/3D 联动**；
5. **刀版 CAD 编辑**；
6. **Preflight**；
7. **PDF / SVG / DXF / PNG / GLB 导出**；
8. **批量唛头、模板、项目版本**；
9. 最后才是 Backend / Auth / RBAC / Workflow / ERP / SSO。

任何后期企业功能都不能以牺牲 1–8 的完成度为代价。

---

# 1. 产品目标

BoxStudio 要解决的是：

> 从“我要设计一个纸箱”一直做到“生成可供印刷厂、刀模厂、打样设备使用的生产文件”，尽量避免在 CAD、Illustrator、Excel、PDF、二维码网站之间反复切换。

目标用户：

- 外贸业务员；
- 包装工程师；
- 工厂跟单；
- 包装采购；
- 平面设计师；
- 电商卖家；
- 印刷厂；
- 包装厂。

第一阶段不以“账号体系有多复杂”衡量成功，而以**纸盒设计是否真正可用、可生产、可重复验证**衡量成功。

---

# 2. 第一阶段成功标准

以下测试全部通过，才算完成纸盒设计软件核心，而不是网页 Demo：

| 测试 | 必须达到的结果 |
|---|---|
| 修改箱长 | 刀版正确重算 |
| 修改箱宽 / 箱高 | 面板、折线、糊口、插舌正确重算 |
| 修改纸厚 | 结构补偿正确 |
| 内尺寸 / 外尺寸 / 制造尺寸切换 | 结果明确且可验证 |
| 修改 SKU | 所有绑定位置同步变化 |
| Package Count 1 → 3 | 自动出现多包提示 |
| 修改 CRN | 所有绑定位置同步变化 |
| 修改条码值 | 条码自动重新生成 |
| 修改 QR | QR 自动重新生成 |
| Barcode + QR Group | 不允许拆散，整体等比例缩放 |
| 2D → 3D | 位置与方向一致 |
| Fold | 0–100% 折叠过程合理 |
| PDF | 实际物理尺寸 1:1 |
| SVG | 保留可编辑矢量 |
| DXF | CAD 能识别 CUT / CREASE / PERF Layer |
| 字体 | 生产文件不丢字体或明确转曲 |
| Preflight | 能发现缺字段、越界、二维码/条码问题 |
| Excel Batch | 多行数据可稳定生成多个包装稿 |

---

# 3. 主工作流

```text
创建项目
  ↓
选择盒型 / 导入刀版
  ↓
输入 L × W × H
  ↓
选择尺寸类型 / 材料 / 楞型 / 纸厚
  ↓
自动生成刀版
  ↓
进入 2D 编辑器
  ↓
设计 Artwork
  ↓
编辑 Shipping Marks
  ↓
绑定变量 / 条件规则
  ↓
生成 Barcode / QR
  ↓
2D ↔ 3D 检查
  ↓
Preflight
  ↓
导出 Production / Artwork / Dieline / 3D 文件
```

**一个 Project 内统一保存：**

```text
Project
├─ Structure
├─ Material
├─ Dieline
├─ Panels
├─ Artwork
├─ Marks
├─ Variables
├─ Rules
├─ 3D
├─ Preflight
├─ Versions
└─ Exports
```

---

# 4. 信息架构

主导航：

```text
Dashboard
Templates
Projects
Marks
Assets
Admin
```

打开 Project 后：

```text
Design
Structure
Marks
3D
Preflight
Export
```

前台导航保持克制，专业能力集中在 Editor。

---

# 5. 模板中心

## 5.1 模板中心能力

- 搜索盒型；
- 分类筛选；
- FEFCO / ECMA / Model ID 搜索；
- 3D 缩略图；
- 展示支持的参数；
- 快速新建项目；
- 收藏 / 最近使用；
- 自定义模板入口。

分类至少包含：

```text
全部
运输箱
飞机盒 / Mailer
插口盒
折叠盒
展示盒
天地盖
抽屉盒
套筒盒
瓦楞箱
邮寄盒
自定义
```

## 5.2 第一批模板

第一阶段目标不是几千个，而是 **5 个真正完成**：

1. US Side-Seal / RSC 类真实生产模板；
2. Mailer / Flip Top 150010；
3. FEFCO 0201 RSC；
4. FEFCO 0427 / Mailer 类；
5. Straight / Reverse Tuck End 之一。

第二阶段扩展到 20–30 个高频结构：

- 0203 / 0215 / 0216；
- 0426 / 0427；
- Auto Lock Bottom；
- Snap Lock Bottom；
- Crash Lock；
- Sleeve；
- Tray；
- Lid & Base；
- Drawer；
- Display Box。

每个模板必须有独立的：

- 参数 schema；
- geometry generator；
- panel graph；
- fold edges；
- default rules；
- test fixtures；
- export fixtures。

---

# 6. 参数化结构引擎

每个盒型必须定义：

```text
Template
+
Parameters
+
Geometry Generator
```

输入示例：

```text
L = 1200 mm
W = 600 mm
H = 200 mm
T = 6.5 mm
Flute = BC
Dimension Mode = Inner / Outer / Manufacturing
```

`generate(params)` 输出：

```text
Panels
Edges
Cut Paths
Crease Paths
Perf Paths
Glue Paths
Bleed
Safe Area
Fold Graph
Bounding Box
```

核心要求：

- 内部单位固定 `1 unit = 1 mm`；
- 结构不是静态 SVG；
- L/W/H/T 改变后必须重新生成；
- 所有输出应可用于 2D、3D、Preflight、PDF、SVG、DXF；
- 几何计算与 UI 解耦；
- 每个模板有确定性回归测试。

---

# 7. 尺寸与材料系统

## 7.1 尺寸类型

支持：

- 内尺寸；
- 外尺寸；
- 制造尺寸。

系统必须明确展示当前尺寸定义，不能笼统只写 Length / Width / Height。

## 7.2 材料数据库

至少支持：

```text
Corrugated
Kraft
Cardboard
Coated Paper
Greyboard
```

瓦楞：

```text
E / F / B / C / EB / BC / AA
```

材料对象至少包含：

```text
materialId
name
category
flute
ply
thicknessMm
insideAllowance
outsideAllowance
bendAllowance
3dAppearance
```

第一阶段先保证厚度补偿和 3D 边缘厚度一致；真实工厂经验补偿可后续作为 Factory Profile。

---

# 8. 专业 2D 编辑器

## 8.1 基础布局

```text
┌───────────────────────────────────────────────┐
│ File Edit View       2D | 3D | Split   Export │
├──────┬─────────────────────────────┬──────────┤
│TOOLS │         CANVAS              │PROPERTY  │
│      │                             │          │
├──────┴─────────────────────────────┴──────────┤
│ Zoom / Artboard / Panel / Preflight           │
└───────────────────────────────────────────────┘
```

## 8.2 工具栏

```text
Select
Text
Image
Shape
Line
Icon
Barcode
QR Code
Shipping Mark
Symbol
Variable
Table
Dieline
```

## 8.3 对象属性

```text
X      mm
Y      mm
W      mm
H      mm
R      °
```

对象必须支持：

- Move；
- Resize；
- Rotate；
- Multi-select；
- Align；
- Distribute；
- Duplicate；
- Copy / Paste；
- Group / Ungroup；
- Lock；
- Hide；
- Z-order；
- Snap；
- Undo / Redo。

## 8.4 图层

```text
Artwork
Marks
Dieline
  ├─ CUT
  ├─ CREASE
  ├─ PERF
  ├─ GLUE
  ├─ BLEED
  ├─ SAFE
  └─ PANEL
```

支持隐藏、锁定、重命名、排序、分组。

## 8.5 标尺 / 参考线 / 吸附

吸附目标：

- 面板中心；
- 面板边缘；
- 刀线；
- 折线；
- 安全区；
- 对象边缘；
- 对象中心；
- 网格；
- 用户参考线；
- 等距辅助线；
- 文本基线；
- 角度辅助线。

---

# 9. Panel / Fold Graph

刀版不能只存 Path，必须知道：

```text
Front
Back
Left
Right
Top
Bottom
Flap
Glue
```

Panel 至少包含：

```json
{
  "panelId": "front",
  "name": "Front",
  "polygon": [],
  "foldEdges": [],
  "neighbors": []
}
```

用途：

- 2D 面板聚焦；
- Artwork Panel Mapping；
- 3D 折叠；
- UV / Texture；
- Preflight 越界检查；
- 2D ↔ 3D 双向选中。

---

# 10. 刀版 CAD 编辑模式

必须支持：

```text
选择线
拖节点
增加节点
删除节点
直线
圆弧
Bezier
Cut ↔ Crease
Cut ↔ Perf
```

高级能力：

- 节点多选；
- Handle 编辑；
- 曲线连续性；
- Path 闭合；
- Panel boundary rebuild；
- 修改结构后重建 Fold Graph；
- 结构异常即时提示。

任何结构修改都要显示：

> Changing structure may affect 3D folding and production geometry.

---

# 11. 唛头编辑器 —— BoxStudio 核心差异化

唛头不是普通文本框集合，而是**结构化、可绑定、可校验、可批量替换的业务对象**。

## 11.1 核心字段

```text
SKU
N.W.
G.W.
Package Meas
CRN
Contract No.
Origin Country
Destination Country
Package Index
Package Count
Barcode
QR Code
```

## 11.2 变量绑定

文字对象支持：

```text
SKU: {{sku}}
N.W.: {{nw}} {{weightUnit}}
G.W.: {{gw}} {{weightUnit}}
Package Meas: {{length}} × {{width}} × {{height}} {{dimensionUnit}}
CRN: {{crn}}
```

修改一次变量后，所有绑定位置实时刷新。

## 11.3 条件规则

第一阶段必须支持：

```text
IF packageCount > 1
  SHOW packageNotice
ELSE
  HIDE packageNotice
```

后续通用 Rule Action：

```text
SHOW
HIDE
SET_VALUE
SET_TEXT
SET_STYLE
SET_LAYOUT
REQUIRE
DISABLE
```

## 11.4 唛头组件库

至少包括：

- SKU Block；
- Weight Block；
- Measurement Block；
- Origin Block；
- CRN Block；
- Contract Block；
- Package Notice；
- Barcode + QR Group；
- Handling Icons；
- Custom Mark Block。

## 11.5 US Side-Seal Master Mark Template

首个真实模板继续使用“美线侧封箱”规则作为系统验收基准，封装：

- SKU；
- Package Count / Index；
- N.W. / G.W.；
- L/W/H；
- CRN；
- Contract No.；
- Origin；
- Destination；
- Barcode；
- QR；
- Handling Marks；
- Printing / Font / Board 等生产规则。

---

# 12. Barcode + QR Group

条码与二维码不是两个普通图片。

组件必须：

- 整体移动；
- 整体缩放；
- 默认锁定比例；
- 禁止拆分；
- 可切换预设；
- 数据更新后重新生成；
- 导出保持矢量；
- Preflight 做数字可解码验证。

预设：

```text
Standard 250 × 80 mm
Compact  200 × 64 mm
```

支持：

- Code 39；
- Code 128 / GS1-128；
- EAN-13；
- UPC-A；
- ITF-14；
- QR Code；
- DataMatrix 后续。

当前 V0.31 已建立 final Production PDF 数字解码 gate 和 Preview/PDF geometry gate，这些能力保留并作为 Preflight 子系统继续使用。

---

# 13. 国际运输图标库

第一阶段至少：

```text
This Side Up
Fragile
Keep Dry
Handle With Care
Do Not Stack
Stacking Limit
Center of Gravity
Clamp Here
No Clamp
Recycle
Umbrella
Glass
```

要求：

- SVG 矢量；
- 可设置尺寸；
- 可进入模板；
- 可锁定；
- 可绑定规则；
- 生产导出保持矢量。

---

# 14. 3D 系统

3D 不是装饰，而是设计验收工具。

视图：

```text
2D
3D
2D + 3D
```

必须支持：

- Rotate；
- Zoom；
- Pan；
- Front / Back / Left / Right / Top / Bottom；
- Fold 0 / 25 / 50 / 75 / 100%；
- Fold Animation；
- Artwork Texture Mapping；
- Marks Texture Mapping；
- 面板方向检查；
- 2D 修改后实时更新；
- 2D ↔ 3D 双向选中。

材质：

```text
White Corrugated
Brown Kraft
White Cardboard
Coated Paper
Greyboard
```

纸厚要反映在 3D 边缘厚度中。

---

# 15. Preflight

Preflight 的目标不是“给建议”，而是**明确是否可生产**。

## 15.1 Structure

- Dieline closed；
- Broken path；
- Self-intersection；
- Fold topology；
- Panel graph；
- Glue flap validity；
- Curve / node anomalies。

## 15.2 Artwork

- Bleed；
- Safe area；
- Fold crossing；
- Dieline crossing；
- image DPI；
- clip / overflow；
- transparency policy。

## 15.3 Text

- missing font；
- minimum size；
- outline / embed policy；
- text overflow；
- production font validation。

## 15.4 Barcode / QR

- digital decode；
- quiet zone；
- minimum module size；
- code size；
- clipping；
- crossing cut/fold lines；
- rotation；
- value mismatch。

## 15.5 Marks

- required field missing；
- duplicated values mismatch；
- CRN sync；
- package notice rule；
- destination-specific required marks。

## 15.6 Production Geometry

保留 V0.31：

- final Production PDF readback；
- Preview/PDF key point compare；
- tolerance default `<= 0.2 mm`；
- unsupported production geometry fail-closed。

---

# 16. Excel / CSV 批量唛头

输入支持：

```text
Excel
CSV
JSON
```

核心流程：

```text
Upload
→ Sheet Select
→ Header Detection
→ Field Mapping
→ Import Review
→ Dry Run
→ Generate
→ Preflight per row
→ Export PDFs / ZIP / Report
```

第一阶段必须实现：

- SKU / NW / GW / Size / CRN 自动建议映射；
- 双语 Alias；
- leading zero 保留；
- multi-sheet；
- merged cells；
- partial failure；
- retry；
- failed rows report；
- source-cell lineage；
- 生成多 PDF 或多页 PDF。

后续增强：

- 表内修正；
- Re-upload Compare；
- Large workbook streaming；
- Customer Mapping Profile。

---

# 17. 导出中心

## 17.1 Production

```text
Production PDF
SVG
DXF
```

## 17.2 Artwork

```text
Artwork PDF
PNG
JPG
```

## 17.3 Dieline

```text
Dieline PDF
SVG
DXF
```

## 17.4 3D

```text
PNG
GLB
```

## 17.5 PDF 模式

- Preview PDF；
- Production PDF；
- Artwork Only；
- Dieline Only。

要求：

- Production PDF 1:1；
- Spot line names 保留；
- 文字 embed / outline policy 明确；
- Barcode / QR 矢量；
- PDF 与 Preview 关键点验收。

## 17.6 SVG

保留：

- Path；
- Text 或 Outline；
- Barcode；
- QR；
- Dieline；
- Groups / Layers 语义尽量保留。

## 17.7 DXF

独立 Layer：

```text
CUT
CREASE
PERF
```

必须在真实 CAD 软件中打开验证。

---

# 18. 项目保存、Undo / Redo 与版本

## 18.1 Undo / Redo

至少保留 100 steps。

统一 command history 要覆盖：

- object editing；
- variable editing；
- mark layout；
- dieline node editing；
- clip；
- panel edit；
- batch mapping；
- profile changes。

## 18.2 Auto Save

状态：

```text
Saving…
Saved 15:32
```

## 18.3 Version History

```text
V1 Initial
V2 Changed SKU
V3 Changed CRN
V4 Customer Approved
```

支持：

- Preview；
- Restore；
- Duplicate；
- Compare 后续。

---

# 19. UI / UX 原则

不复制 Pacdora 的视觉。

视觉方向：

- Figma；
- Illustrator；
- Linear；
- Framer；
- 工业设计软件。

关键词：

```text
极简
专业
精密
制造业
高信息密度
少渐变
少大圆角
清晰层级
```

编辑器：

```text
深色 UI + 浅色画布
```

动画只用于状态反馈：

- hover；
- panel transition；
- snap；
- selection；
- fold；
- export；
- preflight。

---

# 20. 技术原则

当前仓库继续以现有 ES Module 实现为基础推进，不为了文档强制重写框架。

但架构必须保持以下边界：

```text
Parametric Geometry Engine
SVG / Vector Document Model
Panel / Fold Graph
Variable & Mark Rules Engine
3D Renderer
Preflight Engine
Export Engine
Project Persistence
```

关键原则：

1. mm 是业务真实单位；
2. geometry 与 UI 解耦；
3. 一份结构同时驱动 2D / 3D / Export / Preflight；
4. Barcode / QR 必须从数据生成，不上传 JPG 代替；
5. SVG/PDF/DXF 生产路径不可依赖屏幕截图；
6. 所有关键生产能力必须有 regression fixtures；
7. 浏览器 E2E 必须在核心功能完成前补上。

未来如果迁移 React/TypeScript，也必须保证上述领域模型不被 UI 框架绑死。

---

# 21. 新版本路线

## V0.32 — Parametric Template Core

目标：重新把主线拉回纸盒结构。

必须完成：

- Template Center 基础；
- 5 个生产级参数化盒型；
- L/W/H/T；
- Inner / Outer / Manufacturing dimension；
- Material / Flute / Thickness；
- Geometry generator contract；
- Panel / Fold Graph fixture；
- 结构 regression。

## V0.33 — Professional 2D Editor

- 图层；
- 多选；
- align/distribute；
- group/ungroup；
- copy/paste；
- ruler/guides；
- snap；
- property inspector；
- 完整 undo/redo 核心链路。

## V0.34 — Marks Workspace

- Shipping Mark 模式；
- 组件库；
- variables；
- conditional rules；
- US Side-Seal Master；
- transportation icon library；
- CodeBlock UX。

## V0.35 — 2D / 3D Linked Packaging Preview

- Split View；
- Fold animation；
- materials；
- artwork/marks texture；
- 2D ↔ 3D selection；
- orientation tests。

## V0.36 — Dieline CAD

- node editing；
- line/arc/Bezier；
- convert CUT/CREASE/PERF；
- panel rebuild；
- topology validation。

## V0.37 — Full Preflight

- Structure；
- Artwork；
- Text；
- Barcode/QR；
- Marks；
- Production geometry；
- actionable issue navigation。

## V0.38 — Export Center

- PDF；
- SVG；
- DXF；
- PNG/JPG；
- GLB；
- real CAD verification；
- 1:1 physical-size regression。

## V0.39 — Batch / Master / Customer Templates

- Excel batch；
- Import Review inline correction；
- Customer templates；
- Master template；
- Batch export；
- template fixtures。

## V0.40 — Project Reliability

- autosave；
- version history；
- complete command history；
- browser E2E；
- recovery / migration；
- performance testing。

---

# 22. 后期延期能力

以下能力有价值，但在 V0.40 前**不得取代核心产品主线**：

- Production Bundle；
- SHA-256 / immutable bundle；
- Hosted Backend；
- Auth / RBAC；
- Reviewer Inbox；
- multi-step approval；
- SSO / SCIM；
- ERP / PIM / PLM；
- Supplier Portal；
- Print Vendor Portal；
- Dashboard / BI；
- Webhook；
- enterprise retention；
- server queue。

这些在核心纸盒设计产品达到第一阶段成功标准后再进入企业化路线。

---

# 23. 不允许的“伪完成”

以下情况不得标记功能完成：

- 有按钮但没有真实行为；
- 只有 happy path，没有负例；
- 只有 SVG 显示，没有生产导出；
- 只有 3D 模型，没有与 2D Artwork 联动；
- 只有静态模板，没有参数化重算；
- 只有文本框，没有变量绑定；
- 只有条码图形，没有 digital decode；
- DXF 文件能下载但 CAD 打不开；
- PDF 看起来正确但实际尺寸不是 1:1；
- UI 有 Undo 但不是完整 command history；
- Preflight 只给提示但无法定位问题对象；
- 写进文档但 CI / E2E 没有对应验收。

---

# 24. 文档优先级

从本版本开始：

1. `BOXSTUDIO_DEVELOPMENT_SPEC_CURRENT.md` —— 产品与开发主基准；
2. `UNFINISHED_BASELINE_AUDIT_CURRENT.md` —— 当前未完成审计；
3. `BASELINE_PROGRESS_V0.xx.md` —— 历史版本增量记录；
4. 旧 V1/V2/V3 文档 —— 原始需求与历史参考；
5. 若后续版本计划与本文件冲突，必须先更新本文件再开发。

---

# 25. 当前下一步

**立即进入 V0.32：Parametric Template Core。**

第一批工作不是 Production Bundle，也不是 Auth，而是：

```text
① Template Center
② 5 个参数化盒型
③ L/W/H/T + 尺寸模式
④ Material / Flute / Thickness
⑤ Panel / Fold Graph
⑥ Geometry Generator Contract
⑦ 结构回归测试
```

只有 V0.32 完成后，才进入 V0.33 专业 2D 编辑器补齐。
