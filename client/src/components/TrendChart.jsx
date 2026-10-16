import { useEffect, useRef, useState } from 'react';
import { fmtDate } from './ui.jsx';

// First-attempt average by week. One series, one axis; challenge level and sample size live in the tooltip and table.
export function TrendChart({ series, minEvidence = 3 }) {
  const wrap = useRef(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!series || series.length === 0) {
    return <p className="muted small">No scored first attempts in this period yet.</p>;
  }

  const height = 220;
  const pad = { top: 14, right: 40, bottom: 30, left: 34 };
  const iw = width - pad.left - pad.right;
  const ih = height - pad.top - pad.bottom;
  const x = (i) => pad.left + (series.length === 1 ? iw / 2 : (i / (series.length - 1)) * iw);
  const y = (v) => pad.top + ih - (v / 100) * ih;
  const path = series.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.average).toFixed(1)}`).join(' ');
  const last = series[series.length - 1];

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    let best = 0;
    let dist = Infinity;
    series.forEach((_, i) => {
      const d = Math.abs(x(i) - px);
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    setHover(best);
  };

  const tickEvery = Math.max(1, Math.ceil(series.length / Math.max(2, Math.floor(iw / 90))));
  const h = hover !== null ? series[hover] : null;

  return (
    <div className="stack-sm">
      <div className="chart" ref={wrap}>
        <svg width={width} height={height} role="img" aria-label={`First-attempt average by week, ${series.length} week${series.length === 1 ? '' : 's'}. Latest: ${last.average} from ${last.n} answers.`}>
          <g className="grid">
            {[0, 25, 50, 75, 100].map((t) => (
              <line key={t} x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} />
            ))}
          </g>
          <g className="axis">
            {[0, 25, 50, 75, 100].map((t) => (
              <text key={t} x={pad.left - 8} y={y(t) + 4} textAnchor="end">
                {t}
              </text>
            ))}
            {series.map((p, i) =>
              i % tickEvery === 0 || i === series.length - 1 ? (
                <text key={p.week} x={x(i)} y={height - 8} textAnchor="middle">
                  {fmtDate(p.week, { year: false })}
                </text>
              ) : null,
            )}
          </g>
          {h && <line className="crosshair" x1={x(hover)} x2={x(hover)} y1={pad.top} y2={pad.top + ih} />}
          <path className="series" d={path} />
          {series.map((p, i) => (
            <circle key={p.week} className={`pt${p.n < minEvidence ? ' thin' : ''}`} cx={x(i)} cy={y(p.average)} r={hover === i ? 6 : 4.5} />
          ))}
          <text x={x(series.length - 1) + 9} y={y(last.average) + 4} className="axis" style={{ fill: 'var(--ink-2)', font: '600 12px var(--sans)' }}>
            {last.average}
          </text>
          <rect
            x={pad.left - 12}
            y={pad.top}
            width={iw + 24}
            height={ih}
            fill="transparent"
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          />
        </svg>
        {h && (
          <div className="chart-tip" style={{ left: x(hover), top: y(h.average) - 6 }}>
            <strong>{h.average}</strong> first-attempt average
            <br />
            Week of {fmtDate(h.week)}: {h.n} answer{h.n === 1 ? '' : 's'}
            <br />
            Average challenge level {h.averageDifficulty}
            {h.n < minEvidence && (
              <>
                <br />
                Fewer than {minEvidence} answers: not used for trends
              </>
            )}
          </div>
        )}
      </div>
      <p className="tiny muted" style={{ margin: 0 }}>
        Hollow points are weeks with fewer than {minEvidence} scored first attempts.
      </p>
      <details>
        <summary className="small" style={{ cursor: 'pointer' }}>
          Weekly numbers
        </summary>
        <div className="table-wrap" style={{ marginTop: 8 }}>
          <table className="data">
            <thead>
              <tr>
                <th>Week of</th>
                <th className="num">First-attempt average</th>
                <th className="num">Answers</th>
                <th className="num">Average challenge level</th>
              </tr>
            </thead>
            <tbody>
              {series.map((p) => (
                <tr key={p.week}>
                  <td>{fmtDate(p.week)}</td>
                  <td className="num">{p.average}</td>
                  <td className="num">{p.n}</td>
                  <td className="num">{p.averageDifficulty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
