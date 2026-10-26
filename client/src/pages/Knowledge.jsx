import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { get } from '../api.js';
import { useAuth, useMeta } from '../state.jsx';
import { BrandChip, Empty, ErrorNotice, fmtDate, Loading, Notice, useLoad } from '../components/ui.jsx';
import { groupSections, Markdown, SectionStatus } from '../components/KnowledgeParts.jsx';
import { PlusIcon } from '../components/Icons.jsx';

const EVIDENCE_SHORT = { documented: 'Documented', public_claims: 'Public claims', observed: 'Observed', mixed: 'Mixed evidence' };
const STATUS = { draft: ['badge-warn', 'Draft'], approved: ['badge-ok', 'Approved'], archived: ['badge-neutral', 'Archived'] };
const firstParagraph = (text) => String(text || '').split(/\n\s*\n/)[0];

function countText(c, isManager) {
  const n = c.counts.sections;
  const parts = [`${n} section${n === 1 ? '' : 's'}`];
  if (isManager && c.counts.drafts) parts.push(c.counts.drafts === n ? 'all drafts' : `${c.counts.drafts} draft${c.counts.drafts === 1 ? '' : 's'}`);
  if (isManager && c.counts.pendingEdits) parts.push(`${c.counts.pendingEdits} edit${c.counts.pendingEdits === 1 ? '' : 's'} awaiting approval`);
  return parts.join(', ');
}

// What most sections share (evidence basis, as-of date) is said once for the collection; a row
// mentions it only where its section differs, so a section with newer or older facts stands out.
function usual(sections, key) {
  const n = {};
  for (const s of sections) if (s[key]) n[s[key]] = (n[s[key]] || 0) + 1;
  return Object.entries(n).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

// One collection as a contents page: groups, then sections in order.
function CollectionContents({ collection: c, sections, isManager, filtering }) {
  const groups = groupSections(sections);
  const evidence = usual(sections, 'evidenceBasis');
  const asOf = usual(sections, 'asOfDate');
  return (
    <article className="collection" aria-labelledby={`col-${c.id}`}>
      <header className="collection-head">
        <div className="stack-sm">
          <h3 id={`col-${c.id}`}>
            <Link to={`/knowledge/collections/${c.id}`}>{c.name}</Link>
          </h3>
          <div className="row small muted">
            <BrandChip brand={c.brand} />
            <span>{countText(c, isManager)}</span>
            {evidence && <span>{EVIDENCE_SHORT[evidence]}</span>}
            {asOf && <span>As of {fmtDate(asOf)}</span>}
          </div>
        </div>
        {isManager && (
          <div className="row">
            <Link className="btn btn-secondary btn-small" to={`/knowledge/new?collection=${c.id}`}>
              <PlusIcon />
              Add section
            </Link>
            <Link className="btn btn-quiet btn-small" to={`/knowledge/collections/${c.id}/edit`}>
              Edit or reorder
            </Link>
          </div>
        )}
      </header>
      {c.description && !filtering && (
        <div className="collection-desc">
          <Markdown>{firstParagraph(c.description)}</Markdown>
        </div>
      )}
      {sections.length === 0 ? (
        <p className="small muted" style={{ margin: 0 }}>
          {filtering ? 'No sections match the filters.' : `No sections yet.${isManager ? ' Add the first one.' : ''}`}
        </p>
      ) : (
        groups.map((g, i) => (
          <div key={`${g.group}-${i}`} className="contents-group">
            {g.group && <h4 className="contents-group-label">{g.group}</h4>}
            <ol className="contents">
              {g.items.map((s) => (
                <li key={s.id}>
                  <Link to={`/knowledge/${s.id}`} className="contents-row">
                    <span className="contents-title">{s.title}</span>
                    <span className="contents-leader" aria-hidden="true" />
                    <span className="contents-meta">
                      {isManager && <SectionStatus section={s} />}
                      {s.evidenceBasis !== evidence && <span>{EVIDENCE_SHORT[s.evidenceBasis] || ''}</span>}
                      {s.asOfDate && s.asOfDate !== asOf && <span className="num">As of {fmtDate(s.asOfDate)}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        ))
      )}
      {sections.length > 0 && !filtering && (
        <p className="small" style={{ margin: '14px 0 0' }}>
          <Link to={`/knowledge/collections/${c.id}`}>Read the whole collection</Link>
        </p>
      )}
    </article>
  );
}

export function Knowledge() {
  const { user } = useAuth();
  const { meta } = useMeta();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const { data, error, loading, reload } = useLoad(() => get('/knowledge'), []);
  useEffect(() => {
    document.title = 'Knowledge Library · Sales Lab';
  }, []);
  const f = (k) => params.get(k) || '';
  const set = (k, v) => {
    const n = new URLSearchParams(params);
    if (v) n.set(k, v);
    else n.delete(k);
    setParams(n, { replace: true });
  };
  const filtering = Boolean(q.trim() || f('brand') || f('subject') || f('persona') || f('status') || f('evidence'));
  const sources = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (data?.sources || []).filter(
      (s) =>
        (!f('brand') || s.brand === f('brand')) &&
        (!f('subject') || s.subjects.includes(f('subject'))) &&
        (!f('persona') || s.personas.length === 0 || s.personas.includes(f('persona'))) &&
        // Archived material is shown only when asked for.
        (f('status') ? s.status === f('status') : s.status !== 'archived') &&
        (!f('evidence') || s.evidenceBasis === f('evidence')) &&
        (!t || s.title.toLowerCase().includes(t)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, params, q]);

  const collections = data?.collections || [];
  const inCollection = (c) => sources.filter((s) => s.collectionId === c.id);
  const shown = (list) => (filtering ? list.filter((c) => inCollection(c).length > 0) : list);
  const playbooks = shown(collections.filter((c) => c.kind === 'playbook'));
  const products = shown(collections.filter((c) => c.kind === 'product'));
  const documents = sources.filter((s) => !s.collectionId);
  const nothing = data && playbooks.length + products.length + documents.length === 0;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Knowledge Library</h1>
          <p className="sub">
            The sales playbook and each brand’s product knowledge, section by section. Coaching checks answers only against approved sections, and each section keeps its own
            date, caveats, and history.
          </p>
        </div>
        {user.isManager && (
          <div className="row">
            <Link className="btn btn-secondary" to="/knowledge/collections/new">
              New collection
            </Link>
            <Link className="btn btn-quiet" to="/knowledge/new">
              Import a document
            </Link>
          </div>
        )}
      </div>
      {data?.coverage?.missing?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <Notice kind="warn" title="Missing approved material">
            <p>
              No approved section covers: {data.coverage.missing.map((m) => m.label).join(', ')}. Drills on these topics run as unscored practice, and coaching will not invent facts
              about them.
              {user.isManager ? ' Write and approve sections to enable coaching.' : ''}
            </p>
          </Notice>
        </div>
      )}
      <div className="filters" role="search">
        <div className="field">
          <label htmlFor="k-q">Search titles</label>
          <input id="k-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="k-brand">Brand</label>
          <select id="k-brand" value={f('brand')} onChange={(e) => set('brand', e.target.value)}>
            <option value="">All</option>
            <option value="ravenly">Ravenly</option>
            <option value="omnizant">Omnizant</option>
            <option value="both">Both brands</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="k-subject">Subject</label>
          <select id="k-subject" value={f('subject')} onChange={(e) => set('subject', e.target.value)}>
            <option value="">All</option>
            {Object.entries(meta.subjects).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="k-persona">Buyer persona</label>
          <select id="k-persona" value={f('persona')} onChange={(e) => set('persona', e.target.value)}>
            <option value="">All</option>
            {meta.personas.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="k-evidence">Evidence</label>
          <select id="k-evidence" value={f('evidence')} onChange={(e) => set('evidence', e.target.value)}>
            <option value="">All</option>
            {Object.entries(meta.evidenceBasis).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        {user.isManager && (
          <div className="field">
            <label htmlFor="k-status">Approval</label>
            <select id="k-status" value={f('status')} onChange={(e) => set('status', e.target.value)}>
              <option value="">Approved and drafts</option>
              <option value="approved">Approved</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        )}
      </div>
      <ErrorNotice error={error} retry={reload} />
      {loading && !data && <Loading />}
      {nothing && <Empty title="Nothing matches">Change the filters{user.isManager ? ', or add a section' : ''}.</Empty>}

      {playbooks.length > 0 && (
        <section className="shelf" aria-labelledby="shelf-playbook">
          <h2 id="shelf-playbook">Sales playbook</h2>
          {playbooks.map((c) => (
            <CollectionContents key={c.id} collection={c} sections={inCollection(c)} isManager={user.isManager} filtering={filtering} />
          ))}
        </section>
      )}
      {products.length > 0 && (
        <section className="shelf" aria-labelledby="shelf-product">
          <h2 id="shelf-product">Product knowledge</h2>
          {products.map((c) => (
            <CollectionContents key={c.id} collection={c} sections={inCollection(c)} isManager={user.isManager} filtering={filtering} />
          ))}
        </section>
      )}
      {documents.length > 0 && (
        <section className="shelf" aria-labelledby="shelf-docs">
          <h2 id="shelf-docs">Other documents</h2>
          <p className="small muted">Long documents outside the collections. A manager can split one into sections from its page.</p>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Brand</th>
                  <th>Subjects</th>
                  <th>Evidence</th>
                  <th>As of</th>
                  {user.isManager && <th>Approval</th>}
                </tr>
              </thead>
              <tbody>
                {documents.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link className="row-link" to={`/knowledge/${s.id}`}>
                        {s.title}
                      </Link>
                    </td>
                    <td>
                      <BrandChip brand={s.brand} />
                    </td>
                    <td className="small">{s.subjects.map((x) => meta.subjects[x]).join(', ')}</td>
                    <td className="small">{EVIDENCE_SHORT[s.evidenceBasis] || '—'}</td>
                    <td className="nowrap">{s.asOfDate ? fmtDate(s.asOfDate) : <span className="muted">Not dated</span>}</td>
                    {user.isManager && (
                      <td>
                        <span className={`badge ${STATUS[s.status][0]}`}>{STATUS[s.status][1]}</span>
                        {s.splitIntoCollectionId && <div className="tiny muted">Split into sections</div>}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
