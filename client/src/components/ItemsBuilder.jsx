import { useMeta } from '../state.jsx';

// Ordered list of drills with prescribed buyer persona and challenge levels.
export function ItemsBuilder({ items, onChange, drills, highlightDimension }) {
  const { meta } = useMeta();
  const byId = new Map(drills.map((d) => [d.id, d]));
  const update = (i, patch) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = items.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const remove = (i) => onChange(items.filter((_, j) => j !== i));
  const add = () => {
    const d = drills[0];
    if (!d) return;
    onChange([...items, { drillId: d.id, persona: d.personas[0], difficulty: d.defaults.difficulty, skepticism: d.defaults.skepticism, depth: d.defaults.depth }]);
  };
  const sorted = drills.slice().sort((a, b) => {
    if (highlightDimension) {
      const ha = a.assessedDimensions.includes(highlightDimension) ? 0 : 1;
      const hb = b.assessedDimensions.includes(highlightDimension) ? 0 : 1;
      if (ha !== hb) return ha - hb;
    }
    return a.title.localeCompare(b.title);
  });
  const levels = [1, 2, 3, 4, 5];

  return (
    <div className="stack-sm">
      {items.length === 0 && <p className="muted small">No drills yet. Add one, or start from a learning path.</p>}
      {items.map((it, i) => {
        const d = byId.get(it.drillId);
        return (
          <div key={i} className="panel panel-tight stack-sm">
            <div className="row-between">
              <strong className="small">Step {i + 1}</strong>
              <div className="row" style={{ gap: 4 }}>
                <button type="button" className="btn btn-quiet btn-small" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move step ${i + 1} up`}>
                  Up
                </button>
                <button type="button" className="btn btn-quiet btn-small" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label={`Move step ${i + 1} down`}>
                  Down
                </button>
                <button type="button" className="btn btn-quiet btn-small" onClick={() => remove(i)} aria-label={`Remove step ${i + 1}`}>
                  Remove
                </button>
              </div>
            </div>
            <div className="form-row">
              <div className="field" style={{ gridColumn: 'span 2' }}>
                <label htmlFor={`drill-${i}`}>Drill</label>
                <select
                  id={`drill-${i}`}
                  value={it.drillId}
                  onChange={(e) => {
                    const nd = byId.get(e.target.value);
                    update(i, { drillId: nd.id, persona: nd.personas.includes(it.persona) ? it.persona : nd.personas[0] });
                  }}
                >
                  {!d && <option value={it.drillId}>Unavailable drill</option>}
                  {sorted.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.title} ({x.stageLabel}
                      {highlightDimension && x.assessedDimensions.includes(highlightDimension) ? ', scores the focus area' : ''})
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor={`persona-${i}`}>Buyer</label>
                <select id={`persona-${i}`} value={it.persona} onChange={(e) => update(i, { persona: e.target.value })}>
                  {(d?.personas || [it.persona]).map((k) => (
                    <option key={k} value={k}>
                      {meta.personas.find((p) => p.key === k)?.label || k}
                    </option>
                  ))}
                </select>
              </div>
              {['difficulty', 'skepticism', 'depth'].map((k) => (
                <div className="field" key={k}>
                  <label htmlFor={`${k}-${i}`}>{k === 'depth' ? 'Product depth' : k[0].toUpperCase() + k.slice(1)}</label>
                  <select id={`${k}-${i}`} value={it[k]} onChange={(e) => update(i, { [k]: Number(e.target.value) })}>
                    {levels.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            {d && !d.coaching.available && <p className="tiny" style={{ color: 'var(--amber)', margin: 0 }}>{d.coaching.message} Reps cannot complete it until coaching is available.</p>}
          </div>
        );
      })}
      <div>
        <button type="button" className="btn btn-secondary btn-small" onClick={add}>
          Add a drill
        </button>
      </div>
    </div>
  );
}
