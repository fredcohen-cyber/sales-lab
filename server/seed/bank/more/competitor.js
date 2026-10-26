// More versions of this stage's existing concepts: each tests the same skill as the question its
// concept names, with a different buyer, situation, or level.
export const QUESTIONS = [
  // ------------------------------------------------------------ ravenly-juvo-real-person
  {
    slug: 'comp-ravenly-juvo-real-person-v2',
    concept: 'ravenly-juvo-real-person',
    title: 'Intake director fears losing Juvo’s night coverage',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'competitive',
    stage: 'competitor',
    roles: ['ae'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You are on a video call with the intake director of a 14-attorney personal injury firm. Juvo Leads’ people answer the firm’s website chat around the clock, and her team of three picks up the overnight handoffs each morning. The managing partner asked her to look at Ravenly.',
    buyerLine:
      '“My team is stretched as it is. Juvo’s people handle our website chat at night and on weekends. If we switched to Ravenly, would all of that land on my team?”',
    objective:
      'Answer her workload worry honestly, separate outside chat coverage from the intake work her team already does, and agree on a way to see which model fits.',
    goodLooksLike: [
      '- Treats wanting people on the chat after hours as a legitimate requirement and acknowledges her team’s workload.',
      '- Says plainly that the reviewed Ravenly offering does not establish a staffed human answering service: website capture can run outside office hours, but that does not mean a person replies around the clock.',
      '- Separates outside conversation coverage from qualification, follow-up ownership, and reporting, and asks what the firm is buying: a better intake system, outsourced conversations, or both.',
      '- Describes where Ravenly could help her team each morning, such as the Action Center’s high-priority leads, messages awaiting response, and tasks due today, with each lead’s original answers beside an AI summary.',
      '- Asks who owns the next step today when a Juvo conversation is handed to the firm, and does not disparage Juvo or claim it lacks reporting, scheduling, or integrations.',
      '- Proposes a next step that includes her, such as walking through a few recent after-hours leads together, with the managing partner invited to the follow-up.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“If someone uses your chat at midnight, does anybody talk to them before my team gets in?”',
      '“What would my team actually do differently in the morning with Ravenly?”',
      '“The partner likes that a real person answers. If I recommend software and we lose a big case overnight, that’s on me.”',
    ],
    assessed: ['product_accuracy', 'empathy_clarity', 'discovery', 'advancing'],
    defaults: [2, 2, 3],
    sources: [{ collection: 'ravenly-product', sections: ['15 · ', '13 · ', '02 · ', '06 · ', '08 · '] }],
  },
  {
    slug: 'comp-ravenly-juvo-real-person-v3',
    concept: 'ravenly-juvo-real-person',
    title: 'Marketing manager won’t risk ad spend on software chat',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'competitive',
    stage: 'competitor',
    roles: ['ae'],
    personas: ['marketing_manager'],
    personaLines: {},
    situation:
      'You are on a video call with the marketing manager of a 28-attorney employment law firm that spends heavily on paid search. Juvo Leads’ people answer the chat on the firm’s landing pages, and the partners asked her to evaluate Ravenly because they want one view of intake and results.',
    buyerLine:
      '“Our landing pages work because a real person answers the chat, day or night. I’m not going to gamble our ad spend on software chat. Why would we switch?”',
    objective:
      'Respect the human-chat requirement without claiming a staffed service, separate conversation coverage from what the partners want from an intake system, and agree on an evaluation she can measure.',
    goodLooksLike: [
      '- Treats a person answering the chat as a legitimate requirement and does not claim Ravenly provides a staffed human answering service.',
      '- Does not claim software chat converts better than Juvo’s people or call human service outdated; offers to measure instead of asserting.',
      '- Separates outside conversation coverage from what the partners asked for (qualification, follow-up ownership, and source-to-retained reporting) and asks whether the firm is buying a better intake system, outsourced conversations, or both.',
      '- Credits what Juvo advertises beyond chat, such as human SMS answering, attribution, and signed-client and revenue tracking, without claiming it lacks reporting or integrations.',
      '- Describes what Ravenly could show her as strengths to demonstrate, not exclusive features: chat, webform, and case evaluation formats; paid reporting by campaign and landing page, including cost per retained lead; and question-level abandonment analytics.',
      '- Proposes an evaluation with agreed measures, such as completed inquiries by page, inquiries that meet the firm’s criteria, and retained outcomes, and asks who else must approve it.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“If a visitor on a landing page wants to talk to a person right now, what happens with Ravenly?”',
      '“Juvo’s reporting already ties signed cases back to my campaigns. What would I learn from yours that I don’t know now?”',
      '“Give me a number. How many more cases would we sign with your software than with real people?”',
    ],
    assessed: ['product_accuracy', 'objection_handling', 'persuasion', 'advancing'],
    defaults: [4, 4, 4],
    sources: [{ collection: 'ravenly-product', sections: ['15 · ', '13 · ', '09 · ', '07 · ', '18 · ', '19 · '] }],
  },

  // ------------------------------------------------------------ ravenly-intaker-ai-agent
  {
    slug: 'comp-ravenly-intaker-ai-agent-v2',
    concept: 'ravenly-intaker-ai-agent',
    title: 'Solo asks if Ravenly texts leads back like Intaker',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'competitive',
    stage: 'competitor',
    roles: ['ae'],
    personas: ['solo_attorney'],
    personaLines: {},
    situation:
      'A solo immigration attorney who handles her own intake saw your Ravenly demo last week and has also been reading Intaker’s website. She calls you between hearings.',
    buyerLine:
      '“I’m in hearings most of the day, and leads go cold before I can text them back. Intaker says its AI texting agent qualifies people and books them for me. Does Ravenly have something like that?”',
    objective:
      'Answer honestly about what Ravenly’s follow-up does and does not do, credit what Intaker advertises, and find out what she needs before proposing a test.',
    goodLooksLike: [
      '- Credits Intaker’s AI texting agent as Intaker describes it (qualifying, booking, transferring, and following up with inquiries) without disputing or belittling it.',
      '- Says plainly that Ravenly’s reviewed automations are not an autonomous texting agent that holds a conversation: they send SMS or email and create tasks, immediately or as a timed sequence.',
      '- Explains what could be configured and tested for her: an approved acknowledgement to each new, non-spam inquiry, a template that can carry her Calendly link once scheduling is set up, and a task so she knows who to call first, with SMS registration and opt-in settled before any texts go out.',
      '- Asks whether she needs an agent to hold the conversation, a structured intake she follows up on herself, or both.',
      '- Proposes running two or three of her real inquiries through both products and sets a date.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Would Ravenly just send a canned text? People can tell when it’s automated.”',
      '“Could I answer them from my phone without giving out my cell number?”',
      '“If Intaker’s agent can book the consultation while I’m in court, why would I pick the one where I still do the work?”',
    ],
    assessed: ['product_accuracy', 'objection_handling', 'discovery', 'advancing'],
    defaults: [3, 3, 3],
    sources: [{ collection: 'ravenly-product', sections: ['14 · ', 'Ravenly vs Intaker', '13 · ', '08 · ', '07 · ', '10 · '] }],
  },
  {
    slug: 'comp-ravenly-intaker-ai-agent-v3',
    concept: 'ravenly-intaker-ai-agent',
    title: 'Intake director wants Intaker’s AI texting agent',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'competitive',
    stage: 'competitor',
    roles: ['ae'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You are on a video call with the intake director of a 22-attorney personal injury firm that gets many after-hours and Local Services Ads (LSA) inquiries. Her team of four cannot keep up with texting new leads at night, and she has seen Intaker’s AI texting agent demonstrated.',
    buyerLine:
      '“Intaker’s AI agent texts our leads back at night, qualifies them, books consultations, and hands off to my team when it should. My people can’t keep up as it is. If Ravenly can’t do that, tell me now.”',
    objective:
      'Give a precise, honest answer about Ravenly’s follow-up, credit Intaker’s advertised agent as Intaker’s claim, and find out whether she needs an agent, a better team workflow, or both.',
    goodLooksLike: [
      '- Answers directly: the reviewed Ravenly product does not establish an autonomous conversational texting agent, and its SMS, email, and task automations are not presented as equivalent to Intaker’s agent.',
      '- Treats Intaker’s descriptions of its AI texting agent (qualification, booking, transfer, follow-up, escalation, and manual takeover) and its LSA responder (AI qualification, follow-up, and warm transfers) as Intaker’s claims to test in her scenarios, neither proven nor disputed.',
      '- Describes accurately what Ravenly could do for her team: an approved acknowledgement and a task when a new, non-spam lead arrives, timed sequences that the builder says cancel on a stage change, and a notification event for a high-priority lead left untouched for 15 minutes, depending on each user’s settings; does not promise branching conversation, response-aware stopping, or business-hour logic.',
      '- For LSA leads, separates time until import (the integration describes a 15-minute cadence that may run slower) from time to respond after import, and does not promise instant replies.',
      '- Asks the questions that decide fit: does she need an agent to hold the conversation, structured intake with team-owned follow-up, or both, and how would her team review an incorrect answer or qualification decision?',
      '- Proposes a scenario-based evaluation with her real after-hours and LSA inquiries in both products, and a dated review with the partners.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“When a lead texts back at midnight, who answers it in Ravenly?”',
      '“If a follow-up sequence is running and my team forgets to update the lead’s stage, what happens?”',
      '“The partners want a decision this month. Give me one reason Ravenly is worth testing when Intaker has an agent and you don’t.”',
    ],
    assessed: ['product_accuracy', 'objection_handling', 'discovery', 'advancing'],
    defaults: [5, 4, 5],
    sources: [{ collection: 'ravenly-product', sections: ['14 · ', 'Ravenly vs Intaker', '13 · ', '08 · ', '07 · ', '06 · '] }],
  },

  // ------------------------------------------------------------ ravenly-juvo-per-lead
  {
    slug: 'comp-ravenly-juvo-per-lead-v2',
    concept: 'ravenly-juvo-per-lead',
    title: 'Marketing manager likes reporting Juvo’s per-lead cost',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'competitive',
    stage: 'competitor',
    roles: ['ae'],
    personas: ['marketing_manager'],
    personaLines: {},
    situation:
      'The marketing manager of an 18-attorney personal injury firm emails you after your Ravenly demo. Juvo Leads’ people run the firm’s website chat, and she reports cost per lead to the partners every month.',
    buyerLine:
      '“I like that Juvo bills us forty dollars only when a lead comes in. It keeps my monthly cost-per-lead report simple. How would I explain a flat subscription to the partners?”',
    objective:
      'Explain the difference in pricing units accurately, help her give the partners a fair comparison, and propose a scoped worksheet instead of promising savings.',
    goodLooksLike: [
      '- Acknowledges why per-lead billing is easy to report and does not criticize Juvo’s model.',
      '- Explains that the units differ: Juvo’s posted $40 is per human chat lead and includes Juvo’s people doing the chatting, while Ravenly is a subscription with published lead allowances that exclude phone calls and spam (for example, Ascend lists 50 monthly leads at $199 a month on yearly billing or $229 monthly, and Summit is a custom quote) and does not include outsourced labor.',
      '- Suggests reporting what the partners care about more than cost per lead, such as cost per retained matter, built on agreed definitions of a lead and a qualified lead.',
      '- Offers a scoped worksheet that compares lead definitions, staff time, conversion outcomes, onboarding, usage, and integrations, and uses Juvo’s posted rate only as arithmetic, not as a quote.',
      '- Does not promise savings or invent numbers, and proposes a short call with her and a partner to fill in the worksheet with the firm’s own volume.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“If our leads drop in a slow month, we still pay the full subscription, right?”',
      '“What counts as a lead for you? Do duplicates and junk submissions count against our allowance?”',
      '“The partners will just ask which one is cheaper. Can you give me that in one line?”',
    ],
    assessed: ['product_accuracy', 'persuasion', 'advancing'],
    defaults: [2, 2, 3],
    sources: [{ collection: 'ravenly-product', sections: ['15 · ', '12 · ', '19 · ', '13 · '] }],
  },
  {
    slug: 'comp-ravenly-juvo-per-lead-v3',
    concept: 'ravenly-juvo-per-lead',
    title: 'Partner calls a subscription the riskier bet',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'competitive',
    stage: 'competitor',
    roles: ['ae'],
    personas: ['managing_partner'],
    personaLines: {},
    situation:
      'You are in the office of the managing partner of a seven-attorney family law firm that has used Juvo Leads’ human chat for a year. Your Ravenly proposal sits next to last month’s Juvo invoice on his desk.',
    buyerLine:
      '“With Juvo, if nobody inquires, I pay nothing. With you, I pay every month no matter what happens. Explain why I’d take on that risk.”',
    objective:
      'Take the risk concern seriously, compare the two models on equal terms without promising savings, and agree on how the firm will judge the numbers.',
    goodLooksLike: [
      '- Acknowledges that per-lead billing feels lower-risk and asks what he means by risk: paying in slow months, paying for poor-fit leads, or not seeing a return.',
      '- Explains that the units differ: Juvo’s posted rate is $40 per human chat lead and includes Juvo’s people holding the conversation, while Ravenly is a subscription priced per month, with lead allowances that exclude phone calls and spam, worked by the firm’s own staff.',
      '- Uses arithmetic only as an illustration, such as 25 billable Juvo chat leads at the posted rate coming to $1,000 before other services or terms, and does not present it as a quote or as proof that either option costs less.',
      '- Proposes a scoped worksheet covering billable-lead definitions, staff time, conversion outcomes, onboarding, usage, and contract terms, and asks how Juvo defines a billable lead for the firm today.',
      '- Builds the case from the firm’s own baseline, such as monthly inquiries, retained rate, and value per retained matter, and does not promise savings or more signed cases.',
      '- Asks for a dated review of the completed worksheet.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“What about a dead month in August? I’m still paying you?”',
      '“Your cheapest price is ninety-nine dollars. Where’s the rest of the cost hiding: setup, texting, phone numbers?”',
      '“My partners will ask what each option costs us per signed client. If you can’t tell me that, why would I switch?”',
    ],
    assessed: ['product_accuracy', 'objection_handling', 'persuasion', 'advancing'],
    defaults: [4, 4, 3],
    sources: [{ collection: 'ravenly-product', sections: ['15 · ', '12 · ', '19 · ', '13 · '] }],
  },

  // ------------------------------------------------------------ comp-intaker-already-installed
  {
    slug: 'comp-intaker-already-installed-v2',
    concept: 'comp-intaker-already-installed',
    title: 'Intake director’s team is settled on Intaker',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'competitive',
    stage: 'competitor',
    roles: ['ae'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'The managing partner of an 11-attorney workers’ compensation firm asked you to meet the intake director, whose team has used Intaker for two years. She runs the team day to day and will recommend whether to change.',
    buyerLine:
      '“My team knows Intaker inside out, and it took us a year to get our workflows right. If I recommend a switch, I’m the one retraining everybody. Why would I do that?”',
    objective:
      'Respect her team’s investment in Intaker, find out whether there is an unresolved problem worth changing for, and agree on a low-disruption way to test it.',
    goodLooksLike: [
      '- Respects the team’s investment and credits what Intaker publicly markets (website chat, communications, workflows, and AI agents) without criticizing it or calling its interface cluttered or hard to use.',
      '- Asks which Intaker capabilities her team uses every week and where work still slows down, then follows her answer instead of listing features.',
      '- Says plainly that a feature checklist alone is not a reason to switch; a change has to fix a gap in her team’s process.',
      '- If a gap surfaces, proposes that she or one of her intake staff work the same real inquiries in Ravenly, focused on reviewing original answers beside the score and summary and on tracking each next action.',
      '- Treats retraining as a real cost and, if setup comes up, describes the listed full-service onboarding (a one-time $3,000 covering configuration, website work, and individual training) while confirming how it would apply.',
      '- Asks when the Intaker arrangement next comes up for review and sets a dated next step that includes the managing partner.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“What would my team do differently in Ravenly on a normal Monday morning?”',
      '“Intaker already qualifies and routes our leads. Isn’t yours the same thing?”',
      '“Even if Ravenly is a little better, a switch means months of disruption for my team. Convince me it’s worth it.”',
    ],
    assessed: ['product_accuracy', 'discovery', 'empathy_clarity', 'advancing'],
    defaults: [3, 3, 3],
    sources: [
      { collection: 'ravenly-product', sections: ['14 · ', 'Ravenly vs Intaker', '06 · ', '05 · ', '12 · '] },
      { collection: 'sales-playbook', sections: ['6. '] },
    ],
  },
  {
    slug: 'comp-intaker-already-installed-v3',
    concept: 'comp-intaker-already-installed',
    title: 'Marketing manager won’t reset two years of reporting',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'competitive',
    stage: 'competitor',
    roles: ['ae'],
    personas: ['marketing_manager'],
    personaLines: {},
    situation:
      'You are on a video call with the marketing manager of a 30-attorney personal injury firm. Over two years she has built the firm’s source-to-signed-client reporting in Intaker and presents it to the partners every quarter. A partner who heard about Ravenly at a conference set up the call.',
    buyerLine:
      '“Intaker works, and the partners trust the two years of source-to-signed-client history I built in it. Switching resets all of that. Give me one reason that justifies it, and don’t tell me your dashboard is better.”',
    objective:
      'Respect the incumbent and her reporting history, find out whether a real gap exists, and agree on a fair test without promising a data migration or better reporting.',
    goodLooksLike: [
      '- Respects her reporting work, does not claim Intaker lacks reporting, automation, or integrations, and agrees that “we have a dashboard” is not a reason to switch.',
      '- Asks which questions the partners still cannot answer with the current reporting and what evidence would make switching worthwhile, then follows the answer.',
      '- Does not promise that Intaker history can be moved into Ravenly or that the two systems’ numbers will match; offers to scope what would need to move, at the event and field level, and confirm it.',
      '- If a gap surfaces, names only Ravenly reporting she could test against it, such as LLM referral attribution where data is available or question-level abandonment analytics, as strengths to demonstrate rather than exclusive features, and keeps the coming-soon report modules out of it.',
      '- Does not claim Ravenly is cheaper, faster, more accurate, or uniquely AI-powered.',
      '- Proposes a limited, dated test, such as tracing one anonymized inquiry from source through follow-up to a recorded outcome, and asks when the Intaker agreement next comes up for review.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Can you bring our Intaker history across, so the partners don’t lose two years of trend lines?”',
      '“The partners want revenue by channel and how each intake person performs. Can Ravenly show both today?”',
      '“If I run your test and the numbers come out about the same, I’ve wasted my team’s time. Why should I take that risk?”',
    ],
    assessed: ['product_accuracy', 'objection_handling', 'discovery', 'advancing'],
    defaults: [5, 5, 4],
    sources: [
      { collection: 'ravenly-product', sections: ['14 · ', 'Ravenly vs Intaker', '13 · ', '09 · ', '10 · '] },
      { collection: 'sales-playbook', sections: ['6. '] },
    ],
  },

  // ------------------------------------------------------------ comp-intaker-just-a-chatbot
  {
    slug: 'comp-intaker-just-a-chatbot-v2',
    concept: 'comp-intaker-just-a-chatbot',
    title: 'Solo sees Intaker and Ravenly as two chat windows',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'competitive',
    stage: 'competitor',
    roles: ['ae'],
    personas: ['solo_attorney'],
    personaLines: {},
    situation:
      'A solo bankruptcy attorney returns your call after looking at Ravenly’s and Intaker’s websites. She has ten minutes before a client arrives.',
    buyerLine:
      '“From what I can tell, Intaker is a chat window on my website, and so are you. I don’t need a fancy chatbot. Why should I care about either one?”',
    objective:
      'Correct the “just a chatbot” picture fairly for both products, without disparaging Intaker, and turn the conversation to the problem she needs solved.',
    goodLooksLike: [
      '- Does not agree that Intaker is just a chat window; notes that its public materials describe website chat plus communications, workflows, and AI agents for texting and Local Services Ads.',
      '- Describes Ravenly in plain terms as more than chat: three ways for visitors to reach her (chat, a webform, or a guided case evaluation), practice-specific questions, and a score and summary beside the original answers, with follow-up and reporting in one workspace.',
      '- Does not claim Ravenly is better across the board, cheaper, faster, or uniquely AI-powered.',
      '- Asks what happens today when someone contacts her while she is with a client or in court, and what that costs her, so the conversation rests on her problem rather than on either product.',
      '- Suggests a short next step, such as walking one of her typical inquiries through Ravenly on a set day.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“I already have a contact form on my site. Isn’t that enough?”',
      '“What does Intaker do that you don’t?”',
      '“I’m a one-person office. Which one is less work for me? Be straight with me.”',
    ],
    assessed: ['product_accuracy', 'empathy_clarity', 'discovery', 'advancing'],
    defaults: [3, 3, 3],
    sources: [
      { collection: 'ravenly-product', sections: ['14 · ', 'Ravenly vs Intaker', '13 · ', '02 · ', '04 · '] },
      { collection: 'sales-playbook', sections: ['3. '] },
    ],
  },
  {
    slug: 'comp-intaker-just-a-chatbot-v3',
    concept: 'comp-intaker-just-a-chatbot',
    title: 'Asked to call Intaker a chatbot in the partner deck',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'competitive',
    stage: 'competitor',
    roles: ['ae'],
    personas: ['marketing_manager'],
    personaLines: {},
    situation:
      'The marketing manager of a 25-attorney employment law firm is drafting slides that compare Ravenly and Intaker for Thursday’s partner meeting. She emails you her summary line and asks you to confirm it.',
    buyerLine:
      '“My summary slide says: ‘Intaker is basically a chatbot. Ravenly is a full intake platform.’ The partners will repeat that to both vendors, so it has to hold up. Can I use it?”',
    objective:
      'Decline the inaccurate line, give her a fair and defensible way to describe both vendors, and steer the slide toward the firm’s own evaluation.',
    goodLooksLike: [
      '- Asks her not to use the line, because Intaker’s public materials describe much more than chat: video-led website chat, a communications hub with shared inbox, tasks, pipelines, routing, and source-to-signed-client analytics, workflows, and AI agents for texting and LSA.',
      '- Offers a defensible alternative that contrasts emphasis rather than capability, for example that Intaker leads with conversations, while Ravenly centers on capturing the lead cleanly, qualifying it quickly, and helping the team see who to follow up with first.',
      '- Presents Ravenly’s strengths as demonstrable, not exclusive: three capture formats, firm-specific scoring criteria beside the original answers, a connected daily intake workspace, LLM referral reporting, and question-level abandonment analytics.',
      '- Does not claim Ravenly is better across the board, cheaper, faster, more accurate, or uniquely AI-powered, and offers no Intaker price, since no current one has been verified.',
      '- Suggests the slide compare both vendors on the firm’s own scenarios and offers to review her draft before Thursday.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“The partners won’t sit through nuance. Give me one line that makes the difference clear.”',
      '“Intaker’s rep says their AI agent does follow-up you can’t. Is that true?”',
      '“If both sets of claims look the same on my slide, the partners will pick the cheaper one. What do I put for price?”',
    ],
    assessed: ['product_accuracy', 'persuasion', 'empathy_clarity', 'advancing'],
    defaults: [4, 3, 4],
    sources: [{ collection: 'ravenly-product', sections: ['14 · ', 'Ravenly vs Intaker', '13 · ', '12 · '] }],
  },

  // ------------------------------------------------------------ comp-intaker-e-signature
  {
    slug: 'comp-intaker-e-signature-v2',
    concept: 'comp-intaker-e-signature',
    title: 'Intake director asks to send retainers from Ravenly',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'competitive',
    stage: 'competitor',
    roles: ['ae'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You demoed Ravenly to the intake director of a six-attorney family law firm, including a lead record’s Documents tab. Her team emails retainers as attachments and chases signatures by phone, and she is also looking at Intaker.',
    buyerLine:
      '“Quick question. In your demo I saw a Documents tab on each lead, and Intaker’s site says its chat handles e-signature workflows. Could my team send retainers for signature from Ravenly too?”',
    objective:
      'Answer precisely about e-signature without overclaiming, treat Intaker’s advertised workflow fairly, and learn how much the feature matters to her team.',
    goodLooksLike: [
      '- Explains that the Documents tab is a place to search and upload lead-related files, and that e-signature was not established in the reviewed product, so offers to confirm the current answer by a set date rather than guessing either way.',
      '- Notes that a stage name such as Retainer Sent describes status and does not prove e-signature functionality.',
      '- Treats Intaker’s e-signature workflow as something Intaker advertises, without disputing or belittling it.',
      '- Asks how her team sends and tracks retainers today and whether e-signature inside the intake tool is a must-have or a convenience.',
      '- Mentions what Ravenly could do about the chasing, such as a task for each retainer that is out, and proposes walking one real retainer through both products.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“If you don’t do e-signatures, can we keep our e-signature tool and use it alongside Ravenly?”',
      '“How would my team see which retainers are still unsigned?”',
      '“Intaker seems to do it all in one place. Why would I recommend two tools to the partners?”',
    ],
    assessed: ['product_accuracy', 'discovery', 'advancing'],
    defaults: [2, 2, 3],
    sources: [{ collection: 'ravenly-product', sections: ['14 · ', '06 · ', '02 · ', '03 · ', '21 · ', '10 · '] }],
  },
  {
    slug: 'comp-intaker-e-signature-v3',
    concept: 'comp-intaker-e-signature',
    title: 'Partner makes e-signature the deciding feature',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'competitive',
    stage: 'competitor',
    roles: ['ae'],
    personas: ['managing_partner'],
    personaLines: {},
    situation:
      'You are in the final meeting with the managing partner of a 16-attorney personal injury firm. His associates spend hours chasing signed retainers, and Intaker’s proposal is also on his desk.',
    buyerLine:
      '“Intaker’s chat handles e-signature workflows. My associates waste hours chasing retainers, so this decides it. Yes or no: can Ravenly get a retainer signed?”',
    objective:
      'Give a precise, honest answer about e-signature, treat Intaker fairly, test whether this really is the deciding requirement, and keep a clear path to a decision.',
    goodLooksLike: [
      '- Answers directly that e-signature was not established in the reviewed Ravenly product, neither claims it nor rules it out, and commits to confirming the current answer by a specific date.',
      '- Does not point to the Retainer Sent stage or the Documents tab as evidence: stage names describe status, and the Documents area holds lead-related files.',
      '- Treats Intaker’s advertised appointment and e-signature workflows as Intaker’s claims, without disputing them or calling Intaker a chatbot.',
      '- Isolates the requirement: asks how retainers are sent and signed today, which signature tool the firm already uses, and whether e-signature inside the intake tool outweighs everything else he has seen.',
      '- Says plainly that if e-signature inside the intake tool is the deciding requirement and the confirmation comes back negative, Ravenly may not be the right fit.',
      '- If it is not the only factor, brings the comparison back to the whole intake process and proposes a dated next step, such as walking one real retainer scenario through both products.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“How sure are you about that, and how fast can you get me a definite answer?”',
      '“Intaker also has AI texting and video chat. Why are we still talking?”',
      '“Say I give you a week. What exactly will you come back with, and what happens if the answer is no?”',
    ],
    assessed: ['product_accuracy', 'objection_handling', 'discovery', 'advancing'],
    defaults: [5, 4, 4],
    sources: [
      { collection: 'ravenly-product', sections: ['14 · ', '02 · ', '06 · ', '03 · ', '21 · '] },
      { collection: 'sales-playbook', sections: ['1. '] },
    ],
  },

  // ------------------------------------------------------------ comp-intaker-reporting-overlap
  {
    slug: 'comp-intaker-reporting-overlap-v2',
    concept: 'comp-intaker-reporting-overlap',
    title: 'Solo asks what sets your ad reporting apart',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'competitive',
    stage: 'competitor',
    roles: ['ae'],
    personas: ['solo_attorney'],
    personaLines: {},
    situation:
      'A solo criminal defense attorney who runs a few Google Ads campaigns asks you a question at the end of your Ravenly demo. He is also comparing Intaker.',
    buyerLine:
      '“Intaker says it shows which leads turn into signed clients, and you just showed me the same kind of thing. For a one-person office, what’s actually different?”',
    objective:
      'Acknowledge the overlap honestly, explain in plain terms what Ravenly’s reporting would show him, and propose a simple way to check it.',
    goodLooksLike: [
      '- Agrees that both vendors describe reporting from lead source to signed client, so a dashboard alone is not a reason to choose, and does not claim Intaker lacks reporting.',
      '- Explains in plain terms what Ravenly’s paid reporting can show for his campaigns: leads, retained matters, spend, cost per lead, cost per retained lead, and recorded won revenue.',
      '- Is clear that the numbers depend on his recording each matter’s stage and value, and that won revenue is a recorded value, not collected fees.',
      '- Asks which decision he wants the reporting to help with, such as which campaign to cut or grow.',
      '- Proposes checking one recent inquiry from his ads through to its recorded outcome during an evaluation.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Does my ad spend come in automatically, or do I have to type it in?”',
      '“If someone sees my ad and calls instead of filling out the form, does that show up?”',
      '“Intaker can do this too. So why would I pay for yours?”',
    ],
    assessed: ['product_accuracy', 'persuasion', 'advancing'],
    defaults: [2, 2, 3],
    sources: [{ collection: 'ravenly-product', sections: ['14 · ', 'Ravenly vs Intaker', '09 · ', '06 · ', '10 · '] }],
  },
  {
    slug: 'comp-intaker-reporting-overlap-v3',
    concept: 'comp-intaker-reporting-overlap',
    title: 'Partner distrusts every vendor’s outcome reporting',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'competitive',
    stage: 'competitor',
    roles: ['ae'],
    personas: ['managing_partner'],
    personaLines: {},
    situation:
      'You are meeting the managing partner of a 12-attorney personal injury firm that spends heavily on Google Ads and Local Services Ads. A previous vendor’s dashboard never matched his intake team’s numbers, and he has already heard Intaker’s pitch.',
    buyerLine:
      '“Intaker told me they show source to signed client. Now you’re telling me the same thing. My last vendor’s dashboard was fiction. Why should I believe either of you?”',
    objective:
      'Acknowledge the overlap and his experience, explain what Ravenly’s reporting records and what it depends on, and propose a test he can verify himself.',
    goodLooksLike: [
      '- Acknowledges that both vendors describe source-to-outcome reporting, does not claim Intaker’s reporting is weaker, and takes his past experience seriously.',
      '- Explains what Ravenly’s numbers rest on: retained and won outcomes depend on the stages the firm records, pipeline value is a recorded estimate, and won revenue is recorded value rather than collected cash.',
      '- Describes reporting he could check, such as Lead Performance by channel and source, the paid view (which has Google Ads and Local Services Ads tabs) with cost per retained lead, and the lead-level Attribution tab that ties a report back to a specific record.',
      '- Does not present the coming-soon modules (Revenue & Pipeline, Team Performance, Conversion Funnel) as available.',
      '- Proposes a test he controls: trace a handful of recent inquiries from source through follow-up to their recorded outcomes and compare them with what his intake team knows.',
      '- Asks which decision the reporting must support, such as where to move ad budget, and sets a dated review.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Can your report tell me what we actually collected on those cases?”',
      '“Local Services leads are half our spend. Do they show up as fast and as cleanly as the rest?”',
      '“If your numbers and my intake team’s numbers don’t match during the trial, we’re done. Agreed?”',
    ],
    assessed: ['product_accuracy', 'objection_handling', 'persuasion', 'advancing'],
    defaults: [4, 5, 4],
    sources: [{ collection: 'ravenly-product', sections: ['14 · ', 'Ravenly vs Intaker', '09 · ', '10 · ', '08 · ', '20 · '] }],
  },

  // ------------------------------------------------------------ comp-juvo-longer-trial
  {
    slug: 'comp-juvo-longer-trial-v2',
    concept: 'comp-juvo-longer-trial',
    title: 'Office manager asks who does the work in a trial',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'competitive',
    stage: 'competitor',
    roles: ['ae'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'The office manager of a four-attorney family law firm is choosing between a Ravenly free trial and a Juvo Leads trial. She runs the front desk with one assistant and would set up whichever trial the partners approve.',
    buyerLine:
      '“Juvo gives us fourteen days, and their people do the chatting. Yours is ten days, and my assistant and I would be doing the work. Why would I sign us up for the shorter, harder one?”',
    objective:
      'State both trials accurately, be honest about what a ten-day Ravenly trial asks of her team and what it would prove, and agree on a start she can manage.',
    goodLooksLike: [
      '- States Ravenly’s trial as the trial page advertises it, 10 days free with no credit card, and treats Juvo’s 14-day trial as Juvo’s advertised offer without criticizing it.',
      '- Explains that the trials test different things: Juvo’s, the quality of its people’s conversations and the handoff; Ravenly’s, how her own team works inquiries in the software.',
      '- Is honest about the work and keeps it focused: agree on scope, users, and one priority workflow in days 1 and 2, validate the capture and handoff, have her team work real scenarios, and decide on day 10, with approvals and website access named early.',
      '- Notes that a messaging registration delay could keep texting out of a 10-day evaluation, so it should be raised at the start.',
      '- Is honest that 10 days can validate setup and usability but may be too short to show retained cases.',
      '- Asks which inquiries she most wants handled better and proposes a start date that fits her calendar.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Juvo’s site also mentions a 30-day switching offer. Can you match that?”',
      '“How many hours would this take from me each week during the trial?”',
      '“If the partners don’t see signed cases in ten days, they’ll say it didn’t work. How do I keep that from happening?”',
    ],
    assessed: ['product_accuracy', 'empathy_clarity', 'advancing'],
    defaults: [3, 3, 3],
    sources: [{ collection: 'ravenly-product', sections: ['15 · ', '12 · ', '20 · ', '19 · ', '13 · ', '04 · '] }],
  },
  {
    slug: 'comp-juvo-longer-trial-v3',
    concept: 'comp-juvo-longer-trial',
    title: 'Marketing manager says ten days proves nothing',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'competitive',
    stage: 'competitor',
    roles: ['ae'],
    personas: ['marketing_manager'],
    personaLines: {},
    situation:
      'The marketing manager of a 35-attorney personal injury firm is deciding which vendor to trial first. The firm’s cases often take weeks to sign, and the partners want evidence before any contract. She has read Juvo’s trial and switching offers and Ravenly’s trial page.',
    buyerLine:
      '“Our cases take weeks to sign. Ten days won’t show me a single retained case. Juvo gives fourteen days and a thirty-day switching offer. Tell me exactly what your ten days would prove, or I start with them.”',
    objective:
      'Agree honestly about what ten days cannot show, define exactly what a Ravenly trial would prove, and compare the two offers fairly.',
    goodLooksLike: [
      '- Agrees that a 10-day trial may be too short to establish retained revenue for a long decision cycle and does not promise retained-case results from it.',
      '- States Ravenly’s trial as advertised (10 days free, no credit card) and treats Juvo’s 14-day trial and 30-day switching offer as Juvo’s advertised offers whose terms she should confirm, without criticizing them.',
      '- Defines what ten days can prove with agreed measures: completed inquiries by format and page, inquiries that meet the firm’s criteria (not just high scores), time to first acknowledgement and to first meaningful staff response, ownership and next tasks, and the share of leads with a usable source.',
      '- Explains that the trials test different things: Juvo’s, its people’s conversations and handoff; Ravenly’s, the firm’s own intake process and attribution in the software.',
      '- Proposes measuring retained outcomes after the trial against a baseline, allowing for campaign changes and the lag between inquiry and retention, rather than promising a longer trial.',
      '- Asks who on the partner side will judge the trial and sets a dated decision meeting.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Your site says no long-term contracts. Does that still apply if we keep Ravenly after the trial?”',
      '“If my team is slow to get things approved, does the ten-day clock keep running?”',
      '“The partners want proof, not setup checklists. Why should I spend the first trial on you instead of Juvo?”',
    ],
    assessed: ['product_accuracy', 'persuasion', 'objection_handling', 'advancing'],
    defaults: [5, 4, 4],
    sources: [{ collection: 'ravenly-product', sections: ['15 · ', '12 · ', '19 · ', '20 · ', '21 · ', '13 · '] }],
  },

  // ------------------------------------------------------------ comp-three-vendor-comparison
  {
    slug: 'comp-three-vendor-comparison-v2',
    concept: 'comp-three-vendor-comparison',
    title: 'Intake director’s three-vendor comparison sheet',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'competitive',
    stage: 'competitor',
    roles: ['ae'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'The partners of a 15-attorney personal injury firm asked the intake director to compare Ravenly, Intaker, and Juvo Leads, because her team of five will live with the choice. She shares her spreadsheet with you on a video call.',
    buyerLine:
      '“I have three columns: you, Intaker, and Juvo. What I need is what my team would actually do every day with each one. Can you help me fill that in honestly?”',
    objective:
      'Help her build an accurate, fair picture of her team’s daily work with each vendor, attribute competitor claims to the vendors, and steer toward testing with her team.',
    goodLooksLike: [
      '- Frames each vendor by who does the work: with Ravenly, her team works leads in the firm’s own workspace (leads, stages, tasks, messages, and records); Intaker advertises a shared inbox, tasks, pipelines, and routing, plus AI agents for texting and Local Services Ads that it says qualify and follow up with inquiries; Juvo advertises its own people answering chat and texts with the firm’s scripts, then delivering leads by email, SMS, or CRM with a fast-dial connection.',
      '- Attributes competitor capabilities to each vendor’s public materials and does not claim either lacks automation, reporting, scheduling, or integrations.',
      '- Is accurate about Ravenly’s follow-up: SMS, email, and task automations with her team doing the communicating, not an autonomous texting agent.',
      '- Suggests rows that matter to her team, such as who answers a new inquiry, who owns the next step after a handoff, how leads from forms, chat, and calls are reconciled, and what her team must set up.',
      '- Proposes that she and one of her team work the same real inquiries in Ravenly during an evaluation, and offers to review the sheet before it goes to the partners.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“With each of you, where does a new lead show up first, and how does my team know it’s there?”',
      '“The partners will add a price row no matter what. What do I put in it so nobody says I fudged it?”',
      '“Honestly, Juvo would take the most off my team’s plate. Why shouldn’t I just recommend them?”',
    ],
    assessed: ['product_accuracy', 'empathy_clarity', 'persuasion', 'advancing'],
    defaults: [3, 3, 4],
    sources: [{ collection: 'ravenly-product', sections: ['13 · ', '14 · ', '15 · ', 'Ravenly vs Intaker', '07 · ', '12 · '] }],
  },
  {
    slug: 'comp-three-vendor-comparison-v3',
    concept: 'comp-three-vendor-comparison',
    title: 'Partner wants three vendors compared in five minutes',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'competitive',
    stage: 'competitor',
    roles: ['ae'],
    personas: ['managing_partner'],
    personaLines: {},
    situation:
      'The managing partner of a nine-attorney personal injury firm has proposals from Intaker and Juvo Leads on his desk and agreed to a short call with you. He wants to narrow the field to two before his partners meet next week.',
    buyerLine:
      '“I have Intaker’s and Juvo’s proposals in front of me and five minutes for you. Tell me how the three of you differ, and don’t trash anybody. I’ll call them and check.”',
    objective:
      'Give a short, fair comparison by operating model that he can verify, avoid unsupported claims, and find out which problem should decide the choice.',
    goodLooksLike: [
      '- Gives a short framing by model: Ravenly is software the firm’s own team uses to capture, qualify, work, and measure inquiries; Intaker advertises an intake platform with website chat, communications, workflows, and AI agents across channels; Juvo advertises its own people handling chat and texts, plus lead tracking and reporting.',
      '- Attributes competitor capabilities to the vendors’ public materials and does not say either lacks AI, automation, reporting, or integrations.',
      '- Asks what the firm is really buying (outsourced conversations, a better intake system for its own staff, or both) and which intake problem made him start looking.',
      '- Does not call any option cheaper; notes that the proposals are priced in different units (Juvo per lead, Ravenly by subscription, Intaker by its quote) and need normalizing for lead definitions, staff labor, onboarding, usage, and term.',
      '- Does not claim a Ravenly autonomous texting agent, a staffed answering service, or that Ravenly is uniquely AI-powered.',
      '- Proposes a decision path, such as running the firm’s own scenarios through the two finalists, and asks for a dated slot with his partners.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Intaker’s proposal is a monthly number and Juvo’s is per lead. Which one is actually cheaper?”',
      '“My intake staff already work hard. Which of you makes their day easier, and how would I know?”',
      '“Give me your honest weakness against each of them.”',
    ],
    assessed: ['product_accuracy', 'persuasion', 'discovery', 'advancing'],
    defaults: [4, 4, 4],
    sources: [{ collection: 'ravenly-product', sections: ['13 · ', '14 · ', '15 · ', 'Ravenly vs Intaker', '12 · ', '03 · '] }],
  },

  // ------------------------------------------------------------ comp-keep-juvo-add-ravenly
  {
    slug: 'comp-keep-juvo-add-ravenly-v2',
    concept: 'comp-keep-juvo-add-ravenly',
    title: 'Intake director wants Juvo leads to land in Ravenly',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'competitive',
    stage: 'competitor',
    roles: ['ae'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'The intake director of a 10-attorney personal injury firm is happy with Juvo Leads’ people on the website chat, but each chat lead arrives as an email in a shared inbox and can sit until someone claims it. She is on a call with you to see whether Ravenly could organize what happens next.',
    buyerLine:
      '“We’re keeping Juvo’s people on chat. Right now their leads land in a shared inbox and sit there until somebody grabs them. Can those leads come straight into Ravenly so my team works them there?”',
    objective:
      'Treat keeping Juvo as a legitimate choice, scope how its leads could reach Ravenly without promising an integration, and settle who owns each lead when it arrives.',
    goodLooksLike: [
      '- Treats keeping Juvo’s people as a legitimate choice and confirms what Ravenly would be for: ownership and follow-up after the chat, reporting, or both.',
      '- Does not promise a native Juvo integration; names paths to test, such as forwarding Juvo’s lead emails to a Ravenly inbound email lead source (a unique @leads.ravenly.com address, where forwarded notifications can become leads) or a Zapier connection with the exact fields and direction defined.',
      '- Says the email route needs a sample-based test of parsing, attachments, duplicate handling, and reliability before anyone relies on it.',
      '- Asks who owns a Juvo lead the moment it arrives and how her team will know, and how those leads will be reconciled with web forms, phone calls, and retained matters.',
      '- Is open that the firm would pay Juvo per lead plus a Ravenly subscription.',
      '- Proposes a trial step that runs a few sample Juvo lead emails through the agreed workflow, with a date.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“If Juvo sends us the same person twice, will my team see two leads?”',
      '“Can Ravenly hand each Juvo lead to the right person on my team automatically?”',
      '“If a Juvo lead never makes it into Ravenly, who finds out, and who do I call?”',
    ],
    assessed: ['product_accuracy', 'discovery', 'advancing'],
    defaults: [3, 3, 4],
    sources: [{ collection: 'ravenly-product', sections: ['15 · ', '10 · ', '06 · ', '07 · ', '05 · ', '20 · '] }],
  },
  {
    slug: 'comp-keep-juvo-add-ravenly-v3',
    concept: 'comp-keep-juvo-add-ravenly',
    title: 'Marketing manager wants Juvo leads fully attributed',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'competitive',
    stage: 'competitor',
    roles: ['ae'],
    personas: ['marketing_manager'],
    personaLines: {},
    situation:
      'The marketing manager of a 40-attorney firm wants to keep Juvo Leads’ people on chat and add Ravenly for intake work and reporting. Her partners want one report from ad click to retained case, and she has been burned by vendors who promised integrations that never worked.',
    buyerLine:
      '“If we keep Juvo on chat and put Ravenly behind it, I need every Juvo chat lead in your reports with its campaign, landing page, and outcome. Will you commit to that in writing?”',
    objective:
      'Treat the hybrid model as legitimate, be precise about what attribution Ravenly can promise for leads another vendor captures, and agree on a test that will settle it.',
    goodLooksLike: [
      '- Treats keeping Juvo as a legitimate choice and does not disparage Juvo or claim it lacks attribution or reporting; notes that Juvo advertises its own attribution and signed-client tracking.',
      '- Does not commit to campaign and landing-page attribution for Juvo chat leads: Ravenly’s Attribution tab (page journey, landing page, source, channel, and medium) describes inquiries Ravenly captures itself, and that detail has not been established for leads arriving from another vendor’s chat.',
      '- Does not promise a native Juvo integration; names the paths to scope (a Ravenly inbound email lead source or a Zapier connection on Ravenly’s side, and the CRM delivery, Zapier, and webhook options Juvo advertises) and the fields that would have to come across, and offers to confirm them on samples.',
      '- Explains what Ravenly would add once a Juvo lead is in it, such as ownership, stages, tasks, and recorded retained outcomes and value, while source detail depends on what the handoff carries.',
      '- Asks how chat leads are reconciled with web forms, phone calls, and retained matters today, and which single report the partners need first.',
      '- Proposes a dated test with sample Juvo leads that checks which fields arrive, how duplicates are handled, and how the leads appear in reporting, and is open that the firm would pay both vendors.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Juvo can send leads into a CRM. Why can’t it just send them to you with the campaign attached?”',
      '“If the attribution is only partial, why wouldn’t I use Juvo’s dashboard and skip you?”',
      '“My partners will see two invoices and two dashboards. Make the case for that, or tell me it isn’t worth it.”',
    ],
    assessed: ['product_accuracy', 'objection_handling', 'discovery', 'advancing'],
    defaults: [5, 5, 5],
    sources: [{ collection: 'ravenly-product', sections: ['15 · ', '09 · ', '10 · ', '13 · ', '12 · ', '21 · '] }],
  },

  // ------------------------------------------------------------ comp-juvo-call-tracking
  {
    slug: 'comp-juvo-call-tracking-v2',
    concept: 'comp-juvo-call-tracking',
    title: 'Office manager asks where phone calls show up',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'competitive',
    stage: 'competitor',
    roles: ['ae'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'The office manager of a six-attorney criminal defense firm runs the front desk, where most new clients call in. The firm is comparing Ravenly with Juvo Leads, and she has read Juvo’s call tracking page.',
    buyerLine:
      '“Most of our new clients call us. Juvo has a call tracking package that records calls. With Ravenly, where would my front desk see the phone calls?”',
    objective:
      'Explain simply and accurately how calls connect to Ravenly, compare fairly with Juvo’s package, and name what needs confirming.',
    goodLooksLike: [
      '- Treats Juvo’s Call Tracking Plus as Juvo advertises it: a separate $179-a-month package with local numbers, call recording, and attribution, with current terms needing a quote.',
      '- Explains that call tracking connects to Ravenly through the CallRail integration, which covers call, text, and form events, that a lead record has a place for recordings and transcripts, and that the lead list can show CallRail as the capture method.',
      '- Does not claim Ravenly supplies its own tracking numbers or dynamic number insertion; offers to confirm what the firm would need, since the complete data flow has not been demonstrated.',
      '- Keeps call tracking separate from call forwarding and Call Connect, which route calls to the firm and are not an answering service.',
      '- Asks whether the firm already uses CallRail or another call tracking tool and how the front desk logs calls today, then proposes testing one tracked call into a lead record.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Do phone calls count against the monthly lead limit?”',
      '“Could my receptionists play back a recorded call right inside the lead?”',
      '“I don’t want my desk checking two systems for every call. Is that what this means?”',
    ],
    assessed: ['product_accuracy', 'discovery', 'advancing'],
    defaults: [2, 2, 3],
    sources: [{ collection: 'ravenly-product', sections: ['15 · ', '10 · ', '07 · ', '06 · ', '12 · '] }],
  },
  {
    slug: 'comp-juvo-call-tracking-v3',
    concept: 'comp-juvo-call-tracking',
    title: 'Solo thinks Ravenly ignores phone calls',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'competitive',
    stage: 'competitor',
    roles: ['ae'],
    personas: ['solo_attorney'],
    personaLines: {},
    situation:
      'A solo personal injury attorney gets most new clients by phone, often while she is in court. She is comparing Ravenly’s pricing page with Juvo Leads’ chat pricing and its Call Tracking Plus page.',
    buyerLine:
      '“Your pricing page says phone calls don’t count as leads, so I assume Ravenly just ignores calls. Juvo will track and record my calls for $179 a month, and most of my clients call. Why would I pick you?”',
    objective:
      'Correct the misreading precisely, explain how calls fit with Ravenly and what must be confirmed, and compare fairly with Juvo’s package.',
    goodLooksLike: [
      '- Corrects the misreading: published lead allowances exclude phone calls and spam, which is about what counts toward the plan’s allowance, not whether calls can appear in Ravenly; how CallRail events count should be confirmed before a quote.',
      '- Explains that call tracking connects to Ravenly through the CallRail integration (call, text, and form events, with a place in the lead record for recordings and transcripts), and that the complete data flow has not been demonstrated, so it should be tested.',
      '- Does not claim Ravenly supplies tracking numbers or dynamic number insertion, and confirms whether she would need her own CallRail account and what it would cost rather than guessing.',
      '- Treats Juvo’s Call Tracking Plus as advertised: $179 a month, separate from its $40-per-lead chat service, listing 10 local numbers, 5,000 local minutes, dynamic number insertion, call recording, and attribution, with current terms needing a quote.',
      '- Asks whether her bigger problem is tracking calls or answering them while she is in court, and keeps call forwarding and Call Connect distinct from an answering service.',
      '- Proposes testing one tracked call from source to lead record in an evaluation, with a date.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Add up CallRail and your plan for me. Is it more or less than Juvo’s package?”',
      '“When a call comes in while I’m in court, does Ravenly do anything about it?”',
      '“I don’t have time to set up two systems. If this takes more than an afternoon, I’m out.”',
    ],
    assessed: ['product_accuracy', 'objection_handling', 'persuasion', 'advancing'],
    defaults: [4, 4, 4],
    sources: [{ collection: 'ravenly-product', sections: ['15 · ', '12 · ', '10 · ', '07 · ', '03 · ', '18 · '] }],
  },

  // ------------------------------------------------------------ comp-omnizant-already-have-agency
  {
    slug: 'comp-omnizant-already-have-agency-v2',
    concept: 'comp-omnizant-already-have-agency',
    title: 'Office manager says FindLaw has the website covered',
    brand: 'omnizant',
    product: 'omnizant_web',
    subject: 'sales_technique',
    stage: 'competitor',
    roles: ['ae'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You are cold calling a six-attorney personal injury firm. You asked the receptionist who handles the relationship with the firm’s website provider, and she put you through to the office manager, who has worked with FindLaw on the firm’s site for years.',
    buyerLine:
      '“Oh, that’s me. We’ve been with FindLaw forever, and they take care of everything. Honestly, we’re fine. I don’t think we need anything.”',
    objective:
      'Respect the current provider, get curious about her experience, and earn a short, dated website review without criticizing FindLaw.',
    goodLooksLike: [
      '- Thanks her and respects the long relationship without criticizing FindLaw or its service.',
      '- Keeps any provider hook factual: FindLaw was sold to Internet Brands in a sale that closed in December 2024. Says what other firms have reported, asks whether she has noticed any changes, and does not tell her the service got worse.',
      '- Asks a curious question about what matters to the firm, such as what the attorneys judge the website by, and follows her answer.',
      '- Offers the free 15- to 20-minute website review as a second opinion on the site she manages: no logins or data needed, not a high-pressure sales call, and findings she could use with FindLaw or anyone else.',
      '- Books a specific day and time on the call and asks whether an attorney should join.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“What would you even look at? FindLaw handles all of that for us.”',
      '“Is there a charge for this?”',
      '“I’d have to check with the attorneys before I take a meeting about the website.”',
    ],
    assessed: ['objection_handling', 'empathy_clarity', 'advancing'],
    defaults: [2, 2, 1],
    sources: [
      { collection: 'sales-playbook', sections: ['6. ', '2. ', '5. '] },
      { collection: 'omnizant-product', sections: ['The complimentary website review', 'Competitor angles'] },
    ],
  },
  {
    slug: 'comp-omnizant-already-have-agency-v3',
    concept: 'comp-omnizant-already-have-agency',
    title: 'Solo with a Justia site is tired of agency calls',
    brand: 'omnizant',
    product: 'omnizant_web',
    subject: 'sales_technique',
    stage: 'competitor',
    roles: ['ae'],
    personas: ['solo_attorney'],
    personaLines: {},
    situation:
      'You are cold calling a solo estate planning attorney whose website is with Justia. She answers her own phone between client meetings and hears from marketing companies every week.',
    buyerLine:
      '“Let me guess: you want to redo my website. It’s with Justia, it works, and I get three of these calls a week. Why should I give you even five minutes?”',
    objective:
      'Respect her provider and her time, earn a little curiosity without criticizing Justia, and leave with a dated review or a dated reason to follow up.',
    goodLooksLike: [
      '- Respects her time and is candid that this is a sales call, for example by asking for 30 seconds rather than assuming them.',
      '- Compliments her choice of a specialist provider and does not criticize Justia; names the provider and offers the review without claiming anything about Justia’s service.',
      '- Asks one curious question about what matters to her, such as what she wants the website to produce, or whether she feels fully confident she is getting everything she needs from it.',
      '- Offers a specific, low-pressure next step: a free 15- to 20-minute review of her website and online presence next week, needing no logins or data, with recommendations she could take to Justia or anyone else.',
      '- Makes no claims about Omnizant results, prices, or rankings.',
      '- If she declines, asks when her website arrangement next comes up for review and agrees on a dated reason to call back.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“What makes you different from the other companies that called me this month?”',
      '“Is this one of those free reviews that turns into a sales pitch?”',
      '“I’m not leaving Justia, so you’re wasting your time.”',
    ],
    assessed: ['objection_handling', 'persuasion', 'empathy_clarity', 'advancing'],
    defaults: [4, 4, 1],
    sources: [
      { collection: 'sales-playbook', sections: ['6. ', '2. ', '8. '] },
      { collection: 'omnizant-product', sections: ['The complimentary website review', 'Competitor angles'] },
    ],
  },

  // ------------------------------------------------------------ comp-omnizant-freelancer-cheaper
  {
    slug: 'comp-omnizant-freelancer-cheaper-v2',
    concept: 'comp-omnizant-freelancer-cheaper',
    title: 'Marketing manager has a cheaper freelance SEO quote',
    brand: 'omnizant',
    product: 'omnizant_web',
    subject: 'sales_technique',
    stage: 'competitor',
    roles: ['ae'],
    personas: ['marketing_manager'],
    personaLines: {},
    situation:
      'You presented Omnizant’s website and SEO recommendation to the marketing manager of a 20-attorney employment law firm. She liked it, but she also has a quote from a freelance SEO consultant, and the partners watch her budget closely.',
    buyerLine:
      '“I like your plan, but a freelance SEO consultant quoted me a fraction of your price. The partners will ask why I’d pay an agency more for the same work. What should I tell them?”',
    objective:
      'Help her see whether the two are really the same thing, without attacking the freelancer or defending the price, so she can explain her recommendation to the partners.',
    goodLooksLike: [
      '- Acknowledges the comparison calmly, without criticizing the freelancer or defending the price.',
      '- Questions whether it is the same thing by asking what the partners need the work to produce, such as signed cases from the website, and what the freelancer’s quote covers.',
      '- Lets her name the value, for example by asking why some firms pay more for a provider, rather than listing Omnizant’s strengths.',
      '- Does not invent Omnizant client results, retention figures, prices, deliverables, or guarantees; offers to confirm specifics in writing.',
      '- Offers to help her bring it to the partners, such as a short call that includes the decision maker, and asks for a decision or a dated next step.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“What would I get from you that I wouldn’t get from him?”',
      '“Can you come down on price so I have something to show the partners?”',
      '“If the freelancer doesn’t work out, I can always come to you later, right?”',
    ],
    assessed: ['objection_handling', 'persuasion', 'advancing'],
    defaults: [2, 2, 1],
    sources: [{ collection: 'sales-playbook', sections: ['6. ', '4. ', '3. '] }],
  },
  {
    slug: 'comp-omnizant-freelancer-cheaper-v3',
    concept: 'comp-omnizant-freelancer-cheaper',
    title: 'Partner defends his cheaper, loyal freelancer',
    brand: 'omnizant',
    product: 'omnizant_web',
    subject: 'sales_technique',
    stage: 'competitor',
    roles: ['ae'],
    personas: ['managing_partner'],
    personaLines: {},
    situation:
      'You are presenting Omnizant’s website and SEO recommendation to the managing partner of an eight-attorney real estate law firm. A freelancer has maintained the firm’s site for six years, and the partner is loyal to him.',
    buyerLine:
      '“My freelancer charges a fraction of what you’re asking, and he picks up on a Saturday. Every agency says it does more. Prove this isn’t the same work for a lot more money, or we’re done.”',
    objective:
      'Stay calm, neither defend the price nor attack the freelancer, test whether it is really the same thing, and get a clear decision or a dated next step without unsupported proof.',
    goodLooksLike: [
      '- Acknowledges the loyalty and responsiveness as real value and does not criticize the freelancer.',
      '- Does not defend the price or offer a discount; questions whether it is the same thing by asking what the firm needs the website to produce and how the current site has done on that.',
      '- Lets him name the value rather than reciting Omnizant’s strengths, and keeps the comparison on outcomes he cares about, such as signed matters in the practice he wants to grow.',
      '- Does not invent client results, retention figures, case studies, or guarantees of rankings or leads; offers real proof only once it is confirmed, such as a short screen-share of Omnizant’s work.',
      '- Is willing to say that if the lowest price is the main goal, Omnizant may not be the right fit, then asks directly what he would like to do.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Show me one law firm you’ve done this for and what happened to its cases.”',
      '“He’s been with us six years. I’m not dropping him over a sales pitch.”',
      '“Last chance. Give me one reason that isn’t a sales line.”',
    ],
    assessed: ['objection_handling', 'persuasion', 'empathy_clarity', 'advancing'],
    defaults: [5, 5, 2],
    sources: [{ collection: 'sales-playbook', sections: ['6. ', '4. ', '3. ', '1. '] }],
  },

  // ------------------------------------------------------------ comp-omnizant-in-house-seo
  {
    slug: 'comp-omnizant-in-house-seo-v2',
    concept: 'comp-omnizant-in-house-seo',
    title: 'Office manager runs the website and listing herself',
    brand: 'omnizant',
    product: 'omnizant_web',
    subject: 'sales_technique',
    stage: 'competitor',
    roles: ['ae'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You are on a follow-up call with the office manager of a four-attorney family law firm. Besides running the office, she updates the firm’s website and Google Business Profile herself, and one of the partners suggested she hear from you.',
    buyerLine:
      '“I’ve kept our website and Google listing up myself for years, and we get calls from it. I’m not sure what an agency would add except a bill, and I’d still be the one dealing with you.”',
    objective:
      'Earn her trust as a help rather than a replacement, learn what she cannot get to, and agree on a next step she controls.',
    goodLooksLike: [
      '- Credits what she has built and makes clear the conversation is about what she wants to get done, not about replacing her.',
      '- Asks what the partners judge the website by and whether the calls it brings turn into signed cases she can point to.',
      '- Explores gaps without assuming them, such as her time, technical website work, or how the firm shows up in AI answers (GEO), and lets her name what is not getting done.',
      '- Makes no claims about Omnizant results, timelines, prices, or packages, and does not guarantee rankings, leads, or AI citations.',
      '- Offers a next step she controls, such as the free website review: about 15 minutes, no logins needed, with recommendations she could carry out herself, with another vendor, or with Omnizant, booked for a set date.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Are you looking to take the website over from me?”',
      '“I don’t have time for another vendor meeting. What would I get out of it?”',
      '“If you find problems, the partners will think I dropped the ball. Why would I sign up for that?”',
    ],
    assessed: ['empathy_clarity', 'discovery', 'objection_handling', 'advancing'],
    defaults: [3, 3, 1],
    sources: [
      { collection: 'sales-playbook', sections: ['6. ', '3. ', '1. '] },
      { collection: 'omnizant-product', sections: ['The complimentary website review'] },
    ],
  },
  {
    slug: 'comp-omnizant-in-house-seo-v3',
    concept: 'comp-omnizant-in-house-seo',
    title: 'Partner backs his in-house marketing coordinator',
    brand: 'omnizant',
    product: 'omnizant_web',
    subject: 'sales_technique',
    stage: 'competitor',
    roles: ['ae'],
    personas: ['managing_partner'],
    personaLines: {},
    situation:
      'You are meeting the managing partner of a 12-attorney personal injury firm. A marketing coordinator on staff handles the website and SEO, the firm ranks well for several local searches, and the partner sees no reason to add an agency.',
    buyerLine:
      '“Our coordinator handles SEO, we rank for the searches that matter, and I’m not paying an agency to take credit for her work. Tell me what you’d add that she can’t, and skip the sales talk.”',
    objective:
      'Respect the in-house work and the coordinator, find a gap the partner cares about without inventing one, and earn a next step that includes the coordinator.',
    goodLooksLike: [
      '- Credits the coordinator’s results and frames any outside help as support for her, not a replacement, without describing how an Omnizant engagement would be structured.',
      '- Moves from rankings to what the partner judges the firm by, such as signed cases and the types of cases he wants more of, and asks whether he can see which searches and pages produce them.',
      '- Explores gaps by asking rather than asserting, such as the coordinator’s capacity, technical website work, or how the firm shows up in AI answers (GEO), and lets him say what matters.',
      '- Makes no claims about Omnizant results, timelines, or prices, and does not guarantee rankings, leads, cases, or AI citations.',
      '- Is willing to say an agency may add little if the in-house work already meets his goals.',
      '- Proposes a next step with the coordinator included, such as a free website review on a set date that gives her findings she can act on herself.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“What would you do in the first ninety days, specifically?”',
      '“Can you guarantee we keep the rankings we have now?”',
      '“If you can’t name one thing she’s missing right now, why would I spend another minute on this?”',
    ],
    assessed: ['discovery', 'objection_handling', 'empathy_clarity', 'advancing'],
    defaults: [5, 5, 2],
    sources: [
      { collection: 'sales-playbook', sections: ['6. ', '3. ', '1. '] },
      { collection: 'omnizant-product', sections: ['The complimentary website review'] },
    ],
  },

  // ------------------------------------------------------------ comp-omnizant-diy-website
  {
    slug: 'comp-omnizant-diy-website-v2',
    concept: 'comp-omnizant-diy-website',
    title: 'Office manager built the firm’s site herself',
    brand: 'omnizant',
    product: 'omnizant_web',
    subject: 'sales_technique',
    stage: 'competitor',
    roles: ['ae'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You are cold calling a three-attorney estate planning firm. The receptionist puts you through to the office manager, who built the firm’s website two years ago with a drag-and-drop builder and still keeps it updated.',
    buyerLine:
      '“Actually, I built our website myself on one of those drag-and-drop builders, and the attorneys love it. I don’t think we need an agency, but thanks.”',
    objective:
      'Respect what she built, move the conversation from how the site looks to what it does for the firm, and earn a short review without criticizing her work.',
    goodLooksLike: [
      '- Compliments her work sincerely and does not criticize the site or the tool she used.',
      '- Moves from how the site looks to what it produces: how inquiries arrive, how many become clients, and what kinds of matters the attorneys want more of.',
      '- Offers the free website review as peace of mind for the site she manages: 15 to 20 minutes, no logins or data, mainly informative and not a high-pressure sales call, with recommendations she could carry out herself.',
      '- Makes no promises about rankings, leads, or AI citations, and does not quote prices or packages.',
      '- Books a specific day and time while she is on the phone and confirms her email address for the invite.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Is there a catch? Why would you look at our site for free?”',
      '“Would you need my login to the website builder?”',
      '“The attorneys are happy with it. What would I even tell them this meeting is for?”',
    ],
    assessed: ['empathy_clarity', 'discovery', 'advancing'],
    defaults: [2, 2, 1],
    sources: [
      { collection: 'sales-playbook', sections: ['6. ', '3. ', '5. '] },
      { collection: 'omnizant-product', sections: ['The complimentary website review'] },
    ],
  },
  {
    slug: 'comp-omnizant-diy-website-v3',
    concept: 'comp-omnizant-diy-website',
    title: 'Partner says AI can build a website for free',
    brand: 'omnizant',
    product: 'omnizant_web',
    subject: 'sales_technique',
    stage: 'competitor',
    roles: ['ae'],
    personas: ['managing_partner'],
    personaLines: {},
    situation:
      'You are on a video call with the managing partner of a five-attorney criminal defense firm who agreed to hear about Omnizant. His current site was built on a drag-and-drop builder, and he has started redoing it with an AI website builder.',
    buyerLine:
      '“Why would I pay an agency for a website? With AI I can build a decent one for free in an afternoon, and I’ve already started.”',
    objective:
      'Agree with what is true about AI-built sites, move the conversation to what happens after a visitor lands, and agree on a next step without criticizing his work or overpromising.',
    goodLooksLike: [
      '- Agrees that anyone can now build a good-looking website and does not criticize his site, the builder, or AI tools.',
      '- Moves from building the site to what happens after a visitor lands: how many inquiries it brings, how many become clients, and which kinds of cases he wants more of.',
      '- Asks what prompted him to redo the site now and what he wants it to accomplish in the next year.',
      '- Makes no promises about rankings, leads, cases, or AI citations, and does not quote prices or packages.',
      '- Offers a specific, low-pressure next step, such as a free 15- to 20-minute review of his site and online presence on a set day, noting he may come away with things he can do himself, such as on his Google Business Profile.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“What does an agency do that my AI tool can’t?”',
      '“Ballpark, what would you charge for a site like mine?”',
      '“If my new site gets calls, why would I ever need you?”',
    ],
    assessed: ['discovery', 'empathy_clarity', 'objection_handling', 'advancing'],
    defaults: [4, 4, 1],
    sources: [
      { collection: 'sales-playbook', sections: ['6. ', '3. ', '1. '] },
      { collection: 'omnizant-product', sections: ['The complimentary website review', 'Competitor angles'] },
    ],
  },
];
