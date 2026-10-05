# BoxStudio V0.40

BoxStudio 是一个**所有人免费使用、无需登录、无需审核**的浏览器纸盒设计与生产文件工具。

核心目标：

> 从选择盒型、输入尺寸开始，在一个项目内完成参数化结构、2D 包装设计、唛头编辑、刀版 CAD、3D 成盒检查、Preflight 与生产文件导出。

产品参考方向：

- **Pacdora**：模板驱动、低门槛尺寸/材料/纸厚设置、即时 3D、生产格式导出；
- **Packform / ds.mxder.com**：毫米级画布、结构节点、直线/圆弧/Bézier、可编辑刀版、2D↔3D；
- **BoxStudio 差异化**：Shipping Mark / 唛头工作区、变量规则、条码/QR、批量数据、专业 Preflight 与统一生产几何链。

BoxStudio 借鉴成熟产品的工作流和交互原则，不复制第三方品牌、文案、图标或受版权保护的视觉资产。

---

## 免费使用原则

V0.40 起，默认产品路径固定为：

- ¥0 / 免费；
- 不要求注册或登录；
- 不需要 Approver；
- 不需要 Production Approval；
- 不需要订阅；
- Templates、2D、Marks、Dieline CAD、3D、Preflight、PDF/SVG/DXF 与 Production PDF 均直接可用；
- **生产导出的硬门只有客观的结构/印前检查错误。**

V0.36/V0.37 的 Hosted Auth/RBAC/Approval/PostgreSQL 代码继续保留，作为未来可选团队协作基础，但**不进入普通用户默认工作流**。

---

## 主工作流

```text
1 选择盒型
      ↓
2 尺寸 / 材料 / 纸厚
      ↓
3 平面设计
      ↓
Shipping Marks / Barcode / QR
      ↓
Dieline CAD
      ↓
4 3D 检查
      ↓
5 Preflight
      ↓
6 导出
```

用户可以走简单流程，也可以随时进入专业 CAD/Prepress 层。

---

## Template Center

当前具备 5 个真实参数化结构核心：

- Side-Seal / FEFCO 0201 RSC
- Mailer / Flip-top 150010
- FEFCO 0427
- Reverse Tuck End
- Auto-lock Bottom

支持：

- 搜索 / 分类；
- FEFCO / Model ID；
- 刀版缩略预览；
- L / W / H；
- Internal / External / Manufacturing Dimension；
- Material / Flute / Thickness；
- 结构参数变化后重新计算真实几何。

0427 / RTE / Auto-lock 已形成工程几何核心，但在真实 CAD 叠图、纸板补偿与工厂样箱验证完成前，不标记为 factory tooling certified。

---

## Professional 2D Editor

当前能力包括：

- 毫米坐标；
- 多选；
- Group / Ungroup；
- Copy / Paste / Duplicate；
- Front / Back / Forward / Backward；
- Align / Distribute；
- X / Y / W / H / Rotation / Panel；
- 直接拖动 / Resize / Rotate；
- Layers / Hide / Lock；
- Panel Focus / Fit All；
- Undo / Redo；
- Table；
- SVG Vector Image；
- Artwork / Marks / Dieline 分层。

---

## Shipping Marks Studio

唛头是 BoxStudio 的核心功能，不是普通文本框。

组件包括：

- SKU
- N.W. / G.W.
- Package Dimensions
- Origin / Destination
- CRN
- Contract No.
- Package X / Total Packages
- Barcode
- QR Code
- This Side Up / Fragile / Keep Dry
- Custom Symbol

支持：

- `{{variable}}` 数据绑定；
- Variable Picker；
- Missing Variable；
- Reusable Blocks；
- Customer Preset；
- SHOW / HIDE 条件规则；
- Package Count / Country / Customer / 任意变量条件；
- 规则可见性进入真实 Production Artwork Plan。

---

## 2D ↔ 3D

- 2D Panel → 3D 高亮；
- 3D 点击 → 2D Panel Focus；
- 2D artwork 修改后刷新 3D proof；
- Fold 0–100%；
- Fold direction / dependency diagnostics；
- Material / Flute / Thickness preview；
- Canvas hit-test 已处理 CSS 缩放坐标映射。

3D 用于结构、方向和外观 Review；生产几何仍以 2D mm 数据为权威来源。

---

## Professional Dieline CAD

V0.38+ 的刀版不是背景图片，而是语义结构文档：

```text
Node
Edge
Panel
CUT
CREASE
PERF
GLUE
BLEED
SAFE
```

支持：

- 节点数值编辑；
- 节点直接拖动；
- CUT / CREASE / PERF / GLUE 转换；
- Line；
- Cubic Bézier；
- Arc；
- C1/C2 控制柄；
- Add Node；
- de Casteljau 精确 Cubic Split；
- 安全 Delete Node；
- SVG / DXF / Dieline PDF。

Native Arc Split 仍 fail-closed；需要先转换后再拆点。

---

## Unified Structural Topology

V0.39 已关闭“编辑刀版后下游仍使用旧模板几何”的问题。

现在数据链为：

```text
Edited CUT / CREASE
→ Planarization
→ Intersection / T-junction nodes
→ Bounded Panels
→ Fold adjacency / Hinges
→ Artwork panel reconciliation
→ Production Preflight
→ Full Production PDF
```

如果原 Panel 身份无法可靠保持：

```text
PANEL_REMAP_REQUIRED
```

直接阻断生产，不会把 artwork 猜测映射到最近的面。

---

## V0.40 Production Offset Engine

V0.40 开始，复杂 Panel 的 Bleed / Safe 不再只显示矩形占位提示。

支持：

- Polygon outward Bleed Offset；
- Polygon inward Safe Offset；
- Miter Join；
- Round Join；
- Bevel Join；
- Miter Limit；
- Self-intersection detection；
- 有限自动 repair；
- 无法修复时 fail-closed；
- Dieline CAD 中真实 polygon overlay；
- Offset 结果进入 V0.40 Production Preflight；
- Full Production PDF 仅由客观 Preflight gate 控制。

---

## Preflight

当前覆盖包括：

- 结构断点 / 缺 Node；
- Degenerate Edge；
- Duplicate Edge；
- CUT Intersection；
- Open CUT Endpoint；
- Fold Graph / Hinge；
- Panel remap / orphan artwork；
- Bleed / Safe；
- Artwork 跨折线 / 越界；
- Raster effective DPI；
- 字体；
- Barcode / QR；
- 变量 / 唛头规则；
- Digital Decode；
- Preview ↔ Production PDF geometry acceptance。

---

## Export

### Dieline

- SVG
- DXF
- 1:1 PDF

### Production

- Full Production PDF
- CutContour / Crease / Perforation / Glue semantic spot lines
- Vector Barcode / QR
- User TTF outline subset
- Spot Separation / Overprint
- Gradient / Soft Mask
- Cross-panel clipping
- OutputIntent
- ICC DeviceLink verified subset

PDF/X 当前仍严格称为 **PDF/X-4 Candidate**；没有第三方 Acrobat/callas/印厂 RIP 验证前，不声称正式 PDF/X 合规。

---

## Batch / Data

- XLSX / CSV / TSV；
- Multi-sheet；
- Header detection；
- 双语 Alias；
- Mapping Profiles；
- source row/cell lineage；
- Dry Run；
- Web Worker Batch PDF；
- Pause / Resume / Cancel / Retry；
- Partial Failure；
- failed rows export；
- IndexedDB recoverable artifacts。

---

## Optional Hosted Foundation

仓库仍保留 V0.36/V0.37：

- Auth / RBAC；
- Immutable Revision；
- Approval workflow；
- Audit hash chain；
- PostgreSQL persistence；
- Idempotency；
- Immutable Production Archive。

这些现在是**可选基础设施**，不是 BoxStudio 免费设计器的前置条件。

---

## Reference / Product Direction

详见：

- `docs/BOXSTUDIO_DEVELOPMENT_SPEC_CURRENT.md`
- `docs/V0.40_REFERENCE_RESTUDY.md`
- `docs/UNFINISHED_BASELINE_AUDIT_CURRENT.md`

当前研发原则：

> 先把模板、结构、2D、唛头、Dieline CAD、3D、Preflight、生产导出做到真正好用，再扩展外围企业系统。
