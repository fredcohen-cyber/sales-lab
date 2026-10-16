import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertIcon, CheckIcon, CopyIcon, CriticalIcon, InfoIcon } from './Icons.jsx';

// ------------------------------------------------------------------ formatting (America/New_York)
const TZ = 'America/New_York';
export function fmtDate(value, opts = {}) {
  if (!value) return '';
  const d = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00Z`) : new Date(value);
  return d.toLocaleDateString('en-US', { timeZone: TZ, month: 'short', day: 'numeric', year: opts.year === false ? undefined : 'numeric' });
}
export function fmtDateTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('en-US', { timeZone: TZ, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
export function fmtRelative(value) {
  if (!value) return 'Never';
  const diff = Date.now() - new Date(value).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const days = Math.round(hr / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return fmtDate(value);
}
export function fmtUntil(value) {
  if (!value) return '';
  const min = Math.round((new Date(value).getTime() - Date.now()) / 60000);
  if (min <= 0) return 'now';
  if (min < 60) return `in ${min} min`;
  const hr = Math.round(min / 60);
  if (hr < 48) return `in ${hr} hr`;
  return `in ${Math.round(hr / 24)} days`;
}
export function nyToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

// ------------------------------------------------------------------ data loading
export function useLoad(fn, deps = []) {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const seq = useRef(0);
  const run = useCallback(
    async ({ quiet = false } = {}) => {
      const mine = ++seq.current;
      if (!quiet) setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const data = await fn();
        if (mine === seq.current) setState({ loading: false, error: null, data });
        return data;
      } catch (error) {
        if (mine === seq.current) setState((s) => ({ loading: false, error, data: s.data }));
        return null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  );
  useEffect(() => {
    run();
  }, [run]);
  return { ...state, reload: run };
}

// ------------------------------------------------------------------ feedback
export function Notice({ kind = 'info', title, children, action }) {
  const Icon = kind === 'critical' ? CriticalIcon : kind === 'warn' ? AlertIcon : kind === 'ok' ? CheckIcon : InfoIcon;
  return (
    <div className={`notice notice-${kind}`} role={kind === 'critical' ? 'alert' : undefined}>
      <Icon />
      <div className="grow">
        {title && <p style={{ fontWeight: 650, marginBottom: children ? 4 : 0 }}>{title}</p>}
        {children}
      </div>
      {action}
    </div>
  );
}

export function ErrorNotice({ error, retry }) {
  if (!error) return null;
  return (
    <Notice
      kind="critical"
      title={error.status === 403 || error.status === 404 ? undefined : 'This did not load.'}
      action={
        retry ? (
          <button className="btn btn-secondary btn-small" onClick={() => retry()}>
            Try again
          </button>
        ) : null
      }
    >
      <p>{error.message}</p>
    </Notice>
  );
}

export function Loading({ label = 'Loading…' }) {
  return (
    <p className="loading" role="status">
      {label}
    </p>
  );
}

export function Empty({ title, children, action }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {children && <div className="muted" style={{ marginTop: 4 }}>{children}</div>}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}

const ToastContext = createContext(() => {});
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, { error = false } = {}) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, error }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), error ? 7000 : 4000);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast${t.error ? ' error' : ''}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);

// ------------------------------------------------------------------ controls
export function Field({ label, hint, error, children, id }) {
  return (
    <div className="field">
      {label && <label htmlFor={id}>{label}</label>}
      {children}
      {hint && !error && <span className="hint">{hint}</span>}
      {error && <span className="error-text">{error}</span>}
    </div>
  );
}

export function Segmented({ value, onChange, options, label, disabled = false }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          disabled={disabled}
          title={o.title}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function LevelPicker({ label, value, onChange, texts, locked }) {
  return (
    <div className="field">
      <span className="label" id={`lvl-${label}`}>
        {label}
      </span>
      <Segmented
        label={label}
        value={value}
        disabled={locked}
        onChange={onChange}
        options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n), title: texts?.[n] }))}
      />
      <span className="hint">{texts?.[value]}</span>
    </div>
  );
}

export function CopyField({ value, label = 'Link' }) {
  const [copied, setCopied] = useState(false);
  const ref = useRef(null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      ref.current?.select();
      document.execCommand?.('copy');
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };
  return (
    <div className="copy-box">
      <input ref={ref} type="text" readOnly value={value} aria-label={label} onFocus={(e) => e.target.select()} />
      <button type="button" className="btn btn-secondary" onClick={copy}>
        {copied ? <CheckIcon /> : <CopyIcon />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className="modal" onClose={onClose} onCancel={onClose} aria-labelledby="modal-title">
      {open && (
        <>
          <div className="modal-body stack">
            <h2 id="modal-title">{title}</h2>
            {children}
          </div>
          {footer && <div className="modal-foot">{footer}</div>}
        </>
      )}
    </dialog>
  );
}

// ------------------------------------------------------------------ labels
export const BRAND_LABEL = { omnizant: 'Omnizant', ravenly: 'Ravenly', both: 'Both brands' };
export function BrandChip({ brand }) {
  return <span className={`chip chip-brand-${brand}`}>{BRAND_LABEL[brand] || brand}</span>;
}

export function ReviewBadge({ status }) {
  if (!status) return null;
  const map = {
    final: ['badge-ok', CheckIcon, 'Final'],
    confirmed: ['badge-ok', CheckIcon, 'Confirmed'],
    provisional: ['badge-warn', AlertIcon, 'Pending review'],
    disputed: ['badge-neutral', InfoIcon, 'Disputed'],
  };
  const [cls, Icon, text] = map[status] || ['badge-neutral', InfoIcon, status];
  return (
    <span className={`badge ${cls}`}>
      <Icon />
      {text}
    </span>
  );
}

export function RunBadge({ status }) {
  const map = {
    running: ['badge-info', 'Coaching running'],
    failed: ['badge-critical', 'Coaching failed'],
    timed_out: ['badge-critical', 'Coaching timed out'],
    superseded: ['badge-neutral', 'Retried'],
  };
  const m = map[status];
  return m ? <span className={`badge ${m[0]}`}>{m[1]}</span> : null;
}

export function VerdictBadge({ verdict }) {
  const map = {
    strength: ['badge-ok', CheckIcon, 'Strength'],
    weakness: ['badge-critical', AlertIcon, 'Needs work'],
    developing: ['badge-neutral', InfoIcon, 'Developing'],
    insufficient: ['badge-neutral', InfoIcon, 'Not enough evidence'],
  };
  const [cls, Icon, text] = map[verdict] || map.insufficient;
  return (
    <span className={`badge ${cls}`}>
      <Icon />
      {text}
    </span>
  );
}

export function ScoreBar({ value, target, label }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="bar-track" role="img" aria-label={`${label ? `${label}: ` : ''}${v} out of 100${target ? `, target ${target}` : ''}`}>
      <div className="bar-fill" style={{ width: `${v}%` }} />
      {target ? <div className="bar-mark" style={{ left: `calc(${target}% - 1px)` }} /> : null}
    </div>
  );
}

export function Stat({ label, value, note }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value ?? '—'}</div>
      {note && <div className="stat-note">{note}</div>}
    </div>
  );
}

export function Score({ value, n }) {
  if (value === null || value === undefined) return <span className="muted">No scores yet</span>;
  return (
    <span>
      <strong className="num">{value}</strong>
      {n !== undefined && <span className="muted"> ({n})</span>}
    </span>
  );
}

export function personaLabel(meta, key) {
  return meta?.personas?.find((p) => p.key === key)?.label || key;
}
export function stageLabel(meta, key) {
  return meta?.stages?.find((s) => s.key === key)?.label || key;
}
