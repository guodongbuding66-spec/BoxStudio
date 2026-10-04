# BoxStudio 当前未完成清单（V0.32 后）

**审计日期**：2026-10-04  
**当前代码版本**：V0.32  
**产品基准**：`docs/BOXSTUDIO_DEVELOPMENT_SPEC_CURRENT.md`  
**进度记录**：`docs/BASELINE_PROGRESS_V0.32.md`  
**原则**：优先完成“纸盒设计网站 + 专业唛头编辑”核心。Backend / Auth / ERP / SSO 不抢占核心产品主线。

---

## 状态定义

| 状态 | 含义 |
|---|---|
| ✅ | 当前主线已有真实实现，并有自动回归或明确软件验收 |
| 🟡 | 已有基础实现，但离最初产品定义的完整体验/生产闭环仍有缺口 |
| ⬜ | 尚未形成可用实现 |
| EXT | 必须依赖真实 CAD、印厂、扫描器、RIP、第三方工具或工厂样品才能最终验收 |

> `✅ software` 不等于 `✅ factory certified`。需要物理样箱、外部 RIP、真实 CAD 或扫描器的项目，在外部证据出现前继续保持 EXT。

---

# 1. 当前总体结论

V0.32 已经把主线重新拉回纸盒设计软件本体，并完成第一块核心补齐：

- ✅ 可搜索/分类的 Template Center；
- ✅ 5 个 actionable parametric core templates；
- ✅ 0201 / RSC；
- ✅ Mailer 150010；
- ✅ FEFCO 0427 engineering core；
- ✅ Reverse Tuck End engineering core；
- ✅ Auto-lock Bottom engineering core；
- ✅ Internal / External / Manufacturing dimension modes；
- ✅ Material / Flute engineering presets；
- ✅ Thickness compensation participates in geometry；
- ✅ 从模板创建项目进入现有 Editor；
- ✅ V0.10–V0.31 全套回归保持通过；
- ✅ V0.32 独立 deterministic geometry 回归。

当前最大问题已经从“只有两个可生成结构”变成：

> **专业 2D 编辑器、完整唛头工作区、2D↔3D 双向联动、Dieline CAD、完整 Preflight 和 Export Center 仍没有收口。**

因此下一主线固定为 **V0.33 Professional 2D Editor**。

---

# 2. Template Center / 参数化盒型

## 当前：✅ software / EXT factory acceptance

### 已完成

- [x] Template Center；
- [x] 盒型搜索；
- [x] 分类过滤；
- [x] FEFCO / Model ID / tag 搜索基础；
- [x] 实际 geometry 生成的刀版缩略预览；
- [x] 从模板创建项目；
- [x] 5 个 actionable core templates；
- [x] 每个核心模板 deterministic generation regression；
- [x] 旧 schema-only FEFCO / ECMA namespace 保留但不可误当成可用 geometry；
- [x] 旧 V0.31 geometry 冻结并通过兼容桥继续复用。

### 仍未完成

- [ ] 20–30 个高频盒型；
- [ ] 0203 / 0215 / 0216；
- [ ] FEFCO 0426；
- [ ] Straight Tuck End；
- [ ] Snap Lock Bottom；
- [ ] Crash Lock 其他变体；
- [ ] Sleeve；
- [ ] Tray；
- [ ] Lid & Base；
- [ ] Drawer；
- [ ] Display Box；
- [ ] 收藏 / 最近使用；
- [ ] 管理员自定义模板制作器。

### EXT

0427 / RTE / Auto-lock 仍需：

- [ ] trusted CAD overlay；
- [ ] crease-center dimension measurement；
- [ ] physical fold sample；
- [ ] lock/tuck clearance verification；
- [ ] board/caliper factory compensation；
- [ ] converter / factory sign-off。

在完成这些之前，不标记为 tooling certified。

---

# 3. 尺寸 / Material / Flute / Thickness

## 当前：🟡

### 已完成

- [x] `1 unit = 1 mm` 核心；
- [x] Internal dimension mode；
- [x] External dimension mode；
- [x] Manufacturing dimension mode；
- [x] Thickness enters compensation equations；
- [x] F / E / B / C / EB / BC / AA engineering presets；
- [x] Corrugated / Kraft / SBS / Greyboard 等基础材料 preset；
- [x] explicit thickness override。

### 仍缺

- [ ] 完整 Material Database UI；
- [ ] 每种材料可编辑技术属性；
- [ ] Factory Profile；
- [ ] Supplier-specific caliper；
- [ ] crease / score allowance profile；
- [ ] bend allowance；
- [ ] moisture / grain / machine-direction rules；
- [ ] 材料库版本管理；
- [ ] 材料与 3D appearance 的完整联动。

---

# 4. Professional 2D Editor

## 当前：🟡 —— **V0.33 主线**

### 已有基础

- [x] SVG/mm canvas；
- [x] Select；
- [x] Text；
- [x] Shape；
- [x] Line；
- [x] Barcode / QR group；
- [x] Variable text；
- [x] Shipping Mark 基础；
- [x] Move / Resize / Rotate 基础；
- [x] Multi-select 基础；
- [x] Align / Distribute 基础；
- [x] Guides / grid / ruler 基础；
- [x] Smart Guide 基础；
- [x] persistent guides；
- [x] object-relative group rotation 基础；
- [x] clip / curve / polygon 等底层能力；
- [x] Undo / Redo 核心 history。

### P0 未完成

- [ ] Image tool 真正可用；
- [ ] Icon tool 完整工作流；
- [ ] Table tool；
- [ ] 专业 Layer Panel UX；
- [ ] arbitrary Group / Ungroup data model；
- [ ] selection clipboard；
- [ ] Copy / Paste；
- [ ] cross-panel paste policy；
- [ ] Bring Forward / Send Backward / absolute z-order UX；
- [ ] 完整 Lock / Hide 对象级 UX；
- [ ] 统一 Numeric Property Inspector；
- [ ] X/Y/W/H/R 精密输入；
- [ ] aspect-ratio lock；
- [ ] anchor / transform-origin UX；
- [ ] panel-focus mode；
- [ ] “Edit this panel only”；
- [ ] Fit Panel；
- [ ] selection marquee 完整行为；
- [ ] keyboard nudge / modifier policy；
- [ ] 所有 overlay/profile/clip/mapping 进入统一 Undo/Redo；
- [ ] browser interaction regression。

---

# 5. Shipping Marks / Variables / Rules

## 当前：🟡 —— V0.34 主线

### 已完成

- [x] SKU；
- [x] NW / GW；
- [x] Package Meas；
- [x] CRN；
- [x] Contract No.；
- [x] Origin / Destination；
- [x] `{{variable}}` binding；
- [x] CRN 等重复字段同步；
- [x] Package Count 条件提示；
- [x] Barcode + QR group；
- [x] Code39 / EAN-13 / UPC-A / ITF-14 / GS1-128；
- [x] QR；
- [x] 基础 handling icons；
- [x] Mark profile / rule / asset 一批基础能力；
- [x] Excel batch 基础。

### 仍缺

- [ ] 独立 Marks Workspace 完整 UX；
- [ ] SKU Block component；
- [ ] Weight Block component；
- [ ] Measurement component；
- [ ] Origin component；
- [ ] Compliance component；
- [ ] Handling component library 完整化；
- [ ] Table/compound mark component；
- [ ] Barcode+QR 标准/紧凑尺寸一键切换 UX；
- [ ] component-level lock policy；
- [ ] drag/drop mark library；
- [ ] visual rule authoring；
- [ ] 通用 `SET_VALUE / SET_TEXT / SET_STYLE / SET_LAYOUT / REQUIRE / DISABLE`；
- [ ] computed-variable dependency graph；
- [ ] rule conflict diagnostics；
- [ ] customer-configurable mark library。

---

# 6. 2D ↔ 3D / Fold / Materials

## 当前：🟡 —— V0.35 主线

### 已完成

- [x] Panel / fold graph 基础；
- [x] 3D folding 基础；
- [x] Fold progress；
- [x] Artwork texture proof 基础；
- [x] cross-panel appearance 一批底层处理；
- [x] orientation review 基础。

### 仍缺

- [ ] 2D 点击对象 → 3D 对应面/对象高亮；
- [ ] 3D 点击面 → 2D 自动定位；
- [ ] 2D + 3D Split View 完整 UX；
- [ ] Front / Back / Left / Right / Top / Bottom 快捷视图；
- [ ] Fold 0/25/50/75/100 preset；
- [ ] Fold animation controller；
- [ ] E/B/C/BC 等真实 edge-thickness appearance；
- [ ] White Corrugated / Kraft / Paperboard / Greyboard appearance；
- [ ] 新 V0.32 三结构的 3D fold 专项验收；
- [ ] Browser/WebGL E2E。

### EXT

- [ ] board thickness physical fold compensation；
- [ ] bend radius；
- [ ] print stretch；
- [ ] color-managed 3D soft proof。

---

# 7. Dieline CAD

## 当前：🟡 —— V0.36 主线

### 已有基础

- [x] line selection；
- [x] node/curve 基础；
- [x] Bezier / cubic PDF；
- [x] polygon panel；
- [x] imported vector repair；
- [x] CUT / CREASE / PERF / GLUE semantics；
- [x] SVG / DXF / PDF-compatible AI import 基础；
- [x] topology/intersection diagnostics 基础。

### 仍缺

- [ ] 专业 Node tool UX；
- [ ] add/delete node 完整操作；
- [ ] line ↔ arc ↔ Bezier 转换；
- [ ] Cut ↔ Crease 一键转换 UX；
- [ ] tangent handles；
- [ ] curve continuity helpers；
- [ ] slot / notch / tab 专用结构工具；
- [ ] dimension annotations；
- [ ] structural constraints；
- [ ] geometry-change → fold graph rebuild 完整化；
- [ ] import 后 panel auto-detection 更稳健；
- [ ] custom box template authoring。

---

# 8. Preflight

## 当前：🟡 —— V0.37 主线

### 已完成的重要质量能力

- [x] Barcode/QR final Production PDF digital decode；
- [x] final-PDF corruption negative regression；
- [x] required check 不可 warning-only 绕过；
- [x] Preview/PDF core geometry `<= 0.2 mm`；
- [x] technical outlined-text keypoint readback；
- [x] unsupported rotation / TTF readback path fail-closed；
- [x] 多种结构 / marks / safe-area 基础检查。

### 仍缺

- [ ] Dieline closure 全面检查；
- [ ] broken path 全面检查；
- [ ] fold topology production rules；
- [ ] image DPI 全面检查；
- [ ] bleed completeness；
- [ ] safe-area policy 完整化；
- [ ] min text size policy；
- [ ] font embeddability policy；
- [ ] TTF glyph-path 独立 measurement；
- [ ] OTF/CFF/CFF2；
- [ ] transparency 全面检查；
- [ ] Barcode quiet-zone standards profile；
- [ ] barcode size/orientation profile；
- [ ] rule issue → exact object / Excel cell 统一定位；
- [ ] Preflight UI 聚合/过滤/fix action；
- [ ] 外部 Preflight adapter。

### EXT

- [ ] physical scanner ISO grade；
- [ ] printer/RIP raster validation；
- [ ] Acrobat/callas/第三方 PDF/X validation。

---

# 9. Export Center

## 当前：🟡 —— V0.38 主线

### 已有

- [x] Production PDF；
- [x] Preview/related PDF 基础；
- [x] SVG；
- [x] DXF 基础；
- [x] PNG 基础；
- [x] native vector Barcode/QR；
- [x] CUT/CREASE spot semantics；
- [x] OutputIntent / DeviceLink subset；
- [x] PDF/X-4 Candidate；
- [x] batch/multi-page PDF 基础。

### 仍缺

- [ ] 统一 Export Center UX；
- [ ] Production / Artwork / Dieline / 3D 分类；
- [ ] Artwork Only；
- [ ] Dieline Only；
- [ ] JPG；
- [ ] GLB；
- [ ] SVG 重新导入一致性验收；
- [ ] DXF 在真实 CAD 的 layer/scale acceptance；
- [ ] 3D high-resolution render；
- [ ] export profile presets；
- [ ] consistent filename policy；
- [ ] export fixture for every core template。

### EXT

- [ ] 正式 PDF/X third-party pass；
- [ ] real RIP separation / overprint acceptance；
- [ ] real CAD round-trip acceptance。

---

# 10. Excel Batch / Master / Customer Template

## 当前：🟡 —— V0.39 主线

### 已有

- [x] XLSX / CSV 基础；
- [x] multi-sheet；
- [x] mapping；
- [x] aliases；
- [x] header detection；
- [x] fill-down subset；
- [x] source lineage；
- [x] worker batch；
- [x] partial failure/retry；
- [x] ZIP；
- [x] failed rows review/export；
- [x] local mapping profiles；
- [x] Master Template 一批基础 domain。

### 仍缺

- [ ] duplicate bilingual header policy；
- [ ] formula policy / controlled engine；
- [ ] scientific notation / complex number format recovery；
- [ ] inline correction in Import Review；
- [ ] re-upload compare；
- [ ] large workbook benchmark；
- [ ] customer template management UI；
- [ ] Master Template update/impact UX；
- [ ] batch output grouped by SKU/package set；
- [ ] per-template batch fixtures。

---

# 11. Project Reliability / Browser E2E

## 当前：🟡 / ⬜ —— V0.40 主线

### 已有

- [x] localStorage autosave；
- [x] local history；
- [x] production job/revision 一批基础；
- [x] storage migrations；
- [x] CI domain/serializer regression。

### 仍缺

- [ ] 完整 project file `.boxproj`；
- [ ] assets 打包/恢复；
- [ ] Version History UX；
- [ ] Preview / Restore / Duplicate；
- [ ] autosave conflict strategy；
- [ ] crash recovery；
- [ ] full migration fixtures；
- [ ] real browser import flow E2E；
- [ ] real browser object editing E2E；
- [ ] template create → edit → 3D → preflight → export E2E；
- [ ] download verification；
- [ ] mobile/tablet behavior acceptance。

---

# 12. 后期企业能力（不抢主线）

以下仍有价值，但在 V0.33–V0.40 核心完成前不作为主线 P0：

- Auth / Session；
- server RBAC；
- hosted database；
- immutable server revision；
- approval workflow；
- server audit；
- dashboard/reporting；
- external proof links；
- notifications；
- Production Bundle / cryptographic manifest；
- S3 / R2；
- queues；
- REST API；
- Webhook；
- ERP / PIM / PLM；
- SSO / SCIM；
- supplier / print-vendor portals。

---

# 13. 当前开发顺序

```text
V0.32  Parametric Template Core                    ✅ software
V0.33  Professional 2D Editor                      ← NEXT
V0.34  Marks Workspace + Component Library + Rules
V0.35  2D ↔ 3D + Fold + Materials
V0.36  Dieline CAD
V0.37  Full Preflight
V0.38  Export Center + DXF/PNG/JPG/GLB
V0.39  Batch + Master/Customer Templates
V0.40  Project Reliability + Browser E2E
```

并行外部验收：

```text
V0.32 new-template CAD/sample validation
Current US Template real-sample acceptance
External PDF/X / RIP validation
Physical barcode/QR scanner validation
Factory board / fold / print compensation validation
```

---

# 14. V0.33 的 P0 完成判定

V0.33 只有在下面这些真实操作闭环后才算完成：

1. Image / Icon / Table 不再是 placeholder；
2. 多选、Align、Distribute 稳定；
3. arbitrary Group/Ungroup 可保存、撤销、恢复；
4. Copy/Paste 可用并有跨 panel 策略；
5. Layers 可 hide/lock/reorder；
6. Numeric inspector 可精确编辑 X/Y/W/H/R；
7. ruler/guide/snap 行为一致；
8. panel-focus / Fit Panel 可用；
9. Undo/Redo 覆盖 V0.33 新操作；
10. 至少一条真实浏览器编辑流程回归。

完成这些以后，再进入 V0.34 Marks Workspace，而不是提前跳去 Backend/ERP。
