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

function wordsAt(hay, needle, i) {
  if (i < 0 || i + needle.length > hay.length) return false;
  for (let j = 0; j < needle.length; j += 1) if (hay[i + j] !== needle[j]) return false;
  return true;
}

export const MAX_QUOTE_FRAGMENTS = 4;

// True when the quote appears in the text as whole words, tolerating case and punctuation differences.
// A quote may elide words with "..." between substantial fragments (3+ words) that sit close together in
// order, so a quote cannot be stitched from scattered words. Strict mode, used for critical failures,
// allows no elision at all and needs at least two words. Matching is linear in the text length
// (failed placements are remembered), so no quote can stall the server.
export function quoteAppearsIn(quote, text, { strict = false } = {}) {
  const q = String(quote || '').trim();
  if (!q) return false;
  const fragments = q
    .split(/\.\.\.|…|\[\.\.\.\]|\[…\]/)
    .map(matchWords)
    .filter((f) => f.length > 0);
  if (fragments.length === 0 || fragments.length > MAX_QUOTE_FRAGMENTS) return false;
  if (strict && (fragments.length > 1 || fragments[0].length < 2)) return false;
  if (fragments.length > 1 && fragments.some((f) => f.length < 3)) return false;
  const maxGap = 30;
  const hay = matchWords(text);
  const failed = new Set();
  // Can fragments fi+1.. be placed after fragment fi placed at position `at`?
  const restFits = (fi, at) => {
    if (fi === fragments.length - 1) return true;
    const key = fi * (hay.length + 1) + at;
    if (failed.has(key)) return false;
    const next = fragments[fi + 1];
    const from = at + fragments[fi].length;
    const to = Math.min(hay.length - next.length, from + maxGap);
    for (let p = from; p <= to; p += 1) {
      if (wordsAt(hay, next, p) && restFits(fi + 1, p)) return true;
    }
    failed.add(key);
    return false;
  };
  for (let p = 0; p + fragments[0].length <= hay.length; p += 1) {
    if (wordsAt(hay, fragments[0], p) && restFits(0, p)) return true;
  }
  return false;
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
