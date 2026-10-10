# BoxStudio design workbench

Intent: packaging operators and export staff need to lay out millimetre artwork, update shipment data and deliver printable files. The canvas is the focal point. Separate carton and standalone marks at product level.

Domain: paperboard, dielines, crease paths, black ink, registration marks, shipping labels, safe margins, physical millimetres.
Color world: white paper, warm gray cutting mat, graphite ink, muted board brown, blue crease/selection ink, green pass marks. One blue action accent; statuses carry meaning.
Signature: measurable paper artboard on a subtle dot mat, physical size chip, dieline/label twin modes, live variable text, barcode+QR as one locked unit. No dashboard KPI tiles, oversized step cards or decorative gradients.

Tokens: paper #ffffff; workbench #f3f4f6; ink #202733; secondary #657080; hairline rgba(32,39,51,.09); selection blue #315cda; inset #f5f6f8. 4px spacing grid. Tool panels 16px padding, section gaps 24px. Native button/dialog/details/input semantics.
Typography: existing locally bundled BoxStudio UI SC, fallback Noto Sans SC/Arial. 12/14/16/20/28 scale, weight 400/500/600. Values use tabular numerals. Secondary captions never below 12px.
Desktop: 64px header; carton 64px tool rail + 228px contextual library + flexible canvas + 304px inspector. Independent marks 240px component library + flexible canvas + 304px data/properties. Mobile uses dedicated library dialogs and a reachable lower inspector, no horizontal page overflow.
Depth: tonal panels and quiet dividers; shadows only for floating paper, dialogs and menus. Radius 8px controls, 12px panels, 16px dialogs. Icon stroke 1.6, currentColor, one shared SVG set.
Motion: repeat actions use 120ms color/opacity feedback; button press scale .96; occasional dialog entrance 180ms translateY 6px/opacity with cubic-bezier(.2,0,0,1). No layout-property transitions or transition:all. Reduced motion removes movement.
Component intent checkpoint: every new component serves the canvas, uses these tokens, native controls, named transitions and visible focus. Data editing is grouped by shipment / trade / dimensions; properties focus on the selected object; export dialog exposes actual available formats.

Selection: Shift click or the explicit multi-select tool adds/removes objects; empty artboard drag selects fully enclosed editable objects. Six alignment icons use shared stroke geometry; safe-area alignment targets an 8 mm margin. Distribution keeps endpoints and rejects negative gaps. Locked layout stays visible and still updates bound variables. Selection and gesture guides are UI-only; a group operation is one history transaction. Escape interrupts drag. Touch uses the same multi-select button and native component dialog.


## V0.71 模板与场景

设计模板使用可筛选的 4 列卡片，手机 2 列；预览由可编辑图文生成，创建前保存原项目。3D 场景用单画布和 244px 参数栏，手机改为画布加双列控件。对比、折叠、缩放实时反馈；真实文件完成后才显示成功。背景透明保留 PNG alpha；GLB 嵌入实际贴图。高频拖动直接更新画布，不提交历史；导出完成后保存场景参数。控件使用 120ms 反馈并尊重 reduced motion。

## V0.76 文字排版与底纹

文字实际预览与328px参数列共用毫米框；字体12家族以原始字形转曲。dialog高度最多860px，标题及操作区固定在正常flex布局，只有内容内部滚动。手机预览/设置上下排列；边界8px，桌面边界16px。字段40px高，纸上预览240px最小高，说明12px。底纹24张分页，桌面4列、窄屏3列，244px设置栏；手机设置在素材之前。颜色仍为纸白/工作台灰/石墨/蓝色选择线。源SVG缩略图与实际平铺预览分别展示，来源与CC BY 4.0署名可见；收藏与最近使用是本地持久化状态。明确错误、空和加载状态，应用是一次事务，取消不写状态。
