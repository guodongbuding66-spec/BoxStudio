# BoxStudio V0.45 — Live Curve Constraints & Fillet / Chamfer

## Status

V0.45 extends the V0.44 professional curve-topology baseline with live continuity repair, exact curve dimensions and native editable corner features.

This release remains within the current BoxStudio product baseline: true millimeter packaging CAD geometry must remain the same source for editing, preflight, topology/3D reconstruction and production export. UI-only effects do not count as completion.

## Delivered

### 1. Live Cubic continuity

Stored V0.44 `G1`, `C1` and `G2` continuity is now re-solved after a Cubic control-handle edit.

The implementation is intentionally layered over the V0.38 CAD commit/render lifecycle instead of replacing the editor. V0.45 waits until V0.38 has persisted and re-rendered the edited curve, then inspects the currently selected Cubic. A repair is performed only when the stored continuity is actually outside tolerance, preventing MutationObserver/reopen loops.

The edited Cubic is preferred as the driver so the user's modification is preserved and the adjacent Cubic is adjusted.

### 2. Exact Cubic handle dimensions

The Edge Inspector exposes C1/C2 handle lengths in millimeters. Editing a handle length preserves its direction and sets its exact distance from the endpoint. If the endpoint participates in stored G1/C1/G2 continuity, that continuity is then re-solved.

### 3. Circular Arc radius constraint

Circular Arc edges expose a radius field. Generic arcs fail closed if the requested radius is smaller than half the chord.

For V0.45 Fillet features, the radius field does not merely mutate `rx/ry`. It rebuilds the corner feature from its original sharp-corner provenance so tangent points and source-edge setbacks change with the requested radius.

### 4. Native Fillet

For a safe degree-2 corner consisting of two straight `CUT` edges, Fillet:

1. measures the included angle;
2. calculates setback `R / tan(theta / 2)`;
3. verifies both source edges are long enough;
4. inserts two tangent nodes;
5. trims the two original CUT edges;
6. removes the original sharp corner node;
7. inserts a native circular CUT Arc;
8. stores lossless source-corner provenance for later editing/restoration.

For a 90-degree R5 corner the expected path is a quarter circle with length `pi * 5 / 2 = 7.854 mm`.

### 5. Native Chamfer

For the same safe straight-CUT corner class, Chamfer trims the two source edges by the requested setback and inserts a native straight CUT connector.

### 6. Editable corner-feature provenance

Each V0.45 corner feature stores the original sharp node and original source edges. Editing an existing Fillet/Chamfer restores that source topology first and then regenerates the feature using the new parameter.

This fixes an important defect found during V0.45 development: changing R5 to R6 originally changed only Arc metadata and left the R5 tangent points in place. That behavior was rejected. The completed V0.45 path restores the source corner and recalculates the R6 setback, tangent points and native Arc.

Corner-feature restoration is fail-closed if the tangent nodes or source edges have been independently edited in a way that makes lossless restoration unsafe.

### 7. Curve dimensions and diagnostics

V0.45 reports:

- chord length;
- curve/path length;
- Cubic C1 handle length;
- Cubic C2 handle length;
- Arc RX/RY;
- Arc rotation;
- circular/elliptical classification;
- corner-feature metadata when applicable.

### 8. V0.45 Preflight

The V0.45 preflight layer extends V0.44 and validates:

- stored G1/C1/G2 continuity;
- Fillet/Chamfer connector line type;
- native Fillet Arc validity;
- radius/chord feasibility;
- Fillet feature parameter drift;
- native corner-operation presence.

A Fillet whose Arc radius no longer matches its stored editable feature parameter is reported as `V45_FILLET_PARAMETER_DRIFT` rather than silently accepted.

### 9. Production vector continuity

Native Fillets continue through the existing V0.43 production curve pipeline:

- SVG: native `A` command;
- DXF: native `ARC`;
- PDF: vector cubic `c` representation;
- topology/3D: same source geometry sampled only for mesh reconstruction.

## Acceptance evidence

Implementation head before documentation:

`e35b78c8a2c2800770bb7d7961c864dd88c6932a`

All eleven PR workflows passed on that head.

Node regression signal:

```text
BoxStudio V0.45 constraints passed: live=1 G2=7.50e-8 handle=6.25 fillet=R5.0 edit=R6.0 arc=9.425 chamfer=4.0
```

Real Chrome acceptance signal:

```text
PASS liveG2=5.88e-9 handle=6.500 fillet=R6-reflow arc=9.425 svg=A dxf=ARC pdf=C v45Fillets=1
```

The R6 browser test requires both tangent nodes to move to the correct 6 mm setback on a 90-degree corner and requires the path length to be approximately `3*pi = 9.425 mm`.

## Compatibility

V0.45 retains V0.44 and earlier behavior. The PR acceptance matrix includes:

- CI;
- V0.36 Hosted Backend;
- V0.37 Durable PostgreSQL;
- V0.38 Dieline CAD;
- V0.39 Unified Topology Production;
- V0.40 Free Professional Editor;
- V0.41 Reference Interaction Layer;
- V0.42 Advanced Structure Controls;
- V0.43 Native Curved Production;
- V0.44 Professional Curve Editing;
- V0.45 Live Curve Constraints.

## Explicit boundaries

V0.45 does not claim the following as complete:

- Fillet/Chamfer between arbitrary Line/Arc/Cubic combinations; current corner creation is deliberately restricted to degree-2 straight CUT + straight CUT corners.
- Live general constraint solving across arbitrary Line/Arc/Cubic junctions; live stored continuity is currently Cubic-to-Cubic G1/C1/G2.
- Elliptical Arc radius constraints beyond the existing V0.43 Arc controls.
- Multi-corner/batch Fillet/Chamfer.
- Direct on-canvas Fillet radius drag widget.
- External CAD/CAM/RIP/die-cutting-machine acceptance. Browser/Node vector tests do not substitute for production tooling validation.

These boundaries remain candidates for later versions rather than being reported as finished.