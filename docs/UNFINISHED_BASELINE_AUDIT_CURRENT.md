# BoxStudio 当前未完成清单 —— 对照最初 V1 / V2 / V3 开发文档

**当前审计版本**：V0.30  
**日期**：2026-10-04  
**历史首轮审计**：`docs/UNFINISHED_BASELINE_AUDIT.md`（V0.28）  
**增量记录**：`docs/BASELINE_PROGRESS_V0.29.md`、`docs/BASELINE_PROGRESS_V0.30.md`

> 本文件是当前继续开发时使用的“剩余工作清单”。它不重新扩需求，只保留最初 V1.0、V2.0、V3.0 已经提出、但截至 V0.30 尚未完整关闭的内容。已经存在基础函数/按钮但没有形成完整生产闭环的项目仍标记为“部分完成”。

## 状态

| 状态 | 含义 |
|---|---|
| ✅ | 当前主线已有实现并有可验证回归路径 |
| 🟡 | 有基础实现，但未达到最初文档定义的完整闭环 |
| ⬜ | 尚未形成对应实现 |
| EXT | 必须依赖第三方 / 印厂 / 真实硬件验证，仓库内部不能单独宣称完成 |

# 1. P0 —— 生产正确性与上线前必关项

| 最初开发文档要求 | 当前 | V0.30 真实状态 | 未完成定义 |
|---|---:|---|---|
| Barcode / QR Digital Decode Required Check | ⬜ | 当前能生成 Barcode/QR，也有格式级 preflight | Production PDF rasterize 后自动 decode，回读值与 source value 一致；失败必须阻止 Production |
| Preview / PDF Fidelity | 🟡 | Preview/PDF 共享 mm geometry，生产 PDF 为 vector | 建立独立几何验收工具；关键点误差目标 `<= 0.2 mm`，不能只靠“同源代码”推断 |
| Current US Template real sample acceptance | 🟡 | 美线模板规则、CodeBlock、CRN、Origin、多包逻辑已数据化 | 用真实原稿逐项叠加/测量，形成正式 acceptance report |
| K-only / print-color production acceptance | 🟡 | 有 print profile、spot、ICC、DeviceLink subset | 外部 RIP / Acrobat/callas/印厂检查；确认无意外 RGB/彩色对象 |
| PDF/X | 🟡 / EXT | 当前只称 `PDF/X-4 Candidate` | 第三方 Preflight / RIP 通过后才可称正式符合 |
| Font fidelity | 🟡 | 用户 TTF glyf outline 可进入生产 PDF | 真实字体 metrics、CFF/CFF2/OTF 策略、Preview/PDF text measurement 验收 |
| Approved Revision immutable production source | 🟡 | 有 Production Job fingerprint、revision、approval gate | 完整不可变 ArtworkSnapshot / TemplateSnapshot / RendererSnapshot + server persistence |
| Production Export traceability | 🟡 | 本地 audit + serializer fingerprint + artifact metadata | server append-only audit、用户身份、不可篡改 hash/signature |
| Browser Interaction E2E | ⬜ | CI 主要是 syntax / domain / serializer regression | 真实浏览器覆盖导入、编辑、3D、审批、批量、下载、恢复、迁移 |

# 2. P0 / P1 —— V3 Phase 1 Production MVP 仍未关闭

| Phase 1 项目 | 当前 | 仍缺 |
|---|---:|---|
| Auth | ⬜ | 登录、Session、用户身份、密码/SSO 边界 |
| RBAC | 🟡 | 有本地 viewer/operator/approver/admin 逻辑 | 服务端角色与资源权限、真实身份强制 |
| Template Version | 🟡 | 本地 master revision/history | server immutable version、effective date、publish 状态 |
| Business Form | 🟡 | 当前变量表单可用 | 真正按 `TemplateVariable.ui` 自动生成 Business Mode |
| Factory Master | ⬜ | CRN 仍主要是项目变量 | Factory CRUD、CRN version/effective date、引用关系 |
| Country Master | ⬜ | Origin/Destination 变量存在 | 标准 country code、显示规则、市场规则 |
| Rule Engine | 🟡 | Customer/Packaging/Mark Rules 已有 | SET_VALUE / SET_TEXT / SET_STYLE / SET_LAYOUT / REQUIRE / DISABLE 的通用正式 schema |
| Computed Variable | 🟡 | Package Notice、尺寸格式等已有 | 正式 dependency graph / computed schema / error policy |
| Proof PDF Profile | 🟡 | Proof renderer/3D proof 已有 | 统一 Watermark / Revision / Template / Preflight Status policy |
| Preflight | 🟡 | 数据/布局/PDF candidate 等已有 | Digital Decode、真实字体、DPI/transparency 完整规则、外部 adapter |
| Revision | 🟡 | 本地 Production Job revision | server immutable ArtworkRevision + full snapshots |
| Audit | 🟡 | 本地 audit events | append-only server audit、old/new/reason/session/signature |
| Search | ⬜ | 无完整搜索产品页 | SKU / Contract / PO / Factory / CRN / Customer / Template / Revision / Date / Status |

# 3. V3 Phase 1.5 Excel & Batch —— V0.30 后剩余项

主流程已经明显收敛：Upload、Multi-sheet、Mapping、双语 Alias、Header Detection、Merge/Fill Down、Footer Stop、Formula no-cache diagnostics、leading-zero zero-mask subset、Import Review table、Dry Run、Batch Worker、Partial Failure、Retry、ZIP、`failed_rows.xlsx` 已进入主线。

仍未关闭：

| Excel / Batch 项目 | 当前 | 仍缺 |
|---|---:|---|
| Persistent Mapping Profile | ✅ 本地 | 若按完整平台定义，仍需 Customer/Supplier 级服务端 Profile、权限、版本 |
| Alias Registry | 🟡 | 内置双语 Alias | 客户/模板可配置、版本化 Alias |
| Duplicate bilingual header handling | ⬜ | 可自动识别 header | 自动跳过/合并中英文重复 Header 的正式策略 |
| Formula Cell | 🟡 | 无缓存公式可定位 Warning | 若业务需要，需受控 Formula Engine；否则明确 policy=ERROR |
| Leading-zero recovery | 🟡 | 支持明确纯零 number format | 科学计数法、复杂 custom number formats 的安全恢复/警告 |
| Preflight Issue → exact Cell | 🟡 | 已有 source lineage + 部分 field inference | 每个 Preflight Issue 原生携带 canonical `field/path`，取消启发式猜测 |
| Import Review Inline Correction | ⬜ | 有 filter/search/sort/open row | 表格内修正、重新校验、变化标记 |
| Re-upload compare | ⬜ | 可重新导入 | 新旧 Import Job diff、保留修正/映射策略 |
| Server ImportJob | ⬜ | 浏览器状态/worker | job identity、user、server audit、idempotency、retry contract |
| Large workbook validation | ⬜ | 未做规模验收 | streaming/memory/performance benchmark |

# 4. V3 Phase 2 Template Designer 仍未关闭

| 项目 | 当前 | 仍缺 |
|---|---:|---|
| Object tools | ✅ | — |
| Layer / visibility / lock | ✅ 基础 | 如需成熟 Designer，仍需统一 Layer panel UX |
| Variable Binding | ✅ | — |
| Rule Binding | 🟡 | 规则已有 | 更完整通用 action + designer rule authoring |
| Panel-aware Geometry | ✅ | — |
| Guides / Ruler / Snap | ✅ | — |
| Multi-select / Align / Distribute | ✅ | — |
| Group / Ungroup | 🟡 | CodeBlock / shared transform 有 | 任意对象的正式 Group/Ungroup model |
| Undo / Redo | 🟡 | 核心编辑已有 history | 所有 overlay / profile / clip / batch mapping 操作统一 command history |
| Copy / Paste | 🟡 | 部分 duplicate 能力 | 完整 selection clipboard 与跨 panel policy |
| Template Publish Pipeline | ⬜ | CI regression 存在 | Draft → Tests → Sample Render → Preflight → Review → Approve → Publish |
| Template Fixtures | 🟡 | 全局 tests 很多 | 每个 Template 自带 fixtures、expected snapshots、required checks |
| Business / Admin mode separation | 🟡 | locked variables/groups/profile UI | 基于 Auth/RBAC + Template Policy 的真正双模式产品 |

# 5. V3 Phase 2.5 Workflow 仍未关闭

| 项目 | 当前 | 仍缺 |
|---|---:|---|
| Reviewer / Approver | 🟡 | 本地角色与 approve/reject | 用户 assignment、Inbox、server identity |
| Stale Approval | ✅ 基础 | server immutable implementation 仍依赖 backend |
| Blocking Comment | ⬜ | 评论线程 + resolve gate |
| Conversation Resolution | ⬜ | thread lifecycle |
| Two-step Approval | ⬜ | 多人审批策略 |
| Separation of Duties | ⬜ | 提交人不能最终批准自己的服务端强制 |
| Scheduled Publish | ⬜ | effective date / scheduled release |
| Notifications | ⬜ | Email / Webhook / Slack / Teams |
| External Proof Link | ⬜ | token、expiry、view-only、comment、optional approve |
| Rejection Reason Taxonomy | ⬜ | 结构化原因与统计 |
| Published / Production state | 🟡 | Approved export gate | 完整 server state machine |

# 6. V3 Phase 3 Compare + Content 仍未关闭

| 项目 | 当前 | 仍缺 |
|---|---:|---|
| Structured Content | 🟡 | Mark assets / variables / templates | ContentItem / Version / Owner / EffectiveDate |
| Content Library | 🟡 | 本地 mark assets | Company Address / CRN / Legal Copy / Symbol / Logo single source of truth |
| Master Data vs Snapshot | 🟡 | frozen batch + approval fingerprint | 所有 ArtworkRevision 的完整 frozen snapshot |
| Impact Analysis | ⬜ | Master Data 变化 → 受影响 Templates/Artwork |
| Revision Compare | ⬜ | 标准 comparison domain |
| Text Compare | ⬜ | — |
| Graphics Compare | ⬜ | — |
| Barcode / QR Compare | ⬜ | — |
| Dieline Compare | ⬜ | — |
| Side-by-side / Overlay / Difference / Flicker | ⬜ | 正式 Compare UI |
| Dashboard | ⬜ | Draft/Pending/Rejected/Approved/KPI |
| Reporting / Bottleneck | ⬜ | approval time、failure rate、rejection reasons |

# 7. V3 Phase 3.5 3D 仍未关闭

| 项目 | 当前 | 仍缺 |
|---|---:|---|
| Panel Fold | ✅ | — |
| Artwork texture mapping | ✅ | — |
| Orientation Review | ✅ | — |
| 2D ↔ 3D selection | 🟡 | 共享 panel/geometry 数据 | 双向点击联动和 selection focus 的完整产品 UX |
| Physical fold compensation | ⬜ / EXT | 几何折叠为理想模型 | board thickness、bend radius、factory-verified print stretch compensation |
| Color-managed 3D soft proof | ⬜ / EXT | 当前 3D 仅用于位置/方向 | 需要显示器/ICC proof pipeline；不应混同普通 3D preview |

# 8. V3 Phase 4 Enterprise 仍未关闭

以下基本仍属于未完成：

- ERP Adapter；
- PIM / PLM；
- 正式 REST API；
- Webhook；
- SSO；
- SCIM；
- Supplier Portal；
- Print Vendor Portal；
- External Preflight Adapter；
- S3 / Cloudflare R2 持久化生产资产；
- Server Queue / Redis/BullMQ 或平台 Queue；
- Retention / Backup / Data Region；
- External share expiry policy。

# 9. Production Bundle / Deterministic Rendering 仍未关闭

V3 明确建议正式生产包包含：Production PDF、Proof PDF、Preview、Preflight Report、DataSnapshot、Manifest，并记录 SHA-256。

当前已有单项输出、artifact metadata、frozen batch context 与 production fingerprint，但仍缺：

- 一个正式的 Production Bundle schema；
- `Production.pdf` / `Proof.pdf` / `PreflightReport.json|pdf` / `DataSnapshot.json` / `Manifest.json` 一键打包；
- cryptographic SHA-256 output hash；
- manifest 中的 Template Version / Preflight Profile Version / Renderer Version / User / Generated At；
- bundle-level reproducibility test；
- server immutable archive。

# 10. ICC / Color / Prepress 仍未关闭

已验证子集：RGB → CMYK DeviceLink `mft1/LUT8`、`mft2/LUT16`，OutputIntent、Spot、Overprint、PDF/X-4 Candidate 路线已存在。

尚未完成：

- ICC mAB / mBA；
- General Source ICC → Destination ICC CMM；
- Rendering Intent pipeline；
- Black Point Compensation；
- Proof Device Simulation；
- image DPI 全面 preflight；
- transparency 全面外部 preflight；
- 真实 printer/RIP profile 验收。

# 11. 当前建议开发顺序

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

并行质量轨：

```text
Browser Interaction E2E
Current US Template real-sample acceptance
External PDF/X / RIP validation
Physical barcode/QR scanner validation
Factory board / fold / print compensation validation
```

# 12. 完成判定原则

后续只有满足以下条件，才从“部分完成/未完成”改为“完成”：

1. 代码主线存在真实实现；
2. 有自动回归或明确验收证据；
3. UI 按钮不等于业务闭环；
4. 本地模拟角色不等于 Auth/RBAC；
5. PDF/X Candidate 不等于第三方认证；
6. Digital Decode 不等于实体印刷 ISO Grade；
7. 3D Review 不等于 Production Source；
8. 需要印厂/第三方/硬件验证的项目，在外部证据出现前保持 `EXT`。
