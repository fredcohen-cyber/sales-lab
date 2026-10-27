// The ideal answer for a question: proposed by the AI from the approved material, reviewed and approved by
// a manager. Approved answers are shown to reps after they answer, and given to coaching as a reference.
import { ErrorNotice, fmtDate, Notice } from './ui.jsx';
import { AlertIcon, CheckIcon, SparkIcon } from './Icons.jsx';

export function IdealBadge({ status }) {
  if (status === 'approved')
    return (
      <span className="badge badge-ok">
        <CheckIcon />
        Ideal answer approved
      </span>
    );
  if (status === 'proposed')
    return (
      <span className="badge badge-warn">
        <AlertIcon />
        Ideal answer to review
      </span>
    );
  return <span className="badge badge-neutral">No ideal answer</span>;
}

// The facts an answer relies on, each with the passage it was matched to.
export function FactList({ claims }) {
  if (!claims?.length) return null;
  return (
    <div className="stack-sm">
      <h3 className="section-title" style={{ margin: 0 }}>
        Facts it relies on
      </h3>
      <ul className="feedback-list ideal-facts">
        {claims.map((c, i) => (
          <li key={i}>
            <div className="row" style={{ gap: 8 }}>
              {c.verified ? <span className="badge badge-ok">Matched to the material</span> : <span className="badge badge-warn">Not matched: check it</span>}
            </div>
            <span className="evidence">“{c.claim}”</span>
            {c.sourceQuote && (
              <span className="quote-source">
                {c.sourceTitle ? `${c.sourceTitle}: ` : ''}“{c.sourceQuote}”
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

const ORIGIN_TEXT = {
  ai: 'Proposed by the AI',
  ai_edited: 'Proposed by the AI and edited',
  manager: 'Written by a manager',
};

// Who wrote it and who approved it.
export function idealProvenance(ideal, status) {
  const from = ORIGIN_TEXT[ideal.origin] || ORIGIN_TEXT.manager;
  if (status === 'approved') return `${from}. Approved${ideal.approvedByName ? ` by ${ideal.approvedByName}` : ''}${ideal.approvedAt ? ` on ${fmtDate(ideal.approvedAt)}` : ''}.`;
  return `${from}. Not approved yet, so reps and coaching do not see it.`;
}

// Read-only, for reviewing a question in the bank.
export function IdealAnswerView({ ideal, status }) {
  if (!ideal.text) return <p className="small muted" style={{ margin: 0 }}>No ideal answer yet.</p>;
  return (
    <div className="stack-sm">
      <div className="model-answer">{ideal.text}</div>
      <p className="tiny muted" style={{ margin: 0 }}>
        {idealProvenance(ideal, status)}
      </p>
      {ideal.approach && (
        <p className="small" style={{ margin: 0 }}>
          <strong>Why it works:</strong> {ideal.approach}
        </p>
      )}
      {ideal.notes && (
        <Notice kind="info" title={status === 'approved' ? 'Noted when it was proposed' : 'To check before approving'}>
          {ideal.notes}
        </Notice>
      )}
      <FactList claims={ideal.claims} />
    </div>
  );
}

// In the editor: propose, edit, and approve.
export function IdealAnswerEditor({ ideal, onChange, onPropose, proposing, error, adding }) {
  const set = (patch) => onChange({ ...ideal, ...patch });
  const status = ideal.text.trim() ? (ideal.approved ? 'approved' : 'proposed') : 'none';
  return (
    <section className="panel stack ideal-panel" id="ideal-answer" aria-labelledby="ideal-title">
      <div className="row-between">
        <h2 id="ideal-title" className="section-title with-icon improve" style={{ margin: 0 }}>
          <SparkIcon size={16} />
          {adding ? 'Review the ideal answer' : 'Ideal answer'}
        </h2>
        <IdealBadge status={status} />
      </div>
      <p className="small muted" style={{ margin: 0 }}>
        The answer an excellent rep would give. Sales Lab proposes one from this question and its approved source material. Once you approve it, reps see it after
        they answer, and coaching uses it as a reference.
      </p>
      {proposing && (
        <div className="ideal-proposing" role="status">
          <span className="ideal-spinner" aria-hidden="true" />
          Writing an ideal answer from the approved material. This usually takes 10 to 40 seconds.
        </div>
      )}
      {error && <ErrorNotice error={{ message: error.message }} />}
      {(ideal.warnings || []).map((w) => (
        <Notice key={w} kind="warn">
          {w}
        </Notice>
      ))}
      <div className="field">
        <label htmlFor="ideal-text">Ideal answer</label>
        <textarea
          id="ideal-text"
          rows={7}
          value={ideal.text}
          disabled={proposing}
          placeholder={proposing ? '' : 'Propose one, or write it yourself.'}
          onChange={(e) => set({ text: e.target.value, origin: ideal.origin === 'ai' || ideal.origin === 'ai_edited' ? 'ai_edited' : 'manager' })}
        />
        <span className="hint">Exactly what the rep would say or write. Edit it as you see fit.</span>
      </div>
      {ideal.text && (ideal.approach || ideal.origin) && (
        <p className="tiny muted" style={{ margin: 0 }}>
          {idealProvenance(ideal, status)}
          {ideal.persona ? ` Written for ${/^[aeiou]/i.test(ideal.persona.label) ? 'an' : 'a'} ${ideal.persona.label.toLowerCase()}.` : ''}
        </p>
      )}
      {ideal.approach && (
        <p className="small" style={{ margin: 0 }}>
          <strong>Why it works:</strong> {ideal.approach}
        </p>
      )}
      {ideal.notes && <Notice kind="info" title="To check before approving">{ideal.notes}</Notice>}
      <FactList claims={ideal.claims} />
      <div className="row-between ideal-actions">
        <button type="button" className="btn btn-secondary btn-small" onClick={onPropose} disabled={proposing}>
          <SparkIcon size={15} />
          {ideal.text ? 'Propose a new one' : 'Propose an ideal answer'}
        </button>
        <label className="checkbox ideal-approve">
          <input type="checkbox" checked={ideal.approved && Boolean(ideal.text.trim())} disabled={!ideal.text.trim() || proposing} onChange={(e) => set({ approved: e.target.checked })} />
          I reviewed it: approve this as the ideal answer
        </label>
      </div>
    </section>
  );
}
