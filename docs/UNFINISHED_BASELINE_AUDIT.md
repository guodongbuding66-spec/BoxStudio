# BoxStudio 未完成清单与开发前基线对照

**审计版本**：V0.28  
**日期**：2026-10-04  
**当前应用版本**：BoxStudio V0.28  
**主要对照基线**：《在线唛头网站_开发文档_V3.0_集百家之长终版.md》（2026-09-30，开发前 Baseline PRD + Technical Blueprint）  
**辅助对照**：《在线唛头网站_开发文档_V1.0.md》《在线唛头网站_开发文档_V2.0_开源项目调研版.md》

> 本文件的目的不是继续扩需求，而是把“最初承诺的产品路线”和当前代码真实状态放在一张表里。后续版本优先关闭这里的差距。未经真实实现/测试的项目不标记为完成。

## 状态定义

| 状态 | 含义 |
|---|---|
| ✅ 已完成 | 当前仓库已经存在可运行实现，并有模块/回归测试或明确可验证路径 |
| 🟡 部分完成 | 有实现基础，但没有覆盖开发前文档要求的完整业务闭环、生产质量或持久化边界 |
| ⬜ 未完成 | 当前主线没有对应完整实现 |
| 🚫 初始明确非优先 | V3.0 已明确不是现阶段核心，不计入“欠账” |

---

# 1. 总体结论

V0.28 已经把最初文档里最困难的一批“浏览器内包装几何 / Artwork / Production PDF / 3D / Batch”技术问题推进得比开发前 PoC 计划更深，包括：参数化几何、Panel/Fold Graph、SVG/PDF/AI/DXF 导入、Cross-panel Artwork、Native PDF Gradient/Soft Mask、Bezier Clip、DeviceLink LUT8/LUT16、3D Fold Texture、Recoverable Worker Batch、Production Approval Fingerprint 等。

但与 V3.0 的**完整产品定义**相比，当前项目仍主要是“强功能本地 Web 原型 + 生产渲染内核”，尚未成为 V3.0 设想的“多用户、可审计、内容中心化、工作流化、企业集成”的完整平台。

当前最大的结构性缺口不是再加更多画布效果，而是：

1. **Hosted Backend + Auth/RBAC + Server Database**；
2. **Factory / Country / Customer / Product Master Data 与 Content Library**；
3. **真正冻结的 Artwork Revision Snapshot 与不可篡改 Server Audit**；
4. **Template Draft/Test/Approve/Publish 生命周期**；
5. **完整 Excel Import Engine（Header Detection / Fill Down / TOTAL / Cell-level Error lineage）**；
6. **Digital Barcode / QR Decode Verification**；
7. **Revision Compare / Impact Analysis / Dashboard / Search**；
8. **Blocking Comment / Two-step Approval / Scheduled Publish / Notification / External Proof Link**；
9. **Browser E2E、物理尺寸验证、真实字体度量、外部 PDF/X/RIP Preflight**；
10. **ERP/PIM/PLM/API/Webhook/SSO/SCIM 与 Vendor/Supplier Portal**。

---

# 2. V3.0 Phase 1 —— 生产可用 MVP 对照

V3.0 §97 定义 Phase 1：Auth、Template Version、Current US Template、Business Form、Variable Binding、Factory Master、Country Master、Rule Engine、Computed Field、CodeBlock、SVG Preview、Production PDF、Proof PDF、Preflight、Revision、Audit、Search。

| V3.0 项目 | 当前状态 | V0.28 真实情况 | 仍需完成 |
|---|---:|---|---|
| Auth | ⬜ | 当前只有浏览器本地角色/权限逻辑，没有登录身份系统 | 登录、Session、密码/SSO 策略、服务端身份 |
| Template Version | 🟡 | Master Template 有本地 revision/history | 服务端 immutable version、effective date、publish 状态、回滚权限 |
| Current US Template | ✅ | 美线侧封箱变量、CodeBlock、条件包裹提示、CRN、Origin 等已实现 | 继续用真实客户稿做生产验收 |
| Business Form | 🟡 | 有变量表单和 profile UI | 还不是完全由 `TemplateVariable.ui` 自动生成的 Business Mode |
| Variable Binding | ✅ | 同字段多位置绑定、模板变量替换已存在 | — |
| Factory Master | ⬜ | 当前 CRN 是项目变量，不是正式 Factory Master 关系 | Factory CRUD、CRN version、effective date、绑定与影响分析 |
| Country Master | ⬜ | Origin/Destination 是变量 | Country Master、标准代码、显示规则、市场规则 |
| Rule Engine | 🟡 | Customer/Packaging/Mark Rule 已配置化 | 补齐 V3.0 规划的 SET_VALUE/SET_TEXT/SET_STYLE/SET_LAYOUT/REQUIRE/DISABLE 等通用动作模型 |
| Computed Field | 🟡 | Package Notice、尺寸/重量文本已有自动格式化 | 建立正式 Computed Variable schema、依赖图、错误处理 |
| CodeBlock | ✅ | Barcode+QR 锁定组、250×80 / 200×64 已实现 | 需要真实扫描质量验证 |
| SVG Preview | ✅ | mm 几何源、SVG editor/preview 已存在 | — |
| Production PDF | ✅ | Vector PDF、Spot/Overprint、Native Gradient、Soft Mask、Native Cubic Appearance Clip、DeviceLink 路线 | PDF/X 仍是 Candidate；真实 RIP/印厂验收未完成 |
| Proof PDF | 🟡 | 有多种 Proof serializer / 3D proof | 缺统一正式 Proof Profile：Watermark、Revision、Template Version、Preflight Status |
| Preflight | 🟡 | 数据/结构/Barcode 格式/布局/PDF Candidate 等已有检查 | Digital Decode、真实字体、DPI/Transparency 完整规则、外部 preflight adapter、客户 profile 版本化 |
| Revision | 🟡 | Production Job revision + stale approval fingerprint | 缺服务端 immutable ArtworkRevision + 完整 DataSnapshot/TemplateSnapshot/RendererSnapshot |
| Audit | 🟡 | 本地 audit events、export event | 缺 server append-only audit、Old/New Value、Reason、IP/Session、签名/完整性保证 |
| Search | ⬜ | 没有完整 Artwork/Search 产品页 | SKU/Contract/PO/Factory/CRN/Customer/Template/Revision/Date/Status 搜索 |

## Phase 1 尚未关闭的 P0

- Auth + Hosted Backend
- Factory/Country Master
- formal TemplateVersion / ArtworkRevision Snapshot
- formal Proof Profile
- Digital Barcode/QR Decode
- Server Audit
- Search

---

# 3. V3.0 Phase 1.5 —— Excel & Batch 对照

V3.0 §31–35、§98 要求的不只是“能读 xlsx”，而是一个正式 Import Engine。

| V3.0 项目 | 当前状态 | 当前实现 | 未完成 |
|---|---:|---|---|
| Upload | ✅ | `.xlsx/.csv/.tsv` 导入 | — |
| Multi-sheet | ✅ | workbook sheet 读取和 sheet 选择基础已存在 | — |
| Mapping | ✅ | 字段 mapping + auto aliases | 保存为客户级 Mapping Profile 的完整生命周期仍需加强 |
| Alias | ✅ | `VAR_ALIASES` 已覆盖 SKU/NW/GW/CRN/Contract/Origin/Package 等 | 客户/模板可配置 alias registry 未完成 |
| Header Detection | ⬜ | 当前 `matrixToDataset()` 固定第一行作为 Header | 自动扫描 Header 行、跳过前置说明/重复中英文表头 |
| Fill Down | ⬜ | 当前 XLSX parser 未实现 merged-cell fill-down | 合并单元格/空白继承规则 |
| TOTAL Detection | ⬜ | 当前没有 TOTAL/SUBTOTAL/合计/总计终止检测 | Footer stop engine |
| Formula Cell Error | 🟡 | 读取缓存值基础存在 | 无缓存公式的 Cell-level ERROR 与定位未形成正式机制 |
| Barcode Clean / Leading Zero | 🟡 | 字符串映射基础存在 | Excel 数值化导致前导 0 丢失的系统化恢复/警告不完整 |
| Import Review | 🟡 | 有 batch rows / preflight | 缺完整 Filter/Sort/Jump-to-row/Export-error-xlsx/re-upload UI |
| Row Error | 🟡 | 每个 batch item 可以失败并记录错误 | 还没有稳定的 `Excel Sheet + Cell + Canonical Field` lineage |
| Dry Run | ✅ | 批量 preflight 可先检查 | — |
| Batch Generation | ✅ | Web Worker + frozen context | — |
| Partial Failure | ✅ | item 独立状态、Retry、passed artifact 可恢复 | — |
| ZIP | ✅ | IndexedDB recoverable artifacts + ZIP manifest | — |
| Batch Audit | 🟡 | serializer/color/fingerprint/manifest 已记录 | 缺服务端 Job/Audit 与用户身份 |
| Idempotency Key | 🟡 | frozen rows/base fingerprints 防配置漂移 | 没有正式服务端 idempotency key / duplicate-job contract |

## Phase 1.5 最高优先级缺口

1. Header Detection  
2. Merge/Fill Down  
3. TOTAL/Footer Stop  
4. Cell-level Error Lineage  
5. Import Review / failed_rows.xlsx  
6. Persistent Mapping Profile

---

# 4. V3.0 Phase 2 —— Template Designer 对照

| V3.0 项目 | 状态 | 说明 |
|---|---:|---|
| Object tools | ✅ | 移动、缩放、旋转、Bezier clip direct selection、Z-order 等已有 |
| Layer | ✅ | group/layer visibility/lock 基础已有 |
| Variable | ✅ | 模板变量绑定已有 |
| Rule | 🟡 | 可编辑规则基础已有；通用动作仍不完整 |
| Panel | ✅ | Panel-aware geometry / polygon panel / fold graph |
| Guides | ✅ | Persistent User Guide + object/spacing/baseline guides |
| Ruler | ✅ | editor ruler 基础存在 |
| Alignment | ✅ | Align / Distribute / smart alignment |
| Group | 🟡 | CodeBlock 锁定组、Cross-panel shared transform 已有；通用对象任意 Group/Ungroup 不完整 |
| Undo / Redo | 🟡 | 部分编辑路径有历史机制；还不是所有 Designer 操作的统一 command history |
| Exact X/Y/W/H | ✅ | 多处 numeric inspector / layout editor 已实现 |
| Bring Forward / Send Backward | ✅ | Object Z-order 已实现 |
| Publish Pipeline | ⬜ | 无正式 Template Draft → Tests → Review → Approve → Publish 服务端状态机 |
| Template Tests | 🟡 | CI regression 很强，但不是每个模板自带 fixtures + snapshot + publish required checks |
| Business/Admin Mode 隔离 | 🟡 | 锁变量/锁组/profile UI 有基础 | 尚未形成真正基于角色与 template policy 的完整双模式产品 |

---

# 5. V3.0 Phase 2.5 —— Workflow 对照

| V3.0 项目 | 状态 | 未完成部分 |
|---|---:|---|
| Reviewer | 🟡 | 当前有本地 Approver 角色概念，没有真实用户/assignment/inbox |
| Reject | ✅ | Local Production Job 支持 reject |
| Approve | ✅ | Local Production Job 支持 approve + stale fingerprint gate |
| Blocking Comment | ⬜ | 评论线程、resolve、blocking gate 未实现 |
| Conversation Resolution | ⬜ | 未实现 |
| Two-step Approval | ⬜ | 未实现双人/多人最终批准策略 |
| Separation of Duties | ⬜ | “作者不能批准自己”没有真实身份层，无法可靠强制 |
| Scheduled Publish | ⬜ | effective date / schedule 未实现 |
| Notifications | ⬜ | Email/Webhook/Slack/Teams 未实现 |
| External Proof Link | ⬜ | token / expiry / view-only / comment / approve 链路未实现 |
| Rejection Reason Taxonomy | ⬜ | 无结构化拒绝原因统计 |
| Production Publish 状态 | 🟡 | 有 Approved Production Gate | 尚无完整 APPROVED→PUBLISHED→PRODUCTION 服务端状态机 |

---

# 6. V3.0 Phase 3 —— Compare + Content 对照

这是当前与最初“成熟 Artwork 平台”定位差距最大的模块之一。

| V3.0 项目 | 状态 | 说明 |
|---|---:|---|
| Structured Content | 🟡 | Mark Assets / Templates / Variables 有基础 | 不是正式 ContentItem / ContentVersion / Owner / EffectiveDate 模型 |
| Content Library | 🟡 | 有本地 mark assets | 缺公司地址、CRN、Legal Copy、Symbol、Logo 等 single-source-of-truth 内容中心 |
| Master Data vs Snapshot | 🟡 | Frozen Batch Context + Production Fingerprint 已有 | 没有所有 Artwork Revision 的完整不可变 data snapshot |
| Impact Analysis | ⬜ | Master Data 改动后列出受影响 Template/Artwork 未实现 |
| Revision Compare | ⬜ | 未实现统一 revision comparison |
| Text Compare | ⬜ | 未实现 |
| Graphics Compare | ⬜ | 未实现 |
| Barcode/QR Compare | ⬜ | 未实现 |
| Dieline Compare | ⬜ | 未实现 |
| Side-by-side / Overlay / Difference / Flicker | ⬜ | 未实现正式 Compare UI |
| Dashboard | ⬜ | Draft/Pending/Rejected/Approved 和质量 KPI dashboard 未实现 |
| Reporting / Bottleneck | ⬜ | 未实现 |

---

# 7. V3.0 Phase 3.5 —— 3D 对照

| V3.0 项目 | 状态 | 说明 |
|---|---:|---|
| Panel Fold | ✅ | Hinge-pivot Fold 0–100% 已实现 |
| Artwork → Panel Texture | ✅ | Panel Artwork Atlas / Cross-panel fragment texture 已实现 |
| Orientation Check | ✅ | 3D 用于方向/面/图稿核对 |
| 2D → 3D Selection | 🟡 | 有同一几何/Panel 数据源，但完整点击联动仍未形成成熟产品交互 |
| 3D → 2D Selection | 🟡 | 同上 |
| Review Link | ⬜ | 外部 3D Review Link 未实现 |
| Physical Board Thickness/Bend Radius | ⬜ | 当前不是物理纸板仿真 |
| Verified Print Stretch | ⬜ | 未实现经过生产数据验证的折弯印刷拉伸补偿 |
| Calibrated Soft Proof | ⬜ | 浏览器 3D 仍是 sRGB 几何/位置 proof，不是显示器校色 soft proof |

V3.0 已明确“3D 不是 Production Source”，当前实现仍遵守该原则。

---

# 8. V3.0 Phase 4 —— ERP / Enterprise 对照

| V3.0 项目 | 状态 | 说明 |
|---|---:|---|
| ERP Adapter | ⬜ | 未实现 |
| PIM | ⬜ | 未实现 |
| PLM | ⬜ | 未实现 |
| REST API | 🟡 | 有 REST persistence adapter / revision foundation | 没有 V3.0 规划的 hosted `/api/templates` `/api/artworks` `/api/imports` 服务 |
| Webhook | ⬜ | 未实现 |
| SSO | ⬜ | 未实现 |
| SCIM | ⬜ | 未实现 |
| MFA | ⬜ | 未实现 |
| External Preflight Adapter | ⬜ | 未接 Acrobat/callas/Enfocus/RIP 类验证结果 |
| Print Vendor Portal | ⬜ | 未实现 |
| Supplier Portal | ⬜ | 未实现 |
| Cloud Object Storage | ⬜ | 当前 recoverable artifact 是 IndexedDB；没有 S3/R2 production storage |
| Server Queue | ⬜ | 当前是 browser Web Worker queue；没有 Redis/BullMQ/managed queue |
| Hosted PostgreSQL/Prisma Data Model | ⬜ | 当前不是 server database app |

---

# 9. V3.0 Preflight / Production Quality 对照

## 9.1 已有较强基础

- Required / Variable / cross-field 基础检查；
- Safe area / bounds / geometry / fold graph 检查；
- Barcode symbology / checksum 的部分逻辑；
- CodeBlock size / composite integrity 基础；
- PDF vector production；
- Spot separation / overprint；
- PDF/X-4 Candidate metadata + OutputIntent；
- Native axial/radial gradient；
- gradient Soft Mask；
- DeviceLink LUT8/mft1、LUT16/mft2；
- Production serializer fingerprint binding；
- Batch frozen context / artifact fingerprint。

## 9.2 仍未达到 V3.0 Production DoD

| 初始要求 | 状态 | 差距 |
|---|---:|---|
| Barcode / QR Digital Decode | ⬜ | 尚未把 Production PDF rasterize 后自动 decode 作为 Required Check |
| Hardware / ISO Grade | ⬜ | 初始文档也明确 Digital Decode ≠ 实物 ISO Grade；仍需外部报告 adapter |
| Text Overflow / Copyfit | 🟡 | 有 bounds/safe 检查，但没有统一 Auto Fit / maxLines / overflowPolicy 引擎 |
| Real Font Measurement | 🟡 | TTF outline 能力存在；Preview/PDF 统一真实 font metrics 仍不完整 |
| Missing Font Hard Error | 🟡 | TTF outline 路径会要求 font；完整 Font Registry/版本/License/embedding policy 未完成 |
| Image DPI | ⬜ | 当前主路线主要 vector；通用 raster asset DPI preflight 未形成完整策略 |
| K-only Current US Profile | 🟡 | 单黑规则/print profile 有基础；尚无外部 RIP/Acrobat 级实证报告 |
| PDF/X Compatibility | 🟡 | 仅 `PDF/X-4 Candidate`，不是第三方认证 |
| Output physical dimensions | 🟡 | 使用 mm→pt 同源几何，但没有形成开发前 PoC E 的真实打印/测量验收记录 |
| Preview/PDF <= 0.2mm PoC | 🟡 | Single Geometry Source 已降低偏差风险，但没有物理/独立测量证明 `<=0.2mm` |
| ICC full CMM | 🟡 | DeviceLink LUT8/LUT16 是已验证子集；mAB/mBA、Source→Destination CMM、BPC 未完成 |

---

# 10. V3.0 Production Bundle / Determinism 对照

V3.0 §50–54 要求 Production Bundle：Production.pdf、Proof.pdf、Preview.png、PreflightReport.pdf/json、DataSnapshot.json、Manifest.json，并记录 Template Version、Preflight Profile Version、Renderer Version、Generated At、User、SHA256。

当前状态：**🟡 部分完成**。

已经有：

- Production PDF；
- Batch ZIP；
- Artifact manifest；
- serializer / colorSpace / DeviceLink fingerprint；
- rows fingerprint；
- frozen batch base state；
- production approval fingerprint；
- local export audit。

仍需：

- 统一单个 Artwork 的 Production Bundle；
- Proof.pdf 标准化；
- Preview.png；
- PreflightReport.pdf；
- PreflightReport.json 的稳定 schema；
- DataSnapshot.json；
- TemplateSnapshot / RuleProfile snapshot；
- SHA-256 cryptographic output hash（当前部分指纹不是安全哈希）；
- 每次 production export 的 immutable manifest；
- Historical Revision 一键重放/重现验证。

---

# 11. V3.0 Template Publication / Regression 对照

V3.0 要求：

```text
Draft Template
→ Template Tests
→ Sample Data Render
→ Preflight
→ Visual Review
→ Approve
→ Publish
```

当前状态：**🟡 CI 很强，但产品工作流未完成**。

已有：

- GitHub Syntax + Smoke + V0.10→当前版本 regression；
- Master Template local revision/history；
- 多类 production module test；
- serializer regression。

仍缺：

- 每个正式 Template 自带 Fixtures；
- `single_package.json / multi_package / long_sku / missing_crn / invalid_weight` 等正式 template test cases；
- Template publish required checks；
- sample render snapshot diff；
- visual approval；
- published/effective version；
- rollback policy；
- Operator 只看到 Published Template。

---

# 12. 开发前 PoC A–H 对照

| PoC | 状态 | 说明 |
|---|---:|---|
| A 当前 PDF → Base Template / 1:1 mm | 🟡 | PDF/AI/SVG geometry 导入和 mm model 已很强，但原始美线 PDF 的最终工厂级 1:1 校准验收未形成签字/报告 |
| B Variables | ✅ | SKU/NW/GW/Meas/CRN/Contract/Origin 已实现 |
| C Panel / Rotation | ✅ | Panel aware + 0/90/180/270 + free rotate |
| D CodeBlock | ✅ | Barcode+QR group + 250×80/200×64 + PDF/SVG |
| E Preview/PDF Fidelity <= 0.2mm | 🟡 | 同源几何已实现；缺独立测量验证 |
| F Digital Decode | ⬜ | 未完成 Production PDF rasterize → barcode/QR decode required check |
| G Font Measurement | 🟡 | TTF outline 已有；Preview/PDF 真实 metric parity 未完成 |
| H K-only | 🟡 | Print profile/preflight 基础已有；缺外部 production preflight 证明 |

---

# 13. MVP Definition of Done 对照

V3.0 §116 的原始 DoD 逐项：

| DoD | 状态 | 说明 |
|---|---:|---|
| 当前美线稿完全数据化 | ✅ | 核心字段/条件/布局已数据化 |
| 同一字段多个位置永远同步 | ✅ | 变量绑定实现 |
| 多包规则自动正确 | ✅ | packageCount 条件实现 |
| 工厂切换 CRN 自动同步 | 🟡 | 同一 CRN 变量多处同步已实现；真正 Factory Master 切换未实现 |
| Origin 自动同步 | 🟡 | Origin 变量绑定已有；Factory/Country Master 关系未实现 |
| CodeBlock 不可拆分 | ✅ | 锁定组合模型已有 |
| Preview / PDF 几何高度一致 | 🟡 | Single Geometry Source 已实现；缺 <=0.2mm 独立验收 |
| 生产稿 Vector 为主 | ✅ | 已实现 |
| PDF 物理尺寸正确 | 🟡 | mm→pt 构建正确；缺真实打印测量验收 |
| K-only Profile 通过 | 🟡 | 内部规则基础有；无外部正式 preflight 证明 |
| Barcode / QR Digital Decode 通过 | ⬜ | 未完成 |
| Excel 批量可追踪错误 | 🟡 | item error 可追踪；缺 cell/field lineage 与 failed_rows.xlsx |
| Approved Revision 不可原地修改 | 🟡 | stale approval fingerprint 会失效；浏览器本地数据本身并非 server-immutable |
| 所有 Export 可追溯 | 🟡 | local audit / manifest 有；不是 server authoritative trail |
| 历史 Revision 可重现 | 🟡 | frozen batch context / fingerprints 有；完整 snapshot bundle replay 未完成 |

---

# 14. V1/V2 到 V3 的原始方向，哪些已兑现

V1 的核心方向是：模板化、变量绑定、Business Mode Guardrails、CodeBlock、Preflight、Production/Proof 输出、角色与审批。当前 **编辑/渲染内核大部分已经兑现**，但 V1 提到的真实数据库、Factory Library、用户角色/审核闭环仍未落地。

V2 在开源调研后强化：Visual Canvas、Layer/Grid/Snap/Multi-select、批量生成、Barcode、JSON template、Excel 容错。当前 **Designer 交互、几何、批量 Worker、Barcode 生成已经明显超过早期 PoC**；但 Excel 的 Header/FillDown/Footer/Cell-lineage 仍未达到 V2/V3 设定的正式 Import Engine 水平。

V3 把产品最终定位升级为：

> 数据驱动、规则约束、可审计的包装外箱 Artwork 自动生成平台。

目前“数据驱动 + 规则约束 + 生产渲染”已形成较深实现；“多用户可审计平台 + Master Data + Workflow + Content + Enterprise Integration”仍是主要未完成面。

---

# 15. 初始文档中明确“不优先”的项目

以下不应该因为还没做就算作当前欠账，V3.0 §104 已明确不优先：

- 通用图片编辑；
- AI 生成设计；
- 自由绘画；
- 视频编辑；
- 动画；
- 素材市场；
- 复杂 3D 材质渲染；
- 直接连接大型纸箱印刷机；
- 全量 FEFCO CAD 生成器。

注意：标准 Structure Library / FEFCO 扩展仍属于长期规划，但“全量 FEFCO CAD”不是当前完成条件。

---

# 16. 当前新增技术债 / V0.28 后仍未完成

这些不一定全部来自初始 V3.0，但已经成为当前实现继续生产化必须关闭的技术债：

## P0 — 生产可信度

- [ ] Browser Interaction E2E：真实点击/拖拽/旋转/clip handle/batch UI 回归；
- [ ] Barcode + QR Production PDF Digital Decode Required Check；
- [ ] Preview/PDF 独立几何测量与 `<=0.2mm` 验收；
- [ ] Current US Template 真实印厂/RIP Preflight；
- [ ] K-only 外部验证；
- [ ] Native Cubic Object Clip 同步覆盖 SVG Outline Fragment（当前 Fill/Gradient/Soft Mask 已 native cubic，outline object-clip 仍 flattened）；
- [ ] Real Font Metrics parity；
- [ ] Production Bundle + cryptographic SHA-256 output hash。

## P1 — 产品闭环

- [ ] Hosted Backend；
- [ ] Auth + real RBAC；
- [ ] PostgreSQL/Prisma 或等价 server data model；
- [ ] Factory/Country/Customer/Product Master Data；
- [ ] Content Library；
- [ ] Immutable Artwork Revision Snapshot；
- [ ] Server append-only Audit；
- [ ] Template Publish Pipeline；
- [ ] Search；
- [ ] Compare / Impact Analysis。

## P1 — Excel Import Engine

- [ ] Header Detection；
- [ ] Fill Down / merged cell inheritance；
- [ ] TOTAL/SUBTOTAL/footer stop；
- [ ] Formula-no-cache error；
- [ ] leading-zero protection；
- [ ] Sheet/Cell/Field lineage；
- [ ] Import Review；
- [ ] failed_rows.xlsx；
- [ ] persistent Mapping Profiles。

## P2 — Workflow

- [ ] Blocking comments + resolve；
- [ ] Two-step approval；
- [ ] Separation of duties；
- [ ] Scheduled publish/effective dates；
- [ ] Notification；
- [ ] External proof link；
- [ ] rejection reason taxonomy；
- [ ] Dashboard/KPI。

## P2 — Print/Color

- [ ] ICC mAB/mBA verified subset；
- [ ] General source ICC → destination ICC CMM；
- [ ] Rendering intents；
- [ ] Black Point Compensation；
- [ ] calibrated soft proof / proof-device simulation；
- [ ] external PDF/X / RIP adapter；
- [ ] raster image DPI/transparency policy。

## P3 — Enterprise

- [ ] ERP/PIM/PLM adapters；
- [ ] REST production API；
- [ ] Webhook；
- [ ] SSO/MFA/SCIM；
- [ ] S3/R2 artifact store；
- [ ] server job queue/idempotency；
- [ ] Print Vendor Portal；
- [ ] Supplier Portal。

## P3 — Physical Packaging Simulation

- [ ] Board thickness model；
- [ ] bend radius；
- [ ] factory-validated crease/print stretch compensation；
- [ ] material/press compensation profiles only from verified production data。

---

# 17. 推荐后续关闭顺序

与其继续把版本号用于扩展边缘功能，建议从 V0.29 起按“关闭原始基线”推进：

```text
V0.29  Browser E2E + Digital Decode + PDF/Geometry Acceptance
V0.30  Excel Import Engine completion
V0.31  Production Bundle + SHA-256 + immutable snapshot schema
V0.32  Master Data + Content Library local/domain model
V0.33  Hosted Backend + Auth/RBAC + DB
V0.34  Template Publish + Artwork Workflow + server audit
V0.35  Compare + Impact Analysis + Search/Dashboard
V0.36  External Preflight + advanced ICC/CMM
V0.37  ERP/API/Webhook/SSO enterprise adapters
```

这不是新增需求路线，而是优先关闭 2026-09-30 V3.0 开发前基线中尚未兑现的部分。

---

# 18. 本文件的维护规则

后续每个版本必须：

1. 若关闭某项，把状态从 ⬜/🟡 改为 ✅；
2. 在对应版本 Test Report 中给出真实测试证据；
3. 不允许因为“存在一个按钮/模型函数”就把业务闭环标记为完成；
4. 不允许把本地角色模拟称为 Auth/RBAC；
5. 不允许把 PDF/X Candidate 称为认证 PDF/X；
6. 不允许把 Digital Decode 称为实体条码 ISO Grade；
7. 不允许把浏览器 LocalStorage/IndexedDB audit 称为不可篡改服务器审计；
8. 新增功能若偏离 V3.0 主线，必须说明它解决了哪个基线问题，否则优先级低于本清单 P0/P1。

**本清单从 V0.28 起作为 BoxStudio 的持续 Gap Register。**
