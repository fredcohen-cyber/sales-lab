// More versions of this stage's existing concepts: each tests the same skill as the question its
// concept names, with a different buyer, situation, or level.
export const QUESTIONS = [
  // ------------------------------------------------------------ cold-permission-opener
  {
    slug: 'cold-permission-opener-v2',
    concept: 'cold-permission-opener',
    title: 'Office manager screens your cold call',
    brand: 'both',
    product: 'general',
    subject: 'sales_technique',
    stage: 'cold_outreach',
    roles: ['ae'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You are cold calling a nine-attorney personal injury firm you found through its website. The office manager answers the main line; she runs the front desk, the firm’s vendors, and the attorneys’ calendars. You represent your own company: Omnizant or Ravenly.',
    buyerLine: '“Good morning, law office, this is Denise. If this is a sales call, the attorneys don’t take them. What’s it regarding?”',
    objective:
      'Earn about 30 seconds with the person who screens the firm’s calls and runs its vendors: be upfront, give one reason that matters to her, and end with a question instead of a pitch or a push to reach a partner.',
    goodLooksLike: [
      '- Introduces themself and the company in one line and is upfront that it is a sales call, rather than dodging her question or implying an existing relationship.',
      '- Asks for 30 seconds instead of assuming them, and shows respect for her time.',
      '- Treats her as the right person to talk to: does not open by asking for a partner or whether she is the decision-maker, and instead asks about her role, such as whether she handles the firm’s relationship with its website provider.',
      '- Gives one specific reason tied to her work, such as how the firm’s website brings in new cases or how quickly a website inquiry reaches the right person, with no feature pitch.',
      '- Ends with a question that opens a conversation, and avoids needy phrasing such as “sorry to bother you.”',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“I handle our vendors, but anything that costs money goes through our managing partner. Why would he care about this?”',
      '“Can you just email me something? If it looks relevant, I’ll pass it along.”',
      '“The last vendor I put through to our managing partner wasted an hour of his time, and I heard about it for a week. Why would I risk that again?”',
    ],
    assessed: ['persuasion', 'empathy_clarity', 'advancing'],
    defaults: [3, 3, 1],
    sources: [{ collection: 'sales-playbook', sections: ['The playbook on one page', '2. ', '6. ', '8. '] }],
  },
  {
    slug: 'cold-permission-opener-v3',
    concept: 'cold-permission-opener',
    title: 'Solo answers a cold call on her cell while driving',
    brand: 'both',
    product: 'general',
    subject: 'sales_technique',
    stage: 'cold_outreach',
    roles: ['ae'],
    personas: ['solo_attorney'],
    personaLines: {},
    situation:
      'You are cold calling a solo estate planning attorney at the only number on her website, which turns out to be her cell phone. She answers hands-free while driving between client meetings. You represent your own company: Omnizant or Ravenly.',
    buyerLine: '“This is Rachel. I’m driving, and this is my cell. How did you get this number, and what are you selling?”',
    objective:
      'Answer her challenge honestly, earn either 30 seconds now or a specific better time, and if she gives you the time, give one reason that fits a solo practice and end with a question.',
    goodLooksLike: [
      '- Answers “how did you get this number” plainly and briefly (it is the number listed on her website), without sounding defensive.',
      '- Introduces themself and the company in one line and owns that it is a sales call.',
      '- Because she is driving, asks whether she wants 30 seconds now or a specific better time, rather than launching into a pitch.',
      '- If given the time, gives one reason specific to a solo practice, in her terms (new clients signed rather than “revenue”), and ends with a question.',
      '- If she asks not to be called on this number, agrees without arguing and asks how she would prefer to be reached, and avoids needy phrasing such as “sorry to bother you.”',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“I’m a one-woman office. Isn’t whatever you’re selling built for big firms with staff?”',
      '“I’m slammed through the end of the month. Call me in a few weeks.”',
      '“Honestly, I can’t stand cold calls on my personal phone. Why should I give you any of my time?”',
    ],
    assessed: ['persuasion', 'empathy_clarity', 'advancing'],
    defaults: [4, 4, 1],
    sources: [{ collection: 'sales-playbook', sections: ['The playbook on one page', '2. ', '5. ', '8. '] }],
  },

  // ------------------------------------------------------------ ravenly-cold-reason
  {
    slug: 'cold-ravenly-cold-reason-v2',
    concept: 'ravenly-cold-reason',
    title: 'Intake director gives you 30 seconds',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'cold_outreach',
    roles: ['ae'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You are cold calling a 15-attorney Social Security disability firm for Ravenly. The intake director runs a team of four intake specialists who handle inquiries from the firm’s website and ads, and she has agreed to give you 30 seconds.',
    buyerLine: '“Sure, thirty seconds. Fair warning, we’re not short on leads. My team can barely keep up as it is. What do you do?”',
    objective:
      'In about 20 seconds, give a reason to talk that fits the person who runs intake day to day, tied to what happens after an inquiry arrives, and end with one question about her team’s process.',
    goodLooksLike: [
      '- Positions Ravenly around what happens after an inquiry arrives (capture, qualify, respond, manage, measure), not around more leads or “we have a chatbot.”',
      '- Picks the angle that fits an intake director whose team is stretched, such as scattered notifications, uneven qualification, duplicate records, or inconsistent follow-up, and offers more consistent triage and fewer handoffs that rely on memory as the benefit.',
      '- Keeps the claims modest: her team would see the original answers, a priority, and the next action in one place, with no promise of time saved or more signed cases.',
      '- Does not present marketing statistics, such as the share of leads that go unanswered, as facts about her firm.',
      '- Ends with one question about her process, such as who first sees a website inquiry that arrives at 8 p.m. and how that person knows they own it.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“We already use a shared inbox and a spreadsheet. It’s messy, but it works. Why change it?”',
      '“My team is stretched thin as it is. Who would set this up and train them?”',
      '“If I bring this to the managing partner and it turns into one more system my team ignores, that’s on me. What makes you so sure it won’t?”',
    ],
    assessed: ['product_accuracy', 'persuasion', 'advancing'],
    defaults: [2, 2, 2],
    sources: [
      { collection: 'ravenly-product', sections: ['02 · ', '03 · ', '16 · ', '18 · ', '21 · '] },
      { collection: 'sales-playbook', sections: ['2. '] },
    ],
  },
  {
    slug: 'cold-ravenly-cold-reason-v3',
    concept: 'ravenly-cold-reason',
    title: '“Our cost per lead is the best it’s ever been”',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'cold_outreach',
    roles: ['ae'],
    personas: ['marketing_manager'],
    personaLines: {},
    situation:
      'You are cold calling the marketing manager of a 35-attorney employment law firm for Ravenly. An agency runs the firm’s Google Ads, and she has agreed to give you 30 seconds before her next meeting.',
    buyerLine:
      '“Thirty seconds. Our agency sends me cost per lead every month, and it’s the best it’s ever been. So what do you do that I don’t already have?”',
    objective:
      'In about 20 seconds, give a reason to talk that fits a marketing manager who already tracks cost per lead, tied to what happens after the inquiry, without overstating what Ravenly’s reporting can prove, and end with one question.',
    goodLooksLike: [
      '- Respects her numbers and the agency’s work, and does not suggest either is falling short.',
      '- Moves from cost per lead to what happens after the inquiry, such as which campaigns bring matters the firm retains, and names the relevant capability plainly as something to see rather than a given: reporting that connects sources and campaigns to qualified and retained outcomes, such as cost per retained lead, without claiming her plan or ad-spend setup would include it.',
      '- Stays accurate about measurement: reporting covers inquiries whose source data is available and depends on the team recording outcomes; it is not complete visibility or proof of return on investment.',
      '- Does not present marketing statistics as facts about her firm, and does not claim her agency’s reports cannot show retained cases.',
      '- Ends with one question, such as whether she can see today which campaigns bring matters the firm actually retains.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Our agency already reports conversions to me every month. How is that any different?”',
      '“Lots of our clients hear our radio spot and then search for our name. Your reports would just credit Google, wouldn’t they?”',
      '“Every vendor promises to prove ROI. If I take this to the partners and the numbers don’t hold up, it’s my credibility. Why should I take that risk?”',
    ],
    assessed: ['product_accuracy', 'persuasion', 'objection_handling', 'advancing'],
    defaults: [4, 4, 2],
    sources: [
      { collection: 'ravenly-product', sections: ['02 · ', '03 · ', '09 · ', '18 · ', '21 · '] },
      { collection: 'sales-playbook', sections: ['2. '] },
    ],
  },

  // ------------------------------------------------------------ ravenly-already-have-chatbot
  {
    slug: 'cold-ravenly-already-have-chatbot-v2',
    concept: 'ravenly-already-have-chatbot',
    title: 'Intake director won’t rip out her chat vendor',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'cold_outreach',
    roles: ['ae'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You are cold calling a 20-attorney workers’ compensation firm for Ravenly. The intake director answers; her team works the inquiries from the chat tool the firm added to its website last year, and she cuts in when you mention website intake.',
    buyerLine:
      '“Stop right there. We have a chat vendor, and it took me three months to get my team using it properly. I’m not ripping it out for the next shiny thing.”',
    objective:
      'Respect the work she put into the current tool, move the conversation from the chat window to what happens after an inquiry arrives, and earn a short conversation without asking her to replace anything.',
    goodLooksLike: [
      '- Acknowledges the work it took to get her team using the current tool, and does not criticize it or ask her to replace it.',
      '- Asks which part works well and what happens after a chat inquiry arrives: who sees it, how the team knows who owns it, and what the next step is.',
      '- Connects only what she describes to Ravenly, accurately, such as the original answers beside a summary and score for consistent triage, or ownership through assignments, stages, and tasks, without claiming her current tool lacks them.',
      '- Makes no claims about the current vendor, and promises no results and no painless switch.',
      '- Proposes a small, specific next step, such as 15 minutes to map how one chat inquiry is handled today and look only at the part that is not working.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Our chat already sends every lead to my team’s inbox the second it comes in. What would you add to that?”',
      '“My team is finally comfortable. If I bring in another system, I’m the one who hears the complaints.”',
      '“The partners picked this vendor, not me. Even if I liked what you showed me, I’d be the one sticking my neck out. Why would I?”',
    ],
    assessed: ['objection_handling', 'discovery', 'product_accuracy', 'advancing'],
    defaults: [4, 4, 3],
    sources: [
      { collection: 'ravenly-product', sections: ['18 · ', '13 · ', '02 · ', '03 · ', '06 · '] },
      { collection: 'sales-playbook', sections: ['6. '] },
    ],
  },
  {
    slug: 'cold-ravenly-already-have-chatbot-v3',
    concept: 'ravenly-already-have-chatbot',
    title: 'Solo says her web designer’s chat box covers her',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'cold_outreach',
    roles: ['ae'],
    personas: ['solo_attorney'],
    personaLines: {},
    situation:
      'You sent a short cold email about Ravenly to a solo immigration attorney. Her website came with a chat box from the designer who built it, and she replied the same day.',
    buyerLine: '“Thanks, but my web designer put a chat box on my site when we built it. I think I’m covered.”',
    objective:
      'Reply in a few sentences that respect what she has, ask what happens after someone uses the chat box, and propose a small next step that fits a one-person practice.',
    goodLooksLike: [
      '- Agrees that a chat option is a good start, and does not criticize the chat box or the web designer.',
      '- Moves from the chat box to what happens next: where a chat inquiry goes when she is in court or with a client, what she knows about the person before calling back, and how she keeps track of follow-up.',
      '- If it fits what she describes, names one capability in plain terms, such as intake questions tailored to her practice with the original answers and a summary waiting for her, without claiming her chat box cannot do the same.',
      '- Keeps it short and simple for a solo, with no feature list and no promise of more clients.',
      '- Ends with one easy question or a small, specific next step, such as 15 minutes on Tuesday or Thursday.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“My chat box already emails me every message. Isn’t that enough for a one-person office?”',
      '“I’m not technical at all. Would I have to rip out what I have and set everything up myself?”',
      '“I get maybe ten website inquiries a month. Is something like this even worth it for a practice my size?”',
    ],
    assessed: ['objection_handling', 'persuasion', 'product_accuracy', 'advancing'],
    defaults: [2, 2, 2],
    sources: [
      { collection: 'ravenly-product', sections: ['18 · ', '02 · ', '03 · ', '10 · '] },
      { collection: 'sales-playbook', sections: ['6. ', '8. '] },
    ],
  },

  // ------------------------------------------------------------ cold-omnizant-new-website
  {
    slug: 'cold-omnizant-new-website-v2',
    concept: 'cold-omnizant-new-website',
    title: 'Office manager just finished the website redesign',
    brand: 'omnizant',
    product: 'omnizant_web',
    subject: 'sales_technique',
    stage: 'cold_outreach',
    roles: ['ae'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You are cold calling a six-attorney employment law firm for Omnizant. The office manager answers; she ran the firm’s website redesign with its web designer, and she reacts as soon as you mention the website.',
    buyerLine:
      '“Oh no, please don’t tell me something’s wrong with it. I spent four months going back and forth with our designer, and it finally went live in June. What’s this about?”',
    objective:
      'Put her at ease about the new site, find out what the firm wanted it to do, and offer a no-cost, low-pressure next step that helps her, without criticizing the site or promising results.',
    goodLooksLike: [
      '- Reassures her quickly: does not say or hint that anything is wrong with the site, and credits the work she put into the launch.',
      '- Asks what the firm wanted the new site to accomplish and how she will know it is working, for example more inquiries for the kinds of employment cases the attorneys want.',
      '- Offers the complimentary website review as a check for her, not a critique: a short video call covering public things such as page speed, whether pages are properly linked, and whether the firm’s details and Google Business Profile match the new site.',
      '- Is clear about what it asks of her: no logins or data, no charge, and if the firm ever wants Omnizant’s services, that is a separate call.',
      '- Books a specific time while she is on the phone instead of offering to send something.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Is this going to cost anything? The partners are not spending another dime on the website this year.”',
      '“What do you get out of doing a review for free?”',
      '“Honestly, I’d feel awkward if you found problems. Our designer is a friend of one of the partners.”',
    ],
    assessed: ['empathy_clarity', 'discovery', 'advancing'],
    defaults: [2, 2, 1],
    sources: [
      { collection: 'sales-playbook', sections: ['2. ', '3. ', '5. ', '6. '] },
      { collection: 'omnizant-product', sections: ['The complimentary website review'] },
    ],
  },
  {
    slug: 'cold-omnizant-new-website-v3',
    concept: 'cold-omnizant-new-website',
    title: 'Marketing manager dares you to fault the new site',
    brand: 'omnizant',
    product: 'omnizant_web',
    subject: 'sales_technique',
    stage: 'cold_outreach',
    roles: ['ae'],
    personas: ['marketing_manager'],
    personaLines: {},
    situation:
      'You are cold calling the marketing manager of a 30-attorney personal injury firm for Omnizant. She led a website relaunch this spring with a new agency, chosen after a long search, and reports the site’s results to the partners every month.',
    buyerLine:
      '“We spent six months choosing an agency and relaunched in April. Form fills are up 30 percent, and I report them to the partners every month. Unless you can tell me something specific that’s wrong with the site right now, I’m hanging up.”',
    objective:
      'Hold your ground without inventing a flaw or criticizing her agency, get curious about what her numbers do and do not show, and earn a short review she can use whatever she decides.',
    goodLooksLike: [
      '- Does not invent or guess at problems with the site, and is candid about how closely the rep has looked at it.',
      '- Credits the relaunch and her results, and does not criticize the agency or the site.',
      '- Asks one sharp question that moves from volume to fit, such as how many of those form fills became signed cases, or which case types she wants more of.',
      '- Offers the complimentary website review as a second opinion whose findings are useful to whoever works on the site, including her agency, and says it needs no logins or data.',
      '- Promises no rankings, traffic, AI citations, or cases, and asks for a specific 15-minute slot.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Our agency already sends me a monthly SEO report. What would your review tell me that theirs doesn’t?”',
      '“If I bring in another vendor to look at the site, my agency will see it as a vote of no confidence. How do I explain that?”',
      '“I don’t take meetings on a maybe. Name one thing you would change on our site, right now, or we’re done.”',
    ],
    assessed: ['objection_handling', 'discovery', 'advancing'],
    defaults: [5, 5, 1],
    sources: [
      { collection: 'sales-playbook', sections: ['2. ', '3. ', '6. '] },
      { collection: 'omnizant-product', sections: ['The complimentary website review'] },
    ],
  },

  // ------------------------------------------------------------ cold-omnizant-ai-answer-challenge
  {
    slug: 'cold-omnizant-ai-answer-challenge-v2',
    concept: 'cold-omnizant-ai-answer-challenge',
    title: 'Partner checks ChatGPT while you’re talking',
    brand: 'omnizant',
    product: 'omnizant_ai_search',
    subject: 'sales_technique',
    stage: 'cold_outreach',
    roles: ['ae'],
    personas: ['managing_partner'],
    personaLines: {},
    situation:
      'You are cold calling the managing partner of a five-attorney criminal defense firm for Omnizant. Your reason for calling: when you asked an AI assistant last week which lawyers to call after a DUI arrest in his county, his firm was not named. He checked on his phone while you were talking.',
    buyerLine:
      '“I just asked ChatGPT that exact question, and we’re the first firm it lists. So either you made that up or you don’t know what you’re doing. Which is it?”',
    objective:
      'Stay calm, concede what a single AI answer can and cannot show, promise nothing about AI recommendations, and earn a short conversation about what matters to his practice.',
    goodLooksLike: [
      '- Stays composed and does not argue with his result or insist on the earlier one; treats each answer as a single observation and offers to share exactly what was asked, on which platform, and when.',
      '- Says plainly that each AI platform decides its own answers, and does not promise or imply that Omnizant can get the firm named or recommended.',
      '- Credits his result without overselling it: a mention does not show that anyone saw it, contacted the firm, or became a client.',
      '- Asks one question about what matters to his practice, such as which cases he wants more of or how he knows where new clients come from.',
      '- Proposes a specific, low-pressure next step, such as 15 minutes to run an agreed set of questions together.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“So if we’re already first, what exactly would I be paying you for?”',
      '“What does it cost, and what do I actually get each month?”',
      '“Put it in writing that we’ll still be the first firm named six months from now, and I’ll sign today.”',
    ],
    assessed: ['objection_handling', 'empathy_clarity', 'advancing'],
    defaults: [5, 5, 1],
    sources: [
      { collection: 'sales-playbook', sections: ['1. ', '2. ', '6. '] },
      { collection: 'omnizant-ai-search', sections: ['Messaging guidance', 'How we earn confidence', 'How the plans fit'] },
    ],
  },
  {
    slug: 'cold-omnizant-ai-answer-challenge-v3',
    concept: 'cold-omnizant-ai-answer-challenge',
    title: 'Solo says Gemini already names her',
    brand: 'omnizant',
    product: 'omnizant_ai_search',
    subject: 'sales_technique',
    stage: 'cold_outreach',
    roles: ['ae'],
    personas: ['solo_attorney'],
    personaLines: {},
    situation:
      'Your LinkedIn message for Omnizant to a solo real estate attorney said that when you asked an AI assistant to recommend real estate closing attorneys in her town, her practice was not named. She replied the next morning.',
    buyerLine:
      '“Funny, my daughter asked Gemini the same thing last night and it named me. So I think I’m okay? Now I’m curious what you saw, though.”',
    objective:
      'Reply in a few sentences that welcome her result, explain simply what a single AI answer can and cannot show, promise nothing, and turn her curiosity into a short conversation.',
    goodLooksLike: [
      '- Welcomes her result and treats both checks as single observations rather than proof either way, without insisting the earlier result was right.',
      '- Offers to share exactly what was asked, on which platform, and when, so she can see the difference for herself.',
      '- Explains simply that each AI platform decides its own answers, and that being named does not by itself mean anyone saw it, contacted her, or became a client.',
      '- Promises no mentions, recommendations, or new clients, and does not invent Omnizant prices or deliverables.',
      '- Asks one question about what matters to her practice and proposes two specific times for a short call.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“I’m a one-person practice. Is this really something a solo needs to worry about?”',
      '“My website person already handles my Google listing and all that. Wouldn’t she cover this too?”',
      '“Roughly what would something like this cost a solo?”',
    ],
    assessed: ['empathy_clarity', 'persuasion', 'advancing'],
    defaults: [2, 1, 1],
    sources: [
      { collection: 'sales-playbook', sections: ['1. ', '2. ', '8. '] },
      { collection: 'omnizant-ai-search', sections: ['Messaging guidance', 'How we earn confidence', 'The role within'] },
    ],
  },

  // ------------------------------------------------------------ cold-omnizant-referrals-only
  {
    slug: 'cold-omnizant-referrals-only-v2',
    concept: 'cold-omnizant-referrals-only',
    title: 'Partner says marketing is for firms without referrals',
    brand: 'omnizant',
    product: 'omnizant_web',
    subject: 'sales_technique',
    stage: 'cold_outreach',
    roles: ['ae'],
    personas: ['managing_partner'],
    personaLines: {},
    situation:
      'You are cold calling the managing partner of a seven-attorney business litigation firm for Omnizant. The firm has grown for 25 years on referrals from other lawyers and accountants, and he stops you after your first sentence.',
    buyerLine:
      '“Let me save us both some time. We haven’t advertised in 25 years. Our work comes from lawyers and CPAs who trust us. Marketing is for firms that can’t get referrals.”',
    objective:
      'Respect a referral practice that clearly works, get curious about what referred clients do before they call, and find out whether there is a gap worth a short conversation, without arguing or pitching.',
    goodLooksLike: [
      '- Affirms that a 25-year referral network is a real asset, and does not argue that referrals are not enough or that the firm should advertise.',
      '- Asks one curious question about the path a referral takes, such as what a referred client or a referring CPA does before calling, or which kinds of matters he wishes came in more often.',
      '- Makes no claims about how clients research firms, and promises no traffic, rankings, or cases.',
      '- If he says referred clients look the firm up first, offers the complimentary website review as a credibility and health check, with SEO left out, rather than a marketing pitch.',
      '- Uses a low-pressure framing such as “I’m not sure if it’s for you, but…,” and ends with a specific small next step or a gracious exit.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Our website is only there so people can find our phone number. It doesn’t need to do anything else.”',
      '“We’re at capacity most months. Why would I want more inquiries?”',
      '“Frankly, I think lawyers selling themselves online cheapens the profession. Why would I want any part of that?”',
    ],
    assessed: ['discovery', 'objection_handling', 'advancing'],
    defaults: [4, 4, 1],
    sources: [
      { collection: 'sales-playbook', sections: ['2. ', '3. ', '6. ', '8. '] },
      { collection: 'omnizant-product', sections: ['The complimentary website review'] },
    ],
  },
  {
    slug: 'cold-omnizant-referrals-only-v3',
    concept: 'cold-omnizant-referrals-only',
    title: 'Office manager says the firm runs on referrals',
    brand: 'omnizant',
    product: 'omnizant_web',
    subject: 'sales_technique',
    stage: 'cold_outreach',
    roles: ['ae'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You are cold calling a four-attorney estate planning and elder law firm for Omnizant. The office manager, who handles the firm’s vendors, including the company that hosts its website, picks up and hears your reason for calling.',
    buyerLine:
      '“I appreciate the call, but our attorneys get nearly every client by referral, and I can’t see them spending money on marketing.”',
    objective:
      'Respect the firm’s referral model, learn how referred clients and the website connect, and offer a small next step that helps her even if the firm never markets online.',
    goodLooksLike: [
      '- Agrees that a referral-driven practice is a strength and does not argue that the firm needs marketing.',
      '- Plays back what she said without judgment and asks one question about it, such as whether referred clients look the firm up before calling and what they find.',
      '- Offers the complimentary website review as a credibility and health check rather than marketing, covering public things such as page speed, whether pages are properly linked, and whether the firm’s details and Google Business Profile are consistent, with no logins or data needed.',
      '- Is upfront that the review is free and mainly informative and that any services would be a separate conversation, and makes no claims about results.',
      '- Offers to book 15 minutes at a specific time, with her and any attorney she wants on the invite.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Would you need our logins or anything from me? I’m not handing our web company’s passwords to someone I just met.”',
      '“I’ve only been here eight months, so I wouldn’t know if anything on the site has changed or slipped.”',
      '“Even if you find problems, there’s no budget to fix anything this year. So what’s the point?”',
    ],
    assessed: ['discovery', 'empathy_clarity', 'advancing'],
    defaults: [3, 3, 1],
    sources: [
      { collection: 'sales-playbook', sections: ['2. ', '3. ', '5. ', '6. '] },
      { collection: 'omnizant-product', sections: ['The complimentary website review'] },
    ],
  },

  // ------------------------------------------------------------ cold-already-work-with-someone
  {
    slug: 'cold-already-work-with-someone-v2',
    concept: 'cold-already-work-with-someone',
    title: 'Office manager says the current vendor is fine',
    brand: 'both',
    product: 'general',
    subject: 'sales_technique',
    stage: 'cold_outreach',
    roles: ['ae'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You are cold calling a 14-attorney real estate firm. The office manager, who looks after the firm’s vendors, heard your 30 seconds and politely stopped you. You represent your own company: Omnizant or Ravenly.',
    buyerLine: '“That’s nice of you to call, but we already have a company that handles that, and I’m the one who works with them. They’re fine.”',
    objective:
      'Compliment the arrangement she manages, get curious about what “fine” means to her, and leave with either a reason to keep talking or a dated reason to call back.',
    goodLooksLike: [
      '- Compliments her for having a provider in place instead of competing with it, and never criticizes the provider.',
      '- Gets curious about what matters most to her when she judges their work, such as responsiveness, her own workload, or what the attorneys ask her about.',
      '- Gently explores “fine,” for example by asking whether there is anything she wishes they did differently, or whether she would value a second opinion.',
      '- Does not claim to be better, cheaper, or easier to work with than a provider the rep has not seen.',
      '- If there is no opening, asks when the arrangement next comes up for review and sets a specific date to call back.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“The attorneys don’t complain about them, and believe me, I’d hear it if they did.”',
      '“I don’t sign the contracts anyway. That’s our managing partner.”',
      '“We’ve been with them six years. If I start shopping around now, it looks like I haven’t been doing my job. Why would I do that?”',
    ],
    assessed: ['objection_handling', 'empathy_clarity', 'advancing'],
    defaults: [2, 2, 1],
    sources: [{ collection: 'sales-playbook', sections: ['6. ', '2. ', '8. '] }],
  },
  {
    slug: 'cold-already-work-with-someone-v3',
    concept: 'cold-already-work-with-someone',
    title: 'Solo is loyal to his longtime provider',
    brand: 'both',
    product: 'general',
    subject: 'sales_technique',
    stage: 'cold_outreach',
    roles: ['ae'],
    personas: ['solo_attorney'],
    personaLines: {},
    situation:
      'You are cold calling a solo personal injury attorney who has run his own practice for 15 years. He heard your reason for calling, then cut in. You represent your own company: Omnizant or Ravenly.',
    buyerLine: '“I’ve had the same guy handle all of that for ten years. He picks up when I call, and I’m loyal to people who pick up. So, no.”',
    objective:
      'Honor his loyalty instead of competing with it, find out what matters most to him beyond responsiveness, and leave with a dated reason to talk again if there is no opening today.',
    goodLooksLike: [
      '- Respects his loyalty and the relationship, and does not criticize the provider or suggest he is being underserved.',
      '- Agrees that responsiveness matters, then asks what else matters most to him when he judges the work, such as the kinds of cases coming in.',
      '- Creates contrast with a question rather than a claim, such as whether he is completely confident he is getting everything he needs or would welcome a second opinion.',
      '- Does not claim to be better, cheaper, or faster than a provider the rep has not seen, and does not pitch features.',
      '- Accepts a no gracefully if it comes, and asks when it would make sense to check back, setting a specific date.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“What exactly would you do that he doesn’t? Specifics, please.”',
      '“He charges less than any company that’s ever called me. You won’t beat his price.”',
      '“If I talk to you behind his back and he finds out, that’s ten years of goodwill gone. Why would I risk that for a stranger on the phone?”',
    ],
    assessed: ['objection_handling', 'empathy_clarity', 'advancing'],
    defaults: [4, 4, 1],
    sources: [{ collection: 'sales-playbook', sections: ['6. ', '2. ', '1. ', '8. '] }],
  },

  // ------------------------------------------------------------ cold-referral-intro-reply
  {
    slug: 'cold-referral-intro-reply-v2',
    concept: 'cold-referral-intro-reply',
    title: 'Introduced marketing manager asks for the numbers',
    brand: 'both',
    product: 'general',
    subject: 'sales_technique',
    stage: 'cold_outreach',
    roles: ['ae'],
    personas: ['marketing_manager'],
    personaLines: {},
    situation:
      'The marketing director at one of your client firms introduced you by email to a peer from a legal marketing group: the marketing manager of a 25-attorney family law firm. The new contact replied to you both. You represent your own company: Omnizant or Ravenly.',
    buyerLine:
      '“Thanks for connecting us, Priya! Priya says you made her monthly partner reports much easier. Could you send me what you did for her firm, with the before-and-after numbers? I’m building next year’s budget and need something concrete.”',
    objective:
      'Build on the introduction without sharing the client’s numbers or overselling the referral, turn the request for a document into a short conversation about her firm, and set a specific time.',
    goodLooksLike: [
      '- Replies briefly and warmly, and thanks the referring client.',
      '- Does not send or describe the referring firm’s results, numbers, or fees, and does not invent outcomes; offers to let Priya speak to her own experience if she is willing.',
      '- Handles the request to send something by leading, for example offering to send the right material after two quick questions about her goals.',
      '- Asks one question about what prompted her interest or what the partners want to see in next year’s plan.',
      '- Proposes two specific times for a short call that fit her budget timeline, instead of “let me know what works.”',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Could you send a case study for now? I like to read something before I get on a call.”',
      '“The partners will ask what it costs before anything else. Can you give me a range for the budget?”',
      '“To be honest, I’m already talking to two other vendors. Why should I add a third call to my week?”',
    ],
    assessed: ['objection_handling', 'empathy_clarity', 'advancing'],
    defaults: [3, 2, 1],
    sources: [{ collection: 'sales-playbook', sections: ['1. ', '4. ', '6. ', '8. '] }],
  },
  {
    slug: 'cold-referral-intro-reply-v3',
    concept: 'cold-referral-intro-reply',
    title: 'Introduced partner wants results and price by email',
    brand: 'both',
    product: 'general',
    subject: 'sales_technique',
    stage: 'cold_outreach',
    roles: ['ae'],
    personas: ['managing_partner'],
    personaLines: {},
    situation:
      'An attorney whose firm is your client introduced you by email to a law school friend: the managing partner of a ten-attorney workers’ compensation firm. The managing partner replied to you alone. You represent your own company: Omnizant or Ravenly.',
    buyerLine:
      '“Mark says you’re good. I don’t have time for a discovery call. Tell me what you did for his firm, what it got him, and what it costs. Short version.”',
    objective:
      'Respect his time and the referral, keep the client’s results and fees his to share, handle the demand for a price without dodging it, and earn a short call at a specific time.',
    goodLooksLike: [
      '- Keeps the reply short and direct, as he asked, and thanks him for making time after Mark’s introduction.',
      '- Does not share Mark’s results, numbers, or fees, and does not invent outcomes; offers to let Mark speak to his own experience.',
      '- Answers the price question with frame control rather than a dodge or an invented number, for example explaining that the right number depends on two or three facts about his firm.',
      '- Gives him a reason the short call is worth it, such as leaving with an accurate number in 15 minutes, and asks one question about his firm.',
      '- Proposes two specific times instead of “let me know what works.”',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“If I do take a call, who from my firm needs to be on it? I’m not pulling my partners into a sales pitch.”',
      '“If I call Mark, what’s he going to tell me went wrong?”',
      '“I don’t meet with vendors until I’ve seen a proposal. Send me one and I’ll decide.”',
    ],
    assessed: ['objection_handling', 'persuasion', 'advancing'],
    defaults: [4, 4, 1],
    sources: [{ collection: 'sales-playbook', sections: ['1. ', '4. ', '6. ', '8. '] }],
  },

  // ------------------------------------------------------------ cold-ravenly-voicemail-solo
  {
    slug: 'cold-ravenly-voicemail-solo-v2',
    concept: 'cold-ravenly-voicemail-solo',
    title: 'Leave a voicemail for an intake director',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'cold_outreach',
    roles: ['ae'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You are cold calling the intake director of a ten-attorney criminal defense firm for Ravenly, on the direct line listed on the firm’s website. The site has a contact form for new cases, and the call goes to her voicemail.',
    buyerLine:
      '“Hi, this is Elena, intake director. I’m with a client or my team right now. Leave your name, your number, and what it’s about, and I’ll call you back.”',
    objective:
      'Leave a voicemail of about 20 to 30 seconds that gives the person who runs intake one specific, accurate reason to call back, tied to her team’s daily work, and makes calling back easy.',
    goodLooksLike: [
      '- Says who they are, the company, and what the call is about in the first few seconds, as her greeting asks, and leaves a name and number she can act on.',
      '- Gives one specific reason tied to her team’s work, such as what happens to a website inquiry that arrives overnight: how it reaches the right person and how her team knows who owns the first call.',
      '- Stays accurate: Ravenly organizes website inquiries for her team, with the original answers, a priority, and the next action in one place; the voicemail does not suggest that it answers the firm’s phones or replaces her staff.',
      '- Does not quote marketing figures as facts, and promises no results.',
      '- Sounds confident and friendly, without “sorry to bother you,” and ends with a simple reason to call back.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Elena here, returning your call. A lot of what comes through our website form is spam or cases we don’t take. Can your system fix that?”',
      '“Every form already lands in a shared email, and we divide them up at our morning meeting. Why would we need software for that?”',
      '“Most of our new cases start with a call from the jail, not the website. Why would I spend time on website inquiries?”',
    ],
    assessed: ['product_accuracy', 'persuasion', 'advancing'],
    defaults: [2, 2, 2],
    sources: [
      { collection: 'ravenly-product', sections: ['02 · ', '03 · ', '05 · ', '18 · ', '21 · '] },
      { collection: 'sales-playbook', sections: ['2. '] },
    ],
  },
  {
    slug: 'cold-ravenly-voicemail-solo-v3',
    concept: 'cold-ravenly-voicemail-solo',
    title: 'Voicemail for a partner who won’t return sales calls',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'cold_outreach',
    roles: ['ae'],
    personas: ['managing_partner'],
    personaLines: {},
    situation:
      'You are cold calling the managing partner of a 15-attorney personal injury firm for Ravenly. The firm runs Google Ads around the clock, and his direct line goes to voicemail.',
    buyerLine: '“This is Tom. I don’t return sales calls. If you’re selling something, send an email, and I’ll read it if I have time.”',
    objective:
      'Leave a voicemail of about 20 to 30 seconds that respects his rule, is honest that it is a sales call, gives one specific reason that matters to a managing partner, and makes the follow-up email easy to spot.',
    goodLooksLike: [
      '- Is upfront that it is a sales call and says who they are and the company in one line, without pretending to return a call or to have a relationship.',
      '- Respects his rule: says an email will follow and how to recognize it, and still leaves a name and number, without pressing him to call back.',
      '- Gives one specific reason in a managing partner’s terms, such as whether he can see which high-value website inquiries are going stale and who owns each one, or which marketing sources, such as his Google Ads, lead to retained cases.',
      '- Stays accurate: does not claim Ravenly answers the firm’s phones or that the firm is losing inquiries, and does not quote marketing figures as facts.',
      '- Sounds confident and brief, with no apology for calling.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Fine, I’m replying. We have six intake staff. What would your software do that they don’t already?”',
      '“Our intake team logs everything in our case management system. I’m not paying for a second database.”',
      '“Give me one number: how many more cases will we sign in the first 90 days?”',
    ],
    assessed: ['product_accuracy', 'persuasion', 'advancing'],
    defaults: [4, 4, 2],
    sources: [
      { collection: 'ravenly-product', sections: ['02 · ', '03 · ', '18 · ', '21 · '] },
      { collection: 'sales-playbook', sections: ['2. ', '8. '] },
    ],
  },

  // ------------------------------------------------------------ cold-ravenly-linkedin-different
  {
    slug: 'cold-ravenly-linkedin-different-v2',
    concept: 'cold-ravenly-linkedin-different',
    title: 'Intake director says every demo looks the same',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'cold_outreach',
    roles: ['ae'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You emailed the intake director of a 20-attorney immigration firm about Ravenly. She runs a team of five intake specialists, and she replied the same day.',
    buyerLine:
      '“I’ve sat through four intake software demos this year, and honestly, they all blur together. What’s actually different about yours for the people who’d use it every day?”',
    objective:
      'Reply briefly and honestly, without claiming exclusivity or results, with one or two demonstrable strengths that matter to an intake team’s daily work, and ask one question.',
    goodLooksLike: [
      '- Does not claim Ravenly is the only or best option, does not criticize the products she has seen, and promises no results.',
      '- Picks one or two demonstrable strengths that fit her team’s day, such as the original answers shown beside the AI summary and score so staff can check before calling, or one workspace showing messages awaiting a response, tasks due, and high-priority leads.',
      '- Offers them as things to see with her own scenarios, not as proven or exclusive advantages.',
      '- Stays accurate about the score: it helps staff prioritize review and does not decide whether the firm takes a case.',
      '- Keeps it to a few sentences and ends with one specific question, such as where her team loses the most time between an inquiry arriving and the first call.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Can my team see why the system scored a lead high or low, or do they just have to trust the number?”',
      '“We get a lot of duplicates, the same person on the chat and then on the form. What happens then?”',
      '“Every demo looks great with made-up data. How would I know it works on our real inquiries before I put my name on a recommendation to the partners?”',
    ],
    assessed: ['product_accuracy', 'persuasion', 'advancing'],
    defaults: [3, 3, 3],
    sources: [
      { collection: 'ravenly-product', sections: ['13 · ', '03 · ', '05 · ', '06 · ', '20 · '] },
      { collection: 'sales-playbook', sections: ['2. '] },
    ],
  },
  {
    slug: 'cold-ravenly-linkedin-different-v3',
    concept: 'cold-ravenly-linkedin-different',
    title: 'Partner gives you one sentence to stand out',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'cold_outreach',
    roles: ['ae'],
    personas: ['managing_partner'],
    personaLines: {},
    situation:
      'You are cold calling the managing partner of a 12-attorney medical malpractice firm for Ravenly. He has taken calls from several intake vendors this quarter, and he gives you one chance.',
    buyerLine:
      '“Every intake vendor tells me they’re different, and none of them are. One sentence: what do you do that the last three didn’t? And don’t say ‘more signed cases.’”',
    objective:
      'Answer in a sentence or two without claiming exclusivity, results, or knowledge of what other vendors lack, tie one demonstrable strength to what a managing partner is accountable for, and earn a short next step.',
    goodLooksLike: [
      '- Does not claim to know what the other vendors offered or lacked, and does not claim Ravenly is the only or best option.',
      '- Answers in a sentence or two with one strength that fits a managing partner, such as seeing which high-priority inquiries have gone inactive and who owns each one, or retained matters and recorded revenue by marketing source, offered as something to see rather than a proven advantage.',
      '- Promises no signed cases, revenue, or return on investment.',
      '- Stays accurate about reporting: it shows recorded outcomes by source where source data is available and the team records outcomes; it is not complete visibility.',
      '- Ends with a specific next step, such as 20 minutes to trace how one recent high-value inquiry was handled from arrival to outcome.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“So you have a dashboard. Everybody has a dashboard. Why should I care?”',
      '“My intake manager picks the software her team uses. Why are you calling me and not her?”',
      '“If I give you 20 minutes and you can’t show me something my current setup doesn’t do, I never want to hear from you again. Deal?”',
    ],
    assessed: ['product_accuracy', 'persuasion', 'objection_handling', 'advancing'],
    defaults: [5, 5, 3],
    sources: [
      { collection: 'ravenly-product', sections: ['13 · ', '03 · ', '06 · ', '09 · ', '18 · '] },
      { collection: 'sales-playbook', sections: ['2. '] },
    ],
  },

  // ------------------------------------------------------------ cold-ravenly-chat-tool-flopped
  {
    slug: 'cold-ravenly-chat-tool-flopped-v2',
    concept: 'cold-ravenly-chat-tool-flopped',
    title: 'Intake director who cleaned up the last chat tool',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'cold_outreach',
    roles: ['ae'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You are cold calling a nine-attorney bankruptcy firm for Ravenly. The intake director answers; she managed the website chat tool the firm cancelled last year, and she stops you as soon as you mention website intake.',
    buyerLine:
      '“No. I’m the one who babysat the last chat tool. It woke me up at 2 a.m. for spam, nobody knew who was supposed to answer what, and the partners blamed my team. You have one minute.”',
    objective:
      'Take her experience seriously, find out what actually broke before positioning anything, connect only the relevant parts of Ravenly accurately, and earn a short conversation without promising it will go differently.',
    goodLooksLike: [
      '- Acknowledges what she went through, including taking the blame, without criticizing the previous vendor or promising that this time will be different.',
      '- Asks what broke before pitching anything: who received which alerts, who was supposed to own each inquiry, and what the spam looked like.',
      '- Connects accurately to what she describes: notification preferences each user sets by event and channel, teams tied to case types with a default team as a fallback, and ownership through assignments, stages, and tasks.',
      '- Makes no claim about how much spam the spam filter catches and does not promise exactly how alerts will behave, offers to see and confirm both in a controlled test, and says that software alone will not fix unclear ownership.',
      '- Ends with a specific, low-risk next step, such as 20 minutes for her to sketch how inquiries should be routed before anyone involves the partners.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Can I control who gets alerted, and how? I am not getting texts at 2 a.m. again.”',
      '“The partners will hear the words ‘chat tool’ and say no before I finish the sentence. How would I even bring this up?”',
      '“If it fails again, it’s my job on the line, not yours. What happens if we sign and it’s the same mess?”',
    ],
    assessed: ['objection_handling', 'discovery', 'product_accuracy', 'advancing'],
    defaults: [5, 5, 3],
    sources: [{ collection: 'ravenly-product', sections: ['03 · ', '05 · ', '06 · ', '07 · ', '18 · ', '20 · '] }],
  },
  {
    slug: 'cold-ravenly-chat-tool-flopped-v3',
    concept: 'cold-ravenly-chat-tool-flopped',
    title: 'Chat tool raised leads but not signed cases',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'cold_outreach',
    roles: ['ae'],
    personas: ['marketing_manager'],
    personaLines: {},
    situation:
      'You emailed the marketing manager of a 26-attorney criminal defense firm with four offices about Ravenly. She replied that the firm ran a website chat tool for a year and dropped it.',
    buyerLine:
      '“We ran a chat tool for a year. Chat leads went up, signed cases didn’t, and I had to explain that to the partners. So what would be different with yours?”',
    objective:
      'Get curious about why more chat leads did not become signed cases before positioning anything, then connect only the relevant parts of Ravenly accurately and earn a short conversation.',
    goodLooksLike: [
      '- Acknowledges the experience without criticizing the previous vendor or promising different results.',
      '- Asks what happened between the chat lead and the signed case, for example whether the inquiries were the wrong case types, how quickly and by whom they were followed up, and how outcomes were recorded.',
      '- Connects accurately to what she describes: case-specific questions and disqualifier controls the firm approves, firm criteria that adjust the score without rejecting leads, and reporting that ties sources to qualified and retained matters where the team records outcomes.',
      '- Does not claim Ravenly will raise signed cases, and does not suggest the AI score or the spam filter will screen out poor-fit leads on its own.',
      '- Proposes a specific next step, such as 20 minutes to look at how last year’s chat leads were followed up and recorded.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“How would we know a lead is worth calling before my intake team spends time on it?”',
      '“A lot of people started the chat and quit halfway. Would yours show me where they drop off, and why?”',
      '“The partners will want a guarantee before they try another one. What do I tell them?”',
    ],
    assessed: ['discovery', 'product_accuracy', 'objection_handling', 'advancing'],
    defaults: [3, 3, 3],
    sources: [
      { collection: 'ravenly-product', sections: ['03 · ', '05 · ', '09 · ', '18 · '] },
      { collection: 'sales-playbook', sections: ['3. ', '6. '] },
    ],
  },

  // ------------------------------------------------------------ cold-ravenly-statistic-challenged
  {
    slug: 'cold-ravenly-statistic-challenged-v2',
    concept: 'cold-ravenly-statistic-challenged',
    title: 'Solo says he answers every inquiry within an hour',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'cold_outreach',
    roles: ['ae'],
    personas: ['solo_attorney'],
    personaLines: {},
    situation:
      'Your cold email for Ravenly to a solo DUI defense attorney said that 42% of firms take three or more days to respond to an inquiry, a figure from Ravenly’s public website. He replied the same day.',
    buyerLine: '“Interesting stat, but I answer every inquiry within an hour, usually from my phone. Who’s taking three days? Not me, I hope.”',
    objective:
      'Acknowledge that the figure does not describe him and is a marketing claim rather than a verified fact, credit his responsiveness, and turn the exchange toward his own process with a light next step.',
    goodLooksLike: [
      '- Agrees the figure does not describe him, and says plainly that it is a marketing claim from Ravenly’s website, not an independently verified statistic.',
      '- Does not defend the figure or swap in another one, such as the share of leads that go unanswered.',
      '- Credits his fast response and gets curious about it, for example what happens to an inquiry that arrives while he is in court, and what he knows about the person before he calls back.',
      '- Keeps the tone light and confident, without a long apology.',
      '- Offers a small next step, such as a 15-minute call about how his inquiries come in, or leaves the door open gracefully if he is happy as he is.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“So if I’m already fast, what would your software actually do for me?”',
      '“Most of my new clients call my cell directly. Do I even need anything on my website?”',
      '“Next time, don’t lead with a number you can’t back up. Why should I trust anything else you tell me?”',
    ],
    assessed: ['product_accuracy', 'objection_handling', 'empathy_clarity', 'advancing'],
    defaults: [2, 2, 2],
    sources: [
      { collection: 'ravenly-product', sections: ['21 · ', '02 · ', '03 · ', '16 · ', '18 · '] },
      { collection: 'sales-playbook', sections: ['6. '] },
    ],
  },
  {
    slug: 'cold-ravenly-statistic-challenged-v3',
    concept: 'cold-ravenly-statistic-challenged',
    title: 'Marketing manager asks for the study behind 80%',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'cold_outreach',
    roles: ['ae'],
    personas: ['marketing_manager'],
    personaLines: {},
    situation:
      'Your LinkedIn message for Ravenly to the marketing manager of a 22-attorney estate planning firm opened with a figure from Ravenly’s public website: 80% of prospects contact three or more firms. She replied within the hour.',
    buyerLine: '“Where does the 80% come from? I’d need the study, the sample, and the year before I could repeat that to my partners.”',
    objective:
      'Answer her request for a source honestly, without inventing a study or defending the figure, and turn her rigor toward her own firm’s data with a specific next step.',
    goodLooksLike: [
      '- Says plainly that the figure is a marketing claim on Ravenly’s public website and that the rep cannot point to a verified study, sample, or year for it.',
      '- Does not invent a source or promise that one exists; at most offers to ask whether Ravenly has a dated source and to report back by a set date.',
      '- Agrees she should not repeat it to the partners as a fact, and does not swap in another unverified figure.',
      '- Turns to her own data with one question, such as how quickly last month’s inquiries got a meaningful response, or whether she can see which sources led to retained matters.',
      '- Proposes a specific next step built on her numbers, such as 20 minutes to look at one month of inquiries together.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“If your own marketing numbers aren’t sourced, why would I trust your reporting?”',
      '“So what would you measure first instead?”',
      '“Our partners will only fund a tool that pays for itself in the first quarter. Can you commit to that?”',
    ],
    assessed: ['product_accuracy', 'objection_handling', 'discovery', 'advancing'],
    defaults: [3, 4, 3],
    sources: [
      { collection: 'ravenly-product', sections: ['21 · ', '16 · ', '09 · ', '19 · ', '18 · '] },
      { collection: 'sales-playbook', sections: ['6. '] },
    ],
  },

  // ------------------------------------------------------------ cold-ravenly-ai-legal-advice
  {
    slug: 'cold-ravenly-ai-legal-advice-v2',
    concept: 'cold-ravenly-ai-legal-advice',
    title: 'Immigration partner fears the bot will give advice',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'cold_outreach',
    roles: ['ae'],
    personas: ['managing_partner'],
    personaLines: {},
    situation:
      'You are cold calling the managing partner of an eight-attorney immigration firm for Ravenly. When you mention AI-assisted website intake, he stops you.',
    buyerLine:
      '“Absolutely not. If your chatbot tells someone they qualify for asylum and they don’t, that’s a family’s future and our firm’s name. Tell me exactly what that AI says to people, or we’re done.”',
    objective:
      'Answer his challenge precisely and only as far as the material goes: what the firm controls in what visitors see, what staff see, and what you will confirm rather than assume, without compliance promises, and earn a short follow-up.',
    goodLooksLike: [
      '- Treats the concern as serious and answers precisely, without minimizing it or getting defensive.',
      '- Explains that visitors answer the intake questions in flows the firm approves, and that staff see the original answers beside an AI summary and score; neither is legal advice, an eligibility decision, or a promise that the firm will take the matter.',
      '- Names what the firm controls: the questions and their order, required answers and disqualifiers, the consent wording, and the completion messages visitors see.',
      '- Does not claim the product is bar-approved, ethics-compliant, or always accurate; notes that Ravenly’s own terms say AI outputs can be inaccurate, which is why staff review the original answers.',
      '- Does not suggest the chat can answer legal questions, and does not claim the AI never says anything to visitors, or that it does; offers to confirm exactly what a visitor sees and proposes a specific next step, such as 20 minutes to review a draft immigration intake flow his team would approve before anything goes live.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Many of our clients write in Spanish or Haitian Creole. If a translation is wrong, that’s worse than nothing. Who checks it?”',
      '“My partners will ask whether the bar has approved this. Has it?”',
      '“Put it in writing: your AI will never tell a visitor anything about their case. Will you sign that?”',
    ],
    assessed: ['product_accuracy', 'objection_handling', 'empathy_clarity', 'advancing'],
    defaults: [5, 5, 4],
    sources: [
      { collection: 'ravenly-product', sections: ['02 · ', '04 · ', '05 · ', '11 · ', '18 · '] },
      { collection: 'sales-playbook', sections: ['6. '] },
    ],
  },
  {
    slug: 'cold-ravenly-ai-legal-advice-v3',
    concept: 'cold-ravenly-ai-legal-advice',
    title: 'Intake director worries the chat will give advice',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'cold_outreach',
    roles: ['ae'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You left a voicemail about Ravenly for the intake director of an 11-attorney family law firm, and she has called you back. When you mention AI-assisted website intake, she stops you.',
    buyerLine:
      '“I have to be honest, that makes me nervous. My team is trained never to give legal advice on intake calls. How do I know your chatbot won’t tell a scared parent what their rights are?”',
    objective:
      'Take her concern seriously, explain accurately what the intake experience and the AI do and do not do, show how her rules stay in the firm’s control, and earn a short conversation she can bring to the attorneys.',
    goodLooksLike: [
      '- Respects her team’s standard and treats the concern as legitimate, without brushing it aside.',
      '- Explains accurately that visitors answer the intake questions in flows the firm approves, and that the AI summary and score help staff review an inquiry; neither is legal advice or a decision to take the case. Does not claim the AI never says anything to visitors, or that it does, and offers to show exactly what a visitor would see.',
      '- Notes that she and the attorneys would approve the questions, required answers, consent wording, and completion messages, and that her staff can read every original answer.',
      '- Does not claim the product is bar-approved or ethics-compliant, and does not suggest the chat can answer legal questions.',
      '- Asks what her team needs to know before a first call, and proposes a short look at how a family law intake flow could work, with the attorney she would want involved.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Can my team see exactly what the person typed, or only what the AI made of it?”',
      '“What if someone in a dangerous situation fills out the chat at midnight? Who would even see it?”',
      '“The attorneys will ask me who’s responsible if the AI gets something wrong. What do I tell them?”',
    ],
    assessed: ['product_accuracy', 'empathy_clarity', 'objection_handling', 'advancing'],
    defaults: [3, 3, 3],
    sources: [{ collection: 'ravenly-product', sections: ['02 · ', '04 · ', '05 · ', '07 · ', '11 · ', '18 · '] }],
  },
];
