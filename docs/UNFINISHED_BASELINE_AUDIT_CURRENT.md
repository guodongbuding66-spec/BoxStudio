# BoxStudio 当前未完成清单 —— 对照最初 V1 / V2 / V3 开发文档

**当前审计版本**：V0.31  
**日期**：2026-10-04  
**历史首轮审计**：`docs/UNFINISHED_BASELINE_AUDIT.md`（V0.28）  
**增量记录**：`docs/BASELINE_PROGRESS_V0.29.md`、`docs/BASELINE_PROGRESS_V0.30.md`、`docs/BASELINE_PROGRESS_V0.31.md`

> 本文件只记录最初 V1/V2/V3 已经定义、但当前主线仍未完整关闭的工作。按钮、基础函数、本地模拟角色、Candidate PDF/X 或单元测试都不自动等于完整生产闭环。

## 状态

| 状态 | 含义 |
|---|---|
| ✅ | 当前主线已有真实实现，并有自动回归/可验证路径 |
| 🟡 | 有基础实现，但离最初文档定义的完整闭环仍有缺口 |
| ⬜ | 尚未形成对应实现 |
| EXT | 依赖第三方、印厂、真实硬件或真实业务环境，仓库内部不能单独宣称完成 |

# 1. P0 —— 生产正确性与上线前必关项

| 最初开发文档要求 | 当前 | V0.31 状态 | 仍未关闭 |
|---|---:|---|---|
| Barcode / QR Digital Decode Required Check | ✅ 数字稿 | 读取实际 Production PDF 矢量码区 → 内存栅格化 → Barcode/QR 解码 → 与 source 比较；失败进入 blocking preflight | EXT：实体印刷扫描、ISO barcode grade、外部 RIP raster 仍需外部验证 |
| Preview / PDF Fidelity | ✅ 核心关键点 | 解析 Production PDF MediaBox / rect / text anchor / line，与 Preview mm geometry 独立比较；默认阈值 `<=0.2 mm` | Cross-panel appearance 像素、转曲 glyph 全量可视差异仍由 serializer regression / 后续浏览器 E2E 补齐 |
| Current US Template real sample acceptance | 🟡 | 美线规则、CodeBlock、CRN、Origin、多包逻辑已数据化 | 真实原稿逐项叠加、尺寸测量、验收报告 |
| K-only / print-color production acceptance | 🟡 / EXT | Print Profile、Spot、OutputIntent、DeviceLink subset 已存在 | Acrobat/callas/印厂 RIP 检查，确认无意外 RGB/彩色对象 |
| PDF/X | 🟡 / EXT | 仍只称 `PDF/X-4 Candidate` | 第三方 Preflight / RIP 通过后才能称正式符合 |
| Font fidelity | 🟡 | 用户 TTF glyf outline 可进入生产 PDF | 真实字体 metrics、CFF/CFF2/OTF 策略、文本 measurement 验收 |
| Approved Revision immutable production source | 🟡 | Production Job fingerprint、revision、approval gate | 完整不可变 ArtworkSnapshot / TemplateSnapshot / RendererSnapshot + server persistence |
| Production Export traceability | 🟡 | 本地 audit、serializer fingerprint、artifact metadata | append-only server audit、真实用户身份、不可篡改 hash/signature |
| Browser Interaction E2E | ⬜ | 当前 CI 仍以 syntax/domain/serializer regression 为主 | 真实浏览器覆盖导入、编辑、3D、审批、批量、下载、恢复、迁移 |

# 2. V3 Phase 1 —— Production MVP 剩余项

| Phase 1 项目 | 当前 | 仍缺 |
|---|---:|---|
| Auth | ⬜ | 登录、Session、真实用户身份 |
| RBAC | 🟡 | 本地 viewer/operator/approver/admin | 服务端角色、资源权限、身份强制 |
| Template Version | 🟡 | 本地 revision/history | server immutable version、effective date、publish state |
| Business Form | 🟡 | 变量表单可用 | 根据 `TemplateVariable.ui` 自动生成 Business Mode |
| Factory Master | ⬜ | CRN 主要还是项目变量 | Factory CRUD、CRN version/effective date、引用关系 |
| Country Master | ⬜ | Origin/Destination 变量存在 | 标准 country code、显示规则、市场规则 |
| Rule Engine | 🟡 | Customer/Packaging/Mark Rules | 通用 `SET_VALUE / SET_TEXT / SET_STYLE / SET_LAYOUT / REQUIRE / DISABLE` schema |
| Computed Variable | 🟡 | Package Notice、尺寸格式等已有 | 正式 dependency graph / computed schema / error policy |
| Proof PDF Profile | 🟡 | Proof/3D proof 基础已有 | 统一 watermark / revision / template / preflight-status policy |
| Preflight | 🟡 | V0.31 已补 Digital Decode + Geometry Acceptance | 真实字体、image DPI、transparency、外部 Preflight Adapter |
| Revision | 🟡 | 本地 Production Job revision | server immutable ArtworkRevision + full snapshots |
| Audit | 🟡 | 本地 audit events | append-only server audit、old/new/reason/session/signature |
| Search | ⬜ | — | SKU / Contract / PO / Factory / CRN / Customer / Template / Revision / Date / Status |

# 3. V3 Phase 1.5 —— Excel & Batch 剩余项

当前已进入主线：Upload、Multi-sheet、Mapping、双语 Alias、Header Detection、merged-cell expansion、受控 Fill Down、Footer Stop、Formula no-cache diagnostics、leading-zero zero-mask subset、Import Review、Dry Run、Worker Batch、Partial Failure、Retry、ZIP、`failed_rows.csv/.xlsx`、source-cell lineage。

| 项目 | 当前 | 仍缺 |
|---|---:|---|
| Persistent Mapping Profile | ✅ 本地 | Customer/Supplier 级服务端 Profile、权限、版本 |
| Alias Registry | 🟡 | 内置双语 Alias | 客户/模板可配置、版本化 Alias |
| Duplicate bilingual header handling | ⬜ | Header detection 已有 | 自动跳过/合并重复中英文 Header 的正式策略 |
| Formula Cell | 🟡 | 无缓存公式可定位 | 受控 Formula Engine 或明确 `policy=ERROR` |
| Leading-zero recovery | 🟡 | 明确纯零 number format | 科学计数法、复杂 custom format 的安全策略 |
| Preflight Issue → exact Cell | 🟡 | lineage + field inference | 每个 Issue 原生携带 canonical `field/path` |
| Import Review Inline Correction | ⬜ | filter/search/sort/open row | 表内修正、重新校验、变化标记 |
| Re-upload Compare | ⬜ | 可重新导入 | 新旧 Import Job diff / 保留修正策略 |
| Server ImportJob | ⬜ | 浏览器状态/worker | identity、user、audit、idempotency、retry contract |
| Large workbook validation | ⬜ | — | streaming/memory/performance benchmark |

# 4. V3 Phase 2 —— Template Designer 剩余项

| 项目 | 当前 | 仍缺 |
|---|---:|---|
| Object tools | ✅ | — |
| Layer / visibility / lock | ✅ 基础 | 统一成熟 Layer Panel UX |
| Variable Binding | ✅ | — |
| Rule Binding | 🟡 | 规则已有 | 通用 action + visual rule authoring |
| Panel-aware Geometry | ✅ | — |
| Guides / Ruler / Snap | ✅ | — |
| Multi-select / Align / Distribute | ✅ | — |
| Group / Ungroup | 🟡 | CodeBlock / shared transform | 任意对象正式 Group/Ungroup model |
| Undo / Redo | 🟡 | 核心编辑 history | overlay/profile/clip/mapping 全部统一 command history |
| Copy / Paste | 🟡 | duplicate 基础 | 完整 selection clipboard / 跨 panel policy |
| Template Publish Pipeline | ⬜ | CI regression ≠ publish workflow | Draft → Tests → Sample Render → Preflight → Review → Approve → Publish |
| Template Fixtures | 🟡 | 全局 tests 很多 | 每个 Template 自带 fixtures / expected snapshots / required checks |
| Business/Admin Mode Separation | 🟡 | lock/profile UI 基础 | Auth/RBAC + Template Policy 的真正双模式 |

# 5. V3 Phase 2.5 —— Workflow 剩余项

| 项目 | 当前 | 仍缺 |
|---|---:|---|
| Reviewer / Approver | 🟡 | 本地 approve/reject | assignment、Inbox、server identity |
| Stale Approval | ✅ 基础 | server immutable implementation 仍依赖 backend |
| Blocking Comment | ⬜ | comment thread + resolve gate |
| Conversation Resolution | ⬜ | thread lifecycle |
| Two-step Approval | ⬜ | 多人审批策略 |
| Separation of Duties | ⬜ | 提交人不能最终批准自己的服务端强制 |
| Scheduled Publish | ⬜ | effective date / scheduled release |
| Notifications | ⬜ | Email / Webhook / Slack / Teams |
| External Proof Link | ⬜ | token、expiry、view-only、comment、optional approve |
| Rejection Reason Taxonomy | ⬜ | 结构化原因 + 统计 |
| Published / Production State | 🟡 | Approved export gate | 完整 server state machine |

# 6. V3 Phase 3 —— Compare + Content 剩余项

| 项目 | 当前 | 仍缺 |
|---|---:|---|
| Structured Content | 🟡 | Mark assets / vars / templates | ContentItem / Version / Owner / EffectiveDate |
| Content Library | 🟡 | 本地 mark assets | Company Address / CRN / Legal Copy / Symbol / Logo single source of truth |
| Master Data vs Snapshot | 🟡 | frozen batch + approval fingerprint | 所有 ArtworkRevision 完整 frozen snapshot |
| Impact Analysis | ⬜ | — | Master Data 变化 → 受影响 Template/Artwork |
| Revision Compare | ⬜ | — | 标准 comparison domain |
| Text Compare | ⬜ | — | — |
| Graphics Compare | ⬜ | — | — |
| Barcode / QR Compare | ⬜ | — | — |
| Dieline Compare | ⬜ | — | — |
| Side-by-side / Overlay / Difference / Flicker | ⬜ | — | 正式 Compare UI |
| Dashboard | ⬜ | — | Draft/Pending/Rejected/Approved + KPI |
| Reporting / Bottleneck | ⬜ | — | approval time、failure rate、rejection reason |

# 7. V3 Phase 3.5 —— 3D 剩余项

| 项目 | 当前 | 仍缺 |
|---|---:|---|
| Panel Fold | ✅ | — |
| Artwork Texture Mapping | ✅ | — |
| Orientation Review | ✅ | — |
| 2D ↔ 3D Selection | 🟡 | 共享 geometry | 双向点击联动 / focus UX |
| Physical Fold Compensation | ⬜ / EXT | 理想几何折叠 | board thickness、bend radius、factory-verified print stretch |
| Color-managed 3D Soft Proof | ⬜ / EXT | 当前仅位置/方向 review | 显示器/ICC proof pipeline |

# 8. V3 Phase 4 —— Enterprise 剩余项

仍未完成：

- ERP Adapter；
- PIM / PLM；
- 正式 REST API；
- Webhook；
- SSO；
- SCIM；
- Supplier Portal；
- Print Vendor Portal；
- External Preflight Adapter；
- S3 / Cloudflare R2 生产资产持久化；
- Server Queue / Redis/BullMQ 或平台 Queue；
- Retention / Backup / Data Region；
- External Share Expiry Policy。

# 9. Production Bundle / Deterministic Rendering —— 下一主线 P0

V3 明确要求正式生产包可包含：

```text
Production.pdf
Proof.pdf
Preview.png
PreflightReport.pdf / json
DataSnapshot.json
Manifest.json
```

并记录 Template Version、Preflight Profile Version、Renderer Version、Generated At、User、SHA-256。

当前仍缺：

- 正式 `ProductionBundle` schema；
- 一键打包；
- cryptographic SHA-256；
- full immutable DataSnapshot / TemplateSnapshot / RendererSnapshot；
- bundle-level reproducibility regression；
- server immutable archive。

**计划：V0.32。**

# 10. ICC / Color / Prepress 剩余项

已验证：RGB→CMYK DeviceLink `mft1/LUT8`、`mft2/LUT16`，OutputIntent、Spot、Overprint、PDF/X-4 Candidate。

仍缺：

- ICC mAB / mBA；
- General Source ICC → Destination ICC CMM；
- Rendering Intent pipeline；
- Black Point Compensation；
- Proof Device Simulation；
- image DPI 全面 preflight；
- transparency 全面外部 preflight；
- 真实 printer/RIP profile 验收。

# 11. 当前开发顺序

```text
V0.32  Production Bundle + SHA-256 + immutable snapshot schema
V0.33  Master Data + Content Library domain
V0.34  Hosted Backend + Auth/RBAC + Database
V0.35  Template Publish + Artwork Workflow + Server Audit
V0.36  Compare + Impact Analysis + Search + Dashboard
V0.37  External Preflight + advanced ICC/CMM
V0.38  ERP / API / Webhook / SSO enterprise adapters
```

并行质量轨：

```text
Browser Interaction E2E
Current US Template real-sample acceptance
External PDF/X / RIP validation
Physical barcode/QR scanner validation
Factory board / fold / print compensation validation
```

# 12. 完成判定原则

1. 代码主线有真实实现；
2. 有自动回归或明确验收证据；
3. UI 按钮不等于业务闭环；
4. 本地角色不等于 Auth/RBAC；
5. PDF/X Candidate 不等于第三方认证；
6. Digital Decode 不等于实体印刷 ISO Grade；
7. 3D Review 不等于 Production Source；
8. 需要印厂/第三方/硬件验证的项目，在外部证据出现前保持 `EXT`。
