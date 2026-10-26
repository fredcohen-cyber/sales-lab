import { evaluationOutputSchema } from './schema.js';
import { ProviderError, RUN_ERROR_MESSAGES } from './provider.js';
import { quoteAppearsIn, sentenceContaining } from '../lib/text.js';

// A negation counts only when it governs the verb directly ("can't guarantee", "no one can honestly
// promise"): it must sit in the same clause, within the last few words before the verb.
const NEGATION_WORDS = /\b(not|never|no one|nobody|cannot|can't|can not|won't|wouldn't|don't|do not|doesn't|does not|isn't|aren't|unable|no)\b/i;
const CLAUSE_BREAK = /[,;:\u2013\u2014]|\s(?:and|but|because|so|since)\s/gi;
function negatesVerb(before) {
  const parts = before.split(CLAUSE_BREAK);
  const clause = parts[parts.length - 1] || '';
  const lastWords = clause.trim().split(/\s+/).slice(-4).join(' ');
  return NEGATION_WORDS.test(lastWords);
}
const GUARANTEE = /\b(guarantee[ds]?|guaranteeing|i promise|we promise|promise you|you will definitely|you'll definitely|will definitely|100% (?:sure|certain)|risk[- ]free results?)\b/i;
const INJECTION =
  /(ignore (?:all |any |the )?(?:previous|prior|above|earlier) (?:instructions|rules|prompts?)|disregard (?:the|your) (?:rules|instructions)|you are now|system prompt|as the (?:evaluator|grader|ai|model)|give (?:me|this(?: answer)?) (?:a )?(?:100|full marks|perfect|top)|score (?:this|me) (?:a )?(?:100|perfect|highly)|record_evaluation|<\/?\s*(?:rep_answer|source_material|scenario|rubric|conversation|turn|buyer|rep_reply)\b)/i;

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
    if (negatesVerb(s.slice(0, m.index))) continue;
    hits.push(raw.length > 300 ? raw.slice(0, 300) : raw);
  }
  return hits;
}

// "We can't guarantee more cases" mentions a guarantee but declines to give one.
export function isNegatedGuarantee(sentence) {
  const s = String(sentence || '').replace(/[\u2018\u2019]/g, "'");
  const m = GUARANTEE.exec(s);
  return Boolean(m) && negatesVerb(s.slice(0, m.index));
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
  // Critical failures need an exact, contiguous quote (short elisions only) of the rep's words and the source.
  const strictlyInAnswer = (q) => Boolean(q && q.trim()) && quoteAppearsIn(q, answer, { strict: true });
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
    if (!strictlyInAnswer(cf.claim_quote)) {
      // Never dropped silently: a manager sees it, and can add it with the rep's exact words if it holds up.
      const loose = inAnswer(cf.claim_quote);
      reviewFlags.push({
        kind: 'unverified_critical',
        type: cf.type,
        claimQuote: loose ? cf.claim_quote : null,
        note: `${cf.explanation} Coaching reported this as a critical failure, but its quote ${loose ? 'did not match the answer word for word' : 'does not appear in the answer'}, so it was not counted. A manager should check it.`,
      });
      continue;
    }
    if (cf.type === 'unauthorized_guarantee') {
      const sentence = sentenceContaining(answer, cf.claim_quote);
      if (sentence && isNegatedGuarantee(sentence)) {
        reviewFlags.push({
          kind: 'possible_guarantee',
          claimQuote: cf.claim_quote,
          note: `${cf.explanation} Coaching called this a guarantee, but the sentence appears to decline to guarantee results, so it was not counted as a critical failure. A manager should check it.`,
        });
        continue;
      }
    } else {
      const scoped = cf.source_ref && sourceTextByRef.has(cf.source_ref) ? sourceTextByRef.get(cf.source_ref) : allSourceText;
      const sourceOk =
        Boolean(cf.source_quote) &&
        (quoteAppearsIn(cf.source_quote, scoped, { strict: true }) || quoteAppearsIn(cf.source_quote, allSourceText, { strict: true }));
      if (!sourceOk) {
        reviewFlags.push({
          kind: 'unverified_critical',
          type: cf.type,
          claimQuote: cf.claim_quote,
          note: `${cf.explanation} The cited source passage could not be found word for word in the approved material, so this was not counted as a critical failure. A manager should check it.`,
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
      origin: 'coach',
      status: 'pending',
    });
  }

  const flaggedQuotes = new Set([...criticalFailures, ...reviewFlags].map((x) => x.claimQuote));
  for (const c of ev.claims) {
    if (!inAnswer(c.claim_quote) || flaggedQuotes.has(c.claim_quote)) continue;
    const sourceQuoteOk = c.source_quote ? quoteAppearsIn(c.source_quote, allSourceText) : false;
    if (c.status === 'overstated') {
      reviewFlags.push({
        kind: 'overstated',
        claimQuote: c.claim_quote,
        sourceRef: c.source_ref || null,
        sourceQuote: sourceQuoteOk ? c.source_quote : null,
        note:
          c.note ||
          'The approved material supports this only as a public claim, an untested observation, or a point to confirm, but the answer states it as established fact.',
      });
      flaggedQuotes.add(c.claim_quote);
    } else if (c.status === 'unsupported' || c.status === 'uncertain') {
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

  // Skip a sentence only if a guarantee finding already covers it; other claims in the same sentence do not.
  const guaranteeQuotes = [
    ...criticalFailures.filter((c) => c.type === 'unauthorized_guarantee'),
    ...reviewFlags.filter((f) => f.kind === 'possible_guarantee' || f.type === 'unauthorized_guarantee'),
  ].map((x) => x.claimQuote);
  const coveredGuarantee = (s) => guaranteeQuotes.some((q) => quoteAppearsIn(q, s) || quoteAppearsIn(s, q));
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
  // In a conversation, the earlier replies and the buyer's latest words were part of what coaching read.
  const history = scenario.conversation?.history || [];
  if (history.length && (history.some((t) => detectInjection(t.answer)) || detectInjection(scenario.buyerLine))) {
    reviewFlags.push({
      kind: 'instruction_text',
      claimQuote: null,
      note: 'An earlier reply in this conversation, or the buyer’s line it led to, contains text addressed to the evaluator. Coaching treated it as part of the conversation, not as an instruction; a manager should check this reply’s score.',
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

  criticalFailures.forEach((c, i) => {
    c.id = `cf${i + 1}`;
  });
  reviewFlags.forEach((f, i) => {
    f.id = `f${i + 1}`;
    f.status = 'open';
  });

  // A critical failure counts only once a manager confirms it. Until then the overall score is unknown:
  // it becomes 0 if the failure is confirmed and the weighted score if it is rejected.
  const pendingCritical = criticalFailures.length > 0;
  const overallScore = pendingCritical ? null : weightedScore;
  const reviewStatus = criticalFailures.length || reviewFlags.length ? 'provisional' : 'final';
  return {
    dimensionScores,
    weightedScore,
    overallScore,
    criticalFailures,
    reviewFlags,
    reviewStatus,
    meetsTarget: !pendingCritical && weightedScore >= threshold,
    feedback,
    notes,
  };
}

// Applies a manager's decisions to an evaluation's critical failures and flags. Pure function.
// decisions: { criticalFailures: { [id]: 'confirm' | 'reject' }, flags: { [id]: 'dismiss' | 'critical' },
//              flagTypes: { [id]: type }, added: [{ type, claimQuote, explanation }] }
export function applyReviewDecisions(ev, decisions, { answer, threshold, reviewerName }) {
  const problems = [];
  const cfs = (ev.critical_failures || []).map((c) => ({ ...c }));
  const flags = (ev.review_flags || []).map((f) => ({ ...f }));
  const cfDecisions = decisions.criticalFailures || {};
  const flagDecisions = decisions.flags || {};
  for (const [id, d] of Object.entries(cfDecisions)) {
    const c = cfs.find((x) => x.id === id);
    if (!c) problems.push(`Unknown critical failure ${id}.`);
    else c.status = d === 'confirm' ? 'confirmed' : 'rejected';
  }
  let nextId = cfs.reduce((n, c) => Math.max(n, Number.parseInt(String(c.id).replace(/\D/g, ''), 10) || 0), 0) + 1;
  for (const [id, d] of Object.entries(flagDecisions)) {
    const f = flags.find((x) => x.id === id);
    if (!f) {
      problems.push(`Unknown flag ${id}.`);
      continue;
    }
    if (d === 'critical') {
      if (f.status === 'made_critical') continue;
      if (!f.claimQuote || !quoteAppearsIn(f.claimQuote, answer)) {
        problems.push('That flag does not quote the answer, so it cannot become a critical failure. Add one with the rep’s exact words instead.');
        continue;
      }
      const type = decisions.flagTypes?.[id] || (f.kind === 'possible_guarantee' ? 'unauthorized_guarantee' : f.type || 'contradicts_approved_fact');
      f.status = 'made_critical';
      cfs.push({
        id: `cf${nextId++}`,
        type,
        claimQuote: f.claimQuote,
        sourceRef: f.sourceRef || null,
        sourceQuote: f.sourceQuote || null,
        explanation: decisions.flagExplanations?.[id] || f.note,
        origin: 'manager',
        status: 'confirmed',
        fromFlag: id,
        confirmedBy: reviewerName,
      });
    } else {
      // Dismissing a flag that was turned into a critical failure earlier removes that failure too.
      if (f.status === 'made_critical') {
        for (const c of cfs) if (c.fromFlag === id) c.status = 'rejected';
      }
      f.status = 'dismissed';
    }
  }
  for (const add of decisions.added || []) {
    if (!quoteAppearsIn(add.claimQuote, answer)) {
      problems.push('A critical failure must quote words that appear in the answer.');
      continue;
    }
    cfs.push({
      id: `cf${nextId++}`,
      type: add.type,
      claimQuote: add.claimQuote,
      sourceRef: null,
      sourceQuote: null,
      explanation: add.explanation,
      origin: 'manager',
      status: 'confirmed',
      confirmedBy: reviewerName,
    });
  }
  // Items set aside when an evaluation was disputed need a fresh decision if it is reviewed again.
  const unresolved =
    cfs.filter((c) => c.status === 'pending' || c.status === 'set_aside').length + flags.filter((f) => f.status === 'open' || f.status === 'set_aside').length;
  const confirmed = cfs.filter((c) => c.status === 'confirmed').length;
  const overallScore = confirmed > 0 ? 0 : ev.weighted_score;
  return {
    problems,
    unresolved,
    criticalFailures: cfs,
    reviewFlags: flags,
    overallScore,
    meetsTarget: confirmed === 0 && overallScore >= threshold,
  };
}
