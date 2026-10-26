// The Knowledge Library's starting collections. The Sales Playbook and the Ravenly guide that Fred
// supplied are split into sections here (their text is unchanged; see knowledge/sections.js), and
// Omnizant's product knowledge starts as draft outlines to fill in.
import { sectionTitleKey } from '../knowledge/service.js';

// Ravenly sections by title (numbers set aside): where each sits and what it covers. Subjects decide
// which drills a section can support; technique sections support product drills but never stand in
// for product facts.
const RAVENLY_SECTIONS = {
  'how to use this guide': { group: 'Start here', subjects: ['product'] },
  'product positioning and core narrative': { group: 'Positioning and fit', subjects: ['product'] },
  'buyer problems, personas, and fit': { group: 'Positioning and fit', subjects: ['product', 'sales_technique'] },
  'capture: chat, webforms, and case evaluations': { group: 'Product capabilities', subjects: ['product'] },
  'qualification, scoring, and routing': { group: 'Product capabilities', subjects: ['product'] },
  'daily intake work: leads, pipeline, tasks, and records': { group: 'Product capabilities', subjects: ['product'] },
  'messaging, calling, notifications, and mobile access': { group: 'Product capabilities', subjects: ['product'] },
  'automations and follow-up': { group: 'Product capabilities', subjects: ['product'] },
  'reporting, attribution, and measurement': { group: 'Product capabilities', subjects: ['product'] },
  'integrations and deployment': { group: 'Product capabilities', subjects: ['product'] },
  'administration, support, and trust questions': { group: 'Product capabilities', subjects: ['product'] },
  'packaging, pricing, trial, and commercial discovery': { group: 'Pricing and packaging', subjects: ['product'] },
  'competitive landscape: choose the right comparison': { group: 'Competitive', subjects: ['competitive'] },
  'intaker battlecard': { group: 'Competitive', subjects: ['competitive'] },
  'juvo leads battlecard': { group: 'Competitive', subjects: ['competitive'] },
  'discovery: diagnose before demonstrating': { group: 'Selling Ravenly', subjects: ['sales_technique'] },
  'a safe, persuasive 15-minute demo': { group: 'Selling Ravenly', subjects: ['sales_technique', 'product'] },
  'objection handling and suggested language': { group: 'Selling Ravenly', subjects: ['sales_technique', 'product'] },
  'business case and roi conversation': { group: 'Selling Ravenly', subjects: ['sales_technique', 'product'] },
  'implementation, trial success, and salesperson certification': { group: 'Selling Ravenly', subjects: ['product', 'sales_technique'] },
  'internal confirmation and claims-cleanup register': { group: 'Claims and sources', subjects: ['product'] },
  'source register, coverage, and research limits': { group: 'Claims and sources', subjects: ['product', 'competitive'] },
};
export const ravenlySectionMeta = (section) => RAVENLY_SECTIONS[sectionTitleKey(section.title)] || null;
export const RAVENLY_SECTION_TITLES = Object.keys(RAVENLY_SECTIONS);

const OUTLINE = `_Outline to fill in. Replace each prompt with facts you have checked, then approve the section. Coaching does not use a section until it is approved._

### What it is
What the service delivers, in one or two plain sentences.

### Who it is for
The firms and situations where it fits, and where it does not.

### What is included
Deliverables, timelines, and who does what.

### Pricing and packaging
Prices, plans, and terms a rep may quote.

### Proof
Results, case studies, and the claims a rep may and may not make.

### Questions and objections
What buyers ask, and the accurate answers.

### Competitors and alternatives
Who else the buyer is considering, and how to compare fairly.`;

export const SEED_COLLECTIONS = [
  {
    slug: 'sales-playbook',
    name: 'Sales Playbook',
    kind: 'playbook',
    brand: 'both',
    position: 1,
    // The playbook's own opening, without its title and byline.
    description:
      'Winning reps lead the sale, ask more than they tell, and always ask for a decision. This playbook shows how to do that at every stage, from the opener to the follow-up.\n\n' +
      'Each section gives the principle and the exact words to use, followed by **Coaching notes** on applying them.',
    from: 'sales-playbook',
    meta: () => ({ subjects: ['sales_technique'] }),
  },
  {
    slug: 'ravenly-product',
    name: 'Ravenly product knowledge',
    kind: 'product',
    brand: 'ravenly',
    position: 2,
    // The guide's own opening, without its banner and title.
    description:
      'A comprehensive guide to the product, the buyer’s problems, the sales conversation, and the competitive landscape.\n\n' +
      'Research combines Ravenly’s public website, a read-only review of the Stritmatter Law demo account, and competitors’ own public materials. Prepared for internal training; review the confirmation items before converting this into external marketing copy.',
    from: 'ravenly-sales-training',
    meta: ravenlySectionMeta,
  },
  {
    slug: 'omnizant-product',
    name: 'Omnizant product knowledge',
    kind: 'product',
    brand: 'omnizant',
    position: 3,
    description:
      'Omnizant’s services: web development, SEO, and GEO. These sections are draft outlines. Omnizant product drills run as unscored practice until sections are written and approved.',
    drafts: [
      { title: 'Web development', group: 'Services' },
      { title: 'SEO (search engine optimization)', group: 'Services' },
      { title: 'GEO (generative engine optimization)', group: 'Services' },
    ].map((d) => ({ ...d, content: OUTLINE, subjects: ['product'] })),
  },
];
