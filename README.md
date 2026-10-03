# BoxStudio V0.8

浏览器内运行的纸盒结构设计、2D 刀版、唛头编辑、批量数据、3D 折叠与生产文件原型。

V0.8 在 V0.7 导入/结构能力之上，重点推进**可配置印前 Profile、用户 CMYK ICC OutputIntent、PDF/X-4 Candidate 门控、动态 Spot Separation 命名和二进制安全 PDF 组装**。系统仍明确区分“候选输出”与“第三方合规认证”。

## V0.8 新增

### 1. PDF/X-4 Candidate 输出路线

Export 新增 `Production PDF / PDF/X-4 Candidate` 两种模式。Candidate 模式会在导出前执行硬门控：

- 必须加载用户自有/有权使用的 **CMYK ICC / ICM**
- 必须开启文字转曲，避免未嵌入 Base14 字体
- 当前存在 PDF serializer 尚未实现的旋转对象时阻断导出

满足条件后，PDF 会写入：

- `/OutputIntents`
- `/DestOutputProfile`
- `/S /GTS_PDFX`
- `/GTS_PDFXVersion (PDF/X-4)`
- XMP `pdfxid:GTS_PDFXVersion`
- `TrimBox / BleedBox`

Candidate 模式不再把 Helvetica / Helvetica-Bold 资源写进 PDF；文字在门控条件下必须转成路径。

**边界：**V0.8 不声称经过 Acrobat Preflight、callas pdfToolbox、VeraPDF 或印厂 RIP 的第三方认证，因此界面使用“PDF/X-4 Candidate”而不是“PDF/X-4 Passed”。

### 2. 用户 ICC OutputIntent

新增 `src/iccRegistry.js`：

- 读取 ICC 128-byte header
- 验证 `acsp` signature
- 识别 device class / color space / PCS / version
- Candidate 当前只接受 `CMYK` profile
- ICC 仅保留在当前浏览器会话，不写入项目 localStorage，也不随源码分发

### 3. Print Profile + 自定义 Spot 名称

新增 `src/printProfiles.js`，当前提供：

- Generic Packaging
- Process Proof
- Custom

CUT / CREASE / PERF / GLUE 的 spot name 可直接编辑。名称同时作用于：

- PDF Separation ColorSpace
- SVG `data-spot-name`

修改名称后自动切换到 Custom Profile。

### 4. 二进制安全 PDF assembler

V0.7 的 PDF assembler 基于纯字符串。V0.8 改为 Uint8Array chunk 组装，使 ICC 二进制 profile 可以直接作为 PDF stream 写入，同时保持 xref byte offset 正确。

### 5. Preflight 增强

Preflight 新增：

- 当前 Spot Profile / 实际专色名称显示
- PDF/X-4 Candidate Gate 状态
- ICC 是否加载 / 是否 CMYK
- 文字是否转曲
- PDF 旋转兼容阻断

## V0.7 基线能力

### 1. PDF / PDF-compatible AI 矢量刀版导入

Structure 现在可导入：

- SVG
- DXF
- PDF（矢量路径）
- PDF-compatible AI

PDF / AI 导入器会解析常见 PDF content stream 路径操作符，并支持 `/FlateDecode` 压缩流。能够读取：

- Move / Line / Cubic curve / Rectangle / Close path
- Graphics-state matrix `cm`
- RGB / Gray / CMYK stroke color
- Spot / Separation color space 名称
- Dash pattern

若检测到 `CutContour / Crease / Perforation / Glue` 等专色名称，会优先用这些语义分类刀线。

**明确边界：**旧式 PostScript AI 不是 PDF-compatible AI，V0.8 会明确拒绝；PDF 导入目前聚焦矢量线条，不把 PDF 中的图片、排版文字或复杂透明效果伪装成可编辑刀线。

### 2. Production PDF：Spot Color + Overprint

PDF 生产输出升级到 PDF 1.6，并为刀版建立实际 Separation Color Space：

- `CutContour`
- `Crease`
- `Perforation`
- `Glue`

可开启 Overprint：

- `/OP true`
- `/op true`
- `/OPM 1`

SVG 输出也保留 `data-spot-name` / `data-overprint` 语义，便于后续印前流程继续处理。

**V0.7 不宣称 PDF/X 合规。** 当前没有嵌入 OutputIntent ICC，也没有完整 XMP / PDF/X 元数据，因此 Preflight 会把它显示为“PDF/X readiness”，不是“PDF/X Passed”。

### 3. TrueType 精确文字转曲

Export → Text → Vector Outlines 现在有两种来源：

1. Technical Vector：继续使用无字体依赖的内置技术字形。
2. Uploaded TrueType：用户在当前浏览器会话上传 `.ttf`，系统解析 `cmap / glyf / loca / hmtx / head / hhea / maxp`，把实际 glyph outline 输出为 SVG/PDF path。

支持：

- Simple glyf
- 常见 XY-positioned composite glyf
- cmap format 4 / 12
- TrueType Quadratic curve → PDF Cubic curve

字体文件仅在当前页面会话内使用，不保存到项目，也不随 BoxStudio 分发。

**明确边界：**V0.8 只支持 TrueType `glyf` 字体；CFF / CFF2 OpenType 尚未支持。

### 4. Polygon Panel

Manual Panel Editor 不再只支持矩形。

可以：

- Add Polygon Panel
- 通过 `x,y x,y ...` 编辑顶点
- 计算 polygon bounds
- 生成 Polygon Bleed / Safe Area
- 用 Polygon 判断元素是否越界
- 3D/Offline 3D 按真实多边形轮廓显示

对任意 Polygon，系统不会自动伪造 Fold Graph；需要人工确认结构关系。

### 5. 路径交叉 / 自交 Preflight

新增：

- CUT line intersection
- Polygon self-intersection
- degenerate / duplicate / near endpoints（保留 V0.6）

Topology Repair 仍只自动处理明确安全的近端点吸附、近零长度线、重复线；**不会自动删除交叉刀线**。

### 6. SVG Arc 真正离散

SVG `A` Elliptical Arc 不再只连接起点和终点，而是按 SVG arc 参数计算椭圆弧并在生产导出阶段高精度离散。

SVG 文档本身仍可保留 native curve 语义；PDF / DXF 需要兼容时才 flatten。

## 继续保留的核心能力

- Side-Seal / RSC 参数化结构
- Mailer / Flip-top 150010 参数化结构
- Panel / Fold Graph
- CREASE → Fold Candidate → 人工确认 Mountain / Valley
- Offline Canvas Hinge-Pivot 3D
- Bleed / Safe Area
- Code 39 / EAN-13 / UPC-A / ITF-14 / GS1-128
- 本地 QR Code
- GS1 常用 AI 语义校验
- Excel / CSV / TSV，多 Sheet、字段映射
- SVG ZIP / PDF ZIP / Combined PDF
- SVG / DXF / PDF / PDF-compatible AI 刀版导入
- CUT / CREASE / PERF / GLUE 节点编辑
- Topology Repair
- Manual Rectangle / Polygon Panel Editor
- localStorage、Undo / Redo
- SVG / PNG / 1:1 PDF / R12 DXF
- FEFCO / ECMA template schema

## 运行

```bash
cd boxstudio-v0.8
python -m http.server 8080
```

打开：

```text
http://localhost:8080
```

## 自动测试

```bash
node tests/smoke.mjs
```

V0.8 Smoke Test 覆盖：

- RSC / Mailer Fold Graph
- Mailer 150010 576 × 590 mm 校准
- 五种一维码 + GS1 常用 AI 语义
- SVG Transform
- SVG Elliptical Arc flatten
- Imported Fold Graph
- Topology Repair
- CUT crossing detection
- Polygon self-intersection
- Polygon Panel / guide / point-in-polygon
- FEFCO / ECMA schema
- DXF import
- PDF / PDF-compatible AI import
- PDF Spot Separation / Overprint
- Custom Spot names / Print Profile
- ICC header validation / CMYK gate
- PDF/X-4 Candidate OutputIntent + XMP + GTS_PDFXVersion
- Candidate 模式移除 Base14 font resources
- Technical Vector outline
- Bezier → PDF / DXF
- 若执行环境存在可用 TTF，则额外验证 TrueType parser 与 exact outline PDF

## 示例文件

`assets/`：

- `reference-template-from-pdf.svg`
- `sample-batch.xlsx`
- `sample-batch.csv`
- `sample-dieline.svg`
- `sample-dieline.dxf`
- `sample-dieline.pdf`
- `sample-dieline.ai` — PDF-compatible AI 示例
- `sample-transform-curves.svg`
- `sample-repair.dxf`

## 源模板约束

`docs/SOURCE_RULES.md` 记录用户提供的《美线侧封箱印刷模板20260520(1).pdf》中明确支持的生产规则，包括：

- 五层 BC 楞
- 250 psi
- 单位 mm
- 公差 ±5 mm
- 单黑印刷
- Arial 或接近字体
- Barcode + QR Group 尺寸、整体缩放、不可拆分
- 多包裹条件英文
- CRN 两处联动

源文件没有提供完整纸箱厂压线补偿表、设备参数和全部结构节点坐标，因此参数化 RSC 仍是工程基础模型，不应直接宣称为纸箱厂最终签核刀模。

## 当前明确边界

1. PDF/X 尚未完成：没有 OutputIntent ICC / 完整 XMP / PDF/X 标识。
2. Legacy PostScript AI 尚未支持，只支持 PDF-compatible AI。
3. PDF import 当前只提取可识别的矢量 path/stroke；不导入图片、排版文字、透明组等复杂内容。
4. TrueType exact outline 只支持 `glyf` TTF；CFF/CFF2 OTF 尚未实现。
5. 用户字体只保存在当前运行会话，刷新后需重新加载。
6. PDF 对旋转唛头对象仍未完整应用旋转变换；Preflight 会提示。
7. Topology Repair 不会自动删除 crossing / self-intersection。
8. Polygon Panel 的 Fold Graph 不自动猜测 parent / child / M/V。
9. FEFCO / ECMA 只有已实现并验证的结构才能生成真实 geometry；schema-only 条目不会伪造刀版。
10. 当前仍是浏览器本地原型，没有服务器账号、组织权限、云版本历史与多人审批。

## 下一阶段：V0.9

建议继续推进：

- PDF Import 更多 graphics state、clipping、nested Form XObject
- Legacy AI / EPS 导入路线评估
- CFF / CFF2 OpenType outline
- Arbitrary polygon fold-edge authoring
- Path boolean / join / trim / weld
- Overprint / knockout 可视化预览
- 标准模板后台、审批版本与组织权限
