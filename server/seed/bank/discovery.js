// Discovery: questions for the Practice Studio feed.
export const QUESTIONS = [
  {
    slug: 'disc-omnizant-deal-with-me',
    title: '“You can just deal with me”',
    brand: 'omnizant',
    subject: 'sales_technique',
    stage: 'discovery',
    roles: ['ae'],
    personas: ['marketing_manager'],
    personaLines: {},
    situation:
      'You are on a first video call for Omnizant with the marketing manager of a 25-attorney business and real estate law firm. She runs the website and the firm’s marketing vendors, and the firm is unhappy with how few inquiries the site produces.',
    buyerLine: '“I manage the website, the SEO, and all our vendors, so you can just deal with me. There’s no need to bring the partners into this.”',
    objective:
      'Respect her ownership while learning how a decision like this actually gets made: who else is involved, what they will need to see, the budget, and the timing.',
    goodLooksLike: [
      '- Affirms her role and works through her, without asking “Are you the decision-maker?” or trying to go around her.',
      '- Asks how a decision like this was made before, for example how the firm chose its current vendors and who signed off.',
      '- Asks who else should be part of the decision and what the partners will want to know before anything is approved.',
      '- Covers budget and timing without asking whether the firm can afford it, for example whether money is set aside this year and when a change would need to start.',
      '- Ends with a dated next step that she leads and that includes whoever else decides.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Whatever we pick, I’m the one who has to defend it to the partners. What would I even show them?”',
      '“I don’t have a budget number for you yet. Tell me what you charge, and I’ll see if it fits.”',
      '“Honestly, nothing changes until our agency contract is up in the spring.”',
    ],
    assessed: ['discovery', 'objection_handling', 'advancing'],
    defaults: [3, 2, 1],
    sources: [{ collection: 'sales-playbook', sections: ['3. ', '8. ', '4. ', '5. '] }],
  },
  {
    slug: 'disc-omnizant-more-cases',
    title: '“I just want more cases”',
    brand: 'omnizant',
    subject: 'sales_technique',
    stage: 'discovery',
    roles: ['ae'],
    personas: ['solo_attorney'],
    personaLines: {},
    situation:
      'You are on a discovery call for Omnizant with a solo probate attorney who booked the call through your website. He is friendly but vague about what he wants.',
    buyerLine: '“Honestly, I just want more cases. I don’t really track where my clients come from. Can you help with that?”',
    objective:
      'Turn a vague wish into a specific goal and gap, in his own words and numbers, before saying anything about what Omnizant would do.',
    goodLooksLike: [
      '- Does not promise more cases or describe services before understanding the goal.',
      '- Asks where he wants to be, such as how many new matters a month and of what kind, and how far that is from today.',
      '- Asks how clients find him now, even roughly, and what has or has not worked.',
      '- Gets his numbers on the table, such as what a typical matter is worth to him, and does not supply them for him.',
      '- Asks one question at a time and follows the answer instead of running a checklist.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“I don’t have a lot of time for this. What would you actually do for me?”',
      '“Cash is tight until a couple of estates close. I can’t take on a big monthly bill right now.”',
      '“I’ve been burned before. A marketing company took my money for a year, and I got maybe two calls out of it.”',
    ],
    assessed: ['discovery', 'empathy_clarity', 'advancing'],
    defaults: [2, 2, 1],
    sources: [{ collection: 'sales-playbook', sections: ['3. ', '1. '] }],
  },
  {
    slug: 'disc-omnizant-ai-search-partners',
    title: '“The partners keep asking about AI search”',
    brand: 'omnizant',
    subject: 'sales_technique',
    stage: 'discovery',
    roles: ['ae', 'am'],
    personas: ['marketing_manager'],
    personaLines: {},
    situation:
      'You are on a call about AI search with the marketing manager of a 30-attorney family law firm. If you are an AE, the firm is a new prospect; if you are an AM, it is an existing Omnizant website and SEO client.',
    buyerLine:
      '“The partners keep asking what we’re doing about AI search. I need something to tell them at next month’s partner meeting. What should we be doing?”',
    objective:
      'Diagnose before prescribing: find out what prompted the question, what the partners actually want, and how success would be judged, then agree on what she needs for the partner meeting.',
    goodLooksLike: [
      '- Does not jump to a GEO plan or promise that the firm will be cited in AI answers.',
      '- Asks what prompted the partners’ question, such as a competitor named in an AI answer, a client comment, or something they read.',
      '- Asks what a good outcome would mean to the partners in their own terms, such as more family law consultations or retained matters.',
      '- Asks how the firm tracks where inquiries come from today, so any change can be measured.',
      '- Proposes what she could bring to the partner meeting and a dated next step before it.',
    ].join('\n'),
    roleGuidance: {
      ae: [
        '- Qualifies the new firm: who decides, whether there is budget for this, and the partners’ timing.',
        '- Learns how the website and search work are handled today and by whom, without criticizing any current provider.',
        '- Aims for a dated meeting before the partner meeting, ideally with a partner on it.',
      ].join('\n'),
      am: [
        '- Starts from what Omnizant already does for the firm and what is working, rather than treating the call as a fresh start.',
        '- Treats GEO as an expansion only if it serves the goal the partners name, not as an upsell.',
        '- Offers to help prepare her update for the partners, involves the client’s main sponsor, and confirms any new scope and pricing before proposing it.',
      ].join('\n'),
    },
    pushbacks: [
      '“Can’t you just send me a one-page plan? I don’t have time for a long discovery process.”',
      '“One of the partners read that AI search will replace Google within a year. Is that true?”',
      '“Whatever we do, the partners will want a guarantee that we show up in ChatGPT. Can you give me that?”',
    ],
    assessed: ['discovery', 'persuasion', 'advancing'],
    defaults: [3, 3, 1],
    sources: [{ collection: 'sales-playbook', sections: ['3. ', '1. ', '5. '] }],
  },
  {
    slug: 'disc-ravenly-answer-my-phone',
    title: '“I need something to answer my phone”',
    brand: 'ravenly',
    subject: 'product',
    stage: 'discovery',
    roles: ['ae'],
    personas: ['solo_attorney'],
    personaLines: {},
    situation:
      'You are on a discovery call for Ravenly with a solo immigration attorney who is at hearings most mornings and handles every new inquiry herself.',
    buyerLine:
      '“What I really need is something that answers my phone when I’m in court. People give up when they can’t reach me. Does Ravenly do that?”',
    objective:
      'Diagnose where her inquiries come from and what happens to each today, answer the phone question accurately, and be honest about fit if live phone coverage is the core need.',
    goodLooksLike: [
      '- Does not claim Ravenly answers her phone, provides a live or AI answering service, or covers every channel around the clock.',
      '- Before positioning anything, asks how new inquiries arrive (calls, website, referrals), roughly how many of each, and what happens today to one that comes in during a hearing.',
      '- Asks what missed inquiries have cost her, such as matters that went to another attorney, in her own numbers.',
      '- Separates the two needs: website inquiries can be captured with their details outside office hours, while live phone coverage is a separate requirement the reviewed Ravenly offering does not establish; says so plainly if phones are the core problem.',
      '- Mentions phone-related features only accurately, such as call forwarding to a mobile number being separate from an answering service, and offers to confirm anything else.',
      '- Ends with a next step that fits the diagnosis, which may be a short look at her website intake or an honest “this may not be the right fit.”',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Most of my clients would rather call than fill out a form. So what good is a website tool to me?”',
      '“I already pay an answering service that takes messages. Why would I pay for both?”',
      '“I’m in court all morning and with clients all afternoon. When would I ever set this up?”',
    ],
    assessed: ['discovery', 'product_accuracy', 'empathy_clarity', 'advancing'],
    defaults: [4, 3, 4],
    sources: [
      { collection: 'ravenly-product', sections: ['03 · ', '07 · ', '02 · ', '16 · '] },
      { collection: 'sales-playbook', sections: ['3. '] },
    ],
  },
  {
    slug: 'disc-ravenly-low-volume-fit',
    title: '“Do I even need something like this?”',
    brand: 'ravenly',
    subject: 'product',
    stage: 'discovery',
    roles: ['ae'],
    personas: ['solo_attorney'],
    personaLines: {},
    situation:
      'You are on a phone discovery call for Ravenly with a solo estate planning attorney in a small town. She answers every website inquiry herself, usually in the evening.',
    buyerLine:
      '“I get maybe eight or ten website inquiries a month, and I answer them all myself at night. Do I even need something like this?”',
    objective:
      'Assess fit honestly: understand her process, what a slow or missed response costs her, and whether the economics work at her volume, without inflating the opportunity.',
    goodLooksLike: [
      '- Takes the question seriously and does not insist that she needs Ravenly.',
      '- Asks about the process and its gaps: how soon an inquiry gets a meaningful response, what happens in a busy week, and whether any inquiries have gone to another attorney.',
      '- Gets her numbers, such as what a typical matter is worth and how many more retained matters a month would make a difference, rather than supplying them.',
      '- Keeps the economics plausible at her volume: no aggressive revenue projection, and no marketing statistics presented as facts.',
      '- If plan scope comes up, states it accurately: Launch lists 25 monthly leads, 2 users, 3 practice areas, and 1 website at $99 a month on yearly billing or $119 monthly, and what counts toward the lead allowance is something to confirm.',
      '- Gives an honest recommendation, including that it may not be worth it yet if her numbers do not support it.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Honestly, answering them at night works fine. People can wait a few hours, can’t they?”',
      '“Even the cheapest plan is over a thousand dollars a year. That’s a lot for eight inquiries a month.”',
      '“I don’t want to get locked into anything. If it doesn’t help, can I just walk away?”',
    ],
    assessed: ['discovery', 'product_accuracy', 'persuasion'],
    defaults: [3, 3, 3],
    sources: [
      { collection: 'ravenly-product', sections: ['03 · ', '16 · ', '12 · ', '19 · ', '21 · '] },
      { collection: 'sales-playbook', sections: ['3. '] },
    ],
  },
  {
    slug: 'disc-ravenly-run-itself',
    title: '“It has to run itself”',
    brand: 'ravenly',
    subject: 'product',
    stage: 'discovery',
    roles: ['ae'],
    personas: ['managing_partner'],
    personaLines: {},
    situation:
      'You are on a discovery call for Ravenly with the managing partner of a 14-attorney criminal defense firm. Website inquiries land in a shared inbox, and two paralegals call people back between other work.',
    buyerLine: '“If we do this, it has to run itself. Nobody here has time to babysit another system, me included.”',
    objective:
      'Find out who would own intake work and how it runs today, set honest expectations about what automation does and does not do, and qualify whether the firm can support a successful rollout.',
    goodLooksLike: [
      '- Acknowledges the time pressure without promising a system that runs itself or follows up on its own.',
      '- Asks who owns each step today: who sees a new inquiry first, who calls back, and how anyone knows it was handled.',
      '- Explains accurately that automations can be configured to send approved acknowledgements and create tasks, validated before launch, while someone at the firm still owns responses, stages, and data.',
      '- Raises the fit question directly: if no one will own responses and follow-up, software visibility alone will not fix the problem.',
      '- If setup time comes up, describes full-service onboarding accurately: listed at $3,000 one-time for configuration, website work, and individual training, with the firm still supplying approvals and access, and with how it applies to the plan confirmed.',
      '- Ends by asking who would own the intake work day to day and proposing a next step that includes that person.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Can’t the AI just text people back and forth until they book a consultation?”',
      '“My paralegals already have full plates. I’m not hiring someone just to manage software.”',
      '“If my people still have to call everyone back, what exactly am I paying for?”',
    ],
    assessed: ['discovery', 'product_accuracy', 'objection_handling', 'advancing'],
    defaults: [4, 4, 3],
    sources: [
      { collection: 'ravenly-product', sections: ['03 · ', '08 · ', '12 · ', '16 · ', '18 · '] },
      { collection: 'sales-playbook', sections: ['3. '] },
    ],
  },
  {
    slug: 'disc-ravenly-calculator-108x',
    title: '“Where does your 108x come from?”',
    brand: 'ravenly',
    subject: 'product',
    stage: 'discovery',
    roles: ['ae'],
    personas: ['marketing_manager'],
    personaLines: {},
    situation:
      'You are on a discovery call for Ravenly with the marketing manager of a 50-attorney personal injury firm. Before the call, she ran the calculator on Ravenly’s pricing page with its default settings.',
    buyerLine:
      '“Your pricing page says we’d add $648,000 a year, a 108x return. If I put that in front of our partners, they’ll tear it apart unless I can explain exactly where it comes from. So where does it come from?”',
    objective:
      'Explain the calculator figure accurately as a scenario rather than a result, then turn the conversation into discovery of the firm’s own baseline for a model the partners can trust.',
    goodLooksLike: [
      '- Explains that the figure follows the calculator’s default assumptions, a 25% increase in captured leads and a 25% relative improvement in close rate with an illustrative $500 monthly cost, and is not an observed customer outcome.',
      '- Notes that $500 is not one of the named plan prices and that 108x compares incremental revenue with cost, not net profit ROI.',
      '- Does not defend or round the figure, and does not replace it with another projection or a guarantee.',
      '- Asks for the firm’s own baseline: monthly inquiries, current retained rate, revenue per retained matter, and the margin the partners would apply; for contingency matters, separates expected fee value from settlement amounts and cash timing.',
      '- Proposes building a transparent model with her, including a no-change scenario, and measuring it in an evaluation, noting that a 10-day trial may be too short to show retained revenue.',
      '- Proposes what she can take to the partners and a dated next step.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Forget the calculator. What do firms like ours actually see? Give me a real number.”',
      '“Our intake data is a mess. I can’t tell you our retained rate by channel, so how would we even build your model?”',
      '“The partners will only approve this if you guarantee it pays for itself in the first year. Will you put that in writing?”',
    ],
    assessed: ['product_accuracy', 'discovery', 'objection_handling', 'advancing'],
    defaults: [5, 5, 5],
    sources: [
      { collection: 'ravenly-product', sections: ['19 · ', '21 · ', '09 · ', '20 · '] },
      { collection: 'sales-playbook', sections: ['3. '] },
    ],
  },
  {
    slug: 'disc-ravenly-evaluation-plan',
    title: 'Close discovery with an evaluation plan',
    brand: 'ravenly',
    subject: 'product',
    stage: 'discovery',
    roles: ['ae'],
    personas: ['managing_partner'],
    personaLines: {},
    situation:
      'You are near the end of a discovery call for Ravenly with the managing partner of a 20-attorney employment law firm. He has told you that weekend web inquiries sit until Monday, nobody clearly owns follow-up, and he cannot tell which marketing produces retained clients.',
    buyerLine: '“Okay, you’ve heard our mess. I don’t want a tour of every feature. What do you suggest we do next?”',
    objective:
      'Close discovery with a specific evaluation agreement built from what he said: the main gap, the workflow to test, the measures, the open requirements, and who decides by when.',
    goodLooksLike: [
      '- Plays the problem back in his words before suggesting anything, and checks that nothing is missing.',
      '- Names one main gap and one workflow to evaluate, such as weekend inquiries getting an acknowledgement and a named owner before Monday, instead of offering a feature tour.',
      '- Proposes a baseline and a few measures, such as time to first acknowledgement and to first meaningful staff response, tracked separately, and the share of inquiries with an owner and a next task.',
      '- Lists the open requirements to confirm, such as the case management handoff, messaging registration, and consent wording, without promising them.',
      '- Asks who else decides and proposes a dated review with them, for example at the end of a 10-day trial or after a focused demo.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“I don’t want my staff spending hours testing software. Can’t you just show me it works?”',
      '“Whatever we try, a couple of weeks won’t tell me whether we sign more clients. How would we actually judge it?”',
      '“My partners will want to know the cost before they give this any time. What’s the number?”',
    ],
    assessed: ['discovery', 'product_accuracy', 'persuasion', 'advancing'],
    defaults: [4, 3, 3],
    sources: [
      { collection: 'ravenly-product', sections: ['16 · ', '19 · ', '20 · ', '12 · '] },
      { collection: 'sales-playbook', sections: ['5. '] },
    ],
  },
  {
    slug: 'disc-second-office',
    title: '“We’re opening a second office”',
    brand: 'both',
    subject: 'sales_technique',
    stage: 'discovery',
    roles: ['ae', 'am'],
    personas: ['managing_partner'],
    personaLines: {},
    situation:
      'During an in-person meeting, the managing partner of a six-attorney bankruptcy firm tells you the firm will open a second office in a neighboring county in the spring. If you are an AE, you are qualifying a new firm; if you are an AM, the firm is an existing client. You represent your own company: Omnizant or Ravenly.',
    buyerLine: '“We’re opening a second office in the spring, and we’ll need a lot more new clients to make it pay for itself.”',
    objective:
      'Explore the growth plan before offering anything: the goal, the gap, the cost of missing it, and who decides, so any recommendation is built from the firm’s own numbers.',
    goodLooksLike: [
      '- Shows genuine interest and asks about the destination: how many new clients the second office needs, by when, and for which kinds of matters.',
      '- Asks how far the firm is from that today and where new clients come from now.',
      '- Asks what happens if the office opens and the clients do not come, so the cost of the gap is in the partner’s terms.',
      '- Asks who else is involved in decisions about the new office, and about budget and timing, without asking whether the firm can afford it.',
      '- Does not pitch, quote, or promise results before the diagnosis.',
    ].join('\n'),
    roleGuidance: {
      ae: [
        '- Qualifies the firm as a new opportunity: budget for the expansion, who decides, and when they need to be ready.',
        '- Uses the opening date as a real reason to act, without inventing urgency.',
        '- Aims for a dated meeting with the decision-makers, framed around the new office’s goals.',
      ].join('\n'),
      am: [
        '- Connects the expansion to what the account already has: what is working, and what the current scope does and does not cover.',
        '- Uncovers the need before proposing any change to scope or pricing, and confirms what a change would involve before quoting it.',
        '- Brings in the existing sponsor and whoever will run the new office, and sets a dated planning session well before the opening.',
      ].join('\n'),
    },
    pushbacks: [
      '“It’s early. We haven’t even signed the lease, so I don’t want to commit to anything.”',
      '“Every spare dollar is going into the build-out. Anything new will have to wait until the doors are open.”',
      '“My partner is running the new office, and she has her own ideas. Honestly, it’ll be her call.”',
    ],
    assessed: ['discovery', 'empathy_clarity', 'advancing'],
    defaults: [3, 3, 1],
    sources: [{ collection: 'sales-playbook', sections: ['3. ', '4. ', '5. '] }],
  },
  {
    slug: 'disc-price-before-questions',
    title: 'Asked for the price before any questions',
    brand: 'both',
    subject: 'sales_technique',
    stage: 'discovery',
    roles: ['ae'],
    personas: ['solo_attorney'],
    personaLines: {},
    situation:
      'You are one minute into a scheduled discovery call with a solo DUI defense attorney. You represent your own company: Omnizant or Ravenly.',
    buyerLine: '“Before we get into questions, can you just tell me what it costs? I want to know if it’s even in my range.”',
    objective:
      'Keep control of the conversation without dodging: acknowledge the request, earn the right to ask a few questions so any number is the right one, and keep the call moving.',
    goodLooksLike: [
      '- Acknowledges the request respectfully and does not ignore or refuse it.',
      '- Uses a frame-control line, such as offering to get a number and asking two or three quick questions first so it is the right number.',
      '- Keeps the questions short and high value, such as what prompted the call and what a new client is worth to the practice.',
      '- Does not invent prices, packages, or discounts to keep the buyer on the line.',
      '- Keeps the buyer talking and moves toward a recommendation or a scheduled next step.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“I’ve been on calls like this before, and they always turn into an hour-long pitch. How long is this going to take?”',
      '“I’m a solo. Anything with a long contract or a big setup fee is a nonstarter for me.”',
      '“Honestly, I’m not sure I even need this. Business is slow, but it’s okay.”',
    ],
    assessed: ['discovery', 'objection_handling', 'advancing'],
    defaults: [2, 2, 1],
    sources: [{ collection: 'sales-playbook', sections: ['1. ', '3. '] }],
  },
];

// Buyer pushbacks and role expectations for the seeded drills already in this stage, by slug.
export const EXISTING = {
  'discovery-cost-of-problem': {
    pushbacks: [
      '“Honestly, I couldn’t put a number on it. We don’t track that kind of thing.”',
      '“The ones that slip through probably weren’t great cases anyway.”',
      '“I can see where this is going. You want me to call it a big problem so you can sell me something.”',
    ],
    roleGuidance: {
      ae: [
        '- Uses the cost to qualify a new firm: whether the problem is big enough to act on now and worth a next meeting.',
        '- Adds the three qualifying questions before moving on: budget, who else should be part of the decision, and timing.',
        '- Ends with a dated next step with the people who decide, built on the cost the buyer named.',
      ].join('\n'),
      am: [
        '- Connects the gap to the client’s current setup: what is already in place, what is working, and where this cost falls outside it.',
        '- Draws on what the account already knows, such as past results and the people involved, instead of re-asking the basics.',
        '- Treats any expansion as a fix for the cost the client named rather than an upsell, and agrees on a dated review with the client’s sponsor.',
      ].join('\n'),
    },
  },
  'ravenly-receptionist': {
    pushbacks: [
      '“She’s been with us for years, and people love her. I’m not replacing her with software.”',
      '“If someone calls after hours, they leave a voicemail. If it matters, they call back.”',
      '“If someone fills out the website form at 8 p.m., does your software answer them, or does someone still have to call them back?”',
    ],
  },
  'just-looking': {
    pushbacks: [
      '“I’d rather not get into our details yet. Can you just walk me through what you offer?”',
      '“Can you just send me a brochure and your pricing? I’ll compare everyone side by side.”',
      '“We’re talking to a few other companies too. Why should I spend more time with you?”',
    ],
  },
  'ravenly-attribution-discovery': {
    pushbacks: [
      '“Our agency says Google Analytics already handles attribution. Why isn’t that enough?”',
      '“Our partners will want one number: how much revenue each channel brings in. Can Ravenly show that?”',
      '“We tried a call-tracking tool last year, and its numbers never matched our case system. Why would this be any different?”',
    ],
  },
};
