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

// Whole words for matching: hyphens and slashes separate words, so "risk-free" matches "risk free".
export function matchWords(s) {
  return normalizeForMatch(s)
    .replace(/[-/]+/g, ' ')
    .split(' ')
    .filter(Boolean);
}

function indexOfWords(hay, needle, from, lastStart) {
  const end = Math.min(hay.length - needle.length, lastStart);
  outer: for (let i = Math.max(0, from); i <= end; i += 1) {
    for (let j = 0; j < needle.length; j += 1) if (hay[i + j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
}

// True when the quote appears in the text as whole words, tolerating case and punctuation differences.
// A quote may elide words with "..." but only between substantial fragments that sit close together in
// order, so a quote cannot be stitched from scattered words. Strict mode, used for critical failures,
// requires longer fragments, smaller gaps, and at least two words overall.
export function quoteAppearsIn(quote, text, { strict = false } = {}) {
  const q = String(quote || '').trim();
  if (!q) return false;
  const fragments = q
    .split(/\.\.\.|…|\[\.\.\.\]|\[…\]/)
    .map(matchWords)
    .filter((f) => f.length > 0);
  if (fragments.length === 0) return false;
  const totalWords = fragments.reduce((n, f) => n + f.length, 0);
  if (strict && totalWords < 2) return false;
  if (fragments.length > 1) {
    const minWords = strict ? 4 : 3;
    if (fragments.some((f) => f.length < minWords)) return false;
  }
  const maxGap = strict ? 12 : 30;
  const hay = matchWords(text);
  const placeFrom = (fi, from, lastStart) => {
    if (fi === fragments.length) return true;
    let start = from;
    for (;;) {
      const at = indexOfWords(hay, fragments[fi], start, lastStart);
      if (at === -1) return false;
      const next = at + fragments[fi].length;
      if (placeFrom(fi + 1, next, next + maxGap)) return true;
      start = at + 1;
    }
  };
  return placeFrom(0, 0, Infinity);
}

// The sentence of the text that contains the quote, if any (for checks such as negated guarantees).
export function sentenceContaining(text, quote) {
  const parts = String(text || '')
    .split(/(?<=[.!?])\s+|\n+/)
    .map((x) => x.trim())
    .filter(Boolean);
  return parts.find((sentence) => quoteAppearsIn(quote, sentence)) || null;
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
