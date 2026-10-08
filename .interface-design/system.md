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
