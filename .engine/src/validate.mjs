// Checks the JSON Claude writes before anything uses it. Returns a list of problems.

const isUrl = (s) => typeof s === 'string' && /^https?:\/\/\S+$/.test(s);
const text = (s) => typeof s === 'string' && s.trim().length > 0;

// research.json: { topic, facts: [{ id, claim, sources: [url] }] }
export function validateResearch(r) {
  const errs = [];
  if (!text(r?.topic)) errs.push('research: missing topic');
  if (!Array.isArray(r?.facts) || r.facts.length === 0) return [...errs, 'research: no facts'];
  const ids = new Set();
  r.facts.forEach((f, i) => {
    if (!text(f.id)) errs.push(`fact #${i + 1}: missing id`);
    else if (ids.has(f.id)) errs.push(`fact ${f.id}: duplicate id`);
    else ids.add(f.id);
    if (!text(f.claim)) errs.push(`fact ${f.id ?? i + 1}: missing claim`);
    if (!Array.isArray(f.sources) || !f.sources.some(isUrl)) {
      errs.push(`fact ${f.id ?? i + 1}: needs at least one source link`);
    }
  });
  return errs;
}

// script.json: { title, chapters: [{ title, scenes: [{ id, narration, visual, keywords: [], facts: [] }] }] }
// Every fact a scene cites must exist in research.json.
export function validateScript(s, research) {
  const errs = [];
  if (!text(s?.title)) errs.push('script: missing title');
  if (!Array.isArray(s?.chapters) || s.chapters.length === 0) return [...errs, 'script: no chapters'];
  const known = new Set((research?.facts ?? []).map((f) => f.id));
  const ids = new Set();
  s.chapters.forEach((c, ci) => {
    if (!text(c.title)) errs.push(`chapter ${ci + 1}: missing title`);
    if (!Array.isArray(c.scenes) || c.scenes.length === 0) {
      errs.push(`chapter ${ci + 1}: no scenes`);
      return;
    }
    c.scenes.forEach((sc, si) => {
      const where = sc.id ?? `chapter ${ci + 1} scene ${si + 1}`;
      if (!text(sc.id)) errs.push(`${where}: missing id`);
      else if (ids.has(sc.id)) errs.push(`${sc.id}: duplicate scene id`);
      else ids.add(sc.id);
      if (!text(sc.narration)) errs.push(`${where}: missing narration`);
      if (!text(sc.visual)) errs.push(`${where}: missing visual note`);
      if (!Array.isArray(sc.keywords) || sc.keywords.length === 0) errs.push(`${where}: no search keywords`);
      for (const f of sc.facts ?? []) {
        if (!known.has(f)) errs.push(`${where}: cites fact "${f}" that is not in the research`);
      }
    });
  });
  return errs;
}

// Roughly 150 spoken words per minute.
export function estimateMinutes(script) {
  const words = script.chapters
    .flatMap((c) => c.scenes)
    .reduce((n, sc) => n + sc.narration.trim().split(/\s+/).length, 0);
  return { words, minutes: Math.round((words / 150) * 10) / 10 };
}
