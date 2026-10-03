export const PRINT_PROFILES = {
  generic: {
    id: 'generic',
    label: 'Generic Packaging',
    description: '通用包装刀线命名，专色 + Overprint。',
    spotNames: { CUT:'CutContour', CREASE:'Crease', PERF:'Perforation', GLUE:'Glue' },
    spotDielines: true,
    overprintDielines: true,
  },
  processProof: {
    id: 'processProof',
    label: 'Process Proof',
    description: '校样模式：不输出专色 Separation，刀线使用 Process Black。',
    spotNames: { CUT:'CutContour', CREASE:'Crease', PERF:'Perforation', GLUE:'Glue' },
    spotDielines: false,
    overprintDielines: false,
  },
  custom: {
    id: 'custom',
    label: 'Custom',
    description: '使用当前自定义 spot 名称与输出设置。',
    spotNames: { CUT:'CutContour', CREASE:'Crease', PERF:'Perforation', GLUE:'Glue' },
    spotDielines: true,
    overprintDielines: true,
  },
};

export function applyPrintProfile(exportOptions={}, id='generic') {
  const p = PRINT_PROFILES[id] || PRINT_PROFILES.generic;
  return {
    ...exportOptions,
    printProfile: p.id,
    spotDielines: p.spotDielines,
    overprintDielines: p.overprintDielines,
    spotNames: {...p.spotNames},
  };
}

export function spotNameFor(options={}, kind='CUT') {
  const fallback = PRINT_PROFILES.generic.spotNames[kind] || kind;
  return String(options.spotNames?.[kind] || fallback).trim() || fallback;
}
