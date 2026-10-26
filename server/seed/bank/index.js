// The Practice Studio question bank: questions per stage, served at random from each stage. Each
// question fixes its buyer persona and challenge levels, says what a good answer does for the rep's
// role, and lists the follow-up objections the buyer is likely to raise. Questions that test the same
// skill share a concept (the slug of the concept's first question), and the feed rotates through
// concepts so a rep meets each skill from several angles.
import { defaultProductLine } from '../../domain.js';
import * as coldOutreach from './cold_outreach.js';
import * as discovery from './discovery.js';
import * as demo from './demo.js';
import * as pricing from './pricing.js';
import * as competitor from './competitor.js';
import * as closing from './closing.js';
import * as stalled from './stalled.js';
import * as amAdoption from './am_adoption.js';
import * as amValue from './am_value.js';
import * as amRenewal from './am_renewal.js';
import * as moreColdOutreach from './more/cold_outreach.js';
import * as moreDiscovery from './more/discovery.js';
import * as moreDemo from './more/demo.js';
import * as morePricing from './more/pricing.js';
import * as moreCompetitor from './more/competitor.js';
import * as moreClosing from './more/closing.js';
import * as moreStalled from './more/stalled.js';
import * as moreAmAdoption from './more/am_adoption.js';
import * as moreAmValue from './more/am_value.js';
import * as moreAmRenewal from './more/am_renewal.js';
import * as newAiSearch from './new/ai_search.js';
import * as newAmAndIntaker from './new/am_and_intaker.js';
import * as newCalls from './new/calls.js';

// The first bank: one file per stage, with the additions for the drills seeded before it (EXISTING).
export const BANK_FILES = {
  cold_outreach: coldOutreach,
  discovery,
  demo,
  pricing,
  competitor,
  closing,
  stalled,
  am_adoption: amAdoption,
  am_value: amValue,
  am_renewal: amRenewal,
};

// Later files: more versions of each stage's concepts, and new concepts from later material. Keys are
// file paths relative to this folder, so the validator can check one file at a time.
export const EXTRA_FILES = {
  'more/cold_outreach.js': moreColdOutreach,
  'more/discovery.js': moreDiscovery,
  'more/demo.js': moreDemo,
  'more/pricing.js': morePricing,
  'more/competitor.js': moreCompetitor,
  'more/closing.js': moreClosing,
  'more/stalled.js': moreStalled,
  'more/am_adoption.js': moreAmAdoption,
  'more/am_value.js': moreAmValue,
  'more/am_renewal.js': moreAmRenewal,
  'new/ai_search.js': newAiSearch,
  'new/am_and_intaker.js': newAmAndIntaker,
  'new/calls.js': newCalls,
};

export const BANK_QUESTIONS = [...Object.values(BANK_FILES), ...Object.values(EXTRA_FILES)].flatMap((f) => f.QUESTIONS);

// Additions for the drills seeded before the question bank existed, by slug.
export const EXISTING_UPDATES = Object.assign({}, ...Object.values(BANK_FILES).map((f) => f.EXISTING));

// A question's product line: its own, or the usual one for its brand.
export const productOf = (q) => q.product || EXISTING_UPDATES[q.slug]?.product || defaultProductLine(q.brand);
// A question's concept: the slug of the concept's first question (a question that starts a concept
// names none).
export const conceptOf = (q) => q.concept || q.slug;
