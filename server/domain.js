// Shared vocabulary for Sales Lab. Labels here are what people see in the UI.

export const ROLES = {
  ae: 'Account executive',
  am: 'Account manager',
  manager: 'Manager',
};
export const LEARNER_ROLES = ['ae', 'am'];

export const EXPERIENCE = {
  new_hire: 'New hire',
  experienced: 'Experienced',
};

export const ALLOWED_EMAIL_DOMAINS = ['omnizant.com', 'ravenly.com'];

export const BRANDS = {
  omnizant: 'Omnizant',
  ravenly: 'Ravenly',
  both: 'Omnizant and Ravenly',
};

export const SUBJECTS = {
  sales_technique: 'Sales technique',
  product: 'Product knowledge',
  competitive: 'Competitive knowledge',
};

// What a question sells, for the Practice Studio's product filter. Each line belongs to one brand; sales
// technique questions that fit both brands are "general".
export const PRODUCT_LINES = {
  ravenly: { label: 'Ravenly', brand: 'ravenly' },
  omnizant_ai_search: { label: 'Omnizant AI Search Plans', brand: 'omnizant' },
  omnizant_web: { label: 'Omnizant websites and SEO', brand: 'omnizant' },
  general: { label: 'Sales technique (both brands)', brand: 'both' },
};
export const defaultProductLine = (brand) => (brand === 'ravenly' ? 'ravenly' : brand === 'omnizant' ? 'omnizant_web' : 'general');

// What kind of evidence a knowledge source holds. Coaching treats each differently.
export const EVIDENCE_BASIS = {
  documented: 'Documented facts and approved guidance',
  public_claims: 'Public claims, not verified',
  observed: 'Observed, not tested end to end',
  mixed: 'Mixed, labeled passage by passage',
};

// Ordered by training priority. AM stages follow the AE stages. The track is the rep role each stage
// trains; the description is what reps see on the stage in the Practice Studio.
export const STAGES = [
  { key: 'cold_outreach', label: 'Cold outreach', track: 'ae', description: 'First contact by phone, voicemail, or email: earn attention and a reason to talk.' },
  { key: 'discovery', label: 'Discovery', track: 'ae', description: 'Uncover the problem, what it costs the firm, and how the firm decides.' },
  { key: 'demo', label: 'Product demonstration', track: 'ae', description: 'Show only what matters to this buyer, accurately, and handle questions as they come.' },
  { key: 'pricing', label: 'Pricing', track: 'ae', description: 'Plan questions, price objections, discount asks, and contract terms.' },
  { key: 'competitor', label: 'Competitor comparison', track: 'ae', description: 'Compare fairly and accurately when the buyer has another option.' },
  { key: 'closing', label: 'Closing', track: 'ae', description: 'Ask for the business and agree on a dated next step.' },
  { key: 'stalled', label: 'Stalled-deal follow-up', track: 'ae', description: 'Restart deals that went quiet without sounding needy.' },
  { key: 'am_adoption', label: 'Adoption', track: 'am', description: 'Help a new client’s team get value in the first weeks.' },
  { key: 'am_value', label: 'Ongoing value', track: 'am', description: 'Show an existing client what they get, and grow the account.' },
  { key: 'am_renewal', label: 'Renewal', track: 'am', description: 'Renewals, at-risk accounts, and pushback on cost.' },
];
export const STAGE_KEYS = STAGES.map((s) => s.key);
export const stageLabel = (key) => STAGES.find((s) => s.key === key)?.label || key;

export const DEFAULT_PERSONAS = [
  {
    key: 'managing_partner',
    label: 'Managing partner',
    position: 1,
    responsibilities:
      'Runs the firm as a business: growth, profitability, staffing, and which practice areas to pursue. Signs off on spending and is accountable to the other partners.',
    concerns:
      'Return on the money and time spent, whether the team will actually use a new tool, accountability for leads that go stale, risk and reputation, and vendors who overpromise. Little patience for feature tours.',
  },
  {
    key: 'solo_attorney',
    label: 'Solo attorney',
    position: 2,
    responsibilities:
      'Practices law and also handles intake, marketing, billing, and technology personally, often with little or no staff. Decides alone.',
    concerns:
      'Time, cash flow, and simplicity. Missing calls and inquiries while in court or after hours. Wary of monthly commitments and of tools that need setup or management they cannot give.',
  },
  {
    key: 'marketing_manager',
    label: 'Marketing manager (larger firm)',
    position: 3,
    responsibilities:
      'Owns lead generation, campaigns, agencies, the website, and reporting to partners at a multi-attorney firm. Influences the decision but usually does not own the final budget.',
    concerns:
      'Proving which channels produce retained cases, data accuracy and attribution, fit with the existing stack (analytics, ads, case management), workload, and having evidence to take to the partners.',
  },
  {
    key: 'office_manager',
    label: 'Office manager or intake director',
    position: 4,
    responsibilities:
      'Runs the firm’s day-to-day operations: the front desk and intake team, vendors such as the website provider, schedules, and the attorneys’ calendars. Often the first person a vendor reaches, and the one whose team uses a new tool every day.',
    concerns:
      'Workload and disruption for the team, getting each inquiry to the right person quickly, scattered notifications and duplicate records, keeping the attorneys informed, and not wasting their time on vendors. Can book a meeting and recommend a decision, but rarely signs.',
  },
];

export const DEFAULT_DIMENSIONS = [
  {
    key: 'discovery',
    label: 'Discovery and qualification',
    weight: 10,
    description:
      'Asks purposeful questions that uncover the buyer’s situation, the cost of the problem, the decision process, and fit, instead of assuming.',
  },
  {
    key: 'product_accuracy',
    label: 'Product accuracy',
    weight: 25,
    description:
      'Every product, pricing, integration, and competitor statement matches approved source material. Unverified items are framed as needing confirmation.',
  },
  {
    key: 'persuasion',
    label: 'Benefits and persuasion',
    weight: 25,
    description:
      'Connects relevant benefits to this buyer’s responsibilities and stated problem, sells what it unlocks rather than features, and uses evidence honestly.',
  },
  {
    key: 'objection_handling',
    label: 'Objection handling',
    weight: 20,
    description:
      'Acknowledges the concern, isolates the real issue, answers it directly, and returns to a decision or next step.',
  },
  {
    key: 'empathy_clarity',
    label: 'Empathy and clarity',
    weight: 10,
    description:
      'Shows understanding of the buyer’s position and uses plain, concise, confident language without needy or hedging phrases.',
  },
  {
    key: 'advancing',
    label: 'Advancing the conversation',
    weight: 10,
    description:
      'Moves toward a clear, specific next step or decision: a yes, a no, or a dated next step.',
  },
];
export const DIMENSION_KEYS = DEFAULT_DIMENSIONS.map((d) => d.key);

export const LEVELS = [1, 2, 3, 4, 5];

// In a practice conversation the buyer pushes back after each reply: once at easy levels, twice at the
// standard level, three times at advanced and expert levels.
export function pushbacksFor(difficulty) {
  return difficulty <= 2 ? 1 : difficulty === 3 ? 2 : 3;
}

// How the coach and the expected answer see the rep's job.
export const REP_ROLE_CONTEXT = {
  ae: 'Account executive: wins new business from firms that are not clients yet.',
  am: 'Account manager: looks after an existing client, its adoption, results, renewal, and growth.',
};

export const DIFFICULTY_TEXT = {
  1: 'Introductory: a cooperative buyer and a simple moment.',
  2: 'Developing: the buyer is polite but expects a clear answer.',
  3: 'Standard: a realistic buyer who needs specifics before moving forward.',
  4: 'Advanced: the buyer pushes back and expects a polished, precise response.',
  5: 'Expert: the buyer is demanding and gives you one chance to get it right.',
};
export const SKEPTICISM_TEXT = {
  1: 'Open and curious about what you offer.',
  2: 'Polite but busy; will not volunteer much.',
  3: 'Guarded; wants specifics before believing a claim.',
  4: 'Skeptical; has been oversold by vendors before and challenges claims.',
  5: 'Highly skeptical; assumes you are overpromising until proven otherwise.',
};
export const DEPTH_TEXT = {
  1: 'Big picture only; product detail is not expected.',
  2: 'Light detail; name the relevant capability in plain terms.',
  3: 'Working detail; explain how the relevant capability helps this buyer.',
  4: 'Specific detail; accurate specifics on scope, limits, and setup.',
  5: 'Expert detail; precise specifics, definitions, and caveats from approved material.',
};

export const REVIEW_STATUS = {
  final: 'Final',
  provisional: 'Pending review',
  confirmed: 'Confirmed',
  disputed: 'Disputed',
};
// Evaluations that count toward performance metrics.
export const COUNTED_REVIEW_STATUSES = ['final', 'confirmed'];

export const CRITICAL_FAILURE_TYPES = {
  invented_capability: 'Invented capability',
  contradicts_approved_fact: 'Contradicts approved material',
  unauthorized_guarantee: 'Unauthorized guarantee',
};

export const REPORT_TIMEZONE = 'America/New_York';
export const LINK_TTL_HOURS = 48;
export const SESSION_TTL_DAYS = 14;
export const MIN_PASSWORD_LENGTH = 10;
