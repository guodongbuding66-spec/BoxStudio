# BoxStudio V0.44 — Professional Curve Editing & Node Topology

## Status

V0.44 closes the next curve-editing gap after V0.43 native production geometry. V0.43 established native Arc/Cubic storage and SVG/DXF/PDF production serialization; V0.44 makes those entities editable as professional topology rather than export-only geometry.

Implementation branch: `feature/v0.44-professional-curve-editing`

## Delivered

### 1. Native edge split

`splitEdgeV44()` supports:

- Line
- Cubic Bézier
- SVG elliptical Arc
- arbitrary split parameter `t` in `(0,1)`

Cubic splitting uses de Casteljau subdivision, so the two child curves reproduce the original curve exactly. Arc splitting resolves the SVG endpoint-parameterized ellipse, evaluates the exact intermediate point, and creates two native Arc records with corrected `largeArc` flags.

The source entity is not flattened to line segments.

### 2. Reversible split provenance

Every V0.44 split records:

- source edge record
- source endpoint coordinates
- split parameter
- left/right child identity
- a shared split token

`canMergeSplitNodeV44()` verifies that the split is still losslessly reversible before merge.

A merge is refused if any of these changed after the split:

- original endpoints
- inserted split node
- edge topology
- Cubic handles
- Arc radii / rotation / flags
- line type / curve type

This is intentionally fail-closed. BoxStudio does not label an approximate reconstruction as “lossless”.

`mergeSplitNodeV44()` restores the exact captured source edge when validation passes.

### 3. G1 / C1 / G2 continuity

Degree-2 Cubic ↔ Cubic nodes support:

- `Corner` — no continuity lock
- `G1` — tangent directions align
- `C1` — tangent direction and first-derivative magnitude match
- `G2` — tangent direction and signed curvature match

`continuityDiagnosticsV44()` reports:

- tangent error in degrees
- first-derivative speed ratio
- incoming curvature
- outgoing curvature
- curvature delta

The G2 solver preserves the selected driver edge and adjusts the opposite curve's near/far control geometry to match tangent direction and signed curvature.

### 4. Curve length diagnostics

`curveLengthV44()` computes native Line/Cubic/Arc path length using deterministic curve sampling for inspector diagnostics. This is a measurement/diagnostic utility; it does not replace native production geometry with the sampled points.

### 5. Professional CAD Inspector controls

The V0.44 Inspector adds:

- path length display
- arbitrary split percentage
- `Split Native`
- driver-edge selection
- Corner / G1 / C1 / G2 controls
- `Lossless Merge Split`
- explicit reversible/not-reversible status

CAD reopen/selection restoration is synchronous and deterministic rather than relying on animation-frame timing.

### 6. Existing CAD Add/Delete controls upgraded

V0.44 also upgrades the original V0.38 left-side controls so the user does not need to discover a second workflow:

- `Add Node on Edge` now routes through native V0.44 split for Line, Cubic and Arc.
- On a verified reversible split node, `Delete Node` becomes `Lossless Merge Split` and restores the exact source curve.
- Non-reversible curved-node deletion remains fail-closed.

This removes the V0.38 `ARC_SPLIT_UNSUPPORTED` limitation from the normal V0.44 UI path without weakening safety for unrelated curve merges.

### 7. V0.44 Curve Preflight

`runPreflightV44()` extends V0.43 checks with:

- `V44_CONTINUITY_TOPOLOGY`
- `V44_G1_BROKEN` / `V44_G1_VALID`
- `V44_C1_BROKEN` / `V44_C1_VALID`
- `V44_G2_BROKEN` / `V44_G2_VALID`
- `V44_SPLIT_REVERSIBLE`
- `V44_SPLIT_EDITED`
- `V44_SPLIT_ENGINE_READY`

The preflight therefore distinguishes “this curve was split” from “this curve can still be exactly restored”.

## Production chain preservation

V0.44 does not introduce a second export geometry model.

The same edited CAD document continues through:

1. native CAD entities
2. SVG `L / A / C`
3. DXF `LINE / ARC / SPLINE`
4. Dieline PDF native cubic operators
5. V0.39 topology reconstruction / 3D mesh sampling
6. final Artwork + Spot Dieline Production PDF via V0.43 native structural-curve serializer

Sampling is permitted for topology/mesh reconstruction. Production source geometry remains native.

## Acceptance strategy

V0.44 intentionally separates two concerns in regression tests:

- FEFCO 0427 native rounded geometry is used to prove real curve editing, continuity, SVG/DXF/PDF and topology reconstruction.
- The established production-safe default document is given a real V0.44 split Cubic to prove final Production PDF native-curve serialization without conflating the assertion with the existing 0427 panel-identity review gate.

This does not weaken the production assertion: the final PDF fixture still contains a genuine V0.44 split Cubic and must serialize native PDF `c` operators.

## Current verified signals

Node:

```text
BoxStudio V0.44 curve topology passed: split=cubic arc=arc faces=13 G1=0.000000deg G2=5.07e-8 productionPdf=23596
```

Real Chrome:

```text
PASS cubicSplitMerge=true arcSplitMerge=legacy-ui continuity=G2 tangent=0.000000 curvature=1.41e-8 faces=13 productionPdf=23596
```

## Explicit boundaries after V0.44

Still not claimed complete:

- automatic continuity preservation while a user drags an already-constrained handle
- arbitrary merge of two unrelated edited curved edges
- fillet/chamfer creation by direct corner drag
- dimensional/parametric curve constraints comparable to a full mechanical CAD solver
- curvature comb / inflection visualization
- external Illustrator / ArtiosCAD / Esko / RIP / die-cutting machine acceptance
- correction of every template-specific panel identity/remap case

The next curve-focused step should build on V0.44 rather than reintroducing flattened geometry.