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

// Collections built from a document Fred supplied after launch, one seed step each. The document is split
// at its "## " headings into approved sections (its text before the first heading becomes the collection's
// description), and every section shares the document's date, caveats, and evidence basis.
export const OMNIZANT_AI_SEARCH = {
  seedKey: 'omnizant-ai-search-v1',
  slug: 'omnizant-ai-search',
  name: 'Omnizant AI Search Plans (GEO)',
  kind: 'product',
  brand: 'omnizant',
  file: 'sources/omnizant-ai-search-plans.md',
  asOfDate: '2026-10-26',
  evidenceBasis: 'documented',
  caveats:
    'Internal positioning brief for sales, marketing, and leadership (October 2026). It sets the story and the language for the AI Search Plans; it does not give prices, quantities, or a list of deliverables, so confirm those before quoting. ' +
    'AI platforms control their own answers: describe strengthening the firm’s presence without promising inclusion, a recommendation, or results. “The proof we should develop” lists proof still to be built, not proof that exists.',
  changeNote:
    'Supplied by Fred Cohen (Omnizant AI Search Plans positioning brief, October 26, 2026) and split into sections at its main headings. ' +
    'Wording unchanged except for spacing typos and the heading over the Max AI description, which read “Discovery”.',
  // Every section is about the plans; the story and the messaging guidance also teach how to sell them.
  subjects: (section) =>
    ['the story we tell', 'messaging guidance for the team'].includes(sectionTitleKey(section.title)) ? ['product', 'sales_technique'] : ['product'],
};

// Sections Fred supplied after launch for an existing collection, one seed step each. Each is added
// approved at the end of its group.
export const RAVENLY_VS_INTAKER = {
  seedKey: 'ravenly-vs-intaker-v1',
  collectionSlug: 'ravenly-product',
  title: 'Ravenly vs Intaker battle card',
  group: 'Competitive',
  file: 'sources/ravenly-vs-intaker.md',
  brand: 'ravenly',
  subjects: ['competitive', 'product'],
  asOfDate: '2026-10-26',
  evidenceBasis: 'documented',
  caveats:
    'The sales team’s Ravenly vs Intaker battle card, aligned with 14 · Intaker battlecard (Intaker’s public website as of October 11, 2026). ' +
    'Intaker capabilities are what Intaker publicly markets, not tested. The Intaker prices come from an undated screenshot: confirm a current, complete quote before comparing costs. ' +
    'Ravenly’s strengths here are demonstrable, not proven exclusive.',
  changeNote:
    'Supplied by Fred Cohen (Ravenly vs Intaker Battle Card, October 26, 2026). At his request, the claims that conflicted with 14 · Intaker battlecard were rewritten to match it: ' +
    'Intaker is no longer described as a chatbot with light automation or as having no lead scoring, its pricing is marked unverified, and the unsourced point about its interface became a discovery approach. ' +
    'Ravenly’s scoring follows 05 · Qualification, scoring, and routing, and its pricing basis follows 12 · Packaging, pricing, trial, and commercial discovery. The pricing screenshot is transcribed as a table.',
};
export const ADDED_SECTIONS = [RAVENLY_VS_INTAKER];

// What 14 booked Omnizant outbound calls (October 2026) taught, distilled from the transcripts and analysis
// Fred supplied. Field notes go at the end of the matching Sales Playbook sections as a new approved
// version; Omnizant gets new sections. Company facts the reps stated wait as a draft for Fred to confirm.
// The transcripts themselves are not stored: they name prospects and their email addresses.
export const CALL_LEARNINGS = {
  seedKey: 'call-learnings-2026-10-v1',
  asOfDate: '2026-10-26',
  changeNote:
    'Field notes from 14 booked Omnizant outbound calls (October 2026), distilled from the call transcripts and analysis supplied by Fred Cohen.',
  appendTo: [
    { collectionSlug: 'sales-playbook', titleStart: '2. Openers', file: 'sources/field-notes/playbook-2-openers.md' },
    { collectionSlug: 'sales-playbook', titleStart: '3. Discovery', file: 'sources/field-notes/playbook-3-discovery.md' },
    { collectionSlug: 'sales-playbook', titleStart: '5. Closing', file: 'sources/field-notes/playbook-5-closing.md' },
    { collectionSlug: 'sales-playbook', titleStart: '6. Objections', file: 'sources/field-notes/playbook-6-objections.md' },
  ],
  sections: [
    {
      collectionSlug: 'omnizant-product',
      title: 'Omnizant at a glance',
      group: 'About Omnizant',
      file: 'sources/field-notes/omnizant-at-a-glance.md',
      brand: 'omnizant',
      subjects: ['product'],
      approve: false,
      caveats: 'Facts as reps stated them on calls in October 2026, not yet confirmed. Approve only after checking each one.',
    },
    {
      collectionSlug: 'omnizant-product',
      title: 'The complimentary website review',
      group: 'Selling Omnizant',
      file: 'sources/field-notes/omnizant-website-review.md',
      brand: 'omnizant',
      subjects: ['product', 'sales_technique'],
      approve: true,
      caveats: 'How reps described and offered the review on 14 booked calls in October 2026. These calls show what worked, not how often it works.',
    },
    {
      collectionSlug: 'omnizant-product',
      title: 'Competitor angles from Omnizant’s calls',
      group: 'Competitive',
      file: 'sources/field-notes/omnizant-competitor-angles.md',
      brand: 'omnizant',
      subjects: ['competitive'],
      approve: true,
      caveats:
        'From 14 booked Omnizant calls in October 2026. Competitor experiences are what firms reported on those calls, not verified facts; the FindLaw sale is from Thomson Reuters’ announcement of December 2, 2024.',
    },
  ],
};
