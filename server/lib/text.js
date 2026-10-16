// Text helpers: section parsing for knowledge sources and quote verification for coaching evidence.

export function stripMarkdown(md) {
  return String(md || '')
    .replace(/```[a-z]*\n?/gi, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\((?:[^)(]|\([^)]*\))*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/[*_`~]+/g, '')
    .replace(/\|/g, ' ')
    .replace(/^\s*[-:]{3,}\s*$/gm, ' ');
}

// Lowercase, unify quotes/dashes, drop punctuation, collapse whitespace.
export function normalizeForMatch(s) {
  return stripMarkdown(s)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”‟″]/g, '"')
    .replace(/[–—−]/g, '-')
    .replace(/[^a-z0-9$%'\s-]/g, ' ')
    .replace(/'(?=\s|$)|(?<=\s|^)'/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// True when the quote appears in the text, tolerating punctuation/case differences and "..." elisions.
export function quoteAppearsIn(quote, text) {
  const q = String(quote || '').trim();
  if (!q) return false;
  const hay = normalizeForMatch(text);
  const fragments = q
    .split(/\.\.\.|…|\[\.\.\.\]/)
    .map((f) => normalizeForMatch(f))
    .filter((f) => f.length > 0);
  if (fragments.length === 0) return false;
  let from = 0;
  for (const frag of fragments) {
    const at = hay.indexOf(frag, from);
    if (at === -1) return false;
    from = at + frag.length;
  }
  return true;
}

export function slugify(s) {
  return String(s || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

// "05 · Qualification…" -> "s5"; "6. Objections…" -> "s6"; otherwise a slug of the heading.
export function sectionKey(heading) {
  const m = /^\s*(\d{1,3})\s*(?:[·.:)\-]|\s)/.exec(heading);
  if (m) return `s${Number.parseInt(m[1], 10)}`;
  return slugify(heading) || 'section';
}

// Split Markdown into top-level (##) sections. Text before the first ## is the "intro" section.
export function parseSections(markdown) {
  const lines = String(markdown || '').replace(/\r\n?/g, '\n').split('\n');
  const sections = [];
  let current = { key: 'intro', title: 'Introduction', lines: [] };
  let inFence = false;
  for (const line of lines) {
    if (/^```/.test(line.trim())) inFence = !inFence;
    const h2 = !inFence && /^##\s+(.+?)\s*#*\s*$/.exec(line);
    if (h2) {
      sections.push(current);
      current = { key: sectionKey(h2[1]), title: h2[1].trim(), lines: [line] };
    } else {
      if (current.key === 'intro' && /^#\s+(.+)/.test(line) && current.lines.every((l) => !l.trim())) {
        current.title = /^#\s+(.+)/.exec(line)[1].trim();
      }
      current.lines.push(line);
    }
  }
  sections.push(current);
  const seen = new Map();
  return sections
    .map((s) => ({ key: s.key, title: s.title, text: s.lines.join('\n').trim() }))
    .filter((s) => s.text.length > 0)
    .map((s) => {
      const n = (seen.get(s.key) || 0) + 1;
      seen.set(s.key, n);
      return n === 1 ? s : { ...s, key: `${s.key}-${n}` };
    });
}

export function wordCount(s) {
  const t = String(s || '').trim();
  return t ? t.split(/\s+/).length : 0;
}

export function truncate(s, max) {
  const t = String(s || '');
  return t.length <= max ? t : t.slice(0, Math.max(0, max - 1)).trimEnd() + '…';
}
