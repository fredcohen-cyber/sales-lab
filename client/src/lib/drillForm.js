// A question as the editor holds it, and the body the server takes to save it. The Question Bank page
// uses the same conversion to save an approval without opening the editor.

// The ideal answer as the editor holds it, from what the server stored.
export function idealFromDrill(d) {
  const ia = d?.idealAnswer || { text: '', status: 'none', review: {} };
  const r = ia.review || {};
  return {
    text: ia.text || '',
    approved: ia.status === 'approved',
    origin: r.origin || 'manager',
    approach: r.approach || '',
    notes: r.notes || '',
    claims: r.claims || [],
    persona: r.persona || null,
    model: r.model || null,
    // Shown while reviewing a fresh proposal only.
    warnings: [],
    approvedByName: r.approvedByName || null,
    approvedAt: r.approvedAt || null,
  };
}

export function formFromDrill(d) {
  return {
    title: d.title,
    brand: d.brand,
    subject: d.subject,
    stage: d.stage,
    roles: d.roles,
    personas: d.personas,
    situation: d.situation,
    buyerLine: d.buyerLine,
    personaLines: d.personaLines || {},
    objective: d.objective,
    goodLooksLike: d.goodLooksLike,
    roleGuidance: d.roleGuidance || {},
    pushbacks: d.pushbacks || [],
    assessedDimensions: d.assessedDimensions,
    defaults: d.defaults,
    sourceRefs: d.sourceRefs || [],
    changeNote: '',
    status: d.status,
    version: d.version,
    productLine: d.productLine,
    concept: d.concept || '',
  };
}

// The question fields the server validates, without the editor's own bookkeeping.
export function questionBody(form) {
  const { version, ...rest } = form;
  return {
    ...rest,
    pushbacks: Array.from(form.pushbacks, (x) => (x || '').trim()).filter(Boolean),
    sourceRefs: form.sourceRefs.map((r) => ({
      sourceId: r.sourceId,
      sections: r.wholeSource ? [] : r.sections,
      wholeSource: Boolean(r.wholeSource),
    })),
  };
}

export function idealBody(ideal) {
  return {
    text: ideal.text,
    approved: Boolean(ideal.approved && ideal.text.trim()),
    origin: ideal.origin,
    approach: ideal.approach,
    notes: ideal.notes,
    claims: ideal.claims.map((c) => ({ claim: c.claim, sourceTitle: c.sourceTitle || null, sourceQuote: c.sourceQuote || '', verified: Boolean(c.verified) })),
    persona: ideal.persona,
    model: ideal.model,
  };
}
