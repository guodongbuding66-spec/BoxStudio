export function renderTemplate(template, variables) {
  return String(template || '').replace(/{{\s*([\w]+)\s*}}/g, (_, key) => variables[key] ?? '');
}

export function isPackageNoticeVisible(variables) {
  const count = Number(variables.packageCount || 0);
  return count > 1;
}

export function normalizeVariables(vars) {
  const v = { ...vars };
  ['packageIndex','packageCount'].forEach(k => {
    if (v[k] === '') return;
    const n = Number(v[k]);
    if (Number.isFinite(n)) v[k] = String(Math.max(1, Math.round(n)));
  });
  return v;
}
