import { createFoldClockV78, foldPlanV78, foldPhaseV78 } from './foldMotionV78.js';
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function mountFoldPlayerV78(host, { graph, proof, progress = 100, onCommit = () => {}, onFrame = () => {}, mini = false }) {
  const plan = foldPlanV78(graph), d = document.createElement('section'); d.className = 'v78-fold-player' + (mini ? ' compact' : ''); d.dataset.v78Player = mini ? 'sidebar' : 'stage';
  d.innerHTML = `<div class="v78-fold-heading"><b>折叠装配</b><span data-v78-phase aria-live="off">装配完成</span><output data-v78-percent>100%</output></div>
    <div class="v78-fold-transport"><button data-v78-play ${mini ? '' : 'data-v49-play'} aria-label="播放折叠动画" aria-pressed="false">▶</button><button data-v78-direction aria-label="切换为展开方向" aria-pressed="false">↶</button><input data-v78-progress aria-label="${mini ? '侧栏' : ''}折叠装配进度" type="range" min="0" max="100" step=".1" value="${progress}"><button data-v78-loop aria-label="往返循环" aria-pressed="false">⇄</button></div>
    <div class="v78-fold-settings"><label>速度<select data-v78-speed aria-label="折叠播放速度"><option value=".25">0.25×</option><option value=".5">0.5×</option><option value="1" selected>1×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></label><label>时长<select data-v78-duration aria-label="折叠动画时长"><option value="3000">3 秒</option><option value="5000" selected>5 秒</option><option value="8000">8 秒</option><option value="12000">12 秒</option></select></label><button data-v78-fit>适配视图</button>${mini?'':'<button data-v78-map aria-pressed="false">2D 联动</button>'}</div>
    ${mini ? '' : `<nav class="v78-fold-phases" aria-label="装配阶段"><button data-v78-stage="0">展开</button>${plan.phases.map(p => `<button data-v78-stage="${Math.round(p.end * 100)}" title="${esc(p.label)}">${esc(p.label)}</button>`).join('')}<button data-v78-stage="100">成型</button></nav>`}`;
  host.append(d);
  const range = d.querySelector('[data-v78-progress]'), play = d.querySelector('[data-v78-play]'), phase = d.querySelector('[data-v78-phase]'), percent = d.querySelector('[data-v78-percent]');
  let previousLabel = '', previousPercent = '', previousRunning = null;
  const clock = createFoldClockV78({ progress, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    onFrame(value) { proof()?.setProgress(value); onFrame(value); }, onCommit,
    onChange(s) {
      range.value = String(s.progress); const text = foldPhaseV78(plan, s.progress).label, n = Math.round(s.progress) + '%';
      if (text !== previousLabel) { phase.textContent = text; previousLabel = text; }
      if (n !== previousPercent) { percent.textContent = n; previousPercent = n; }
      if (s.running !== previousRunning) { play.textContent = s.running ? 'Ⅱ' : '▶'; play.setAttribute('aria-pressed', String(s.running)); play.setAttribute('aria-label', s.running ? '暂停折叠动画' : '播放折叠动画'); previousRunning = s.running; }
      d.querySelector('[data-v78-direction]').setAttribute('aria-pressed', String(s.direction === -1));
      d.querySelector('[data-v78-loop]').setAttribute('aria-pressed', String(s.loop));
    }
  });
  play.onclick = () => { if(clock.getState().running)clock.pause();else{proof()?.prepareMotionFrame?.();clock.play();} };
  range.oninput = () => { proof()?.prepareMotionFrame?.();clock.seek(Number(range.value)); };
  d.querySelector('[data-v78-direction]').onclick = () => clock.configure({ direction: -clock.getState().direction });
  d.querySelector('[data-v78-loop]').onclick = () => clock.configure({ loop: !clock.getState().loop });
  d.querySelector('[data-v78-speed]').onchange = e => clock.configure({ speed: Number(e.target.value) });
  d.querySelector('[data-v78-duration]').onchange = e => clock.configure({ durationMs: Number(e.target.value) });
  d.querySelector('[data-v78-fit]').onclick = () => { clock.pause(); proof()?.fitView?.(); };
  d.querySelectorAll('[data-v78-stage]').forEach(b => b.onclick = () => clock.seek(Number(b.dataset.v78Stage)));
  d.querySelector('[data-v78-map]')?.addEventListener('click',e=>{const grid=host.closest('.v49-linked-grid');const visible=grid?.classList.toggle('v78-show-map');e.currentTarget.setAttribute('aria-pressed',String(Boolean(visible)));});
  const visibility = () => { if (document.hidden) clock.pause(); }; document.addEventListener('visibilitychange', visibility);
  d.addEventListener('keydown', e => { if (e.target.closest('input,select')) return; if (e.code === 'Space') { e.preventDefault(); play.click(); } });
  clock.configure({});
  return { ...clock, plan, element: d, dispose() { clock.dispose(); document.removeEventListener('visibilitychange', visibility); d.remove(); } };
}
