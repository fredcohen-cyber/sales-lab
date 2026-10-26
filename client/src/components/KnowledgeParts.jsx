// Shared pieces of the Knowledge Library: Markdown rendering, section status, and grouping.
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function slugText(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
function textOf(children) {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(textOf).join('');
  if (children?.props) return textOf(children.props.children);
  return '';
}

// The page title is the h1, so document headings move down a level (styled by their Markdown level).
// Inside a collection, each section's own title is an h2, so its headings move down one more.
function headingComponents(shift) {
  const H = (level) => `h${Math.min(6, level + shift)}`;
  return {
    h1: ({ children }) => {
      const Tag = H(1);
      return <Tag className="md-h1">{children}</Tag>;
    },
    h2: ({ children }) => {
      const Tag = H(2);
      return (
        <Tag className="md-h2" id={`sec-${slugText(textOf(children))}`}>
          {children}
        </Tag>
      );
    },
    h3: ({ children }) => {
      const Tag = H(3);
      return <Tag className="md-h3">{children}</Tag>;
    },
    h4: ({ children }) => {
      const Tag = H(4);
      return <Tag className="md-h4">{children}</Tag>;
    },
    a: ({ href, children }) => (
      <a href={href} target={href?.startsWith('http') ? '_blank' : undefined} rel="noreferrer noopener">
        {children}
      </a>
    ),
  };
}
const SHIFTED = { 1: headingComponents(1), 2: headingComponents(2) };

export function Markdown({ children, shift = 1 }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={SHIFTED[shift]} skipHtml>
      {children || ''}
    </ReactMarkdown>
  );
}

// What a manager needs to know about a section's approval at a glance. Approved, current sections show nothing.
export function SectionStatus({ section }) {
  if (section.status === 'archived') return <span className="badge badge-neutral">Archived</span>;
  if (section.status === 'draft' || section.isApproved === false) return <span className="badge badge-warn">Draft</span>;
  if (section.hasPendingDraft) return <span className="badge badge-info">Edit awaiting approval</span>;
  return null;
}

// Consecutive sections that share a group label, in order.
export function groupSections(sections) {
  const groups = [];
  for (const s of sections) {
    const last = groups[groups.length - 1];
    if (last && last.group === (s.group || '')) last.items.push(s);
    else groups.push({ group: s.group || '', items: [s] });
  }
  return groups;
}

export const KIND_LABEL = { playbook: 'Sales playbook', product: 'Product knowledge' };
