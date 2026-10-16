import { Link } from 'react-router-dom';
import { CheckIcon } from './Icons.jsx';
import { Notice, ReviewBadge, ScoreBar } from './ui.jsx';

const CF_LABEL = {
  invented_capability: 'Invented capability',
  contradicts_approved_fact: 'Contradicts approved material',
  unauthorized_guarantee: 'Unauthorized guarantee',
};
const FLAG_LABEL = {
  unsupported: 'Not covered by approved material',
  uncertain: 'Marked as unverified in the material',
  possible_contradiction: 'May conflict with approved material',
  unverified_critical: 'Possible critical issue, not verified',
  possible_guarantee: 'Reads like a promise of results',
  instruction_text: 'Text addressed to the evaluator',
};

function Quote({ children }) {
  if (!children) return null;
  return <span className="evidence">“{children}”</span>;
}

export function CoachingResult({ attempt, evaluation, next }) {
  const ev = evaluation;
  const s = attempt.scenario;
  const cfs = ev.criticalFailures || [];
  const flags = ev.reviewFlags || [];
  const assessed = ev.dimensionScores.filter((d) => d.assessed);
  const notAssessed = ev.dimensionScores.filter((d) => !d.assessed);
  const zero = cfs.length > 0;

  return (
    <div className="stack-lg">
      <section className="panel" aria-labelledby="score-title">
        <h2 id="score-title" className="visually-hidden">
          Score
        </h2>
        <div className="score-slip">
          <div className={`score-figure${zero ? ' zero' : ''}`} aria-label={`Overall score ${ev.overallScore} out of 100`}>
            {ev.overallScore}
            <small>/100</small>
          </div>
          <div className="stack-sm">
            <div className="row">
              <span className="badge badge-neutral">{attempt.isFirstAttempt ? 'First attempt' : `Retry ${attempt.attemptNumber - 1}`}</span>
              {ev.meetsTarget ? (
                <span className="badge badge-ok">
                  <CheckIcon />
                  Met target of {ev.proficiencyThreshold}
                </span>
              ) : (
                <span className="badge badge-neutral">Below target of {ev.proficiencyThreshold}</span>
              )}
              <ReviewBadge status={ev.reviewStatus} />
            </div>
            <p className="small muted" style={{ margin: 0 }}>{ev.feedback.summary}</p>
            {zero && (
              <p className="small" style={{ margin: 0 }}>
                A critical failure sets the overall score to zero. Without it, the weighted score would be {ev.weightedScore}.
              </p>
            )}
          </div>
        </div>
        {ev.reviewStatus === 'provisional' && (
          <p className="tiny muted" style={{ marginTop: 12, marginBottom: 0 }}>
            This evaluation is waiting for a manager to review the flagged items below. Until then it is not counted in performance reports.
          </p>
        )}
        {ev.reviewStatus === 'disputed' && (
          <p className="tiny muted" style={{ marginTop: 12, marginBottom: 0 }}>
            A manager disputed this evaluation, so it is not counted in performance reports.
            {ev.reviewNote ? ` Their note: ${ev.reviewNote}` : ''}
          </p>
        )}
      </section>

      {cfs.length > 0 && (
        <Notice kind="critical" title={`Critical failure${cfs.length > 1 ? 's' : ''}`}>
          <ul className="feedback-list">
            {cfs.map((c, i) => (
              <li key={i}>
                <strong>{CF_LABEL[c.type] || c.type}.</strong> {c.explanation}
                <Quote>{c.claimQuote}</Quote>
                {c.sourceQuote && (
                  <span className="quote-source">
                    {c.sourceTitle ? `${c.sourceTitle}: ` : 'Approved material: '}“{c.sourceQuote}”
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Notice>
      )}

      {flags.length > 0 && (
        <Notice kind="warn" title="Flagged for manager review">
          <p className="small">These are not counted as mistakes. A manager checks them against approved material.</p>
          <ul className="feedback-list">
            {flags.map((f, i) => (
              <li key={i}>
                <strong>{FLAG_LABEL[f.kind] || 'Flag'}.</strong> {f.note}
                <Quote>{f.claimQuote}</Quote>
                {f.sourceQuote && <span className="quote-source">Approved material: “{f.sourceQuote}”</span>}
              </li>
            ))}
          </ul>
        </Notice>
      )}

      <section className="stack-sm" aria-labelledby="buyer-reaction">
        <h2 id="buyer-reaction" className="section-title">
          How the {s.persona.label.toLowerCase()} might respond
        </h2>
        <div className="buyer-reply">
          <blockquote>{ev.feedback.buyerReaction}</blockquote>
        </div>
        <p className="tiny muted">A simulated reaction to your actual words, at skepticism level {s.settings.skepticism}.</p>
      </section>

      <div className="grid-2">
        <section className="panel">
          <h2 className="section-title">What worked</h2>
          {ev.feedback.strengths.length === 0 ? (
            <p className="muted small">No specific strengths were noted.</p>
          ) : (
            <ul className="feedback-list">
              {ev.feedback.strengths.map((x, i) => (
                <li key={i}>
                  {x.point}
                  <Quote>{x.evidence}</Quote>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="panel">
          <h2 className="section-title">To improve</h2>
          {ev.feedback.improvements.length === 0 ? (
            <p className="muted small">No specific improvements were noted.</p>
          ) : (
            <ul className="feedback-list">
              {ev.feedback.improvements.map((x, i) => (
                <li key={i}>
                  <strong>{x.point}</strong>
                  <Quote>{x.evidence}</Quote>
                  <span className="small" style={{ display: 'block', marginTop: 6 }}>
                    Try: {x.suggestion}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="panel" aria-labelledby="dims-title">
        <div className="panel-head">
          <h2 id="dims-title" className="section-title" style={{ margin: 0 }}>
            Scores by dimension
          </h2>
          <span className="tiny muted">Weighted by the scoring rubric; only assessed dimensions count.</span>
        </div>
        <div className="dim-list">
          {assessed.map((d) => (
            <div key={d.key} className="dim">
              <span className="dim-name">
                {d.label} <span className="muted tiny">({d.weight}% weight)</span>
              </span>
              <span className="dim-score">{d.score}</span>
              <ScoreBar value={d.score} label={d.label} />
              <div className="dim-body">
                {d.rationale}
                {d.evidence.map((q, i) => (
                  <Quote key={i}>{q}</Quote>
                ))}
              </div>
            </div>
          ))}
          {notAssessed.map((d) => (
            <div key={d.key} className="dim not-assessed">
              <span className="dim-name">{d.label}</span>
              <span className="dim-score tiny">Not assessed</span>
            </div>
          ))}
        </div>
      </section>

      <section className="stack-sm" aria-labelledby="model-title">
        <h2 id="model-title" className="section-title">
          A stronger answer
        </h2>
        <div className="model-answer">{ev.feedback.strongerExample}</div>
        <p className="tiny muted">Written from approved material only. Use it as a model, not a script.</p>
      </section>

      <section className="panel panel-tight stack-sm">
        <h2 className="section-title">Practice next</h2>
        <p style={{ margin: 0 }}>{ev.feedback.nextFocus.suggestion}</p>
        {next?.drillId && (
          <p className="small" style={{ margin: 0 }}>
            Suggested drill for {next.dimensionLabel.toLowerCase()}: <Link to={`/practice/drill/${next.drillId}`}>{next.drillTitle}</Link>
          </p>
        )}
      </section>

      {ev.verificationNotes?.length > 0 && (
        <p className="tiny muted">
          Checks applied: {ev.verificationNotes.join(' ')}
        </p>
      )}
    </div>
  );
}
