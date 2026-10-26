// The Practice Studio question bank: questions per stage, served at random from each stage. Each
// question fixes its buyer persona and challenge levels, says what a good answer does for the rep's
// role, and lists the follow-up objections the buyer is likely to raise.
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

export const BANK_QUESTIONS = Object.values(BANK_FILES).flatMap((f) => f.QUESTIONS);

// Additions for the drills seeded before the question bank existed, by slug.
export const EXISTING_UPDATES = Object.assign({}, ...Object.values(BANK_FILES).map((f) => f.EXISTING));
