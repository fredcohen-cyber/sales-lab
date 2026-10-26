// More versions of this stage's existing concepts: each tests the same skill as the question its
// concept names, with a different buyer, situation, or level.
export const QUESTIONS = [
  // ---------------------------------------------------------------- am-qbr-value
  {
    slug: 'value-am-qbr-value-v2',
    concept: 'am-qbr-value',
    title: 'Intake director must answer whether it’s worth it',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'am_value',
    roles: ['am'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You manage the Ravenly account for an eight-attorney family law firm. The intake director, whose team works every inquiry in Ravenly, has asked for a call before the partners’ meeting next Thursday.',
    buyerLine:
      '“The partners asked me whether Ravenly is worth keeping, and I’m the one who has to answer. I’m not a numbers person. What should I show them?”',
    objective:
      'Help the intake director build a short, accurate answer for the partners from the reports available today, with each measure defined and a plan for what to track next.',
    goodLooksLike: [
      '- Asks what the partners judge the firm by, such as retained matters, revenue, or staff time, and what prompted the question, before choosing reports.',
      '- Points her to reports available today: Insights to orient the partners, then Lead Performance, with qualified, won, and lost leads, won revenue, and a previous-period comparison, plus its Channels and Sources views.',
      '- Defines each measure in plain terms: a lead is an inquiry record, qualified is a defined status, not automatically a consultation or an accepted matter, and won revenue is recorded value, not collected cash.',
      '- Steers her away from report modules marked coming soon, such as Team Performance, Revenue & Pipeline, and Conversion Funnel, so nothing she shows the partners depends on them.',
      '- Keeps the answer short, suggests a few measures the partners can follow every quarter, and offers to review her draft or join the meeting, with a date set before Thursday.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Can I show them how quickly each person on my team responds to new leads?”',
      '“Ravenly writes its own summary in the Lead Performance report. Can I just paste that into my slides?”',
      '“If a partner asks me straight out how many cases we signed because of Ravenly, what do I say?”',
    ],
    assessed: ['product_accuracy', 'discovery', 'empathy_clarity', 'advancing'],
    defaults: [2, 2, 3],
    sources: [{ collection: 'ravenly-product', sections: ['09 · ', '19 · '] }],
  },
  {
    slug: 'value-am-qbr-value-v3',
    concept: 'am-qbr-value',
    title: 'Solo cutting subscriptions asks what Ravenly did',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'am_value',
    roles: ['am'],
    personas: ['solo_attorney'],
    personaLines: {},
    situation:
      'You manage a Ravenly Launch account for a solo immigration attorney who works without staff and gets about a dozen website inquiries a month. He booked 20 minutes with you after going through his business expenses.',
    buyerLine: '“I’m going through every subscription I pay for, and Ravenly is next on the list. What has it actually done for me?”',
    objective:
      'Show a low-volume solo what his own Ravenly data says, define what it means, keep the economics plausible, and agree on what to track before he decides.',
    goodLooksLike: [
      '- Asks what he wanted Ravenly to fix when he started, such as missed after-hours inquiries or time spent sorting them, and what would make it worth keeping.',
      '- Walks him through his own numbers in Lead Performance, such as inquiries received, how many were qualified, won, or lost, and recorded won revenue against the previous period, in plain terms, without presenting coming-soon modules such as Revenue & Pipeline as live.',
      '- Keeps the economics plausible for his volume: works from his own numbers, such as what one retained matter is worth to him against what he pays, instead of projecting large revenue gains.',
      '- Separates what Ravenly recorded from what it caused, and does not present the public calculator’s figures as his results.',
      '- Ends with a decision or a dated review against two or three measures he chooses.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Most of my clients call me or come through referrals. Does any of that even show up in Ravenly?”',
      '“The won revenue on my dashboard is just whatever I typed in when I closed a case, right? How is that proof of anything?”',
      '“Straight answer: if I went back to a plain contact form tomorrow, what would I actually lose?”',
    ],
    assessed: ['product_accuracy', 'discovery', 'objection_handling', 'advancing'],
    defaults: [4, 4, 4],
    sources: [{ collection: 'ravenly-product', sections: ['09 · ', '19 · ', '03 · ', '06 · ', '02 · '] }],
  },

  // ---------------------------------------------------------------- value-llm-referrals-ai-visibility
  {
    slug: 'value-llm-referrals-ai-visibility-v2',
    concept: 'value-llm-referrals-ai-visibility',
    title: 'Partner asks how many clients ChatGPT sends',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'am_value',
    roles: ['am'],
    personas: ['managing_partner'],
    personaLines: {},
    situation:
      'You are holding a quarterly review with the managing partner of a 12-attorney estate planning firm on Ravenly. The partners are weighing whether to spend on AI search marketing, and the managing partner has the LLM referrals report open.',
    buyerLine:
      '“Before I spend a dime on AI search, I want to know how many clients ChatGPT sends us today. Your report tells me that, doesn’t it?”',
    objective:
      'Show what the LLM referral report can tell the managing partner about AI-referred inquiries and retained matters, be clear about what it cannot, and help him set a measure he can use before and after any AI search spend.',
    goodLooksLike: [
      '- Asks what decision he is weighing and what result would justify the spend before walking through figures.',
      '- Answers with what the report can show: inquiries referred by AI assistants such as ChatGPT, by platform, and how many were qualified, high priority, or retained, with their rates, recorded value, and landing pages.',
      '- Is clear that it counts referrals, not influence or visibility: it misses AI-influenced visits that arrive another way, does not measure how often AI tools mention or recommend the firm or what people typed, and can be affected by unknown or stripped referral data.',
      '- Treats retained counts and value as recorded outcomes that depend on the firm’s stages and value entries, not collected fees.',
      '- Suggests recording today’s figures, with their dates and limits, as a baseline to compare against after any AI search spend, and agrees on a dated follow-up.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Only a handful of inquiries came from ChatGPT. Doesn’t that prove AI search is a waste of money?”',
      '“Our IT consultant says Perplexity and Copilot matter as much as ChatGPT. Does your report pick those up?”',
      '“If we do spend on AI search, how will I know from your reports whether it worked?”',
    ],
    assessed: ['product_accuracy', 'discovery', 'advancing'],
    defaults: [3, 3, 4],
    sources: [{ collection: 'ravenly-product', sections: ['09 · ', '19 · '] }],
  },
  {
    slug: 'value-llm-referrals-ai-visibility-v3',
    concept: 'value-llm-referrals-ai-visibility',
    title: 'Client found via ChatGPT is missing from the report',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'am_value',
    roles: ['am'],
    personas: ['solo_attorney'],
    personaLines: {},
    situation:
      'A solo bankruptcy attorney on Ravenly calls you between hearings. A new client told him she found the firm by asking ChatGPT, but he cannot find her in the LLM referrals report.',
    buyerLine: '“My new client swears ChatGPT sent her to me, but she’s not in your AI report. Is the report broken, or am I reading it wrong?”',
    objective:
      'Explain what the LLM referral report counts, why a client who used ChatGPT can be missing from it, and how to check this client’s record, without promising complete AI attribution.',
    goodLooksLike: [
      '- Explains that the report counts inquiries whose visit came with an AI assistant referral, which is not every visit an AI tool influenced.',
      '- Gives plain reasons the client can be missing without the report being broken: after using ChatGPT she may have reached the firm another way, such as a search, typing the web address, or a phone call, and referral data can be unknown, stripped, or missing.',
      '- Offers to look at the client’s lead record, if there is one, where the Attribution tab shows her landing page, referrer, and source, channel, and medium.',
      '- Does not promise a setting that makes every AI-influenced client appear, and does not claim the report shows what people typed into ChatGPT.',
      '- Suggests noting how each new client says they found the firm, to read alongside the referral data, and agrees on a time to look at it together.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Lots of my clients say they asked ChatGPT first. Could your report be missing most of them?”',
      '“Can you change something so ChatGPT visits always get labeled correctly?”',
      '“What’s the point of an AI report if it can’t tell me where my clients really came from?”',
    ],
    assessed: ['product_accuracy', 'empathy_clarity', 'advancing'],
    defaults: [2, 2, 4],
    sources: [{ collection: 'ravenly-product', sections: ['09 · ', '06 · '] }],
  },

  // ---------------------------------------------------------------- value-new-partner-doubts-spend
  {
    slug: 'value-new-partner-doubts-spend-v2',
    concept: 'value-new-partner-doubts-spend',
    title: 'New office manager inherits Ravenly in a vendor cut',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'am_value',
    roles: ['am'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You manage the Ravenly account for a nine-attorney personal injury firm. Its new office manager, who started last month, has been asked by the partners to reduce vendor costs and has booked a call with you.',
    buyerLine:
      '“I inherited eleven vendors and orders to cut three. Ravenly is on my list, and all my predecessor left me is a note that says ‘intake software.’ What does it actually do for us?”',
    objective:
      'Learn how the new office manager will judge her vendors, show what Ravenly does in her team’s daily work and what the firm’s own data shows, and earn a fair evaluation with the partners instead of defending the original purchase.',
    goodLooksLike: [
      '- Does not recite the original pitch or argue from why the firm first bought Ravenly; asks what the partners expect from the cuts and how she will judge each vendor.',
      '- Asks how her intake team handles a new inquiry today and where Ravenly fits in that work, so the answer reflects how the firm actually uses it.',
      '- Explains plainly what Ravenly is for: capturing website inquiries through chat, webforms, and case evaluations, organizing follow-up with owners, stages, and tasks, and connecting sources to retained matters and recorded value.',
      '- Gives her figures she can put in a vendor review, from the firm’s own reports, such as Lead Performance totals, qualified, won, and lost leads, and won revenue against the previous period, and is clear that they show what Ravenly recorded, not what it caused.',
      '- Since she recommends and the partners decide, proposes a short evaluation against an agreed baseline and a dated review with the partner who approves vendor spending.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“My intake team says they mostly work from the email alerts. Do we even need the rest of it?”',
      '“The partners want numbers, not features. What goes in my vendor review?”',
      '“Two other vendors on my list say they do something like this too. Why shouldn’t Ravenly be the one I cut?”',
    ],
    assessed: ['discovery', 'product_accuracy', 'objection_handling', 'advancing'],
    defaults: [3, 3, 3],
    sources: [
      { collection: 'ravenly-product', sections: ['02 · ', '06 · ', '09 · ', '19 · '] },
      { collection: 'sales-playbook', sections: ['3. '] },
    ],
  },
  {
    slug: 'value-new-partner-doubts-spend-v3',
    concept: 'value-new-partner-doubts-spend',
    title: 'New marketing manager calls Ravenly redundant',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'am_value',
    roles: ['am'],
    personas: ['marketing_manager'],
    personaLines: {},
    situation:
      'You manage the Ravenly account for a 30-attorney family law firm. Its new marketing manager, six weeks into the job, is consolidating the firm’s marketing and intake tools and has given you a 20-minute video call.',
    buyerLine:
      '“My predecessor bought Ravenly. From where I sit, Google Analytics and our case management system already cover this. Give me one reason it isn’t redundant.”',
    objective:
      'Find out what the new marketing manager must report and decide, explain where Ravenly sits beside her other tools without claiming they fall short, show what the firm’s own data connects, and agree on a fair test before she cuts it.',
    goodLooksLike: [
      '- Asks what she must report to the partners and which questions her current tools leave unanswered, rather than defending the purchase.',
      '- Positions Ravenly alongside the firm’s analytics and case management system as the capture and intake layer, and does not claim those tools fall short without knowing how the firm uses them.',
      '- Shows what the firm’s own Ravenly data connects: each inquiry’s source, channel, and landing page to qualification, retained outcomes, and recorded value, in Lead Performance and the paid, organic, and LLM referral views.',
      '- Is precise about limits: won revenue is recorded value, not collected cash; LLM figures are referral attribution, not AI visibility; and a Google Analytics 4 connection, which Ravenly lists for server-side lead, deal, and call events, would need configuring and confirming for her account.',
      '- Proposes a short test of one question she must answer, such as which sources produce retained matters, with a dated review.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Our case management system has its own intake forms. Why would I pay for two?”',
      '“Does Ravenly send leads into our case management system, or does my team retype them?”',
      '“I’ve sat through a dozen vendor pitches this month. What would it take for you to agree Ravenly should go?”',
    ],
    assessed: ['discovery', 'product_accuracy', 'persuasion', 'advancing'],
    defaults: [4, 4, 4],
    sources: [
      { collection: 'ravenly-product', sections: ['02 · ', '09 · ', '10 · ', '18 · '] },
      { collection: 'sales-playbook', sections: ['1. '] },
    ],
  },

  // ---------------------------------------------------------------- value-fourth-practice-area-launch
  {
    slug: 'value-fourth-practice-area-launch-v2',
    concept: 'value-fourth-practice-area-launch',
    title: 'Office manager asks to add a practice and a login',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'am_value',
    roles: ['am'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You manage a Ravenly Launch account for a three-attorney firm with custom flows for family law, estate planning, and real estate. Two people use Ravenly: the office manager and one partner. The office manager emails that the firm has hired an associate who will take bankruptcy cases.',
    buyerLine:
      '“Good news, we hired an associate for bankruptcy! Can you add a bankruptcy flow to our chat and give her a login? The partners will ask me what it costs, so I need to know if anything changes.”',
    objective:
      'Learn what the new practice needs, explain the published scope for practice areas and users accurately, and recommend one way forward the office manager can take to the partners, without inventing upgrade terms.',
    goodLooksLike: [
      '- Before answering, asks what she knows about the new practice: how many bankruptcy inquiries the firm expects, what the associate wants to know before a first call, and whether the associate will work those inquiries herself.',
      '- States the published scope accurately: Launch lists three practice areas for custom bot and form flows and two users, and the firm is using all of both; Ascend lists five practice areas and five users.',
      '- Offers to confirm whether a practice area or a user can be added to Launch and how it would be priced, and how a plan change works mid-term, rather than inventing add-on terms.',
      '- If moving to Ascend comes up, gives her the published rates to brief the partners: $199 a month on yearly billing or $229 monthly, against $99 or $119 for Launch, with the actual terms confirmed in a quote.',
      '- Points out that bankruptcy is among the practice-area templates on Ravenly’s public trial page, which could give the associate a head start, subject to confirming it for this account and her review of the questions.',
      '- Recommends one option and agrees on a dated next step, such as a short call with the partner who approves spending.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Does the bankruptcy flow have to be built from scratch, or is there a ready-made one we can switch on?”',
      '“What happens if the bankruptcy inquiries push us over our monthly lead limit?”',
      '“The partners will balk at a bigger bill for one associate. What do I tell them?”',
    ],
    assessed: ['discovery', 'product_accuracy', 'persuasion', 'advancing'],
    defaults: [2, 2, 4],
    sources: [
      { collection: 'ravenly-product', sections: ['12 · ', '04 · ', '19 · '] },
      { collection: 'sales-playbook', sections: ['4. '] },
    ],
  },
  {
    slug: 'value-fourth-practice-area-launch-v3',
    concept: 'value-fourth-practice-area-launch',
    title: 'Managing partner demands a sixth practice area',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'am_value',
    roles: ['am'],
    personas: ['managing_partner'],
    personaLines: {},
    situation:
      'You manage a Ravenly Ascend account for an 18-attorney firm with custom flows for its five practice areas: personal injury, workers’ compensation, Social Security disability, family law, and criminal defense. The managing partner calls to say the firm launches an employment law group next month.',
    buyerLine:
      '“We’re adding employment law, and I want it in the chat on day one. Don’t tell me I need some custom-quote plan for one more flow. Turn it on, or I’ll find a vendor who will.”',
    objective:
      'Learn what the new group needs, explain the published scope honestly under pressure, and recommend one way forward without inventing an exception, add-on terms, or a Summit price.',
    goodLooksLike: [
      '- Stays calm and asks about the new group before debating plans: how many employment inquiries it expects each month, what its attorneys must know before a first call, and who on the intake team will handle them.',
      '- States the published scope accurately: Ascend lists five practice areas, all in use, and Summit, a custom-quote plan, lists flexible practice areas, users, and volume.',
      '- Does not promise an exception or invent terms: offers to confirm by a set date whether one more practice area can be added to Ascend and how it would be priced, and gives no Summit price or range.',
      '- Raises the lead allowance: the new group may push the firm past Ascend’s 50 monthly leads, and what happens at the allowance must be confirmed rather than guessed.',
      '- Notes that employment appears among the templates on Ravenly’s public trial page, so the new group may not start from a blank flow, while making clear that its use on this account must be confirmed and the group’s attorneys approve the questions.',
      '- Recommends the one path that fits what the partner described, and asks him for a decision or a dated call once the terms are confirmed.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“We already pay for five practice areas. Why should a sixth cost anything at all?”',
      '“If we move to Summit, does that mean a new contract and a new term?”',
      '“Another vendor says they’ll give us unlimited practice areas for less than we pay you. Match it, or we walk.”',
    ],
    assessed: ['discovery', 'product_accuracy', 'objection_handling', 'advancing'],
    defaults: [5, 4, 4],
    sources: [
      { collection: 'ravenly-product', sections: ['12 · ', '04 · '] },
      { collection: 'sales-playbook', sections: ['4. ', '6. '] },
    ],
  },

  // ---------------------------------------------------------------- value-credit-for-won-revenue
  {
    slug: 'value-credit-for-won-revenue-v2',
    concept: 'value-credit-for-won-revenue',
    title: 'Intake director wants to credit Ravenly in her report',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'am_value',
    roles: ['am'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You are on a quarterly call with the intake director of a seven-attorney criminal defense firm on Ravenly. Her team records every new inquiry in Ravenly, including those that arrive by phone or referral, and the Insights dashboard shows the highest won revenue the firm has recorded.',
    buyerLine:
      '“Best quarter we’ve ever had! I’m writing the operations report for the partners, and I want to say Ravenly brought in that revenue. That’s fair, isn’t it?”',
    objective:
      'Celebrate the result while helping the intake director write a claim the partners will trust: what won revenue measures, which matters came through Ravenly’s capture, and what her team contributed.',
    goodLooksLike: [
      '- Celebrates the quarter with her, then explains that won revenue adds up the values her team recorded on matters marked won, so it is not collected cash.',
      '- Points out that the total includes matters her team entered from phone calls and referrals, so it cannot all be credited to Ravenly’s website capture; offers to separate them with the channel and source views and to confirm how staff-entered leads are counted.',
      '- Gives her team its share of the credit: they responded to and signed these matters, and Ravenly supported that work rather than producing every client.',
      '- Suggests a claim she can stand behind, such as how won matters and won revenue compare with the quarters before Ravenly, without counting the same gain twice across capture, qualification, and conversion.',
      '- Offers to review her draft before it goes to the partners, on a set date.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“What’s the difference between won revenue and what we actually collected? Aren’t they the same thing?”',
      '“How do I show the partners what my team did versus what the software did?”',
      '“One partner already thinks software is a waste of money. If I don’t give Ravenly the credit, he’ll push to cancel it. Now what?”',
    ],
    assessed: ['product_accuracy', 'empathy_clarity', 'advancing'],
    defaults: [2, 2, 4],
    sources: [{ collection: 'ravenly-product', sections: ['09 · ', '19 · ', '06 · '] }],
  },
  {
    slug: 'value-credit-for-won-revenue-v3',
    concept: 'value-credit-for-won-revenue',
    title: 'Partner divides won revenue by the subscription',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'am_value',
    roles: ['am'],
    personas: ['managing_partner'],
    personaLines: {},
    situation:
      'You are holding an annual review with the managing partner of a 22-attorney employment law firm on Ravenly. He is drafting his year-end letter to the other partners with the Insights dashboard open.',
    buyerLine:
      '“Won revenue this year is $3.2 million. Divide that by what we pay you, and it’s an incredible return. That’s going in my letter to the partners. Any reason it shouldn’t?”',
    objective:
      'Help the managing partner make a return claim his partners will trust: explain what won revenue measures, why dividing it by the subscription is not a return on investment, and how to build a figure he can defend.',
    goodLooksLike: [
      '- Acknowledges a strong year, then says plainly what the $3.2 million is: the values the team entered on matters marked won, which depend on their stage and value entries, not cash the firm collected.',
      '- Explains why the division overstates the return: the firm’s marketing and lawyers produced those matters, so only the change against the firm’s results before Ravenly could reflect Ravenly’s contribution.',
      '- Describes a defensible calculation: additional retained matters against the baseline, valued at contribution after variable costs rather than gross revenue, against the total cost, including subscription, implementation, usage, third-party tools, and staff time.',
      '- Notes what else could explain a record year, such as campaign changes, traffic mix, practice mix, or seasonality, and the lag between inquiry and retention, so the letter does not credit Ravenly for them.',
      '- Offers to build the figures with him or his finance lead before the letter goes out, on a set date.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Your own pricing calculator talks about a 108 times return. Why can’t I just quote that?”',
      '“My partners aren’t accountants. Give me one sentence I can actually put in the letter.”',
      '“If I can’t claim a number like that, how do I justify keeping Ravenly at all?”',
    ],
    assessed: ['product_accuracy', 'objection_handling', 'persuasion', 'advancing'],
    defaults: [4, 2, 5],
    sources: [{ collection: 'ravenly-product', sections: ['09 · ', '19 · '] }],
  },

  // ---------------------------------------------------------------- value-pipeline-value-too-high
  {
    slug: 'value-pipeline-value-too-high-v2',
    concept: 'value-pipeline-value-too-high',
    title: 'Intake director defends her team on pipeline value',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'am_value',
    roles: ['am'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You manage the Ravenly account for a 14-attorney personal injury firm whose case types carry estimated values set at onboarding. At this morning’s partners’ meeting, the active pipeline value on the Insights dashboard far exceeded anything the firm has collected, and a partner asked whether intake is sitting on cases. The intake director calls you that afternoon.',
    buyerLine:
      '“The partners think my team is sitting on millions in cases because of your dashboard. My people work every lead. So which is it: is your math wrong, or is your software?”',
    objective:
      'Explain what pipeline value is without blaming the intake team or the software, find out why it reads high, and agree on fixes with owners that the intake director can take back to the partners.',
    goodLooksLike: [
      '- Acknowledges the pressure she is under and does not blame her team, the partners, or the onboarding.',
      '- Explains that pipeline value is a recorded estimate, which can be seeded from each case type’s estimated value, not a prediction of settlements or fees, so a high figure alone does not show that intake is neglecting cases; no probability weighting was established, so offers to confirm whether any applies.',
      '- Asks the questions her team can answer: which stage a lead goes to when it goes nowhere, how often stale leads are closed out, and what the case-type estimates were meant to represent, such as settlement amounts or expected fees.',
      '- Proposes fixes with owners: the partners agree on what the value should mean, the estimates are reviewed, and her team clears stale active leads, using the stage filters and inactive-lead indicators.',
      '- Gives her a plain explanation she can repeat to the partners and sets a dated review of the corrected figures, ideally with a partner present.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Who decided what each case type is worth? I never signed off on those numbers.”',
      '“If I close out every dead lead, won’t the partners just think we lost a ton of cases?”',
      '“The partners meet again Monday. If I walk in saying ‘it’s complicated,’ I look like I’m covering for my team. What exactly do I say?”',
    ],
    assessed: ['product_accuracy', 'discovery', 'empathy_clarity', 'advancing'],
    defaults: [5, 4, 5],
    sources: [{ collection: 'ravenly-product', sections: ['09 · ', '05 · ', '06 · ', '20 · '] }],
  },
  {
    slug: 'value-pipeline-value-too-high-v3',
    concept: 'value-pipeline-value-too-high',
    title: 'Solo asks if pipeline value is what he’ll collect',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'am_value',
    roles: ['am'],
    personas: ['solo_attorney'],
    personaLines: {},
    situation:
      'You are on a check-in call with a solo personal injury attorney on Ravenly. His case types carry the estimated values set during onboarding, and he has just noticed the active pipeline value on the Insights dashboard.',
    buyerLine: '“My dashboard says my pipeline is worth $1.8 million. Is that what I’m going to collect this year? Because that would be amazing.”',
    objective:
      'Explain kindly and accurately what pipeline value represents and what it does not, so the attorney does not plan around it, and agree on whether to adjust the estimates.',
    goodLooksLike: [
      '- Answers kindly and plainly: no, pipeline value is a recorded estimate, which can be built from the estimated value set for each case type, and it does not predict settlements, collected fees, or profit.',
      '- Adds that no probability weighting was established, so the figure is not a forecast of income, and offers to confirm whether any weighting applies.',
      '- For a contingency practice, separates what an estimate may stand for, such as a settlement amount or an expected fee, from cash timing, collection, and case costs.',
      '- Asks what he had in mind when the estimates were set, such as a typical settlement or his likely fee, and whether matters that went nowhere are still sitting in active stages.',
      '- Offers a short session on a set date to review the estimates and stages so the figure means something he can use.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“If it’s not what I’ll collect, what is that number actually good for?”',
      '“Could you just change the estimates to what I actually expect to earn on each case?”',
      '“I was going to use that number to decide whether I can afford to hire an associate. Should I?”',
    ],
    assessed: ['product_accuracy', 'empathy_clarity', 'advancing'],
    defaults: [2, 2, 4],
    sources: [{ collection: 'ravenly-product', sections: ['09 · ', '05 · ', '19 · '] }],
  },

  // ---------------------------------------------------------------- value-abandonment-recovery-texts
  {
    slug: 'value-abandonment-recovery-texts-v2',
    concept: 'value-abandonment-recovery-texts',
    title: 'Intake director wants to call people who quit',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'am_value',
    roles: ['am'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You are reviewing the abandonment analytics report with the intake director of an 11-attorney criminal defense firm on Ravenly. The top drop-off point in the firm’s case evaluation is a case-detail question that comes after visitors enter their contact details.',
    buyerLine:
      '“So they typed in their phone numbers and then quit? My team has time this afternoon. Pull those numbers for me and we’ll call every one of them.”',
    objective:
      'Explain what the abandonment report shows and does not show, avoid promising contact details or outreach that the product and the firm’s consent settings do not support, and agree on how to investigate the question.',
    goodLooksLike: [
      '- Explains what she is looking at: individual abandonment events with the step and progress where each visitor stopped, which show where people leave but not why.',
      '- Does not promise that names, phone numbers, or partial entries from abandoned sessions are available or saved as leads; offers to confirm what each abandonment event records.',
      '- Raises consent before any outreach: contact depends on the consent a visitor gave, the firm approves its own consent language and channel settings, and calling and texting are regulated, so the firm’s counsel should decide.',
      '- Does not offer Ravenly texts or calls to these visitors as a workaround; abandonment reporting does not establish recovery messages.',
      '- Suggests investigating the question itself, such as its wording, whether it is required, and how much it asks, then comparing drop-off after an approved change.',
      '- Agrees on a dated working session to review the question with her.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“If they gave us their number, doesn’t that mean they want a call?”',
      '“Which question is it, exactly? I bet it asks about their charges in too much detail.”',
      '“My partners measure me on signed cases. If I can’t chase these people, what am I supposed to do about the ones we’re losing?”',
    ],
    assessed: ['product_accuracy', 'objection_handling', 'empathy_clarity', 'advancing'],
    defaults: [4, 3, 4],
    sources: [
      { collection: 'ravenly-product', sections: ['09 · ', '04 · '] },
      { collection: 'sales-playbook', sections: ['2. '] },
    ],
  },
  {
    slug: 'value-abandonment-recovery-texts-v3',
    concept: 'value-abandonment-recovery-texts',
    title: 'Asked to email everyone who quits the case evaluation',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'am_value',
    roles: ['am'],
    personas: ['marketing_manager'],
    personaLines: {},
    situation:
      'The marketing manager of a 28-attorney personal injury firm on Ravenly emails you after reading the abandonment analytics report, which shows many visitors stopping partway through the case evaluation.',
    buyerLine:
      '“Lots of people start the case evaluation and never finish it. Could we set up an automatic email that nudges them to come back?”',
    objective:
      'Explain what the abandonment report and the automation builder do and do not establish, avoid promising recovery emails, and agree on how to investigate where visitors stop.',
    goodLooksLike: [
      '- Explains that the report pinpoints the questions where case-evaluation visitors drop off, and can be filtered by capture method and chatflow, but cannot say why they left.',
      '- Does not promise recovery emails: abandonment reporting does not establish them, and the automation triggers seen in Ravenly are events such as a new lead being created or a stage being set, not an abandoned session; offers to confirm with the product team.',
      '- Notes that any email would depend on the consent each visitor gave, that consent behavior differs across the chat, webform, and case evaluation, and that the firm approves its own consent language and settings.',
      '- Suggests investigating the steps with the most drop-off, such as their wording, required fields, and the evaluation’s length, then comparing drop-off after an approved change.',
      '- Sets a date to go through the case evaluation’s questions together, starting with the step that loses the most visitors.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Online stores send abandoned-cart emails all the time. Why would this be any different?”',
      '“Should we shorten the case evaluation? It feels long to me.”',
      '“The partners will ask what this is costing us. Can the report tell me how many cases walked away?”',
    ],
    assessed: ['product_accuracy', 'empathy_clarity', 'advancing'],
    defaults: [2, 2, 4],
    sources: [{ collection: 'ravenly-product', sections: ['09 · ', '08 · ', '04 · '] }],
  },

  // ---------------------------------------------------------------- value-cut-paid-channel
  {
    slug: 'value-cut-paid-channel-v2',
    concept: 'value-cut-paid-channel',
    title: 'Partner moving the Google Ads budget into LSA',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'am_value',
    roles: ['am'],
    personas: ['managing_partner'],
    personaLines: {},
    situation:
      'You are holding a quarterly review with the managing partner of a 15-attorney personal injury firm on Ravenly, the day before the firm sets next quarter’s ad budget. In the Paid report, the Local Services Ads tab shows a much lower cost per retained lead than the Google Ads tab.',
    buyerLine:
      '“Local Services gets us signed cases for a fraction of what Google Ads costs. I’m moving the entire Google Ads budget over tomorrow, and I don’t need a lecture on data. Yes or no: does your report back me up?”',
    objective:
      'Help the managing partner make a sound budget decision from the Paid report: check the inputs and definitions behind the comparison before endorsing it, without blocking a reasonable conclusion.',
    goodLooksLike: [
      '- Gives a direct answer, neither rubber-stamping nor dismissing the conclusion, and keeps the explanation short.',
      '- Checks how each tab gets its data: whether the Local Services integration is set up and importing this firm’s leads, how spend reaches each tab, and how the Google Ads account and conversions are connected.',
      '- Explains that the Local Services advantage is only as solid as what feeds it: the spend recorded for each tab, which leads each channel was credited with, and the outcomes the team recorded; ROAS, if it comes up, is not profit.',
      '- Asks how many retained matters sit behind each figure and over what dates, and whether recent Google Ads leads may still be open given the lag between inquiry and retention.',
      '- Offers a way to act on the finding while testing it, such as moving part of the budget and comparing results over an agreed period, plus a specific check before tomorrow.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Everyone I talk to says Local Services is cheaper. Isn’t that enough?”',
      '“Most of our Local Services leads are phone calls. Does your report even count those?”',
      '“If I hold back and Local Services really is cheaper, I’ve wasted a quarter of ad money. Who pays for that?”',
    ],
    assessed: ['product_accuracy', 'discovery', 'objection_handling', 'advancing'],
    defaults: [5, 4, 5],
    sources: [{ collection: 'ravenly-product', sections: ['09 · ', '08 · ', '10 · ', '19 · '] }],
  },
  {
    slug: 'value-cut-paid-channel-v3',
    concept: 'value-cut-paid-channel',
    title: 'Solo wants to stop Google Ads after three months',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'am_value',
    roles: ['am'],
    personas: ['solo_attorney'],
    personaLines: {},
    situation:
      'You are on a quarterly call with a solo DUI defense attorney on Ravenly who spends about $1,500 a month on Google Ads. The Google Ads tab of the Paid report shows one retained lead from the last three months.',
    buyerLine:
      '“Forty-five hundred dollars on Google Ads for one client? I’m done. Unless your report is missing something, I’m turning it off this week.”',
    objective:
      'Help the attorney decide about Google Ads from the Paid report: check what the figures rest on, especially the small sample, before backing or questioning his decision.',
    goodLooksLike: [
      '- Treats his frustration as fair, without talking him out of the decision or simply agreeing with it.',
      '- Points out how small the sample is: one retained matter in three months, with a lag between inquiry and retention, so a single case more or less changes the picture.',
      '- Checks the inputs: whether the Google Ads spend in Ravenly matches his ad account, and how many leads from the period have unknown or missing sources or are still in open stages.',
      '- Explains in plain terms that his cost per retained lead depends on the spend recorded in Ravenly, which leads were attributed to Google Ads, and which ones his own stages mark as retained.',
      '- Agrees on a specific next step, such as reviewing the Google Ads leads and their stages together before he turns the ads off.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Can’t your report just tell me which keywords are wasting my money?”',
      '“Half my DUI clients just call the office. Does Ravenly even see those?”',
      '“If you were me, would you turn it off or not?”',
    ],
    assessed: ['product_accuracy', 'discovery', 'empathy_clarity', 'advancing'],
    defaults: [3, 3, 4],
    sources: [{ collection: 'ravenly-product', sections: ['09 · ', '06 · ', '10 · ', '19 · '] }],
  },

  // ---------------------------------------------------------------- value-second-office-website
  {
    slug: 'value-second-office-website-v2',
    concept: 'value-second-office-website',
    title: 'Office manager setting up intake for a second office',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'am_value',
    roles: ['am'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You manage a Ravenly Ascend account for a nine-attorney family law firm. The office manager, who will run intake for both locations, emails that the firm opens a second office in two months, and a different web company is building that office its own website on Wix.',
    buyerLine:
      '“Can Ravenly go on the new office’s website, and can its inquiries go straight to the two staff we’re hiring there? Tell me what you need from me and I’ll make it happen.”',
    objective:
      'Scope the expansion accurately with the person who will run it, covering plan coverage for a second site, how routing works today, and what installation needs, then agree on next steps.',
    goodLooksLike: [
      '- Asks what only she can answer: who at the web company controls the site and its access, which practice areas the new office will handle, expected volume, and how the two new staff will share the work.',
      '- Is accurate about the plan: the firm’s Ascend plan lists one website, while Summit, a custom-quote plan, lists multiple sites, so the options for a second site are confirmed before anything is quoted.',
      '- Tells her plainly what routing can do today: teams can be linked to case types, with a default team catching the rest, but sending inquiries by office or location was not verified, so it needs confirming and a test before opening day.',
      '- Covers the website side: Ravenly describes its snippet as working on sites such as Wix, the web company will need to provide access, and the product or web team must check the generated embed code before it goes live.',
      '- Gives her a short list of what to gather and agrees on a dated scoping call that includes the web company.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“The two new hires will need logins too. Does that change anything?”',
      '“Can we test it before opening day, so nothing lands with the wrong person?”',
      '“The partners want the new office’s numbers reported separately from ours. Can you do that?”',
    ],
    assessed: ['discovery', 'product_accuracy', 'advancing'],
    defaults: [3, 2, 4],
    sources: [{ collection: 'ravenly-product', sections: ['12 · ', '05 · ', '10 · ', '20 · ', '09 · '] }],
  },
  {
    slug: 'value-second-office-website-v3',
    concept: 'value-second-office-website',
    title: 'Marketing manager scoping a second office’s website',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'am_value',
    roles: ['am'],
    personas: ['marketing_manager'],
    personaLines: {},
    situation:
      'You manage a Ravenly Ascend account for a 45-attorney personal injury firm. The marketing manager is launching a separately branded website for the firm’s new office in another state in six weeks, and sends you her requirements before your call.',
    buyerLine:
      '“Three requirements for the new office: Ravenly live on its site at launch, every inquiry routed to that office’s intake team, and its leads, spend, and retained cases reported separately for the partners. Which of those can you commit to today?”',
    objective:
      'Answer each requirement precisely, covering what the published plans include for a second site, what routing and reporting were and were not established, and what installation needs, then agree on a scoping plan that fits the launch date.',
    goodLooksLike: [
      '- Answers each requirement directly instead of giving a general yes.',
      '- Plan coverage: the firm’s Ascend plan lists one website and Summit, quoted individually, lists multiple sites; confirms the options and gives no Summit price.',
      '- Routing to the new office’s intake team: teams tied to case types, with a default fallback team, were observed, but routing by office or location was not verified; commits only to confirming it and testing it before launch.',
      '- Reporting: Lead Performance filters by date, practice area, attorney, and channel, and the channel views show landing pages, but separate reporting by website or office was not established; offers to confirm it rather than promising it.',
      '- Installation: the launch date depends on getting access from whoever owns the new site and on the product or web team verifying the generated embed code first.',
      '- Proposes a scoping call this week with whoever builds the new site, and a test plan before launch.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Could we tag the new site’s traffic with its own UTM codes and split the reports that way?”',
      '“If Summit is the only way to cover two sites, I need a number by Friday for the budget.”',
      '“The partners have already announced the launch date. If Ravenly isn’t ready, we launch with a plain contact form. Is that what you want?”',
    ],
    assessed: ['product_accuracy', 'discovery', 'objection_handling', 'advancing'],
    defaults: [5, 4, 5],
    sources: [{ collection: 'ravenly-product', sections: ['12 · ', '05 · ', '09 · ', '10 · ', '20 · '] }],
  },

  // ---------------------------------------------------------------- value-omnizant-site-no-new-calls
  {
    slug: 'value-omnizant-site-no-new-calls-v2',
    concept: 'value-omnizant-site-no-new-calls',
    title: 'Office manager asked why calls didn’t go up',
    brand: 'omnizant',
    product: 'omnizant_web',
    subject: 'sales_technique',
    stage: 'am_value',
    roles: ['am'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'Omnizant rebuilt the website of a five-attorney criminal defense firm, and the office manager ran the project from the firm’s side. The new site launched two months ago, and she calls you ahead of the partners’ meeting on Friday.',
    buyerLine:
      '“The partners love how the site looks, but they’re asking me why the phones aren’t any busier. I pushed for this project. What am I supposed to tell them?”',
    objective:
      'Help the office manager give the partners an honest account: find out what the firm measures and expected, avoid promising results, and agree on a next step she can bring to the meeting.',
    goodLooksLike: [
      '- Acknowledges her position as the person who championed the project, without defending it or blaming the firm.',
      '- Asks what the firm tracks today, such as calls, form inquiries, and consultations, how her team records where new clients found the firm, and what the partners expected by now.',
      '- Says honestly that a new website alone does not guarantee more calls or cases, does not invent timelines, benchmarks, or results, and offers to confirm specifics before she repeats them.',
      '- Does not use the moment to pitch another service; asks whether she wants ideas before offering any, and ties them to what the partners asked.',
      '- Offers something concrete for Friday, such as reviewing the site’s inquiries with her before the meeting or joining a short call with the partners, on a set date.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“How long does it usually take before a new site brings in more calls?”',
      '“One of the partners says we should have kept the old site. How do I answer that?”',
      '“If I tell the partners we need to wait and see, I look like I wasted their money. Give me something better.”',
    ],
    assessed: ['discovery', 'empathy_clarity', 'advancing'],
    defaults: [3, 3, 1],
    sources: [{ collection: 'sales-playbook', sections: ['3. ', '6. ', '1. ', '5. '] }],
  },
  {
    slug: 'value-omnizant-site-no-new-calls-v3',
    concept: 'value-omnizant-site-no-new-calls',
    title: 'Partner says inquiries dropped since the new site',
    brand: 'omnizant',
    product: 'omnizant_web',
    subject: 'sales_technique',
    stage: 'am_value',
    roles: ['am'],
    personas: ['managing_partner'],
    personaLines: {},
    situation:
      'Omnizant rebuilt the website of a 10-attorney personal injury firm three months ago. On your scheduled review call, the managing partner says his office manager reports fewer web inquiries since launch.',
    buyerLine:
      '“We paid for a new website to get more clients, and my office manager tells me web inquiries are down since it launched. Explain that.”',
    objective:
      'Respond to a worrying report without defending the project or guessing at causes: find out what is being counted and compared, be honest about what is known, and agree on a dated review of the facts.',
    goodLooksLike: [
      '- Takes the concern seriously, and does not defend the project, blame the firm, or guess at a cause before seeing the numbers.',
      '- Asks how inquiries are counted, over which dates, through which channels, and what they are compared with, such as the same months last year.',
      '- Says honestly what is not yet known, does not invent timelines, benchmarks, or results, and offers to confirm specifics with the right people at Omnizant.',
      '- Does not answer a drop in inquiries with a pitch for more services; suggests changes only once the facts are clear, and with his agreement.',
      '- Proposes a specific next step: a review of the inquiry data with the office manager on a set date, with the managing partner invited.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Did something break when you moved us over to the new site?”',
      '“Every week this goes unfixed costs me cases. What happens this week, not next month?”',
      '“My old provider never had this problem. Should I be calling them about going back?”',
    ],
    assessed: ['discovery', 'empathy_clarity', 'objection_handling', 'advancing'],
    defaults: [4, 4, 1],
    sources: [{ collection: 'sales-playbook', sections: ['3. ', '6. ', '1. '] }],
  },

  // ---------------------------------------------------------------- value-omnizant-geo-add-on
  {
    slug: 'value-omnizant-geo-add-on-v2',
    concept: 'value-omnizant-geo-add-on',
    title: 'Solo client asks whether he needs AI search',
    brand: 'omnizant',
    product: 'omnizant_ai_search',
    subject: 'sales_technique',
    stage: 'am_value',
    roles: ['am'],
    personas: ['solo_attorney'],
    personaLines: {},
    situation:
      'Omnizant manages the website and SEO of a solo family law attorney. At the end of your regular call, the attorney brings up something his daughter told him.',
    buyerLine: '“My daughter says nobody Googles lawyers anymore, they just ask ChatGPT. Do I need your AI search thing now?”',
    objective:
      'Ask before proposing: learn what prompted the question and what the attorney wants, explain AI search plainly without promising AI recommendations or dismissing SEO, and agree on a next step.',
    goodLooksLike: [
      '- Asks what prompted the question and what he would want from it, such as more of a particular kind of case, before recommending anything.',
      '- Does not say SEO has stopped mattering: explains that search fundamentals support AI search work, and that Omnizant’s AI Search Plans aim to strengthen the firm’s presence where people use AI to research legal needs and evaluate attorneys.',
      '- Says plainly that each AI platform decides its own answers, so Omnizant cannot guarantee ChatGPT will recommend him.',
      '- Does not invent prices, packages, deliverables, or results for the plans, and offers to confirm specifics.',
      '- Proposes a specific next step, such as a short call on a set date to look at his goals and whether a plan fits.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“So is Google dead or not? Should I stop paying for SEO?”',
      '“How would I even know if people are finding me through ChatGPT?”',
      '“I’m a one-man shop. Is this really for someone my size, or would I be wasting money?”',
    ],
    assessed: ['discovery', 'empathy_clarity', 'advancing'],
    defaults: [2, 2, 2],
    sources: [
      { collection: 'sales-playbook', sections: ['3. '] },
      { collection: 'omnizant-ai-search', sections: ['Messaging guidance', 'The story we tell', 'How we earn confidence'] },
    ],
  },
  {
    slug: 'value-omnizant-geo-add-on-v3',
    concept: 'value-omnizant-geo-add-on',
    title: 'Partner says another agency guarantees ChatGPT',
    brand: 'omnizant',
    product: 'omnizant_ai_search',
    subject: 'sales_technique',
    stage: 'am_value',
    roles: ['am'],
    personas: ['managing_partner'],
    personaLines: {},
    situation:
      'Omnizant handles SEO for a 15-attorney personal injury firm. The managing partner calls you the day after another agency pitched the firm on AI search.',
    buyerLine:
      '“An agency pitched us yesterday and guaranteed we’ll be recommended by ChatGPT within 90 days. Can you guarantee that, yes or no? If not, why shouldn’t they get the budget?”',
    objective:
      'Answer the guarantee honestly without criticizing the other agency, learn what the partner actually wants from AI search, and keep the decision on results the firm can measure.',
    goodLooksLike: [
      '- Answers directly: no, because each AI platform determines its own answers, so Omnizant cannot guarantee a recommendation; does not hedge or match the promise.',
      '- Does not criticize the other agency; asks what exactly its guarantee covers, such as which questions and platforms, and how it would be measured.',
      '- Asks what the partner wants AI search to produce for the firm, such as more signed cases of a particular type, before recommending anything.',
      '- Explains how Omnizant would judge the work: a baseline and changes within a tracked set of prompts and platforms, connected to lead sources, inquiries, and retained clients where the firm records them, without treating a mention as a client.',
      '- Does not invent prices, deliverables, timelines, or results, offers to confirm specifics, and proposes a dated meeting with the decision makers.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“If you can’t guarantee it, what exactly would I be paying you for?”',
      '“We already pay you for SEO. Isn’t this just more SEO with a new label?”',
      '“My partners like guarantees. Give me one thing you will commit to in writing.”',
    ],
    assessed: ['discovery', 'objection_handling', 'persuasion', 'advancing'],
    defaults: [5, 5, 2],
    sources: [
      { collection: 'sales-playbook', sections: ['6. ', '3. '] },
      { collection: 'omnizant-ai-search', sections: ['Messaging guidance', 'How we earn confidence', 'How the plans fit'] },
    ],
  },

  // ---------------------------------------------------------------- value-omnizant-charts-not-cases
  {
    slug: 'value-omnizant-charts-not-cases-v2',
    concept: 'value-omnizant-charts-not-cases',
    title: 'Office manager can’t turn SEO reports into answers',
    brand: 'omnizant',
    product: 'omnizant_web',
    subject: 'sales_technique',
    stage: 'am_value',
    roles: ['am'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'Omnizant provides SEO for a seven-attorney estate planning firm. The office manager, who handles the firm’s vendors, forwards your SEO reports to the partners and calls you with a question.',
    buyerLine:
      '“I forward your reports to the partners, and now they’re asking me what it all means for new clients. Honestly, I don’t know what to tell them. Can you help?”',
    objective:
      'Help the office manager answer the partners in their terms: explain progress honestly, connect the work to the firm’s own intake data, and agree on a simpler way to report from now on.',
    goodLooksLike: [
      '- Thanks her for asking and answers in plain language instead of walking through every chart.',
      '- Gives her words she can use with the partners: which parts of the reports describe activity, how that differs from new clients, and what is known so far and what is not.',
      '- Asks how her intake team records where new clients come from, so the firm’s own data can show whether the work is bringing in clients.',
      '- Gives her nothing unchecked to repeat: no promised rankings, leads, or cases, no invented results, and an offer to confirm what the reporting can and cannot show.',
      '- Proposes a short summary she can pass on, built on a few measures the partners choose, and a dated call to set it up.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Could you just write the partners a plain-English summary I can forward?”',
      '“The partners keep asking whether we’re getting more of the cases we actually want. Can your reports show that?”',
      '“One partner says if I can’t explain it, we should stop paying for it. What do I say to him?”',
    ],
    assessed: ['discovery', 'empathy_clarity', 'advancing'],
    defaults: [2, 2, 1],
    sources: [{ collection: 'sales-playbook', sections: ['3. ', '8. ', '5. '] }],
  },
  {
    slug: 'value-omnizant-charts-not-cases-v3',
    concept: 'value-omnizant-charts-not-cases',
    title: 'Solo sees upbeat SEO reports but no more clients',
    brand: 'omnizant',
    product: 'omnizant_web',
    subject: 'sales_technique',
    stage: 'am_value',
    roles: ['am'],
    personas: ['solo_attorney'],
    personaLines: {},
    situation:
      'Omnizant has provided SEO for a solo employment attorney for eight months. In your quarterly review, the attorney says the reports look positive but his caseload has not changed.',
    buyerLine: '“Every report you send says things are getting better. My caseload says otherwise. What exactly am I paying for?”',
    objective: 'Explain progress honestly in the attorney’s terms, connect the work to his own client data, and agree on what to review from now on.',
    goodLooksLike: [
      '- Acknowledges the gap between the reports and his caseload directly, without defending the work.',
      '- Explains in plain terms the difference between the activity the reports describe and the outcome he cares about, new clients in the cases he wants, and is honest about what is not yet known.',
      '- Asks how new clients reach him, how he records where they came from, and which kinds of cases he wants more of.',
      '- Does not try to win him over with a forecast: no promised rankings, leads, or cases, no invented results or timelines, and an offer to confirm what the reporting can show.',
      '- Agrees with him on two or three measures that matter to a solo practice, such as new consultations and where they came from, and a date to review them together.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“So are the reports wrong, or is the work just not working?”',
      '“I don’t have staff to track where every client comes from. Can’t you do that for me?”',
      '“I’ve given this eight months. How much longer before you admit it isn’t working?”',
    ],
    assessed: ['discovery', 'empathy_clarity', 'objection_handling', 'advancing'],
    defaults: [3, 3, 1],
    sources: [{ collection: 'sales-playbook', sections: ['3. ', '6. ', '1. '] }],
  },

  // ---------------------------------------------------------------- value-skip-quarterly-review
  {
    slug: 'value-skip-quarterly-review-v2',
    concept: 'value-skip-quarterly-review',
    title: 'Office manager wants to push the review to next year',
    brand: 'both',
    product: 'general',
    subject: 'sales_technique',
    stage: 'am_value',
    roles: ['am'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You ask the office manager of a six-attorney firm, who keeps the partners’ calendars, to book the quarterly review you agreed on at kickoff, and she calls you back the same day. You represent your own company: Omnizant or Ravenly.',
    buyerLine:
      '“The partners are in trial most of next month, and protecting their time is my job. Let’s skip this quarter and pick it up after the new year.”',
    objective:
      'Work with the office manager rather than around her to keep a short, useful review on the calendar, so you learn what has changed at the firm before it becomes a problem.',
    goodLooksLike: [
      '- Respects her role and the partners’ schedule and does not try to go around her.',
      '- Offers a much shorter format, such as 15 minutes, or a first review with her, since she runs the day-to-day work and can cover much of it.',
      '- Gives her one reason the review is worth the partners’ time, tied to the firm’s goals rather than your agenda, so she can justify it to them.',
      '- Asks her one quick question that could surface a change, since she would hear of it first, such as staffing, a new practice area, or how the team is using what you provide.',
      '- Offers two specific times outside the trial and asks which partner should join, instead of “let me know what works.”',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Can you just send me a summary, and I’ll pass it along?”',
      '“What would you even need from the partners that I can’t tell you myself?”',
      '“If I put this on their calendars during trial, they’ll be annoyed with me, not you.”',
    ],
    assessed: ['empathy_clarity', 'persuasion', 'advancing'],
    defaults: [3, 3, 1],
    sources: [{ collection: 'sales-playbook', sections: ['7. ', '5. ', '8. '] }],
  },
  {
    slug: 'value-skip-quarterly-review-v3',
    concept: 'value-skip-quarterly-review',
    title: 'Marketing manager asks to swap the review for email',
    brand: 'both',
    product: 'general',
    subject: 'sales_technique',
    stage: 'am_value',
    roles: ['am'],
    personas: ['marketing_manager'],
    personaLines: {},
    situation:
      'You are wrapping up a short call with the marketing manager of a 20-attorney firm and ask to book the quarterly review you agreed on at kickoff. You represent your own company: Omnizant or Ravenly.',
    buyerLine:
      '“We’re in the middle of a rebrand and I’m underwater. Could you just email me the highlights this quarter instead of meeting?”',
    objective:
      'Respect the marketing manager’s workload while keeping a short, useful review on the calendar, and treat the rebrand as a reason to talk rather than a reason to skip.',
    goodLooksLike: [
      '- Acknowledges the rebrand workload and offers a much shorter format, such as 15 minutes.',
      '- Gives one specific reason the review helps her now, tied to her goals, such as making sure the rebrand does not disrupt what is already working.',
      '- Uses the rebrand to ask one quick question that could surface a change, such as new pages, a new agency, or new goals from the partners.',
      '- Offers to send a short summary before the call so the meeting stays brief, rather than replacing the meeting with an email.',
      '- Offers two specific times while you are both still on the call, and avoids needy or passive phrasing such as “no problem, take your time.”',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“What would we even cover that can’t wait until the rebrand is done?”',
      '“My partners haven’t asked for a review. Why do we need one?”',
      '“Every vendor promises a quick call, and it always turns into an hour. Why would yours be different?”',
    ],
    assessed: ['empathy_clarity', 'persuasion', 'advancing'],
    defaults: [2, 2, 1],
    sources: [{ collection: 'sales-playbook', sections: ['7. ', '8. ', '5. '] }],
  },
];
