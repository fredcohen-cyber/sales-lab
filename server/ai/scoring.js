import { evaluationOutputSchema } from './schema.js';
import { ProviderError, RUN_ERROR_MESSAGES } from './provider.js';
import { quoteAppearsIn } from '../lib/text.js';

const NEGATION = /\b(not|never|no one|nobody|cannot|can't|can not|won't|wouldn't|don't|do not|isn't|aren't|without|no)\b[^.!?]{0,40}$/i;
const GUARANTEE = /\b(guarantee[ds]?|guaranteeing|i promise|we promise|promise you|you will definitely|you'll definitely|will definitely|100% (?:sure|certain)|risk[- ]free results?)\b/i;
const INJECTION =
  /(ignore (?:all |any |the )?(?:previous|prior|above|earlier) (?:instructions|rules|prompts?)|disregard (?:the|your) (?:rules|instructions)|you are now|system prompt|as the (?:evaluator|grader|ai|model)|give (?:me|this(?: answer)?) (?:a )?(?:100|full marks|perfect|top)|score (?:this|me) (?:a )?(?:100|perfect|highly)|record_evaluation|<\/?\s*(?:rep_answer|source_material|scenario|rubric)\b)/i;

function sentences(text) {
  return String(text)
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Guarantee language that is not negated ("we can't guarantee results" is fine).
export function detectGuarantees(answer) {
  const hits = [];
  for (const raw of sentences(answer)) {
    const s = raw.replace(/[\u2018\u2019]/g, "'");
    const m = GUARANTEE.exec(s);
    if (!m) continue;
    const before = s.slice(0, m.index);
    if (NEGATION.test(before)) continue;
    hits.push(raw.length > 300 ? raw.slice(0, 300) : raw);
  }
  return hits;
}

export function detectInjection(answer) {
  return INJECTION.test(String(answer));
}

function invalid(detail) {
  return new ProviderError('invalid_response', RUN_ERROR_MESSAGES.invalid_response, { detail });
}

const clampScore = (n) => Math.max(0, Math.min(100, Math.round(Number(n))));

// Turn raw model output into a verified evaluation. Pure function: no I/O.
export function processEvaluation({ output, scenario, answer, sources, rubricDimensions, threshold }) {
  const parsed = evaluationOutputSchema.safeParse(output);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw invalid(`${issue.path.join('.')}: ${issue.message}`);
  }
  const ev = parsed.data;
  const notes = [];
  const assessed = scenario.assessedDimensions.map((d) => d.key);
  const byKey = new Map();
  for (const d of ev.dimensions) if (assessed.includes(d.key) && !byKey.has(d.key)) byKey.set(d.key, d);
  const missing = assessed.filter((k) => !byKey.has(k));
  if (missing.length) throw invalid(`missing dimensions: ${missing.join(', ')}`);

  const inAnswer = (q) => Boolean(q && q.trim()) && quoteAppearsIn(q, answer);
  let droppedQuotes = 0;

  const dimensionScores = rubricDimensions.map((d) => {
    if (!assessed.includes(d.key)) return { key: d.key, label: d.label, weight: d.weight, assessed: false };
    const r = byKey.get(d.key);
    const evidence = (r.evidence || []).filter((q) => {
      const ok = inAnswer(q);
      if (!ok) droppedQuotes += 1;
      return ok;
    });
    return { key: d.key, label: d.label, weight: d.weight, assessed: true, score: clampScore(r.score), rationale: r.rationale.trim(), evidence };
  });

  const scored = dimensionScores.filter((d) => d.assessed);
  let totalWeight = scored.reduce((a, d) => a + (d.weight > 0 ? d.weight : 0), 0);
  let weighted;
  if (totalWeight > 0) {
    weighted = scored.reduce((a, d) => a + (d.weight > 0 ? d.weight * d.score : 0), 0) / totalWeight;
  } else {
    weighted = scored.reduce((a, d) => a + d.score, 0) / scored.length;
    notes.push('All assessed dimensions had zero weight, so they were averaged equally.');
  }
  const weightedScore = Math.round(weighted);

  const sourceTextByRef = new Map(sources.map((s) => [s.ref, s.sections.map((x) => x.text).join('\n\n')]));
  const allSourceText = [...sourceTextByRef.values()].join('\n\n');
  const sourceTitle = (ref) => sources.find((s) => s.ref === ref)?.title || null;

  const reviewFlags = [];
  const criticalFailures = [];

  for (const cf of ev.critical_failures) {
    if (!inAnswer(cf.claim_quote)) {
      notes.push('A critical-failure claim was not found in the answer and was discarded.');
      continue;
    }
    if (cf.type !== 'unauthorized_guarantee') {
      const scoped = cf.source_ref && sourceTextByRef.has(cf.source_ref) ? sourceTextByRef.get(cf.source_ref) : allSourceText;
      const sourceOk = Boolean(cf.source_quote) && (quoteAppearsIn(cf.source_quote, scoped) || quoteAppearsIn(cf.source_quote, allSourceText));
      if (!sourceOk) {
        reviewFlags.push({
          kind: 'unverified_critical',
          type: cf.type,
          claimQuote: cf.claim_quote,
          note: `${cf.explanation} The cited source passage could not be found in the approved material, so this was not counted as a critical failure. A manager should check it.`,
        });
        continue;
      }
    }
    criticalFailures.push({
      type: cf.type,
      claimQuote: cf.claim_quote,
      sourceRef: cf.source_ref || null,
      sourceTitle: cf.source_ref ? sourceTitle(cf.source_ref) : null,
      sourceQuote: cf.type === 'unauthorized_guarantee' ? cf.source_quote || null : cf.source_quote,
      explanation: cf.explanation,
    });
  }

  const flaggedQuotes = new Set([...criticalFailures, ...reviewFlags].map((x) => x.claimQuote));
  for (const c of ev.claims) {
    if (!inAnswer(c.claim_quote) || flaggedQuotes.has(c.claim_quote)) continue;
    const sourceQuoteOk = c.source_quote ? quoteAppearsIn(c.source_quote, allSourceText) : false;
    if (c.status === 'unsupported' || c.status === 'uncertain') {
      reviewFlags.push({
        kind: c.status,
        claimQuote: c.claim_quote,
        sourceRef: c.source_ref || null,
        sourceQuote: sourceQuoteOk ? c.source_quote : null,
        note:
          c.note ||
          (c.status === 'unsupported'
            ? 'The approved material does not cover this claim. It may be true; a manager should confirm it.'
            : 'The approved material marks this as unverified or to be confirmed.'),
      });
      flaggedQuotes.add(c.claim_quote);
    } else if (c.status === 'contradicted') {
      reviewFlags.push({
        kind: 'possible_contradiction',
        claimQuote: c.claim_quote,
        sourceRef: c.source_ref || null,
        sourceQuote: sourceQuoteOk ? c.source_quote : null,
        note: c.note || 'This claim may conflict with approved material. A manager should check it.',
      });
      flaggedQuotes.add(c.claim_quote);
    }
  }

  const coveredGuarantee = (s) => [...flaggedQuotes].some((q) => quoteAppearsIn(q, s) || quoteAppearsIn(s, q));
  for (const s of detectGuarantees(answer)) {
    if (coveredGuarantee(s)) continue;
    reviewFlags.push({
      kind: 'possible_guarantee',
      claimQuote: s,
      note: 'This sentence reads like a promise of results. Sales Lab flagged it automatically for a manager to check.',
    });
  }

  if (ev.injection_detected || detectInjection(answer)) {
    reviewFlags.push({
      kind: 'instruction_text',
      claimQuote: null,
      note: 'The answer contains text addressed to the evaluator. It was treated as part of the answer, not as an instruction.',
    });
  }

  if (droppedQuotes > 0) notes.push(`${droppedQuotes} evidence quote${droppedQuotes === 1 ? '' : 's'} did not match the answer and ${droppedQuotes === 1 ? 'was' : 'were'} removed.`);

  const inAnswerOrNull = (q) => (inAnswer(q) ? q : null);
  const feedback = {
    summary: ev.summary.trim(),
    strengths: ev.strengths.map((s) => ({ point: s.point.trim(), evidence: inAnswerOrNull(s.evidence) })),
    improvements: ev.improvements.map((s) => ({ point: s.point.trim(), evidence: inAnswerOrNull(s.evidence), suggestion: s.suggestion.trim() })),
    strongerExample: ev.stronger_example.trim(),
    buyerReaction: ev.buyer_reaction.trim(),
    nextFocus: {
      dimension: assessed.includes(ev.next_focus.dimension) ? ev.next_focus.dimension : null,
      suggestion: ev.next_focus.suggestion.trim(),
    },
  };

  const overallScore = criticalFailures.length ? 0 : weightedScore;
  const reviewStatus = criticalFailures.length || reviewFlags.length ? 'provisional' : 'final';
  return {
    dimensionScores,
    weightedScore,
    overallScore,
    criticalFailures,
    reviewFlags,
    reviewStatus,
    meetsTarget: criticalFailures.length === 0 && overallScore >= threshold,
    feedback,
    notes,
  };
}
