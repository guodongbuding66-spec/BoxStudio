# BoxStudio 当前未完成清单（按最初产品需求重新审计）

**审计日期**：2026-10-04  
**当前代码版本**：V0.31  
**产品基准**：`docs/BOXSTUDIO_DEVELOPMENT_SPEC_CURRENT.md`  
**原则**：只优先记录“纸盒设计网站 + 专业唛头编辑”核心是否完成。企业后台、SSO、ERP 等降为后期路线。

---

## 状态定义

| 状态 | 含义 |
|---|---|
| ✅ | 主线真实实现，已有自动回归或明确验收 |
| 🟡 | 有实现，但离最初需求定义的完整体验仍有缺口 |
| ⬜ | 尚未形成可用实现 |
| EXT | 必须依赖真实 CAD、印厂、扫描器、RIP、第三方工具或工厂样品才能最终验收 |

---

# 1. 总体结论

V0.31 已经积累了不少底层能力，尤其是：

- mm 几何模型；
- US Side-Seal / Mailer 基础结构；
- 变量唛头；
- 条件 Package Notice；
- Barcode / QR；
- Excel / Batch 大量基础能力；
- 3D 折叠与 Artwork Texture 基础；
- 原生 PDF / SVG 路径；
- Production PDF Digital Decode；
- Preview/PDF `<=0.2 mm` 几何验收；
- 一批节点、曲线、Guide、Clip、Panel 等编辑能力。

但按照**最开始的产品定义**重新看，当前最大问题不是“缺企业后台”，而是：

> **纸盒设计软件本体还没有完整收口。**

尤其缺：

1. 真正的 Template Center；
2. 5 个以上生产级参数化盒型；
3. 内/外/制造尺寸 + Material / Flute / Thickness；
4. 专业 2D 编辑器完整 UX；
5. 完整 Shipping Mark 组件库；
6. 2D ↔ 3D 双向联动与材质系统；
7. Dieline CAD 完整工作流；
8. 完整生产 Preflight；
9. DXF / GLB 等关键导出；
10. Browser E2E 与真实 CAD / 印厂验收。

因此从现在开始，**V0.32 以后重新围绕核心产品推进**。

---

# 2. Template Center / 参数化盒型

## 当前：🟡

已有基础：

- US Side-Seal / RSC 类结构；
- Mailer / 150010 类结构；
- geometry generator 已存在；
- panel / cut / crease / curve 等结构数据已存在；
- 当前结构可以驱动一部分 2D / 3D / PDF。

## 未完成

### P0

- [ ] 正式 Template Center 页面；
- [ ] 分类筛选；
- [ ] 搜索盒型 / FEFCO / Model ID；
- [ ] 3D 模板缩略图；
- [ ] 模板参数说明；
- [ ] 从模板创建项目；
- [ ] 至少 5 个生产级参数化盒型；
- [ ] 每个模板独立 fixture / regression；
- [ ] 参数变更后 geometry deterministic regression。

### 第一批至少补齐

- [ ] FEFCO 0201；
- [ ] FEFCO 0427；
- [ ] Tuck End；
- [ ] Auto Lock / Snap Lock 之一；
- [ ] 保留并完善当前 US Side-Seal；
- [ ] 保留并完善 Mailer 150010。

### 后续

- [ ] 20–30 个高频盒型；
- [ ] Favorite / Recent；
- [ ] Custom Template Builder。

---

# 3. 尺寸模式 / Material / Flute / Thickness

## 当前：⬜ / 🟡

当前已有 L/W/H 类结构参数，但最初需求定义的完整包装尺寸系统还没有形成正式产品模块。

## 未完成

- [ ] Inner Dimension；
- [ ] Outer Dimension；
- [ ] Manufacturing Dimension；
- [ ] 三者之间明确换算；
- [ ] 纸厚 `T` 作为结构正式参数；
- [ ] Material database；
- [ ] Corrugated / Kraft / Cardboard / Coated / Greyboard；
- [ ] E / F / B / C / EB / BC / AA Flute；
- [ ] Ply；
- [ ] thicknessMm；
- [ ] inside / outside allowance；
- [ ] 厚度修改后结构回归；
- [ ] 厚度同步影响 3D edge thickness；
- [ ] Factory compensation profile（后续）。

**这是 V0.32 的核心 P0。**

---

# 4. Professional 2D Editor

## 当前：🟡

已有相当多编辑基础，但仍没有达到 Figma / Illustrator / 包装 CAD 式完整体验。

### 已有或基本可用

- ✅ mm 坐标模型；
- ✅ Text / Shape / Line / Icon / Barcode / QR 等对象基础；
- ✅ Multi-select / Align / Distribute 基础；
- ✅ Guides / Ruler / Snap 基础；
- ✅ Panel-aware geometry；
- ✅ 一部分 Object Guide / baseline / spacing / rotation 辅助；
- ✅ 一部分 curve / clip / node editing；
- ✅ Z-order 相关基础。

### 未完成

- [ ] 统一成熟 Layer Panel；
- [ ] 图层重命名 / 排序 / Group hierarchy；
- [ ] 任意对象 Group / Ungroup；
- [ ] 完整 Copy / Paste；
- [ ] 跨 Panel clipboard policy；
- [ ] 完整 command-history Undo / Redo；
- [ ] overlay / profile / clip / mapping 全部纳入 history；
- [ ] 更完整 Property Inspector；
- [ ] Selection UX；
- [ ] Keyboard shortcut 统一；
- [ ] Professional transform handles；
- [ ] object snapping UI feedback；
- [ ] 对齐/分布的专业交互；
- [ ] panel focus / edit-only 模式；
- [ ] 大文档性能测试。

**V0.33 目标：把“功能存在”升级为“专业编辑器可持续使用”。**

---

# 5. Shipping Marks / 唛头编辑器

## 当前：🟡（核心数据能力较强，产品化仍未完整）

### 已有

- ✅ SKU / NW / GW / Size / CRN / Contract 等变量基础；
- ✅ 多位置变量同步；
- ✅ Package Notice 条件逻辑；
- ✅ Barcode + QR Group；
- ✅ 250×80 / 200×64 相关能力；
- ✅ US Side-Seal 真实业务模板基础；
- ✅ Master / Customer / Rule 等部分基础能力；
- ✅ Excel Batch 大量数据链路。

### 未完成

- [ ] 独立 Marks Workspace 完整 UX；
- [ ] Shipping Mark 组件面板；
- [ ] SKU Block；
- [ ] Weight Block；
- [ ] Measurement Block；
- [ ] Origin Block；
- [ ] CRN Block；
- [ ] Contract Block；
- [ ] Package Notice Block；
- [ ] Handling / Compliance 分类；
- [ ] 组件拖入画布；
- [ ] 可视化变量绑定；
- [ ] 可视化 Rule Authoring；
- [ ] 模板级 Required Field 配置；
- [ ] Marks-specific Preflight navigation；
- [ ] 更完整 Customer Mark Templates。

**V0.34 目标：把唛头从“底层数据模型”做成真正高效的业务工作区。**

---

# 6. 国际运输图标库

## 当前：🟡

已有少量图标基础，例如 This Side Up / Fragile / Keep Dry。

## 未完成

至少补齐：

- [ ] Handle With Care；
- [ ] Do Not Stack；
- [ ] Stacking Limit；
- [ ] Center of Gravity；
- [ ] Clamp Here；
- [ ] No Clamp；
- [ ] Recycle；
- [ ] Umbrella；
- [ ] Glass；
- [ ] 图标搜索 / 分类；
- [ ] SVG 资产规范；
- [ ] Rule Binding；
- [ ] 模板锁定；
- [ ] Export vector regression。

---

# 7. Barcode / QR

## 当前：✅ 核心数字生产验收 / 🟡 产品能力

### 已完成

- ✅ Code 39；
- ✅ EAN-13；
- ✅ UPC-A；
- ✅ ITF-14；
- ✅ GS1-128；
- ✅ QR；
- ✅ final Production PDF artifact digital decode；
- ✅ source value round-trip；
- ✅ final-PDF corruption negative case；
- ✅ Barcode + QR Group；
- ✅ Preview/PDF geometry gate。

### 未完成

- [ ] DataMatrix；
- [ ] 更完整 quiet zone / module-size UX；
- [ ] 旋转支持而不是单纯 fail-closed；
- [ ] 真实打印扫描器验证 EXT；
- [ ] ISO barcode print grade EXT；
- [ ] 外部 RIP raster decode EXT。

这里不再作为主线最大阻塞，后续纳入完整 Preflight。

---

# 8. 3D 系统

## 当前：🟡

### 已有

- ✅ Panel Fold 基础；
- ✅ Artwork Texture Mapping 基础；
- ✅ Orientation Review 基础；
- ✅ Fold progress 基础；
- ✅ 与结构 geometry 共用数据基础。

### 未完成

- [ ] 正式 2D / 3D / Split View；
- [ ] 2D ↔ 3D 双向点击选中；
- [ ] focus panel；
- [ ] Fold Animation 完整 UX；
- [ ] Front / Back / Left / Right / Top / Bottom 快捷视图；
- [ ] Material system；
- [ ] Kraft / White Corrugated / Cardboard / Coated / Greyboard；
- [ ] 纸厚 → 3D edge thickness；
- [ ] Marks Texture 与 Artwork 一致；
- [ ] 3D snapshot export；
- [ ] GLB export；
- [ ] 复杂盒型 Fold Graph 回归。

### 外部/后期

- [ ] Physical board thickness compensation EXT；
- [ ] bend radius EXT；
- [ ] print stretch compensation EXT；
- [ ] color-managed 3D soft proof EXT。

**V0.35 主线。**

---

# 9. Dieline CAD

## 当前：🟡

### 已有基础

- ✅ line / curve 数据；
- ✅ Bezier / cubic 相关基础；
- ✅ node / clip 编辑基础；
- ✅ CUT / CREASE / PERF / GLUE 语义；
- ✅ panel edit 基础。

### 未完成

- [ ] 完整 node tool UX；
- [ ] Add Node；
- [ ] Delete Node；
- [ ] Handle 编辑；
- [ ] straight ↔ arc ↔ Bezier；
- [ ] Cut ↔ Crease ↔ Perf UI；
- [ ] Path Close / Join / Split；
- [ ] self-intersection 检查；
- [ ] Panel boundary rebuild；
- [ ] 修改刀版后 Fold Graph 自动重建；
- [ ] 修改刀版后 3D 自动刷新；
- [ ] 结构破坏 warning；
- [ ] CAD-style numeric editing。

**V0.36 主线。**

---

# 10. Preflight

## 当前：🟡

### 已完成或较强

- ✅ Barcode / QR digital decode；
- ✅ Preview/PDF geometry `<=0.2 mm`；
- ✅ required checks fail-closed；
- ✅ 一部分规则检查；
- ✅ 一部分 batch / variable validation。

### Structure 未完成

- [ ] dieline closed；
- [ ] broken paths；
- [ ] self-intersection；
- [ ] fold topology；
- [ ] panel graph validity；
- [ ] glue flap validity。

### Artwork 未完成

- [ ] image DPI；
- [ ] bleed；
- [ ] safe area；
- [ ] clipping；
- [ ] cut/fold crossing；
- [ ] transparency policy。

### Text 未完成

- [ ] missing font；
- [ ] embeddability；
- [ ] real font metrics；
- [ ] minimum text size；
- [ ] overflow；
- [ ] TTF glyph-path independent verification。

### Marks 未完成

- [ ] required marks profile；
- [ ] destination-specific marks；
- [ ] exact issue → object navigation；
- [ ] exact issue → Excel source cell；
- [ ] rule-level actionable fix。

**V0.37 主线。**

---

# 11. Export Center

## 当前：🟡

### 已有

- ✅ Production PDF 主路径；
- ✅ SVG 相关能力；
- ✅ PDF physical geometry regression；
- ✅ Spot / OutputIntent / DeviceLink subset；
- ✅ Artwork / native PDF 大量底层能力。

### 未完成

#### Production

- [ ] 正式统一 Export Center UX；
- [ ] Preview PDF profile；
- [ ] Artwork Only PDF；
- [ ] Dieline Only PDF；
- [ ] export presets；
- [ ] downloadable export report。

#### DXF

- [ ] DXF exporter；
- [ ] CUT Layer；
- [ ] CREASE Layer；
- [ ] PERF Layer；
- [ ] arc / Bezier 转换策略；
- [ ] 真实 AutoCAD / CAD 软件打开验收 EXT。

#### Raster

- [ ] PNG export；
- [ ] JPG export；
- [ ] high-resolution preview export。

#### 3D

- [ ] GLB；
- [ ] 3D PNG snapshot。

#### 外部生产

- [ ] 正式 PDF/X 第三方认证 EXT；
- [ ] printer/RIP profile 验收 EXT；
- [ ] K-only / CMYK 外部验证 EXT。

**V0.38 主线。**

---

# 12. Excel / Batch

## 当前：🟡（底层完成度较高）

### 已有

- ✅ Upload；
- ✅ Multi-sheet；
- ✅ Header Detection；
- ✅ 双语 Alias 基础；
- ✅ Mapping；
- ✅ merged-cell expansion；
- ✅ controlled Fill Down；
- ✅ Footer Stop；
- ✅ formula no-cache diagnostics；
- ✅ leading-zero subset；
- ✅ Import Review 基础；
- ✅ Dry Run；
- ✅ Worker Batch；
- ✅ Partial Failure；
- ✅ Retry；
- ✅ ZIP；
- ✅ failed_rows.csv / xlsx；
- ✅ source-cell lineage。

### 未完成

- [ ] Import Review Inline Correction；
- [ ] 修改后重新校验；
- [ ] Change Markers；
- [ ] Re-upload Compare；
- [ ] Duplicate bilingual header strategy；
- [ ] complex number format recovery；
- [ ] controlled Formula Engine 或严格 ERROR policy；
- [ ] Issue 原生 canonical field/path；
- [ ] Large workbook streaming benchmark；
- [ ] Customer Mapping Profile 产品化；
- [ ] Batch multi-page PDF UX。

**V0.39 主线的一部分。**

---

# 13. Master Template / Customer Template

## 当前：🟡

已有部分 profile / master / lock / revision 基础，但还不是最初需求里完整的模板产品。

## 未完成

- [ ] Master Template 管理页面；
- [ ] Create from Master；
- [ ] Newer Template Available；
- [ ] Customer Template Center；
- [ ] 模板变量 schema；
- [ ] 模板 Rule schema；
- [ ] locked element UX；
- [ ] locked variable UX；
- [ ] template fixtures；
- [ ] sample renders；
- [ ] template-level preflight；
- [ ] Draft / Published（后期 backend 前先本地实现）。

---

# 14. 项目保存 / Undo / Auto Save / Version History

## 当前：🟡

已有本地状态、部分 history、revision / production job 等基础。

## 未完成

- [ ] 全模块统一 Undo / Redo；
- [ ] 至少 100 steps；
- [ ] clear command boundaries；
- [ ] autosave 状态 UI；
- [ ] crash recovery；
- [ ] project migration regression；
- [ ] Version History 页面；
- [ ] Preview version；
- [ ] Restore；
- [ ] Duplicate；
- [ ] local snapshot diff；
- [ ] `.boxproj` import/export（如果继续采用该方向）。

**V0.40 主线。**

---

# 15. 首页 / Dashboard / Templates UX

## 当前：⬜ / 🟡

当前重点一直集中在 Editor，最初需求定义的完整产品入口仍未真正完成。

## 未完成

- [ ] Dashboard；
- [ ] Create Box；
- [ ] Import Dieline；
- [ ] Marks Design；
- [ ] Recent Projects；
- [ ] Popular Structures；
- [ ] Template Center；
- [ ] Projects 页面；
- [ ] Assets 页面；
- [ ] consistent navigation；
- [ ] editor launch workflow。

注意：这些页面必须服务核心工作流，不优先做“漂亮官网”。

---

# 16. Browser E2E / 真实操作验收

## 当前：⬜

这是当前非常重要的质量缺口。

必须覆盖真实浏览器：

- [ ] 创建项目；
- [ ] 选择模板；
- [ ] 改 L/W/H；
- [ ] 改 thickness；
- [ ] 编辑文本；
- [ ] 改 SKU / CRN；
- [ ] Package 1→3；
- [ ] Barcode / QR 更新；
- [ ] object drag / resize / rotate；
- [ ] undo / redo；
- [ ] 2D ↔ 3D；
- [ ] fold；
- [ ] Excel import；
- [ ] batch generate；
- [ ] preflight；
- [ ] export PDF / SVG / DXF；
- [ ] reload / autosave / restore。

单元测试和 serializer regression 不能代替 Browser E2E。

---

# 17. 真实外部验收轨

以下不能只靠仓库内部测试宣称完成：

### CAD

- [ ] DXF 用 AutoCAD / 其他 CAD 打开；
- [ ] Layer / unit / arc 验证。

### Print / PDF

- [ ] Acrobat / callas Preflight；
- [ ] PDF/X 第三方验证；
- [ ] CMYK / K-only；
- [ ] 外部 RIP。

### Barcode

- [ ] 实体打印；
- [ ] 真实扫描器；
- [ ] ISO Grade。

### Real Template

- [ ] 美线真实原稿 overlay；
- [ ] 关键尺寸实测；
- [ ] 字体 / 条码 / CRN / Package Notice 对照；
- [ ] 出具 real-sample acceptance report。

### Factory

- [ ] 真实纸厚；
- [ ] bend radius；
- [ ] manufacturing allowance；
- [ ] print stretch；
- [ ] 打样反馈。

---

# 18. 重新定义的版本优先级

```text
V0.32  Parametric Template Core
V0.33  Professional 2D Editor
V0.34  Marks Workspace + Component Library + Rules
V0.35  2D ↔ 3D + Fold + Materials
V0.36  Dieline CAD
V0.37  Full Preflight
V0.38  Export Center + DXF + PNG/JPG + GLB
V0.39  Batch + Master Template + Customer Template
V0.40  Project Reliability + Version History + Browser E2E
```

并行外部验收：

```text
Current US Template real-sample acceptance
DXF CAD acceptance
External PDF/X / RIP validation
Physical Barcode / QR validation
Factory board / fold compensation validation
```

---

# 19. 暂时延期，不进入当前主线

以下不删除，但全部降级到 V0.40 后：

- Production Bundle；
- SHA-256 immutable archive；
- Hosted Backend；
- Auth；
- Server RBAC；
- Reviewer Inbox；
- Blocking Comments；
- Two-step Approval；
- Separation of Duties；
- Scheduled Publish；
- Notifications；
- External Proof Link；
- Master Data enterprise domain；
- Impact Analysis；
- Dashboard KPI；
- ERP Adapter；
- PIM / PLM；
- REST API；
- Webhook；
- SSO；
- SCIM；
- Supplier Portal；
- Print Vendor Portal；
- S3 / R2；
- Server Queue；
- enterprise retention / backup。

它们以后会做，但**不能再早于纸盒核心能力**。

---

# 20. 当前最高优先级 P0

## V0.32 — Parametric Template Core

下一阶段必须关闭：

```text
1. Template Center 基础
2. 5 个生产级参数化盒型
3. L / W / H / T
4. Inner / Outer / Manufacturing dimensions
5. Material / Flute / Thickness
6. Panel / Fold Graph contract
7. Geometry Generator contract
8. 每模板 fixture + regression
9. 参数修改后的 2D / 3D / export consistency
```

## V0.32 完成判定

只有同时通过以下测试，才允许进入 V0.33：

- [ ] 5 个模板可从 Template Center 创建；
- [ ] 每个模板修改 L/W/H 后正确重算；
- [ ] 修改 thickness 后正确补偿；
- [ ] 切换 dimension mode 后结果可解释；
- [ ] panel graph 与 fold graph 有 regression；
- [ ] Preview 与 Production geometry 一致；
- [ ] 至少一个真实 Mailer 150010 fixture；
- [ ] 至少一个真实 RSC/US Side-Seal fixture；
- [ ] CI 全绿；
- [ ] Browser E2E 至少覆盖模板创建与参数修改主路径。

---

# 21. 完成判定原则

后续任何版本都遵守：

1. **有按钮 ≠ 完成**；
2. **有代码 ≠ 完成**；
3. **单元测试通过 ≠ 用户工作流完成**；
4. **静态 SVG ≠ 参数化盒型**；
5. **3D 能看 ≠ 2D/3D 联动完成**；
6. **PDF 能下载 ≠ 生产文件完成**；
7. **DXF 能下载 ≠ CAD 验收完成**；
8. **数字 Barcode Decode ≠ 实体 ISO Grade**；
9. **本地角色 ≠ 企业 RBAC**；
10. **历史版本做过 ≠ 当前主线仍然有效，必须持续回归**。

本文件以后作为“还差什么”的唯一当前清单；历史 `UNFINISHED_BASELINE_AUDIT.md` 仅保留作历史记录。
