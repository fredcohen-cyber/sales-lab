import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { get } from '../api.js';
import { useAuth, useMeta } from '../state.jsx';
import { Empty, ErrorNotice, fmtDate, Loading, Notice, useLoad } from '../components/ui.jsx';
import { ClipboardIcon, PadIcon, STAGE_ICONS } from '../components/Icons.jsx';
import { NextUpCard } from './Home.jsx';

const TRACK_TITLE = { ae: 'Account executive stages', am: 'Account manager stages' };
const VIEW_LABEL = { practice: 'Practice', again: 'Try again' };
// Product lines in the order reps see them in the filter.
const PRODUCT_ORDER = ['ravenly', 'omnizant_ai_search', 'omnizant_web', 'general'];

// A rep's last filters, remembered on this device only.
const filtersKey = (userId) => `${userId}:practice-filters`;
export function savedPracticeFilters(userId) {
  try {
    const v = JSON.parse(localStorage.getItem(filtersKey(userId)) || '{}');
    return { product: typeof v.product === 'string' ? v.product : '', buyer: typeof v.buyer === 'string' ? v.buyer : '' };
  } catch {
    return { product: '', buyer: '' };
  }
}
function savePracticeFilters(userId, filters) {
  try {
    localStorage.setItem(filtersKey(userId), JSON.stringify(filters));
  } catch {
    /* storage unavailable: filters still work for this visit */
  }
}
// The query string for a product and buyer, as the stage endpoints and links take it.
export const filterQuery = ({ product, buyer }, { persona = 'buyer' } = {}) => {
  const q = new URLSearchParams();
  if (product) q.set('product', product);
  if (buyer) q.set(persona, buyer);
  return q.toString();
};

function PracticeFilters({ meta, filters, onChange, children = null }) {
  const products = PRODUCT_ORDER.filter((k) => meta.productLines?.[k]);
  return (
    <div className="filters" role="search" aria-label="Narrow the questions">
      <div className="field">
        <label htmlFor="pf-product">Product</label>
        <select id="pf-product" value={filters.product} onChange={(e) => onChange({ ...filters, product: e.target.value })}>
          <option value="">All products</option>
          {products.map((k) => (
            <option key={k} value={k}>
              {meta.productLines[k].label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="pf-buyer">Buyer</label>
        <select id="pf-buyer" value={filters.buyer} onChange={(e) => onChange({ ...filters, buyer: e.target.value })}>
          <option value="">All buyers</option>
          {meta.personas.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      {children}
      {(filters.product || filters.buyer) && (
        <button type="button" className="btn btn-quiet btn-small" onClick={() => onChange({ product: '', buyer: '' })}>
          Clear filters
        </button>
      )}
    </div>
  );
}

function StageTile({ stage, filters }) {
  const narrowed = Boolean(filters.product || filters.buyer);
  const status = stage.openAttemptId ? 'Conversation in progress' : stage.waiting ? 'Question waiting' : null;
  const count = `${stage.questions} question${stage.questions === 1 ? '' : 's'}${stage.concepts ? ` on ${stage.concepts} concept${stage.concepts === 1 ? '' : 's'}` : ''}`;
  const progress = stage.answered ? `You have answered ${stage.answered} of ${count}` : count;
  const Icon = STAGE_ICONS[stage.key] || PadIcon;
  const tile = (
    <span className={`icon-tile${!stage.questions ? ' gray' : stage.track === 'am' ? ' rose' : ''}`} aria-hidden="true">
      <Icon />
    </span>
  );
  if (!stage.questions) {
    return (
      <div className="drill stage-tile stage-tile-empty" aria-disabled="true">
        <div className="stage-tile-top">{tile}</div>
        <h3>{stage.label}</h3>
        <p className="drill-line">{stage.description}</p>
        <div className="drill-foot">
          <span className="tiny muted">{narrowed ? 'No questions for these filters yet.' : 'No questions for your role yet.'}</span>
        </div>
      </div>
    );
  }
  const query = filterQuery(filters);
  return (
    <Link to={`/practice/stage/${stage.key}${query ? `?${query}` : ''}`} className="drill stage-tile" aria-describedby={`stage-${stage.key}-progress`}>
      {/* The title comes first in the link's text, so the link reads as the stage's name. */}
      <div className="stage-tile-top">{tile}</div>
      <h3>{stage.label}</h3>
      <p className="drill-line">{stage.description}</p>
      <div className="drill-foot">
        <span id={`stage-${stage.key}-progress`} className="tiny muted">
          {progress}
        </span>
        {status && <span className="badge badge-info">{status}</span>}
        {stage.coachable === 0 && <span className="badge badge-warn">Unscored only</span>}
      </div>
    </Link>
  );
}

function StageGrid({ user, filters }) {
  const query = filterQuery(filters, { persona: 'persona' });
  const { data, error, loading, reload } = useLoad(() => get(`/practice/stages${query ? `?${query}` : ''}`), [query]);
  if (error) return <ErrorNotice error={error} retry={reload} />;
  if (loading && !data) return <Loading />;
  const stages = data.stages;
  // The person's own role first.
  const order = user.role === 'am' ? ['am', 'ae'] : ['ae', 'am'];
  return order
    .map((track) => ({ track, stages: stages.filter((s) => s.track === track) }))
    .filter((g) => g.stages.length)
    .map((g) => (
      <section key={g.track} className="stage-group" aria-labelledby={`track-${g.track}`}>
        <h2 id={`track-${g.track}`}>{TRACK_TITLE[g.track]}</h2>
        <div className="drill-list">
          {g.stages.map((s) => (
            <StageTile key={s.key} stage={s} filters={filters} />
          ))}
        </div>
      </section>
    ));
}

// The latest result of a question the person answered, as the list shows it.
function lastResult({ state, score, repliesDone, repliesPlanned }) {
  if (state === 'scored') return String(score);
  if (state === 'unfinished') return `${repliesDone} of ${repliesPlanned} replies`;
  if (state === 'unscored') return 'Unscored';
  if (state === 'pending_review') return 'Pending review';
  if (state === 'disputed') return 'Disputed';
  return 'Being coached';
}

// Sort order for the try-again list, remembered on this device only.
const sortKey = (userId) => `${userId}:try-again-sort`;
function savedSort(userId) {
  try {
    return localStorage.getItem(sortKey(userId)) === 'lowest' ? 'lowest' : 'recent';
  } catch {
    return 'recent';
  }
}

// Questions the person has answered, one row per question and buyer, to try one again with the same
// buyer and levels, or to finish a conversation they started.
function TryAgainList({ user, meta, filters, setFilters, onPractice }) {
  const query = filterQuery(filters, { persona: 'persona' });
  const { data, error, loading, reload } = useLoad(() => get(`/practice/answered${query ? `?${query}` : ''}`), [query]);
  const [sort, setSort] = useState(() => savedSort(user.id));
  const changeSort = (v) => {
    setSort(v);
    try {
      localStorage.setItem(sortKey(user.id), v);
    } catch {
      /* storage unavailable: the order still applies for this visit */
    }
  };
  const items = useMemo(() => {
    const list = [...(data?.questions || [])];
    // Lowest score first; questions without a score yet come after the scored ones.
    const scoreOf = (it) => (it.last.state === 'scored' ? it.last.score : Infinity);
    if (sort === 'lowest') list.sort((a, b) => scoreOf(a) - scoreOf(b) || b.lastAt.localeCompare(a.lastAt));
    return list;
  }, [data, sort]);
  const narrowed = Boolean(filters.product || filters.buyer);

  return (
    <>
      <PracticeFilters meta={meta} filters={filters} onChange={setFilters}>
        <div className="field">
          <label htmlFor="ta-sort">Sort</label>
          <select id="ta-sort" value={sort} onChange={(e) => changeSort(e.target.value)}>
            <option value="recent">Most recent</option>
            <option value="lowest">Lowest score first</option>
          </select>
        </div>
      </PracticeFilters>
      <ErrorNotice error={error} retry={reload} />
      {loading && !data && <Loading />}
      {data && items.length === 0 &&
        (narrowed ? (
          <Empty title="No answered questions match these filters">Clear a filter to see more.</Empty>
        ) : (
          <Empty
            title="No answered questions yet"
            action={
              <button type="button" className="btn btn-small" onClick={onPractice}>
                Choose a stage
              </button>
            }
          >
            Questions you answer from a stage appear here, so you can try them again.
          </Empty>
        ))}
      {items.length > 0 && (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Question</th>
                <th>Buyer</th>
                <th className="num">Tries</th>
                <th className="num">Last score</th>
                <th className="num">Best</th>
                <th>Last answered</th>
                <th>
                  <span className="visually-hidden">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={`${it.drillId}:${it.persona.key}`}>
                  <td>
                    <Link className="row-link" to={`/attempts/${it.last.attemptId}`}>
                      {it.title}
                    </Link>
                    <div className="tiny muted">
                      {it.stageLabel}, level {it.difficulty}
                    </div>
                  </td>
                  <td>{it.persona.label}</td>
                  <td className="num">{it.conversations}</td>
                  <td className="num">{lastResult(it.last)}</td>
                  <td className="num">{it.best ?? '—'}</td>
                  <td>{fmtDate(it.lastAt)}</td>
                  <td>
                    {it.openAttemptId ? (
                      <Link className="btn btn-small" to={`/attempts/${it.openAttemptId}`} aria-label={`Continue ${it.title}`}>
                        Continue
                      </Link>
                    ) : (
                      <Link
                        className="btn btn-small"
                        to={`/practice/drill/${it.drillId}?persona=${encodeURIComponent(it.persona.key)}&from=again`}
                        aria-label={`Try again: ${it.title}`}
                      >
                        Try again
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// The practice view's filters: from the link when it has them, otherwise the ones last used here.
function usePracticeFilters(user, meta, params, setParams) {
  const fromUrl = params.has('product') || params.has('buyer');
  const saved = savedPracticeFilters(user.id);
  const raw = fromUrl ? { product: params.get('product') || '', buyer: params.get('buyer') || '' } : saved;
  // Ignore values this workspace doesn't have (an old link, or a removed persona).
  const filters = {
    product: meta.productLines?.[raw.product] ? raw.product : '',
    buyer: meta.personas.some((p) => p.key === raw.buyer) ? raw.buyer : '',
  };
  const setFilters = (next) => {
    savePracticeFilters(user.id, next);
    const p = new URLSearchParams(filterQuery(next));
    if (params.get('view')) p.set('view', params.get('view'));
    setParams(p, { replace: true });
  };
  return [filters, setFilters];
}

export function PracticeStudio() {
  const { user } = useAuth();
  const { meta } = useMeta();
  const [params, setParams] = useSearchParams();
  const views = ['practice', 'again'];
  const view = views.includes(params.get('view')) ? params.get('view') : 'practice';
  const [filters, setFilters] = usePracticeFilters(user, meta, params, setParams);
  const cur = useLoad(() => get('/curriculum/mine'), []);
  useEffect(() => {
    document.title = `${view === 'practice' ? 'Practice Studio' : VIEW_LABEL[view]} · Sales Lab`;
  }, [view]);
  // Practice and Try again share the product and buyer filters.
  const show = (v) => {
    const next = new URLSearchParams(filterQuery(filters));
    if (v !== 'practice') next.set('view', v);
    setParams(next, { replace: true });
  };

  // The question bank moved to its own page.
  if (params.get('view') === 'bank') return <Navigate to={user.isManager ? '/questions' : '/practice'} replace />;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Practice Studio</h1>
          <p className="sub">
            {view === 'again'
              ? 'Questions you’ve answered, with your latest result. Try one again with the same buyer and levels: it starts a new conversation, and your earlier ones stay in My Progress.'
              : 'Choose a stage and answer the buyer’s question. Each reply is coached, then the buyer pushes back, so you practice handling one objection after another.'}
          </p>
        </div>
        {user.isManager && (
          <Link className="btn btn-secondary" to="/questions">
            <ClipboardIcon size={16} />
            Open the Question Bank
          </Link>
        )}
      </div>

      <div className="tabs" role="tablist" aria-label="Practice Studio view">
        {views.map((v) => (
          <button key={v} role="tab" aria-selected={view === v} className={view === v ? 'active' : ''} onClick={() => show(v)}>
            {VIEW_LABEL[v]}
          </button>
        ))}
      </div>

      {!meta.coaching.configured && (
        <div style={{ marginBottom: 20 }}>
          <Notice kind="warn" title="AI coaching is not set up yet">
            <p>Questions run as clearly labeled unscored practice until a manager adds an AI key on the server. The buyer still pushes back where the question lists its pushbacks.</p>
          </Notice>
        </div>
      )}

      {view === 'practice' ? (
        <>
          {cur.data?.next && (
            <div style={{ marginBottom: 24 }}>
              <NextUpCard next={cur.data.next} />
            </div>
          )}
          <PracticeFilters meta={meta} filters={filters} onChange={setFilters} />
          <StageGrid user={user} filters={filters} />
        </>
      ) : (
        <TryAgainList user={user} meta={meta} filters={filters} setFilters={setFilters} onPractice={() => show('practice')} />
      )}
    </div>
  );
}
