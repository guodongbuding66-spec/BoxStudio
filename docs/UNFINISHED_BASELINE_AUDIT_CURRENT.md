# BoxStudio 当前未完成清单（V0.33 后）

**审计日期**：2026-10-04  
**当前代码版本**：V0.33  
**产品基准**：`docs/BOXSTUDIO_DEVELOPMENT_SPEC_CURRENT.md`  
**进度记录**：`docs/BASELINE_PROGRESS_V0.32.md`、`docs/BASELINE_PROGRESS_V0.33.md`  
**原则**：继续优先完成“纸盒设计网站 + 专业唛头编辑”本体。Backend / Auth / ERP / SSO 不抢占核心主线。

---

## 状态定义

| 状态 | 含义 |
|---|---|
| ✅ | 当前主线已有真实实现，并有自动回归或明确软件验收 |
| 🟡 | 已有可用实现，但仍有明确 hardening / UX / production gap |
| ⬜ | 尚未形成可用实现 |
| EXT | 必须依赖真实 CAD、印厂、扫描器、RIP、第三方工具或工厂样品才能最终验收 |

> `✅ software` 不等于 `✅ factory certified`。需要物理样箱、外部 RIP、真实 CAD 或扫描器的项目，在外部证据出现前继续保持 EXT。

---

# 1. 当前总体结论

V0.32–V0.33 已把主线重新拉回纸盒设计软件本体，并连续补齐两块核心：

- ✅ 5 个 actionable parametric core templates；
- ✅ Template Center 搜索/分类/预览/创建项目；
- ✅ Internal / External / Manufacturing dimension modes；
- ✅ Material / Flute engineering presets；
- ✅ Professional 2D 独立工作区；
- ✅ 多选、Group/Ungroup、Copy/Paste/Duplicate/Delete；
- ✅ Align / Distribute；
- ✅ Z-order；
- ✅ 精确 X/Y/W/H/R 与 Panel 属性；
- ✅ Artwork / Marks / Dieline 层基础 hide/lock；
- ✅ object list、object hide/lock；
- ✅ Panel Focus / Fit All；
- ✅ Table 以生产链已有 shape/line/text primitives 生成；
- ✅ SVG vector artwork Image path；
- ✅ V0.10–V0.33 Node regression；
- 🟡 V0.33 browser interaction regression 已纳入 CI，最终合并以该 gate 通过为前提。

当前最大缺口已经从“缺专业编辑器骨架”转移到：

> **Marks Workspace、完整 2D↔3D 双向联动、Dieline CAD、Full Preflight、Export Center 和 Project Reliability 仍未收口。**

因此下一产品主线仍按原基准进入 **V0.34 Marks Workspace + Component Library + Rules**；V0.33 的 raster image / selection polish 等留作并行 editor hardening，不阻断唛头主线。

---

# 2. Template Center / 参数化盒型

## 当前：✅ software / EXT factory acceptance

### 已完成

- [x] Template Center；
- [x] 搜索 / category / FEFCO / Model ID / tag 过滤基础；
- [x] geometry 生成的刀版预览；
- [x] 从模板创建项目；
- [x] FEFCO 0201 / RSC；
- [x] Mailer 150010；
- [x] FEFCO 0427 engineering core；
- [x] Reverse Tuck End engineering core；
- [x] Auto-lock Bottom engineering core；
- [x] Internal / External / Manufacturing dimension modes；
- [x] material / flute presets；
- [x] thickness compensation participates in geometry；
- [x] deterministic fixtures/regression；
- [x] schema-only FEFCO 04xx / ECMA namespace 继续保留。

### 仍缺 / EXT

- [ ] 20–30 个高频模板扩展；
- [ ] custom template authoring；
- [ ] factory-specific compensation profile；
- [ ] 0427 / RTE / Auto-lock 真实 CAD overlay；
- [ ] 样箱折叠验收；
- [ ] 刀模厂 / 压线中心确认；
- [ ] 不同纸板/楞型真实补偿矩阵。

---

# 3. Professional 2D Editor

## 当前：✅ core / 🟡 hardening

### V0.33 已完成

- [x] 独立 Professional 2D workspace；
- [x] same Project state 读写；
- [x] additive multi-select；
- [x] group-aware selection；
- [x] arbitrary Group / Ungroup metadata；
- [x] Copy / Paste；
- [x] Duplicate；
- [x] Delete；
- [x] keyboard 1 mm / 10 mm nudge；
- [x] Bring Front / Back / Forward / Backward；
- [x] Align six directions；
- [x] horizontal / vertical distribute；
- [x] exact X / Y / W / H / R；
- [x] exact Panel reassignment；
- [x] mouse drag move；
- [x] single-object resize handle；
- [x] single-object rotate handle；
- [x] Artwork / Marks / Dieline layer visibility + lock state；
- [x] per-object visible / lock state；
- [x] object list；
- [x] Panel Focus；
- [x] Fit All；
- [x] session Undo / Redo；
- [x] keyboard shortcuts；
- [x] Table tool；
- [x] SVG vector artwork import；
- [x] Table / SVG path进入已有 production artwork primitives/plan；
- [x] Z-order stale-index bug 已有回归防护。

### 仍需 hardening

- [ ] PNG/JPEG raster placement + native PDF/SVG/3D production contract；
- [ ] marquee selection polish；
- [ ] explicit cross-panel paste-target UX；
- [ ] aspect lock / anchor / transform origin 完整 UI；
- [ ] top-level layer reorder semantics；
- [ ] hide/lock 在所有 legacy/editor/export surface 的一致语义；
- [ ] 将历史 cross-panel/clip/live-assist 全部统一进一个 selection/history 模型；
- [ ] drag/resize/rotate 的多模板 browser E2E matrix；
- [ ] mobile/tablet editor interaction acceptance。

### 设计边界

`Image` 在 V0.33 指**生产安全的 SVG vector artwork**，不是“PNG/JPEG 已完成”。在 raster embed / DPI / ICC / transparency / final-PDF readback 未验收前，不把栅格图片能力标成完成。

---

# 4. Shipping Marks / 变量 / 规则

## 当前：🟡 —— V0.34 主线

### 已有

- [x] SKU / Weight / Measurement / Origin / Destination / CRN / Contract；
- [x] `{{variable}}` 模板；
- [x] Barcode + QR Group；
- [x] Code39 / EAN-13 / UPC-A / ITF-14 / GS1-128；
- [x] QR；
- [x] package notice；
- [x] Excel mapping/batch 基础；
- [x] SVG symbol path；
- [x] local mark assets / templates 的一批 domain 能力。

### V0.34 需要收口

- [ ] Marks 专门 workspace；
- [ ] Component Library：SKU / Weight / Dimension / Origin / Package / Barcode / QR / Handling Icon / Custom Symbol；
- [ ] drag-in component creation；
- [ ] reusable block presets；
- [ ] component style inspector；
- [ ] variable picker；
- [ ] variable usage map；
- [ ] condition/rule editor UX；
- [ ] Package Count / Country / Customer 条件；
- [ ] missing-variable visualization；
- [ ] rule preview / debug；
- [ ] customer mark template presets；
- [ ] Marks Workspace browser E2E。

---

# 5. 2D ↔ 3D / Fold / Materials

## 当前：🟡 —— V0.35 主线

### 已有

- [x] Fold Graph 基础；
- [x] Hinge Pivot fold 基础；
- [x] 0–100% Fold；
- [x] Artwork texture / atlas 基础；
- [x] cross-panel artwork 基础；
- [x] offline canvas renderer；
- [x] material/flute engineering metadata。

### 仍缺

- [ ] 2D click → 3D highlight；
- [ ] 3D click → 2D Panel focus；
- [ ] Split view；
- [ ] 2D move/rotate/resize → 3D near-live refresh；
- [ ] fold direction override UI；
- [ ] fold-order diagnostics；
- [ ] realistic corrugated/paperboard thickness edge；
- [ ] material appearance presets in final preview；
- [ ] cross-panel visual fidelity browser acceptance；
- [ ] high-resolution 3D proof/render path。

---

# 6. Dieline CAD

## 当前：🟡 —— V0.36 主线

### 已有

- [x] line selection；
- [x] node/curve 基础；
- [x] Bezier / cubic PDF；
- [x] polygon panel；
- [x] imported vector repair；
- [x] CUT / CREASE / PERF / GLUE semantics；
- [x] SVG / DXF / PDF-compatible AI import 基础；
- [x] topology/intersection diagnostics 基础。

### 仍缺

- [ ] professional Node tool UX；
- [ ] add/delete node 完整操作；
- [ ] line ↔ arc ↔ Bezier；
- [ ] Cut ↔ Crease 一键转换 UX；
- [ ] tangent handles / continuity helpers；
- [ ] slot / notch / tab 结构工具；
- [ ] dimension annotations；
- [ ] structural constraints；
- [ ] geometry-change → fold graph rebuild 完整化；
- [ ] import panel auto-detection hardening；
- [ ] custom box template authoring。

---

# 7. Preflight

## 当前：🟡 —— V0.37 主线

### 已完成的重要质量能力

- [x] Barcode/QR final Production PDF digital decode；
- [x] final-PDF corruption negative regression；
- [x] required checks 不可 warning-only 绕过；
- [x] Preview/PDF core geometry `<= 0.2 mm`；
- [x] technical outlined-text keypoint readback；
- [x] unsupported rotation / TTF readback fail-closed；
- [x] structure / marks / safe-area 一批基础检查。

### 仍缺

- [ ] Dieline closure / broken path 全面检查；
- [ ] fold topology production rules；
- [ ] raster image DPI；
- [ ] bleed completeness；
- [ ] safe-area policy 完整化；
- [ ] min text size / font embeddability；
- [ ] TTF glyph-path independent measurement；
- [ ] OTF/CFF/CFF2；
- [ ] transparency checks；
- [ ] Barcode quiet-zone / size / orientation profile；
- [ ] issue → exact object / Excel cell unified location；
- [ ] Preflight UI filter/fix actions；
- [ ] external preflight adapter。

### EXT

- [ ] physical scanner ISO grade；
- [ ] printer/RIP raster validation；
- [ ] Acrobat/callas/third-party PDF/X validation。

---

# 8. Export Center

## 当前：🟡 —— V0.38 主线

### 已有

- [x] Production PDF；
- [x] SVG；
- [x] DXF 基础；
- [x] PNG 基础；
- [x] native vector Barcode/QR；
- [x] CUT/CREASE spot semantics；
- [x] OutputIntent / DeviceLink subset；
- [x] PDF/X-4 Candidate；
- [x] batch/multi-page PDF 基础。

### 仍缺

- [ ] unified Export Center UX；
- [ ] Production / Artwork / Dieline / 3D 分类；
- [ ] Artwork Only；
- [ ] Dieline Only；
- [ ] JPG；
- [ ] GLB；
- [ ] SVG round-trip acceptance；
- [ ] DXF real-CAD layer/scale acceptance；
- [ ] high-resolution 3D render；
- [ ] export profiles；
- [ ] consistent filename policy；
- [ ] export fixture for every core template。

### EXT

- [ ] formal PDF/X third-party pass；
- [ ] real RIP separation / overprint；
- [ ] real CAD round-trip。

---

# 9. Excel Batch / Master / Customer Template

## 当前：🟡 —— V0.39 主线

### 已有

- [x] XLSX / CSV；
- [x] multi-sheet；
- [x] mapping / aliases / header detection；
- [x] fill-down subset；
- [x] source lineage；
- [x] worker batch；
- [x] partial failure / retry；
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
- [ ] package-set grouped output；
- [ ] per-template batch fixtures。

---

# 10. Project Reliability / Browser E2E

## 当前：🟡 —— V0.40 主线

### 已有

- [x] localStorage autosave；
- [x] local history；
- [x] V0.33 Professional workspace session history；
- [x] production job/revision 基础；
- [x] storage migrations；
- [x] CI domain/serializer regression；
- [x] V0.33 Headless Chrome interaction gate 已进入 CI 定义。

### 仍缺

- [ ] `.boxproj` project file；
- [ ] assets pack/restore；
- [ ] Version History UX；
- [ ] Preview / Restore / Duplicate version；
- [ ] autosave conflict strategy；
- [ ] crash recovery；
- [ ] full migration fixtures；
- [ ] import flow browser E2E；
- [ ] template create → edit → 3D → preflight → export E2E；
- [ ] download verification；
- [ ] mobile/tablet acceptance。

---

# 11. 后期企业能力（继续不抢主线）

以下有价值，但 V0.34–V0.40 核心完成前不作为主线 P0：

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
- REST API / Webhook；
- ERP / PIM / PLM；
- SSO / SCIM；
- supplier / print-vendor portals。

---

# 12. 当前开发顺序

```text
V0.32  Parametric Template Core                    ✅ software
V0.33  Professional 2D Editor                      ✅ core / 🟡 hardening
V0.34  Marks Workspace + Component Library + Rules ← NEXT
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

# 13. V0.33 原 P0 判定复核

| 原判定项 | 当前状态 |
|---|---|
| Image / Icon / Table 不再 placeholder | 🟡 SVG Image + Icon + Table 已可用；PNG/JPEG 未完成 |
| 多选 / Align / Distribute | ✅ |
| Group/Ungroup 可保存并进入 history | ✅ Professional session |
| Copy/Paste + cross-panel strategy | 🟡 same-panel 可用；explicit target UX 待补 |
| Layers hide/lock/reorder | 🟡 hide/lock 有；top-level reorder 待补 |
| Numeric X/Y/W/H/R | ✅ |
| ruler/guide/snap consistency | 🟡 旧 Smart Guide 能力仍在，尚未全部统一进 V0.33 workspace |
| Panel Focus / Fit Panel | ✅ Panel Focus + Fit All |
| Undo/Redo 覆盖 V0.33 新操作 | ✅ session history |
| real browser edit regression | 🟡 CI gate 已建立，合并必须以最终 gate PASS 为前提 |

因此 V0.33 记为 **Professional 2D core 完成、hardening 未完全结束**，不虚构成 Illustrator/CAD 全能力完成。

---

# 14. V0.34 的 P0 完成判定

V0.34 进入 Shipping Marks 主线，至少需要：

1. 独立 Marks Workspace；
2. 结构化 Component Library；
3. 拖入 SKU / Weight / Dimension / Origin / Barcode / QR / Icon 等组件；
4. Variable picker + usage map；
5. 规则编辑器可配置 Package Count / Country / Customer 等条件；
6. missing-variable 可视化；
7. reusable block presets；
8. customer mark template 基础；
9. Marks 变更继续进入 Production PDF / Digital Decode / Preflight；
10. 至少一条真实浏览器 Marks 编辑回归。

完成后再进入 V0.35 2D↔3D，而不是转去 Backend/ERP。
