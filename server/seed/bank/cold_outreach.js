// Cold outreach: questions for the Practice Studio feed.
export const QUESTIONS = [
  {
    slug: 'cold-omnizant-new-website',
    title: '“We just paid for a new website”',
    brand: 'omnizant',
    subject: 'sales_technique',
    stage: 'cold_outreach',
    roles: ['ae'],
    personas: ['managing_partner'],
    personaLines: {},
    situation:
      'You are cold calling the managing partner of a four-attorney estate planning firm for Omnizant. The firm launched a redesigned website three months ago, and she cuts in as you start your reason for calling.',
    buyerLine:
      '“We just spent a small fortune on a new website. It launched three months ago and everyone loves it. The last thing I need is another web company telling me it’s wrong.”',
    objective:
      'Respect the investment, find out whether the new site is doing what the firm bought it to do, and earn a short follow-up conversation without criticizing the site or promising results.',
    goodLooksLike: [
      '- Acknowledges the new site as a real investment and does not criticize it or the firm that built it.',
      '- Does not claim to know the site is underperforming, and does not promise traffic, rankings, AI citations, or cases.',
      '- Asks what she wanted the new site to accomplish and how she will know it is working, for example new estate planning inquiries or signed clients each month.',
      '- Gives one specific reason the call could matter to her, such as whether people searching for an estate planning attorney nearby actually find the new site, and keeps it short.',
      '- Ends with a low-pressure, specific next step, such as 15 minutes next week to look at what the firm measures today.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Our web designer said the site is already optimized for Google. Isn’t that what you do?”',
      '“Honestly, I don’t look at website numbers. As long as the phone rings, I’m happy.”',
      '“Whatever it is, we’re not spending another dollar on marketing this year. Call me in January.”',
    ],
    assessed: ['objection_handling', 'discovery', 'advancing'],
    defaults: [3, 3, 1],
    sources: [{ collection: 'sales-playbook', sections: ['2. ', '6. ', '3. '] }],
  },
  {
    slug: 'cold-omnizant-ai-answer-challenge',
    title: '“We came up in ChatGPT. Which is it?”',
    brand: 'omnizant',
    product: 'omnizant_ai_search',
    subject: 'sales_technique',
    stage: 'cold_outreach',
    roles: ['ae'],
    personas: ['marketing_manager'],
    personaLines: {},
    situation:
      'You sent a cold email for Omnizant to the marketing manager of a 30-attorney employment law firm. It said that when you asked an AI assistant to recommend employment lawyers in her city, three competitors were named and her firm was not. She replied the same afternoon.',
    buyerLine:
      '“I just asked ChatGPT the same question, and we were the second firm it named. So which is it? And can you actually get us cited, or is this the new SEO snake oil?”',
    objective:
      'Reply in a few sentences that concede what a single AI answer can and cannot show, promise nothing about citations, and earn a conversation about what the firm needs from AI search.',
    goodLooksLike: [
      '- Acknowledges her result without arguing, and treats both her check and the original one as single snapshots rather than proof either way.',
      '- Does not promise or guarantee AI citations, rankings, or leads, and does not invent Omnizant methods, tools, timelines, or results.',
      '- Answers the “snake oil” challenge directly and calmly, for example by offering to show exactly what was asked and when.',
      '- Shifts to discovery with a question or two: which practice areas and questions matter most, and what the partners expect from AI search.',
      '- Proposes a specific, low-pressure next step, such as a 20-minute call to review a set of agreed questions together.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Our agency already handles our SEO and says it covers AI search too. Why would I bring in someone else?”',
      '“If I take this to the partners, the first questions will be what it costs and what we get. What do I tell them?”',
      '“Show me one law firm you’ve gotten cited in AI answers, with numbers, or let’s not waste each other’s time.”',
    ],
    assessed: ['objection_handling', 'persuasion', 'advancing'],
    defaults: [4, 4, 1],
    sources: [{ collection: 'sales-playbook', sections: ['2. ', '6. ', '8. '] }],
  },
  {
    slug: 'cold-omnizant-referrals-only',
    title: '“My cases all come from referrals”',
    brand: 'omnizant',
    subject: 'sales_technique',
    stage: 'cold_outreach',
    roles: ['ae'],
    personas: ['solo_attorney'],
    personaLines: {},
    situation:
      'You are cold calling a solo workers’ compensation attorney for Omnizant. He gave you 30 seconds, and you explained that Omnizant helps law firms with their websites, SEO, and GEO.',
    buyerLine:
      '“Appreciate the call, but almost all my cases come from referrals: other lawyers, old clients, a couple of union reps. I don’t really need marketing.”',
    objective:
      'Respect what is working, get curious about how referred clients actually reach him, and find out whether there is a gap worth a second conversation, without arguing or pitching.',
    goodLooksLike: [
      '- Affirms that a strong referral base is an asset, and does not argue that referrals are not enough.',
      '- Asks one curious question about how referrals reach him, such as what a referred person does before calling, or which kinds of cases he wishes he had more of.',
      '- Uses a low-pressure framing such as “I’m not sure if it’s for you, but…” instead of a pitch.',
      '- Makes no claims about how clients search or what marketing would deliver, and promises no results.',
      '- Ends with a question or a small, specific next step rather than “let me know if you’re ever interested.”',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“I tried pay-per-click ads a few years ago and it was a money pit. Never again.”',
      '“I’m in hearings most days. I don’t have time to write blog posts or fuss with a website.”',
      '“Look, I’m busy. If I ever need marketing, I’ll look you up.”',
    ],
    assessed: ['discovery', 'empathy_clarity', 'advancing'],
    defaults: [2, 2, 1],
    sources: [{ collection: 'sales-playbook', sections: ['2. ', '3. ', '8. '] }],
  },
  {
    slug: 'cold-already-work-with-someone',
    title: '“We already work with someone for that”',
    brand: 'both',
    subject: 'sales_technique',
    stage: 'cold_outreach',
    roles: ['ae'],
    personas: ['marketing_manager'],
    personaLines: {},
    situation:
      'You are cold calling the marketing manager of a 20-attorney immigration firm. She gave you 30 seconds, heard your reason for calling, and stopped you there. You represent your own company: Omnizant or Ravenly.',
    buyerLine: '“We already work with a company for that, and the partners are happy with them. I don’t see a reason to switch.”',
    objective:
      'Respect the current relationship, find out what matters most to her and whether anything is missing, and leave with a reason or a date to talk again.',
    goodLooksLike: [
      '- Compliments the choice instead of competing with it, and never criticizes the current provider.',
      '- Gets curious about what matters most to her when she judges the current provider’s work.',
      '- Creates contrast with a question, such as whether she is completely confident she is getting everything she needs or would value a second opinion.',
      '- Does not claim to be better, cheaper, or faster than a provider the rep has not seen.',
      '- If there is no opening today, asks when the current arrangement next comes up for review and sets a dated reason to call back.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“They’re fine. Nothing’s perfect, but switching vendors would be a huge project for me.”',
      '“Even if I wanted to, the partners chose them. I can’t just bring in someone new.”',
      '“Our contract runs through the end of next year, so there’s really nothing to talk about.”',
    ],
    assessed: ['objection_handling', 'empathy_clarity', 'advancing'],
    defaults: [3, 3, 1],
    sources: [{ collection: 'sales-playbook', sections: ['6. ', '2. '] }],
  },
  {
    slug: 'cold-referral-intro-reply',
    title: 'Reply to a warm referral introduction',
    brand: 'both',
    subject: 'sales_technique',
    stage: 'cold_outreach',
    roles: ['ae'],
    personas: ['solo_attorney'],
    personaLines: {},
    situation:
      'A client of yours, the managing partner of a family law firm, introduced you by email to a solo elder law attorney she knows from the bar association. The new contact replied to you both. You represent your own company: Omnizant or Ravenly.',
    buyerLine:
      '“Thanks for the introduction, Lauren. Nice to meet you by email. I’m curious: what exactly did you do for Lauren’s firm, and what would something like that cost a solo like me?”',
    objective:
      'Build on the referral without overselling it: keep the referring client’s details hers to share, handle the price question without dodging it, and set a specific time to talk.',
    goodLooksLike: [
      '- Replies briefly and warmly, and thanks the referring client.',
      '- Does not share the referring firm’s results, numbers, or fees, and does not invent outcomes; lets the referring client speak for her own experience.',
      '- Handles the price question with frame control, such as offering to get her a number after a couple of quick questions so it is the right number.',
      '- Asks one question about the new contact’s practice or what prompted her interest.',
      '- Proposes two specific times for a short call instead of “let me know what works.”',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Lauren’s firm is much bigger than mine. I’m not sure what works for her would work for me.”',
      '“Money’s tight right now. I’d have to see a real return before I spend anything.”',
      '“I’m swamped through the end of the month. Can we talk sometime next month instead?”',
    ],
    assessed: ['persuasion', 'empathy_clarity', 'advancing'],
    defaults: [1, 1, 1],
    sources: [{ collection: 'sales-playbook', sections: ['1. ', '4. ', '8. '] }],
  },
  {
    slug: 'cold-ravenly-voicemail-solo',
    title: 'Leave a voicemail a solo will return',
    brand: 'ravenly',
    subject: 'product',
    stage: 'cold_outreach',
    roles: ['ae'],
    personas: ['solo_attorney'],
    personaLines: {},
    situation:
      'You are cold calling a solo bankruptcy attorney for Ravenly. Her website has a contact form and says she is in court most mornings, and the call goes to voicemail.',
    buyerLine: '“Hi, you’ve reached Nina’s office. I’m in court most mornings, so leave a message and I’ll get back to you as soon as I can.”',
    objective:
      'Leave a voicemail of about 20 to 30 seconds that gives her one specific, accurate reason to call back, tied to what happens to website inquiries while she is in court, and makes calling back easy.',
    goodLooksLike: [
      '- Says who they are and the company in one line, and leaves a name and number she can act on.',
      '- Gives one specific reason tied to her situation, such as website inquiries that arrive while she is in court or after hours and wait until she is free.',
      '- Stays accurate: website intake can capture an inquiry’s details outside office hours, but the voicemail does not suggest Ravenly answers her phone or provides a live answering service.',
      '- Does not quote marketing figures such as “35% of calls go unanswered” as facts, and promises no results.',
      '- Ends with a reason to call back or a simple question to think about, in a confident tone without “sorry to bother you.”',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“I’m returning your call. I have five minutes before my next hearing. What is this about?”',
      '“My office calls already forward to my cell. Why would I need anything else?”',
      '“I’m a one-person office. I don’t have time to set up and run another piece of software.”',
    ],
    assessed: ['product_accuracy', 'persuasion', 'advancing'],
    defaults: [3, 2, 2],
    sources: [
      { collection: 'ravenly-product', sections: ['02 · ', '03 · ', '21 · ', '18 · '] },
      { collection: 'sales-playbook', sections: ['2. ', '8. '] },
    ],
  },
  {
    slug: 'cold-ravenly-linkedin-different',
    title: '“What actually makes you different?”',
    brand: 'ravenly',
    subject: 'product',
    stage: 'cold_outreach',
    roles: ['ae'],
    personas: ['marketing_manager'],
    personaLines: {},
    situation:
      'You connected on LinkedIn with the marketing manager of a 40-attorney personal injury firm with three offices. Your note mentioned Ravenly in one line, and she replied.',
    buyerLine:
      '“Thanks for connecting. Fair warning: I hear from intake and chat vendors every week, and they all promise more signed cases. What actually makes you different?”',
    objective:
      'Reply in a short message that answers honestly, without claiming exclusivity or results, ties one or two demonstrable strengths to her job of showing which channels produce retained cases, and asks one question.',
    goodLooksLike: [
      '- Does not promise more signed cases, and does not claim Ravenly is the only or the best product at anything.',
      '- Picks one or two demonstrable strengths that fit her role, such as LLM referral reporting or question-level abandonment analytics, and offers them as things to see rather than proven or exclusive advantages, without implying that other vendors lack source-to-signed-case reporting.',
      '- Stays accurate about measurement: attribution works where source data is available and depends on the firm recording outcomes; it is not complete visibility, and the rep does not promise it will prove ROI.',
      '- Keeps it to a few sentences that suit LinkedIn, with no feature list.',
      '- Ends with one specific question, such as how she shows the partners today which campaigns produce retained matters.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Can it show me which Google Ads campaigns produce retained cases, or just which ones produce form fills?”',
      '“Every vendor says setup is easy. How much of my team’s time will this really take?”',
      '“Send me a case study from a firm like ours, with real numbers. If you don’t have one, I don’t see the point of a call.”',
    ],
    assessed: ['product_accuracy', 'persuasion', 'advancing'],
    defaults: [4, 4, 3],
    sources: [
      { collection: 'ravenly-product', sections: ['13 · ', '09 · ', '03 · ', '18 · ', '12 · '] },
      { collection: 'sales-playbook', sections: ['2. '] },
    ],
  },
  {
    slug: 'cold-ravenly-chat-tool-flopped',
    title: '“We tried a chat tool and it flopped”',
    brand: 'ravenly',
    subject: 'product',
    stage: 'cold_outreach',
    roles: ['ae'],
    personas: ['managing_partner'],
    personaLines: {},
    situation:
      'You are cold calling the managing partner of a ten-attorney Social Security disability firm for Ravenly. He listened to your reason for calling, then cut in.',
    buyerLine:
      '“We tried one of those website chat tools two years ago. The leads were junk, my intake team ignored it, and we cancelled after six months. Why would this be any different?”',
    objective:
      'Get curious about what went wrong before positioning anything, connect only the relevant parts of Ravenly to those failures accurately, and earn a short follow-up conversation.',
    goodLooksLike: [
      '- Acknowledges the bad experience without criticizing the previous vendor or promising that this time will be different.',
      '- Asks what “junk” meant and why the team ignored the tool, for example poor-fit matters, spam, or no clear owner for follow-up.',
      '- Connects accurately to what he describes: firm-approved qualification questions and disqualifier controls, the original answers available to staff, and ownership through stages and tasks.',
      '- Does not claim the spam filter or the AI score screens out bad leads, and acknowledges that software alone does not fix an ownership gap.',
      '- Ends with a specific next step, such as 20 minutes with him and his intake lead to walk through what went wrong last time.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“The real problem was my intake team. They live on the phone and won’t touch another screen.”',
      '“We’re short-staffed already. How much of my people’s time would setup take?”',
      '“The last vendor said their AI would screen out the bad cases for us. Will yours do that, yes or no?”',
    ],
    assessed: ['objection_handling', 'discovery', 'product_accuracy', 'advancing'],
    defaults: [4, 4, 3],
    sources: [
      { collection: 'ravenly-product', sections: ['03 · ', '05 · ', '06 · ', '18 · '] },
      { collection: 'sales-playbook', sections: ['6. '] },
    ],
  },
  {
    slug: 'cold-ravenly-statistic-challenged',
    title: '“Up to 40%? Says who?”',
    brand: 'ravenly',
    subject: 'product',
    stage: 'cold_outreach',
    roles: ['ae'],
    personas: ['managing_partner'],
    personaLines: {},
    situation:
      'Your cold email for Ravenly to the managing partner of an eight-attorney family law firm opened with a line from Ravenly’s public website: “Up to 40% of leads go unanswered.” He replied within the hour.',
    buyerLine:
      '“Up to 40% of leads go unanswered? Says who? It isn’t true here, and I don’t take meetings with people who open with numbers they can’t back up. You get one reply.”',
    objective:
      'Own the overreach without groveling, say accurately what the figure is and is not, and turn the exchange toward his firm’s own numbers with a low-pressure next step.',
    goodLooksLike: [
      '- Concedes plainly that the figure is a marketing claim from Ravenly’s website, not an independently substantiated statistic, and that it says nothing about his firm.',
      '- Does not defend it or swap in another unverified figure, such as 80% of prospects contacting three or more firms or 42% of firms taking three or more days to respond.',
      '- Keeps the acknowledgment short and confident, without an extended apology or needy phrasing.',
      '- Asks one question about his own data, such as how quickly an inquiry that arrives at 8 p.m. gets a meaningful response today, and how he knows.',
      '- Offers a low-pressure next step that uses his numbers, such as a short review of last month’s inquiries, or leaves the door open gracefully.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“What do you actually know about my firm that made you email me in the first place?”',
      '“We respond to every inquiry the same day. What exactly would you improve?”',
      '“If you want a meeting, put in writing that you’ll increase our signed cases. Otherwise we’re done.”',
    ],
    assessed: ['product_accuracy', 'objection_handling', 'empathy_clarity', 'advancing'],
    defaults: [5, 5, 3],
    sources: [
      { collection: 'ravenly-product', sections: ['21 · ', '16 · ', '18 · '] },
      { collection: 'sales-playbook', sections: ['8. ', '6. '] },
    ],
  },
  {
    slug: 'cold-ravenly-ai-legal-advice',
    title: '“I won’t have a robot giving legal advice”',
    brand: 'ravenly',
    subject: 'product',
    stage: 'cold_outreach',
    roles: ['ae'],
    personas: ['solo_attorney'],
    personaLines: {},
    situation:
      'You are cold calling a solo criminal defense attorney for Ravenly. When you mention AI-assisted intake for his website, he stops you.',
    buyerLine:
      '“Hold on. An AI chatbot on my website? The last thing I need is a robot giving legal advice to people facing criminal charges. That’s my license on the line.”',
    objective:
      'Take the concern seriously, explain accurately what the intake experience and the AI do and do not do, and earn a short follow-up conversation without making compliance promises.',
    goodLooksLike: [
      '- Treats the concern as legitimate and answers calmly and briefly.',
      '- Explains accurately that visitors answer the intake questions in flows the firm approves, and that the AI summary and score help him review an inquiry; they are not legal advice, verified case valuation, or a decision to take the case. Does not claim the AI never says anything to visitors, or that it does, and offers to show exactly what a visitor would see.',
      '- Does not claim Ravenly is bar-approved or ethics-compliant, and does not suggest it can answer questions like an attorney.',
      '- Notes that he would approve the questions and the consent wording, and can read every original answer himself.',
      '- Asks a question that opens a conversation, such as what he wishes he knew before calling an inquiry back, and proposes a short look at how a criminal defense intake flow could work.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“What happens when someone types a question your chatbot doesn’t have an answer for? Does it make something up?”',
      '“And where does everything people type end up? I can’t have client confidences sitting on some server.”',
      '“I’m a one-man shop. I don’t have time for a demo, and I won’t pay for something I have to babysit.”',
    ],
    assessed: ['product_accuracy', 'objection_handling', 'empathy_clarity', 'advancing'],
    defaults: [4, 4, 3],
    sources: [
      { collection: 'ravenly-product', sections: ['02 · ', '04 · ', '18 · ', '11 · '] },
      { collection: 'sales-playbook', sections: ['6. '] },
    ],
  },
];

// Buyer pushbacks and role expectations for the seeded drills already in this stage, by slug.
export const EXISTING = {
  'cold-permission-opener': {
    pushbacks: [
      '“I get calls like this every week. What makes this one worth my time?”',
      '“Honestly, things are working fine for us right now. Why would I change anything?”',
      '“I really have to go. Just email me something and I’ll look at it when I can.”',
    ],
  },
  'ravenly-cold-reason': {
    pushbacks: [
      '“Our website form already emails every inquiry straight to us. Isn’t that the same thing?”',
      '“Adding another system is the last thing we need. Who’s going to learn it and keep it running?”',
      '“Every vendor who calls says we’re losing leads. Unless you can prove that about us, I’m hanging up.”',
    ],
  },
  'ravenly-already-have-chatbot': {
    pushbacks: [
      '“What would you do that our current chat tool doesn’t?”',
      '“We’re locked into a contract with them for another year anyway.”',
      '“If you want to stay on my radar, just send pricing. I don’t have time for a call.”',
    ],
  },
};
