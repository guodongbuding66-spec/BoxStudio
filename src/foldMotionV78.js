// Physical choreography shared by the workbench, sidebar and exported videos.
// Timelines drive hinge angles; panel positions are never independently tweened.
export const FOLD_MOTION_VERSION_V78 = 'V0.78';
const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, Number(n) || 0));
export const foldEaseV78 = t => { t = clamp(t); return t * t * t * (t * (t * 6 - 15) + 10); };
const key = e => `${e.from}->${e.to}`;

function assignment(edge, graph) {
  const id = edge.to, node = graph.nodes.find(n => n.id === id), role = node?.role || '';
  const base = graph.nodes.find(n => n.id === graph.root);
  const tray = base?.role === 'base' || /base$/.test(graph.root || '');
  if (/spine$/.test(id)) return ['spines', '折起纸厚桥', .43, .59];
  if (/inner-wall$/.test(id)) return ['inner-walls', '卷折内壁', .54, .76];
  if (/floor-lock$/.test(id)) return ['floor-locks', '扣入内壁锁脚', .69, .88];
  if (/return/.test(id)) return ['returns', '卷折内壁', .43, .69, Math.sign(edge.angle || 90) * 180];
  if (/lid-(left|right)$/.test(id) || role === 'lid-side-flap') return ['lid-wings', '预折盖翼与插舌', .61, .78];
  if (/tuck/.test(id) || role === 'tuck') return ['tucks', '预折插舌', .66, .84];
  if (/^lid$|cover$/.test(id) || role === 'lid') return ['lid', '合上盖板', .79, 1];
  if (graph.components?.some(c => id.startsWith(c.root.replace(/base$/, '')) && c.assembly)) {
    if (/tab|glue/.test(id)) return ['component-tabs', '预折上盖边角', .37, .53];
    return ['component-walls', '成型上盖与套筒', .49, .73];
  }
  if (/top[- ]/.test(id)) {
    if (/left|right|dust/.test(id)) return ['top-dust', '收拢顶部防尘翼', .69, .84];
    return ['top-cover', '封合顶部盖板', /back/.test(id) ? .79 : .86, /back/.test(id) ? .95 : 1];
  }
  if (/bottom[- ]/.test(id)) {
    if (/left|right|dust/.test(id)) return ['bottom-dust', '折叠底部防尘翼', .36, .54];
    return ['bottom-cover', '封合底盖', /back/.test(id) ? .48 : .56, /back/.test(id) ? .67 : .73];
  }
  if (/tab|glue/.test(id) || /tab|glue/.test(role)) return ['tabs', '预折角耳与粘口', 0, .19];
  if (/wing|wrap/.test(id)) return ['locks', '收拢锁翼', .47, .72];
  if (tray && /front$|back$/.test(id)) return ['long-walls', '立起前后壁', .1, .36];
  if (tray && /left$|right$/.test(id)) return ['side-walls', '立起侧壁', .28, .53];
  return ['body', '成型盒身', .08, .41];
}

export function foldPlanV78(graph) {
  const edges = (graph.edges || []).filter(e => e.hinge).map(e => {
    const [phase, label, start, end, angle] = assignment(e, graph);
    return { key: key(e), from: e.from, to: e.to, phase, label, start, end, angle: angle ?? e.angle };
  });
  const phases = [];
  for (const e of [...edges].sort((a, b) => a.start - b.start)) {
    if (!phases.some(p => p.id === e.phase)) phases.push({ id: e.phase, label: e.label, start: e.start, end: e.end, edges: edges.filter(x => x.phase === e.phase).map(x => x.key) });
  }
  if (graph.components?.some(c => c.assembly)) phases.push({ id: 'assembly', label: '装配上盖与内衬', start: .75, end: 1, edges: [] });
  return { schema: 'boxstudio-fold-choreography-v78', edges, phases, durationMs: 5000 };
}

export function motionAuthoringV78(graph, progress, authoring = {}) {
  // Explicit advanced hinge authoring owns the pose; ordinary previews use choreography.
  if (authoring.motionMode === 'uniform' || Object.keys(authoring.edgeProgress || {}).length) return authoring;
  const plan = foldPlanV78(graph), t = clamp(progress / 100), angles = { ...(authoring.edgeAngles || {}) };
  for (const e of plan.edges) if (!Object.hasOwn(angles, e.key)) angles[e.key] = e.angle;
  return { ...authoring, motionMode: 'assembly', edgeAngles: angles, edgeProgress: Object.fromEntries(plan.edges.map(e => [e.key, clamp((t - e.start) / (e.end - e.start)) * 100])), componentProgress: clamp((t - .75) / .25) * 100 };
}

export function foldPhaseV78(plan, progress) {
  const t = clamp(progress / 100);
  if (t === 0) return { id: 'flat', label: '刀版展开' };
  if (t === 1) return { id: 'closed', label: '装配完成' };
  return plan.phases.filter(p => t >= p.start && t < p.end).at(-1) || plan.phases.find(p => t < p.end) || { id: 'closed', label: '装配完成' };
}

export function createFoldClockV78({ progress = 100, durationMs = 5000, speed = 1, direction = 1, loop = false, reducedMotion = false, onFrame = () => {}, onChange = () => {}, onCommit = () => {}, raf = fn => requestAnimationFrame(fn), cancel = id => cancelAnimationFrame(id), now = () => performance.now() } = {}) {
  let p = clamp(progress / 100) * 100, running = false, frame = 0, previous = null, hold = 0, disposed = false;
  const emit = () => onChange({ progress: p, running, durationMs, speed, direction, loop });
  function tick(time) {
    if (!running || disposed) return;
    const dt = previous === null ? 0 : Math.max(0, time - previous); previous = time;
    if (hold > 0) hold = Math.max(0, hold - dt);
    else {
      p = clamp((p + direction * dt * speed / durationMs * 100) / 100) * 100; onFrame(p); emit();
      if (p === (direction > 0 ? 100 : 0)) {
        onCommit(p);
        if (loop) { direction *= -1; hold = 280; emit(); }
        else { running = false; previous = null; emit(); return; }
      }
    }
    frame = raf(tick);
  }
  function pause(commit = true) { running = false; cancel(frame); previous = null; if (commit) onCommit(p); emit(); }
  const api = {
    play() { if (disposed || running) return; if (p === (direction > 0 ? 100 : 0)) p = direction > 0 ? 0 : 100;
      if (reducedMotion) { p = direction > 0 ? 100 : 0; onFrame(p); onCommit(p); emit(); return; }
      running = true; previous = null; hold = 0; onFrame(p); emit(); frame = raf(tick);
    },
    pause,
    seek(value) { pause(false); p = clamp(value / 100) * 100; onFrame(p); onCommit(p); emit(); },
    configure(value) { if (Number.isFinite(value.speed)) speed = clamp(value.speed, .1, 3); if (Number.isFinite(value.durationMs)) durationMs = clamp(value.durationMs, 1000, 30000); if (value.direction === 1 || value.direction === -1) direction = value.direction; if (typeof value.loop === 'boolean') loop = value.loop; previous = null; emit(); },
    getState: () => ({ progress: p, running, durationMs, speed, direction, loop }),
    dispose() { pause(false); disposed = true; }
  };
  return api;
}
