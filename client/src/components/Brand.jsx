import { Link } from 'react-router-dom';
import { useState } from 'react';
import { ChatIcon } from './Icons.jsx';

// The Sales Lab wordmark: a violet speech-bubble mark, "sales" set bold and "lab" light.
export function Wordmark() {
  return (
    <span className="saleslab-logo" aria-hidden="true">
      <span className="brand-mark">
        <ChatIcon strokeWidth={2.1} />
      </span>
      sales<span className="light">lab</span>
      <span className="logo-dot" />
    </span>
  );
}

// The two companies whose team uses Sales Lab, small and secondary under the wordmark. The logo files
// live in client/public/brand/; if one is missing, the company's name shows instead.
function CompanyMark({ name, slug }) {
  const [failed, setFailed] = useState(false);
  return <span className={`mark mark-${slug}`}>{failed ? name : <img src={`/brand/${slug}.svg`} alt={name} onError={() => setFailed(true)} />}</span>;
}

export function CompanyMarks() {
  return (
    <span className="company-marks">
      <CompanyMark name="Omnizant" slug="omnizant" />
      <span className="divider" aria-hidden="true" />
      <CompanyMark name="Ravenly" slug="ravenly" />
    </span>
  );
}

export function Brand({ to = '/', large = false, marks = true }) {
  return (
    <Link to={to} className={`brand${large ? ' brand-large' : ''}`} aria-label="Sales Lab home, by Omnizant and Ravenly">
      <Wordmark />
      {marks && <CompanyMarks />}
    </Link>
  );
}
