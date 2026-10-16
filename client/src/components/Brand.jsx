import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

// Original Sales Lab mark: a legal-pad sheet shaped like a speech bubble.
export function SalesLabMark({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path d="M5 3h22a2 2 0 0 1 2 2v17a2 2 0 0 1-2 2H13l-6 5v-5H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" fill="#fcf4c2" stroke="#1e5a48" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9 3.5v20" stroke="#d2544c" strokeWidth="1.6" />
      <path d="M12 9h12M12 13.5h12M12 18h8" stroke="#7fa7c9" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// Company marks stay small and secondary. Logo files dropped into client/public/brand/
// (omnizant.svg or omnizant.png, ravenly.svg or ravenly.png) replace the text automatically.
const logoLookups = new Map();
function findLogo(slug) {
  if (!logoLookups.has(slug)) {
    const tryLoad = (file) =>
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(file);
        img.onerror = () => resolve(null);
        img.src = file;
      });
    logoLookups.set(
      slug,
      tryLoad(`/brand/${slug}.svg`).then((found) => found || tryLoad(`/brand/${slug}.png`)),
    );
  }
  return logoLookups.get(slug);
}

function CompanyMark({ name, slug }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let cancelled = false;
    findLogo(slug).then((file) => !cancelled && setSrc(file));
    return () => {
      cancelled = true;
    };
  }, [slug]);
  return <span className="mark">{src ? <img src={src} alt={name} /> : name}</span>;
}

export function CompanyMarks() {
  return (
    <span className="company-marks" aria-label="Omnizant and Ravenly">
      <CompanyMark name="Omnizant" slug="omnizant" />
      <span className="divider" aria-hidden="true" />
      <CompanyMark name="Ravenly" slug="ravenly" />
    </span>
  );
}

export function Brand({ to = '/', large = false }) {
  return (
    <Link to={to} className="brand" aria-label="Sales Lab home">
      <span className="brand-main">
        <SalesLabMark size={large ? 40 : 30} />
        <span className="brand-name">Sales Lab</span>
      </span>
      <CompanyMarks />
    </Link>
  );
}
