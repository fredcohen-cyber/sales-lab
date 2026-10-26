// More versions of this stage's existing concepts: each tests the same skill as the question its
// concept names, with a different buyer, situation, or level.
export const QUESTIONS = [
  // ------------------------------------------------------------ discovery-cost-of-problem
  {
    slug: 'disc-discovery-cost-of-problem-v2',
    concept: 'discovery-cost-of-problem',
    title: 'Office manager shrugs off overnight delays',
    brand: 'both',
    product: 'general',
    subject: 'sales_technique',
    stage: 'discovery',
    roles: ['ae', 'am'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You are on a video call with the office manager of a nine-attorney workers’ compensation firm, who runs its front desk, two intake coordinators, and the attorneys’ calendars and does not see an urgent problem. If you are an AE, the firm is a new prospect; if you are an AM, it is an existing client. You represent your own company: Omnizant or Ravenly.',
    buyerLine:
      '“My team is on top of it. Sure, a web inquiry sits until morning now and then, or a caller gets voicemail when both coordinators are on the phone, but it all gets handled eventually.”',
    objective:
      'Get her to put a cost on the delays she is shrugging off, in hours or dollars and in her own words, without suggesting that her team is falling short.',
    goodLooksLike: [
      '- Acknowledges how much her team handles and does not imply that anyone is failing.',
      '- Asks one question at a time about the moments she named, such as how often an inquiry waits overnight and what happens to the voicemails, and follows each answer.',
      '- Gets her estimate of what the delays cost in her own units, such as coordinator hours spent chasing callbacks or callers who had already hired another firm by the time someone reached them.',
      '- Asks what a new workers’ compensation client is worth to the firm, or who would know, rather than supplying a figure, then does the math out loud with her numbers.',
      '- Asks what happens if nothing changes, for example in the firm’s busiest weeks.',
      '- Does not pitch or describe a product before the cost is on the table.',
    ].join('\n'),
    roleGuidance: {
      ae: [
        '- Uses the cost she names to judge whether the problem is worth a next meeting, and says so plainly if it is not.',
        '- Asks who else should be part of a decision like this, since she recommends but rarely signs, and what the attorneys would want to know.',
        '- Covers budget and timing without asking whether the firm can afford it, and ends with a dated meeting that includes whoever decides.',
      ].join('\n'),
      am: [
        '- Starts from what the firm already has from your company and what is working, instead of re-asking the basics.',
        '- Treats the gap as something to understand in her team’s day, not a cue for an upsell, and confirms what any change in scope would involve before proposing it.',
        '- Agrees on a dated review with her and the client’s sponsor, built on the cost she named.',
      ].join('\n'),
    },
    pushbacks: [
      '“I’d have to dig through the phone logs to give you real numbers, and I don’t have time for that this week.”',
      '“If I tell the attorneys we’re losing clients, it sounds like my team isn’t doing its job.”',
      '“Even if it’s a couple of clients a month, the attorneys won’t spend money on this. They took six months to approve a new copier.”',
    ],
    assessed: ['discovery', 'empathy_clarity', 'advancing'],
    defaults: [3, 3, 1],
    sources: [{ collection: 'sales-playbook', sections: ['3. ', '4. ', '1. '] }],
  },
  {
    slug: 'disc-discovery-cost-of-problem-v3',
    concept: 'discovery-cost-of-problem',
    title: 'Marketing manager says intake isn’t her problem',
    brand: 'both',
    product: 'general',
    subject: 'sales_technique',
    stage: 'discovery',
    roles: ['ae', 'am'],
    personas: ['marketing_manager'],
    personaLines: {},
    situation:
      'The marketing manager of a 35-attorney personal injury firm, who hands every lead she generates to a separate intake team, agreed to a call with you mostly as a courtesy. If you are an AE, the firm is a new prospect; if you are an AM, it is an existing client. You represent your own company: Omnizant or Ravenly.',
    buyerLine:
      '“My cost per lead is the best it’s been in three years. What intake does with those leads after I hand them over isn’t really my problem, and nobody’s complaining.”',
    objective:
      'Move her from cost per lead to what happens after the handoff, and get her to put a cost on any leakage in her own terms, such as wasted spend or cost per signed case, without arguing or pitching.',
    goodLooksLike: [
      '- Credits her results and does not argue that she has a problem.',
      '- Asks what happens to a lead after she hands it to intake, and how she would know if one was never called back.',
      '- Asks whether she can see how many of her leads become signed cases, and lets her notice the gap if she cannot.',
      '- Gets her to estimate the cost in her own terms, such as the ad spend behind leads that never got a response or what that does to cost per signed case, and does the math out loud with her numbers.',
      '- Asks what the partners judge her on and what happens if nothing changes.',
      '- Does not supply figures of its own, such as industry statistics, or start pitching.',
    ].join('\n'),
    roleGuidance: {
      ae: [
        '- Uses the cost she names to judge whether this is worth a next meeting, and qualifies budget, timing, and who else decides, such as the partner who runs intake.',
        '- Asks what evidence the partners would need, since she influences the decision but rarely owns the budget.',
        '- Ends with a dated meeting that includes the intake lead or a partner, built on the cost she named.',
      ].join('\n'),
      am: [
        '- Draws on what the account already knows, such as the results the firm already gets from your company, instead of re-asking the basics.',
        '- Treats any change as a fix for the cost she names rather than an upsell, and confirms scope and pricing before proposing it.',
        '- Agrees on a dated review with her and the client’s sponsor.',
      ].join('\n'),
    },
    pushbacks: [
      '“Intake reports to a different partner. Once a lead leaves my hands, I don’t see what happens to it.”',
      '“Even if I had that number, I’m measured on cost per lead. That’s what the partners look at.”',
      '“The partners love my numbers right now. If I walk in saying our leads are being wasted, I’m the one who looks bad.”',
    ],
    assessed: ['discovery', 'objection_handling', 'advancing'],
    defaults: [4, 4, 1],
    sources: [{ collection: 'sales-playbook', sections: ['3. ', '6. ', '1. '] }],
  },

  // ------------------------------------------------------------ ravenly-receptionist
  {
    slug: 'disc-ravenly-receptionist-v2',
    concept: 'ravenly-receptionist',
    title: 'Intake director says her team handles everything',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'discovery',
    roles: ['ae'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You are on a discovery call for Ravenly with the intake director of a 22-attorney personal injury firm. Her four intake specialists answer the phones and work every web form during office hours, and the managing partner asked her to take the call.',
    buyerLine:
      '“My team handles every inquiry that comes in, and they’re good at it. The partner asked me to take this call, but I don’t see what software would add except more screens for my people.”',
    objective:
      'Diagnose how her team handles inquiries today, especially after hours and at peak times, without criticizing her people, and find out whether Ravenly could make their work easier rather than add to it.',
    goodLooksLike: [
      '- Respects her team and her expertise, and does not suggest that software would replace her specialists.',
      '- Asks process questions in her terms: what happens to a web form at 8 p.m. or over a weekend, how a specialist knows an inquiry is theirs, and how follow-up attempts are tracked.',
      '- Asks where her team loses time today, such as scattered notifications, duplicate records, repeated questions, or piecing an inquiry’s details together before calling back.',
      '- Connects only what she raises to Ravenly, accurately: the original answers and an AI summary on the lead record, tasks, templates, and a shared view of the messages, tasks, and high-priority leads that need attention, with her team still making the calls and decisions.',
      '- Does not claim that Ravenly provides a human answering service or AI phone answering, or that a person or every channel responds around the clock; saying that website capture works outside office hours is accurate.',
      '- Asks what the managing partner wants from this evaluation and proposes a next step built on her team’s real inquiries, such as a focused look at the intake workspace with her and one specialist.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“We already have an intake screen in our case management system. Why would my team work in two places?”',
      '“After hours, our answering service takes messages, and we call everyone back first thing. What’s wrong with that?”',
      '“If I tell the partner this is worth a look and my team ends up working around it, that’s on me. What would you want my team to try first?”',
    ],
    assessed: ['discovery', 'product_accuracy', 'empathy_clarity', 'advancing'],
    defaults: [4, 4, 3],
    sources: [
      { collection: 'ravenly-product', sections: ['16 · ', '18 · ', '03 · ', '06 · ', '02 · '] },
      { collection: 'sales-playbook', sections: ['3. '] },
    ],
  },
  {
    slug: 'disc-ravenly-receptionist-v3',
    concept: 'ravenly-receptionist',
    title: 'Solo says his assistant covers every inquiry',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'discovery',
    roles: ['ae'],
    personas: ['solo_attorney'],
    personaLines: {},
    situation:
      'You are on a short phone discovery call for Ravenly with a solo family law attorney. His legal assistant of eleven years answers the phone and returns website inquiries during office hours, and he booked the call after a colleague mentioned Ravenly.',
    buyerLine:
      '“My assistant has been with me eleven years, and she calls back every web inquiry the same day. I’m happy to hear you out, but I don’t really see a gap.”',
    objective:
      'Find out what happens to inquiries when his assistant is busy, out, or gone for the day, without criticizing her, and judge honestly whether there is a gap worth solving.',
    goodLooksLike: [
      '- Respects the assistant and the relationship, and does not position Ravenly as a replacement for her.',
      '- Asks what happens to a website inquiry that arrives at 8 p.m., on a weekend, or while the assistant is on vacation, and how long it waits.',
      '- Asks what the assistant needs to know before calling someone back and how she gets it today, such as by asking the same questions on every call.',
      '- If relevant, explains that Ravenly’s chat, webform, and case evaluation can capture an inquiry’s details outside office hours for the assistant to pick up, and that it is not a live answering service or round-the-clock human coverage.',
      '- Accepts an honest answer if the gap is small, and proposes a next step only if he names a real cost, such as a short look at how an after-hours inquiry would reach his assistant.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“If someone fills out the form at night, she calls them first thing in the morning. Isn’t that soon enough?”',
      '“She’s not very technical. If this means learning a complicated system, it’s not worth it.”',
      '“I’m not going to pay a monthly fee to fix a problem I’m not sure I have.”',
    ],
    assessed: ['discovery', 'product_accuracy', 'empathy_clarity'],
    defaults: [2, 2, 2],
    sources: [
      { collection: 'ravenly-product', sections: ['16 · ', '18 · ', '02 · ', '12 · ', '03 · '] },
      { collection: 'sales-playbook', sections: ['3. '] },
    ],
  },

  // ------------------------------------------------------------ just-looking
  {
    slug: 'disc-just-looking-v2',
    concept: 'just-looking',
    title: 'Solo who filled out the form is just poking around',
    brand: 'both',
    product: 'general',
    subject: 'sales_technique',
    stage: 'discovery',
    roles: ['ae'],
    personas: ['solo_attorney'],
    personaLines: {},
    situation:
      'A solo estate planning attorney filled out the contact form on your website late last night, and you are calling her back the next morning. She picks up between client meetings. You represent your own company: Omnizant or Ravenly.',
    buyerLine: '“Oh, thanks for calling back so fast. Honestly, I’m just poking around at this point. What is it you all do, exactly?”',
    objective:
      'Answer her question briefly, normalize her early stage without pressure, find out what prompted her to reach out last night, and point her toward what would actually help.',
    goodLooksLike: [
      '- Normalizes “just poking around” warmly and without pressure.',
      '- Gives a one-line answer about what your company does, then turns back to her instead of running through services.',
      '- Asks what prompted her to fill out the form last night, or what she was hoping to find.',
      '- Offers to save her time by pointing her in the right direction once she has said what she needs.',
      '- Ends with a small, specific next step that fits her day, such as a set time for a short call, rather than offering to send information.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“I’m between meetings. Could you just email me something, and I’ll look at it tonight?”',
      '“I don’t really know what I need yet. That’s kind of why I filled out the form.”',
      '“I already talked to two other companies, and each one spent an hour telling me about itself. I don’t want to do that again.”',
    ],
    assessed: ['discovery', 'empathy_clarity', 'advancing'],
    defaults: [1, 1, 1],
    sources: [{ collection: 'sales-playbook', sections: ['3. ', '6. ', '5. '] }],
  },
  {
    slug: 'disc-just-looking-v3',
    concept: 'just-looking',
    title: 'Marketing manager is filling in a vendor spreadsheet',
    brand: 'both',
    product: 'general',
    subject: 'sales_technique',
    stage: 'discovery',
    roles: ['ae'],
    personas: ['marketing_manager'],
    personaLines: {},
    situation:
      'The marketing manager of a 28-attorney employment law firm booked a call through your website. She is running a vendor review for the partners and has a comparison spreadsheet open. You represent your own company: Omnizant or Ravenly.',
    buyerLine:
      '“I’m running a vendor review for the partners: five companies, twenty minutes each, one comparison sheet. Give me your two-minute version, and I’ll fill in the columns.”',
    objective:
      'Respect her process without becoming one more row in a spreadsheet: find out what prompted the review, what the partners need it to answer, and how the decision will be made, then offer direction.',
    goodLooksLike: [
      '- Respects her process and her time, and neither refuses the overview outright nor launches into a feature tour.',
      '- Offers a short frame, such as a two-line overview followed by two or three questions so the rest of the call covers what matters to her firm.',
      '- Asks what prompted the review now and what the partners need it to answer.',
      '- Asks what her comparison columns are and who chose them, and how the decision will be made: who else is involved, the budget, and the timing.',
      '- Does not criticize the other vendors on her list.',
      '- Ends with a dated next step tied to her review timeline, such as a focused follow-up before her shortlist goes to the partners.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Every vendor says they need to understand our needs first. What do you actually do?”',
      '“The partners want pricing in the comparison. Can you send me a one-pager with your prices by Friday?”',
      '“One of the other vendors already gave us a great demo. Why should I keep you on the list?”',
    ],
    assessed: ['discovery', 'objection_handling', 'advancing'],
    defaults: [4, 4, 1],
    sources: [{ collection: 'sales-playbook', sections: ['3. ', '6. ', '1. '] }],
  },

  // ------------------------------------------------------------ ravenly-attribution-discovery
  {
    slug: 'disc-ravenly-attribution-discovery-v2',
    concept: 'ravenly-attribution-discovery',
    title: 'Partner can’t tell which agency signs cases',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'discovery',
    roles: ['ae'],
    personas: ['managing_partner'],
    personaLines: {},
    situation:
      'You are on a discovery call for Ravenly with the managing partner of a 12-attorney personal injury firm. One agency runs the firm’s Google Ads and another runs its SEO, and he signs both invoices every month.',
    buyerLine:
      '“I write two agency checks every month, and each agency tells me its channel brings in the best cases. I can’t check either one. Tell me how you’d settle that, or let’s not waste each other’s time.”',
    objective:
      'Qualify the measurement problem before claiming anything: how leads, sources, and signed cases are recorded today, what decision he wants the data to support, and who else is involved, while stating accurately what Ravenly reporting can and cannot show.',
    goodLooksLike: [
      '- Does not promise to settle the agencies’ argument, prove ROI, or attribute every signed case to a channel.',
      '- Asks how a lead, a qualified lead, and a signed case are defined and recorded today, who marks the outcome, and how the source of a call or a web form is captured.',
      '- Asks what decision he wants to make with the answer, such as moving budget between the agencies, and what evidence would be enough for him.',
      '- Explains accurately that Ravenly’s paid and organic reports can connect identifiable sources to qualified and retained outcomes, cost per retained lead, and recorded won revenue where spend, attribution, and outcome data are available, and that leads with unknown or missing sources remain possible.',
      '- Notes that the reports depend on the firm recording stages and values consistently, and does not present the dedicated Revenue & Pipeline report, marked coming soon, as available.',
      '- Asks who else should be involved, such as whoever records intake outcomes, and proposes a dated next step with them.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Most of our cases start with a phone call, not a web form. Does your reporting even see those?”',
      '“My intake people don’t always update a case’s status. Does that throw off your numbers?”',
      '“Fine. Run it for ten days and show me which agency to fire.”',
    ],
    assessed: ['discovery', 'product_accuracy', 'objection_handling', 'advancing'],
    defaults: [5, 5, 4],
    sources: [
      { collection: 'ravenly-product', sections: ['09 · ', '16 · ', '10 · ', '06 · ', '19 · '] },
      { collection: 'sales-playbook', sections: ['3. '] },
    ],
  },
  {
    slug: 'disc-ravenly-attribution-discovery-v3',
    concept: 'ravenly-attribution-discovery',
    title: 'Office manager’s source column is half blank',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'discovery',
    roles: ['ae'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You are on a discovery call for Ravenly with the office manager of an eight-attorney family law firm. She keeps the intake spreadsheet, including a column for how each new client heard about the firm, and prepares a monthly marketing summary for the partners.',
    buyerLine:
      '“Every month the partners ask me which ads are bringing in clients, and I do my best from the spreadsheet. But half the time the ‘how did you hear about us’ column is blank or just says ‘Google.’ Could your system fill that in?”',
    objective:
      'Understand how sources and outcomes are recorded today and what the partners need to see, then explain accurately what Ravenly’s source tracking could add and where it stops.',
    goodLooksLike: [
      '- Asks how a new inquiry gets into the spreadsheet, who asks the source question, and how she marks which inquiries became clients.',
      '- Asks what the partners do with her summary, such as deciding where to spend, and what they would need to see to trust it.',
      '- Explains accurately that Ravenly records the source, channel, and landing page of website inquiries where that data is available, that it separates the source (such as Google) from the capture method (such as a webform), and that unknown or missing sources remain possible.',
      '- Notes that knowing which inquiries became clients still depends on her team recording stages consistently.',
      '- Does not promise that every blank will be filled or that the reports will prove which ads pay for themselves.',
      '- Asks who decides on a change like this and proposes a next step that includes a partner.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“A lot of our clients still call instead of filling out a form. Would it know where those people came from?”',
      '“Would I still have to keep my spreadsheet? The partners like the way it looks.”',
      '“The partners won’t pay for something just because it makes my spreadsheet easier. What would I even tell them?”',
    ],
    assessed: ['discovery', 'product_accuracy', 'advancing'],
    defaults: [2, 2, 3],
    sources: [
      { collection: 'ravenly-product', sections: ['09 · ', '06 · ', '16 · ', '10 · '] },
      { collection: 'sales-playbook', sections: ['3. '] },
    ],
  },

  // ------------------------------------------------------------ disc-omnizant-deal-with-me
  {
    slug: 'disc-omnizant-deal-with-me-v2',
    concept: 'disc-omnizant-deal-with-me',
    title: 'Office manager says to leave the attorneys out',
    brand: 'omnizant',
    product: 'omnizant_web',
    subject: 'sales_technique',
    stage: 'discovery',
    roles: ['ae'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You are on a first video call for Omnizant with the office manager of a four-attorney elder law firm. She handles the relationship with the firm’s website provider, she booked this call after your cold call, and none of the attorneys are on it.',
    buyerLine:
      '“I take care of the website company and pretty much all our vendors, so you can just work with me. The attorneys really don’t want to be bothered with this stuff.”',
    objective:
      'Respect her role and work through her while learning how a decision like this actually gets made: who approves it, what the attorneys would want to know, the budget, and the timing.',
    goodLooksLike: [
      '- Thanks her and works through her, without asking whether she is the decision-maker or trying to go around her.',
      '- Asks how the firm chose its current website provider and who approved it, to learn how decisions like this get made.',
      '- Asks what the attorneys would want to know before any change and who else should be part of the decision, framed as making her recommendation easy to approve.',
      '- Covers budget and timing without asking whether the firm can afford it, such as when the agreement with the current provider comes up for review, and does not give a price or ballpark before understanding what the firm needs.',
      '- Ends with a dated next step she agrees to, with the attorney who approves spending on the invite or a clear plan for how she will bring the recommendation to them.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“The attorneys will just ask me what it costs. Can you give me a ballpark I can pass along?”',
      '“Let me talk it over with the attorneys, and I’ll get back to you.”',
      '“Honestly, the website company has been fine. I just don’t want to rock the boat with the attorneys over this.”',
    ],
    assessed: ['discovery', 'empathy_clarity', 'advancing'],
    defaults: [2, 2, 1],
    sources: [{ collection: 'sales-playbook', sections: ['3. ', '6. ', '8. ', '5. ', '1. ', '4. '] }],
  },
  {
    slug: 'disc-omnizant-deal-with-me-v3',
    concept: 'disc-omnizant-deal-with-me',
    title: 'Managing partner says marketing calls are his alone',
    brand: 'omnizant',
    product: 'omnizant_web',
    subject: 'sales_technique',
    stage: 'discovery',
    roles: ['ae'],
    personas: ['managing_partner'],
    personaLines: {},
    situation:
      'You are on a discovery call for Omnizant with the managing partner of a 15-attorney criminal defense firm. Another provider rebuilt the firm’s website two years ago, the office manager handles that provider day to day, and two other partners share ownership of the firm.',
    buyerLine:
      '“I run this firm, and marketing decisions are mine. Don’t bother looping in my partners or my office manager. Just tell me what you’d do with our website.”',
    objective:
      'Respect his authority without taking it on faith: learn how a decision like this has actually been made at the firm, who else it touches, what they would need to see, the budget, and the timing, before saying what you would do.',
    goodLooksLike: [
      '- Respects his authority, does not challenge it or ask whether he is the decision-maker, and does not jump into recommendations before discovery.',
      '- Asks what result he wants from the website and how he judges the current provider, without criticizing it.',
      '- Asks how the firm made its last website decision, including whether the other partners weighed in, and who runs the website relationship day to day.',
      '- Frames bringing in the office manager as protecting his time and making any change go smoothly, not as adding approvers.',
      '- Covers budget and timing without asking whether the firm can afford it, including when the current agreement comes up for review.',
      '- Ends with a dated next step, such as the complimentary website review, a short video call on the firm’s public site and listings that needs no logins, and asks who else should join so no one reopens the decision later.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“My partners trust me on marketing. Bringing them in just slows everything down.”',
      '“Our agreement with the current provider has a year left. Does any of this matter until then?”',
      '“If you can’t tell me today what you’d change and what it costs, I don’t see why I’d meet with you again.”',
    ],
    assessed: ['discovery', 'objection_handling', 'advancing'],
    defaults: [4, 4, 1],
    sources: [
      { collection: 'sales-playbook', sections: ['3. ', '6. ', '8. ', '1. ', '4. '] },
      { collection: 'omnizant-product', sections: ['The complimentary website review'] },
    ],
  },

  // ------------------------------------------------------------ disc-omnizant-more-cases
  {
    slug: 'disc-omnizant-more-cases-v2',
    concept: 'disc-omnizant-more-cases',
    title: 'Partner wants signed cases, not marketing talk',
    brand: 'omnizant',
    product: 'omnizant_web',
    subject: 'sales_technique',
    stage: 'discovery',
    roles: ['ae'],
    personas: ['managing_partner'],
    personaLines: {},
    situation:
      'You are on a discovery call for Omnizant with the managing partner of a seven-attorney medical malpractice firm. The firm’s website is about five years old, he has little patience for marketing language, and he has given you 20 minutes.',
    buyerLine:
      '“I don’t care about clicks or rankings. I need more signed cases, period. The website should be bringing them in, and it isn’t. Can you fix that or not?”',
    objective:
      'Turn his demand into a specific goal and gap in his own numbers, such as signed cases a month by case type, before saying anything about what Omnizant would do or promising any result.',
    goodLooksLike: [
      '- Agrees that signed cases are the right measure and does not promise more cases, leads, or rankings.',
      '- Asks where he wants to be, such as how many signed cases a month and of which types, and how far that is from today.',
      '- Asks how new clients find the firm now and roughly what share come through the website, and what has already been tried.',
      '- Asks what a typical signed case is worth to the firm and lets him supply the number.',
      '- Steers from volume to fit, such as the kinds of cases he wants more of, and asks what happens if nothing changes this year.',
      '- Asks one question at a time and ends with a dated next step built on his numbers.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“I’ve answered these questions for three agencies already. Just tell me what you’d do.”',
      '“We get plenty of calls, and half of them are junk. I want better cases, not more noise.”',
      '“Will you guarantee more signed cases? If not, why would I pay you anything?”',
    ],
    assessed: ['discovery', 'objection_handling', 'advancing'],
    defaults: [4, 4, 1],
    sources: [{ collection: 'sales-playbook', sections: ['3. ', '1. ', '6. '] }],
  },
  {
    slug: 'disc-omnizant-more-cases-v3',
    concept: 'disc-omnizant-more-cases',
    title: 'Office manager told to find more clients',
    brand: 'omnizant',
    product: 'omnizant_web',
    subject: 'sales_technique',
    stage: 'discovery',
    roles: ['ae'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You are on a phone discovery call for Omnizant with the office manager of a three-attorney bankruptcy firm. She manages the firm’s website provider, and the attorneys asked her to find someone who could bring in more clients. Nobody at the firm tracks where new clients come from.',
    buyerLine:
      '“The attorneys just said, ‘Find someone who can get us more clients.’ That’s really all I know, and I’m the one who has to report back. Where would we even start?”',
    objective:
      'Help her turn the attorneys’ request into a specific goal and gap she can take back to them, in the firm’s own words and numbers, before describing what Omnizant would do.',
    goodLooksLike: [
      '- Thanks her and does not promise more clients or describe services yet.',
      '- Asks what kinds of clients the attorneys want more of and roughly how many a month would make a difference, and offers to help her find out if she does not know.',
      '- Asks how new clients reach the firm today, even roughly, such as calls, the website, or referrals, and whether anything has changed recently.',
      '- Asks what a typical new client is worth to the firm, or who would know, without supplying a figure.',
      '- Asks one question at a time and plays back what she said so she can repeat it to the attorneys.',
      '- Suggests a next step that brings in an attorney, such as a short call she books around their court schedule while you are both on the phone.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“I don’t know what a client is worth. I’d have to ask the attorneys.”',
      '“Could you just send me a proposal? I can forward it to them.”',
      '“The attorneys are in court most days. It’s really hard to get them on a call.”',
    ],
    assessed: ['discovery', 'empathy_clarity', 'advancing'],
    defaults: [1, 1, 1],
    sources: [{ collection: 'sales-playbook', sections: ['3. ', '6. ', '5. '] }],
  },

  // ------------------------------------------------------------ disc-omnizant-ai-search-partners
  {
    slug: 'disc-omnizant-ai-search-partners-v2',
    concept: 'disc-omnizant-ai-search-partners',
    title: 'Partner’s firm was missing from ChatGPT’s answer',
    brand: 'omnizant',
    product: 'omnizant_ai_search',
    subject: 'sales_technique',
    stage: 'discovery',
    roles: ['ae', 'am'],
    personas: ['managing_partner'],
    personaLines: {},
    situation:
      'You are meeting in person with the managing partner of an 18-attorney employment law firm. Last weekend he asked ChatGPT to recommend an employment lawyer in his city, and his firm was not mentioned. If you are an AE, the firm is a new prospect; if you are an AM, it is an existing Omnizant website and SEO client.',
    buyerLine:
      '“I asked ChatGPT for the best employment lawyer in town, and it named two of our competitors and not us. I want that fixed by the end of the quarter. Can you do it, yes or no?”',
    objective:
      'Diagnose before prescribing: treat his search as one observation, find out what he wants AI search to do for the firm and how he would judge success, and do not promise a mention or a recommendation.',
    goodLooksLike: [
      '- Takes the concern seriously but answers the yes-or-no honestly: no one can promise that ChatGPT or any AI platform will mention or recommend the firm, by the end of the quarter or at all, because each platform decides its own answers.',
      '- Explains briefly that one search is a single observation, and that a baseline would examine a defined set of prompts and platforms, with the method and dates stated.',
      '- Asks what he wants the result to produce, such as more of the employment matters the firm wants most, and how he would judge it: appearances, inquiries, consultations, or retained clients.',
      '- Asks how the firm tracks where inquiries come from today and what happens when one arrives, so any change can be measured beyond a mention.',
      '- Does not jump to Advantage AI or Max AI, or quote prices or deliverables, before the diagnosis.',
      '- Proposes a dated next step that respects his deadline without promising to meet it, such as a meeting with him and whoever runs the firm’s marketing to agree on the goal, how success would be judged, and what a baseline would cover.',
    ].join('\n'),
    roleGuidance: {
      ae: [
        '- Qualifies the new firm: who else decides, whether there is budget for this, and what is driving his quarter-end deadline.',
        '- Learns who handles the website and search work today, without criticizing any current provider.',
        '- Aims for a dated meeting that includes whoever runs marketing or the website.',
      ].join('\n'),
      am: [
        '- Starts from what Omnizant already does for the firm and what is working, rather than treating the call as a fresh start.',
        '- Treats an AI search plan as an expansion only if it serves the goal he names, and confirms any new scope and pricing before proposing it.',
        '- Involves the client’s main contact and sets a dated review before his deadline to agree on the goal, the measures, and whether an AI search plan fits, without implying results by then.',
      ].join('\n'),
    },
    pushbacks: [
      '“Is this just SEO with a new name? We already pay for SEO.”',
      '“How would I even know it’s working? I don’t want another report full of charts.”',
      '“Our competitors are already in those answers. If you won’t promise we’ll show up, why shouldn’t I hire whoever will?”',
    ],
    assessed: ['discovery', 'objection_handling', 'advancing'],
    defaults: [5, 5, 2],
    sources: [
      { collection: 'sales-playbook', sections: ['3. ', '6. '] },
      { collection: 'omnizant-ai-search', sections: ['The role within', 'How we earn confidence', 'Messaging guidance', 'How the plans fit'] },
    ],
  },
  {
    slug: 'disc-omnizant-ai-search-partners-v3',
    concept: 'disc-omnizant-ai-search-partners',
    title: 'AI search lands on the office manager’s desk',
    brand: 'omnizant',
    product: 'omnizant_ai_search',
    subject: 'sales_technique',
    stage: 'discovery',
    roles: ['ae', 'am'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You are on a call about AI search with the office manager of a five-attorney estate planning firm. She handles the firm’s website provider, so the attorneys asked her to look into it. If you are an AE, the firm is a new prospect; if you are an AM, it is an existing Omnizant website and SEO client.',
    buyerLine:
      '“Since I deal with our website people, the attorneys handed this AI search question to me. I don’t even know what I’m supposed to ask for. Where do I start?”',
    objective:
      'Diagnose before prescribing: find out what prompted the attorneys’ interest and what they hope it will do for the firm, and give her a clear, honest way to take it back to them.',
    goodLooksLike: [
      '- Does not jump to a plan or promise that AI tools will mention or recommend the firm.',
      '- Asks what prompted the attorneys’ interest, such as a client mentioning ChatGPT, something they read, or a competitor.',
      '- Asks what the attorneys would count as a good outcome, such as more estate planning consultations, and which kinds of matters they want more of.',
      '- Asks how the firm knows today where new clients come from and what happens when someone inquires through the website.',
      '- If she asks what the work is, explains in plain terms that it aims to strengthen how the firm is represented in AI search, and that each platform decides its own answers.',
      '- Offers her a short summary to bring the attorneys and proposes a next step with an attorney on it, booked while you are both on the call.',
    ].join('\n'),
    roleGuidance: {
      ae: [
        '- Learns who decides and how, since she recommends but does not sign, and asks about budget and timing without asking whether the firm can afford it.',
        '- Asks how the website and search work are handled today, without criticizing the current provider.',
        '- Books a dated meeting with an attorney on the invite.',
      ].join('\n'),
      am: [
        '- Starts from what Omnizant already does for the firm and what is working, rather than treating the call as new business.',
        '- Treats an AI search plan as an expansion only if it serves the goal the attorneys name, and confirms scope and pricing before proposing it.',
        '- Offers to help her prepare a short update for the attorneys and sets a dated review with the client’s sponsor.',
      ].join('\n'),
    },
    pushbacks: [
      '“Can you just tell me which plan to buy? I don’t want to waste the attorneys’ time.”',
      '“One of the attorneys asked if we’d come up first on ChatGPT. What do I tell her?”',
      '“If it costs more than our website does, they’ll say no. What does it cost?”',
    ],
    assessed: ['discovery', 'empathy_clarity', 'advancing'],
    defaults: [2, 2, 1],
    sources: [
      { collection: 'sales-playbook', sections: ['3. ', '5. ', '4. '] },
      { collection: 'omnizant-ai-search', sections: ['Positioning in brief', 'The role within', 'Messaging guidance'] },
    ],
  },

  // ------------------------------------------------------------ disc-ravenly-answer-my-phone
  {
    slug: 'disc-ravenly-answer-my-phone-v2',
    concept: 'disc-ravenly-answer-my-phone',
    title: 'Office manager wants overflow calls answered',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'discovery',
    roles: ['ae'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You are on a discovery call for Ravenly with the office manager of a six-attorney criminal defense firm. Two receptionists answer the phones, and on Monday mornings, after weekend arrests, new callers roll to voicemail while both lines are busy.',
    buyerLine:
      '“Monday mornings are chaos. Both of my front desk people are on the phone, and new callers go to voicemail. I need something that picks up when they can’t. Can Ravenly do that?”',
    objective:
      'Find out where the firm’s inquiries come from and what happens to each at peak times, answer the phone question accurately, and separate what Ravenly could help with from live phone coverage.',
    goodLooksLike: [
      '- Does not claim that Ravenly answers phones, provides a live or AI answering service, or covers every channel around the clock.',
      '- Asks how new inquiries arrive (calls, website, referrals), roughly how many of each on a Monday, and what happens today to a voicemail and to a web form sent over the weekend.',
      '- Asks what a missed or late call costs the firm, such as callers who hired another lawyer before anyone called back, in her numbers.',
      '- Separates the needs plainly: Ravenly’s chat, webform, and case evaluation can capture website inquiries with their details outside office hours, while answering overflow calls live is a separate requirement that the reviewed offering does not establish.',
      '- Mentions phone-related features only accurately, such as call forwarding to an office or mobile number being separate from an answering service, and offers to confirm anything else rather than guessing.',
      '- Agrees on a next step that fits what she described, which may be a look at how weekend web inquiries are handled or a plain statement that phone overflow needs a different kind of service.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Can’t it at least text back everyone who calls and doesn’t get through?”',
      '“The partners will ask me what this replaces. If it doesn’t replace anything, it’s just another bill.”',
      '“If it can’t pick up the phone, I don’t see how it fixes my Monday problem. Tell me straight: is this the wrong tool for us?”',
    ],
    assessed: ['discovery', 'product_accuracy', 'empathy_clarity', 'advancing'],
    defaults: [3, 3, 3],
    sources: [{ collection: 'ravenly-product', sections: ['02 · ', '03 · ', '07 · ', '08 · ', '16 · ', '18 · '] }],
  },
  {
    slug: 'disc-ravenly-answer-my-phone-v3',
    concept: 'disc-ravenly-answer-my-phone',
    title: 'Partner wants a yes or no on phone answering',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'discovery',
    roles: ['ae'],
    personas: ['managing_partner'],
    personaLines: {},
    situation:
      'You are on a discovery call for Ravenly with the managing partner of a 16-attorney personal injury firm. The firm’s TV and Google ads drive most of its phone calls, and he has heard that AI can now answer law firm phones.',
    buyerLine:
      '“I’m told AI can answer the phones now. Every call that hits voicemail after six is a case walking out the door. Does Ravenly answer my phones, yes or no? Don’t give me a speech.”',
    objective:
      'Answer directly and accurately, diagnose where the firm’s inquiries come from and what an unanswered call costs, and be honest about fit if after-hours phone coverage is the core need.',
    goodLooksLike: [
      '- Answers the yes-or-no directly: the reviewed Ravenly offering did not establish AI phone answering or a staffed answering service, so the rep claims neither and offers to confirm current product status rather than guess.',
      '- Separates the needs: website inquiries can be captured with their details outside office hours, while answering calls is a separate service requirement.',
      '- Asks how inquiries split between calls and the website, how many calls go unanswered after six, and what happens to them today, such as voicemail, an answering service, or a callback the next morning.',
      '- Gets his numbers on what an unanswered call costs, such as how many signed cases a month he believes are lost and what a typical case is worth, without supplying or inflating them.',
      '- Describes phone-related integrations only accurately, such as the CallRail integration, which the catalog describes for call, text, and form events, and call forwarding to an office or mobile number, each to be confirmed for the firm and neither of them an answering service.',
      '- Says plainly if Ravenly is not the fit for after-hours phone coverage, and proposes a next step only where there is one, such as evaluating the firm’s web intake and follow-up separately.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“So what happens when someone calls at nine at night? Walk me through it with your product.”',
      '“Your own trial page says 35 percent of calls go unanswered. Doesn’t that prove my point?”',
      '“If you can’t answer my phones, give me one reason not to hang up and call an answering service right now.”',
    ],
    assessed: ['discovery', 'product_accuracy', 'objection_handling', 'advancing'],
    defaults: [5, 5, 5],
    sources: [{ collection: 'ravenly-product', sections: ['02 · ', '03 · ', '07 · ', '16 · ', '18 · ', '21 · '] }],
  },

  // ------------------------------------------------------------ disc-ravenly-low-volume-fit
  {
    slug: 'disc-ravenly-low-volume-fit-v2',
    concept: 'disc-ravenly-low-volume-fit',
    title: 'Referral-based firm asks why it needs intake software',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'discovery',
    roles: ['ae'],
    personas: ['managing_partner'],
    personaLines: {},
    situation:
      'You are on a discovery call for Ravenly with the managing partner of a three-attorney business law firm. Most new matters come from referrals, the website brings in about a dozen inquiries a month, and the firm’s paralegal forwards each one to whichever partner seems right.',
    buyerLine:
      '“Ninety percent of our work comes from referrals. The website gets maybe a dozen inquiries a month, and half of those want free advice. Make the case for why a firm like ours needs this, because I don’t see it.”',
    objective:
      'Assess fit honestly at the firm’s volume: how web inquiries are handled, whether slow or uneven handling costs the firm anything, and whether the economics work, without inflating the opportunity.',
    goodLooksLike: [
      '- Does not insist that the firm needs Ravenly, and treats “make the case” as a reason to diagnose rather than pitch.',
      '- Asks how a web inquiry is handled today: who sees it first, how quickly someone responds, how the paralegal decides which partner gets it, and whether any good matters have gone to another firm.',
      '- Asks how much partner time the poor-fit inquiries take, and what the right kind of business matter is worth to the firm, in his numbers.',
      '- Keeps the economics plausible at a dozen inquiries a month: no aggressive projection, no marketing statistics presented as facts, and a scenario where nothing changes.',
      '- If plan scope comes up, states it accurately: published lead allowances exclude phone calls and spam, Launch lists 25 monthly leads, 2 users, 3 practice areas, and 1 website at $99 a month on yearly billing or $119 monthly, and what counts toward the allowance is something to confirm.',
      '- Gives an honest recommendation, including that it may not be worth it yet, and if there is a fit, proposes a narrow next step built on the firm’s own gap.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Could it at least screen out the people who just want free advice? That’s what wastes our time.”',
      '“Our referral sources call me directly. Your software wouldn’t even see most of our business, would it?”',
      '“If you can’t show me this pays for itself on a dozen inquiries a month, we’re done. So show me.”',
    ],
    assessed: ['discovery', 'product_accuracy', 'objection_handling', 'advancing'],
    defaults: [4, 4, 4],
    sources: [{ collection: 'ravenly-product', sections: ['03 · ', '05 · ', '12 · ', '16 · ', '19 · ', '21 · '] }],
  },
  {
    slug: 'disc-ravenly-low-volume-fit-v3',
    concept: 'disc-ravenly-low-volume-fit',
    title: 'Office manager asks if this is overkill',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'discovery',
    roles: ['ae'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You are on a phone discovery call for Ravenly with the office manager of a two-attorney immigration firm. She answers the phone, keeps both attorneys’ calendars, and replies to the few website inquiries between other work. One of the attorneys saw Ravenly online and asked her to look into it.',
    buyerLine:
      '“One of the attorneys asked me to look into you. We get two or three website inquiries a week, and I answer them between everything else. Before I put a demo on her calendar, tell me honestly: is this overkill for an office our size?”',
    objective:
      'Assess fit honestly at her volume: how inquiries are handled and how quickly, whether any slip away, and whether the numbers would justify a change, without overselling.',
    goodLooksLike: [
      '- Takes her question seriously, respects that she is screening this for the attorneys, and does not insist that the firm needs Ravenly.',
      '- Asks how soon an inquiry usually gets a reply, what happens on busy days or when she is out, and whether anyone has hired another firm before she got back to them.',
      '- Asks what she needs to know before booking a consultation and how much back-and-forth that takes today.',
      '- Asks what a new immigration client is worth to the firm, or which attorney would know, without supplying a number or quoting marketing statistics as facts.',
      '- If price or scope comes up, states it accurately: Launch lists 25 monthly leads, 2 users, 3 practice areas, and 1 website at $99 a month on yearly billing or $119 monthly, with what counts toward the allowance to confirm.',
      '- Gives an honest view, which may be that it is not worth it at their volume yet, and if there is a fit, suggests a next step that includes an attorney.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“The attorneys would have to approve anything that costs money. What would I even tell them?”',
      '“Could I try it first? I don’t want to sign up and then be stuck with it.”',
      '“If it takes me hours to set up, I just don’t have that time.”',
    ],
    assessed: ['discovery', 'product_accuracy', 'empathy_clarity'],
    defaults: [2, 2, 3],
    sources: [
      { collection: 'ravenly-product', sections: ['03 · ', '12 · ', '16 · ', '18 · ', '21 · '] },
      { collection: 'sales-playbook', sections: ['3. '] },
    ],
  },

  // ------------------------------------------------------------ disc-ravenly-run-itself
  {
    slug: 'disc-ravenly-run-itself-v2',
    concept: 'disc-ravenly-run-itself',
    title: 'Intake director burned by the last system',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'discovery',
    roles: ['ae'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You are on a video discovery call for Ravenly with the intake director of a 30-attorney workers’ compensation firm. Her five intake specialists work from three inboxes, a phone system, and the case management system, and the last intake tool the partners bought was dropped within a few months.',
    buyerLine:
      '“Last time the partners bought a system, my team spent months on setup, then stopped using it, and I took the blame. If yours needs anyone to babysit it, I’ll tell them no. So does it run itself or not?”',
    objective:
      'Set honest expectations about what Ravenly automates and what her team would still own, find out what went wrong last time, and qualify whether her team can support a successful rollout.',
    goodLooksLike: [
      '- Answers honestly that it does not run itself: automations can be configured to send approved acknowledgements and create tasks, validated before launch, while her team still owns responses, stages, and data.',
      '- Asks what went wrong with the last system, such as setup time, double entry, or a poor fit with how her team works, and treats her answer as a requirement.',
      '- Asks how inquiries reach her team today and who owns each step, including how a specialist knows an inquiry is theirs and how she knows it was handled.',
      '- Connects only what fits her problems, such as one view of messages awaiting response, tasks due or overdue, and high-priority leads, and templates for consistent replies, without implying those processes come already configured.',
      '- Describes setup accurately: full-service onboarding is listed at $3,000 one-time for configuration, website work, and individual training, the firm still supplies approvals and access, how it applies to the plan is confirmed, and the handoff to the case management system must be scoped rather than assumed.',
      '- Proposes a limited evaluation her team runs on real scenarios with agreed measures and her as the named owner, rather than a firm-wide rollout.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“My specialists already juggle three inboxes and the case management system. How does one more screen help?”',
      '“Can it automatically assign each new inquiry to the right specialist, so I don’t have to?”',
      '“If your onboarding team sets it up and then disappears, I’m stuck maintaining it. Who supports us after launch, and how fast do they respond?”',
    ],
    assessed: ['discovery', 'product_accuracy', 'objection_handling', 'advancing'],
    defaults: [5, 5, 4],
    sources: [{ collection: 'ravenly-product', sections: ['08 · ', '06 · ', '05 · ', '11 · ', '12 · ', '20 · '] }],
  },
  {
    slug: 'disc-ravenly-run-itself-v3',
    concept: 'disc-ravenly-run-itself',
    title: 'Solo with no staff needs it to run itself',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'discovery',
    roles: ['ae'],
    personas: ['solo_attorney'],
    personaLines: {},
    situation:
      'You are on a phone discovery call for Ravenly with a solo bankruptcy attorney who has no staff. He answers every web inquiry himself between court appearances and client meetings, and he already uses Calendly for consultations.',
    buyerLine: '“It’s just me here, no assistant. So whatever I get has to pretty much run itself. Is that how this works?”',
    objective:
      'Set honest expectations about what Ravenly can automate for a one-person practice and what he would still do himself, and find out whether he can realistically own the follow-up.',
    goodLooksLike: [
      '- Answers honestly that it would not run itself: automations can be configured to send an approved acknowledgement by text or email and create a task, while he still calls people back, decides on each inquiry, and keeps stages up to date.',
      '- Asks how he handles an inquiry today, from arrival to response, and where it falls through, such as during a long day in court.',
      '- Asks how many web inquiries he gets and what a new bankruptcy client is worth to him, without supplying the figures.',
      '- Notes accurately that texting requires messaging registration and approved consent wording, and that Calendly scheduling from chat or case evaluation depends on the integration being set up and on confirming whether the plan he would choose includes it.',
      '- Mentions mobile access only as published, if it fits: Ravenly has iOS and Android app listings and describes mobile replies that keep personal numbers private, with details to confirm.',
      '- Raises the fit question plainly, since software cannot follow up for him if no one owns the responses, and proposes a next step that fits, such as a short look at how an acknowledgement and a task would work for his practice.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“So when someone fills out the form at midnight, what do they get from me, and what’s waiting for me in the morning?”',
      '“Can people just book themselves into my Calendly from your chat?”',
      '“I can give this maybe an hour to set up. If that’s not realistic, tell me now.”',
    ],
    assessed: ['discovery', 'product_accuracy', 'empathy_clarity'],
    defaults: [2, 2, 3],
    sources: [{ collection: 'ravenly-product', sections: ['08 · ', '07 · ', '04 · ', '03 · ', '12 · ', '18 · '] }],
  },

  // ------------------------------------------------------------ disc-ravenly-calculator-108x
  {
    slug: 'disc-ravenly-calculator-108x-v2',
    concept: 'disc-ravenly-calculator-108x',
    title: 'Partner says nothing returns 108 times',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'discovery',
    roles: ['ae'],
    personas: ['managing_partner'],
    personaLines: {},
    situation:
      'You are on a discovery call for Ravenly with the managing partner of a nine-attorney immigration firm. He looked at the calculator on Ravenly’s pricing page before the call and brings it up in the first minute.',
    buyerLine:
      '“Your website says I’d add $648,000 a year, a 108 times return. I’ve run this firm for twenty years, and nothing returns 108 times. Why should I trust anything else you tell me?”',
    objective:
      'Earn back his trust by explaining the calculator figure accurately as an illustrative scenario rather than a result, then move into discovery of the firm’s own numbers.',
    goodLooksLike: [
      '- Agrees the figure should not be read as a forecast, without getting defensive or dismissing the calculator.',
      '- Explains accurately that it follows the calculator’s default assumptions, a 25% increase in captured leads and a 25% relative improvement in close rate with an illustrative $500 monthly cost, which is not one of the named plan prices, and that it is not an observed customer outcome.',
      '- Notes that the 108x compares incremental revenue with cost, not net profit, and does not offer a different multiple or a guarantee in its place.',
      '- Asks for the firm’s baseline: monthly inquiries, how many become retained clients, and what a typical immigration matter is worth to the firm.',
      '- Offers to build a transparent model with him from those numbers, including a scenario where nothing changes, and to test its assumptions in a measured evaluation.',
      '- Ends with a dated next step that includes whoever tracks the firm’s intake numbers.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“I don’t know our retained rate offhand. My office manager might. Can you even build anything without it?”',
      '“My partners will see that calculator too. What am I supposed to tell them about it?”',
      '“Every vendor I meet inflates their numbers. Why would I believe a model you build any more than that calculator?”',
    ],
    assessed: ['product_accuracy', 'discovery', 'objection_handling', 'advancing'],
    defaults: [4, 5, 4],
    sources: [
      { collection: 'ravenly-product', sections: ['19 · ', '21 · ', '12 · '] },
      { collection: 'sales-playbook', sections: ['3. '] },
    ],
  },
  {
    slug: 'disc-ravenly-calculator-108x-v3',
    concept: 'disc-ravenly-calculator-108x',
    title: 'Solo’s calculator result tops his annual billing',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'discovery',
    roles: ['ae'],
    personas: ['solo_attorney'],
    personaLines: {},
    situation:
      'You are on a video discovery call for Ravenly with a solo criminal defense attorney. Before the call, he ran the calculator on Ravenly’s pricing page with its default settings and took a screenshot.',
    buyerLine:
      '“I ran your calculator, and it says I’d add $648,000 a year. I’m a solo. That’s more than I’ve ever billed in a year. How is that number supposed to apply to me?”',
    objective:
      'Explain plainly why the calculator figure does not describe his practice, without embarrassment or spin, then build a realistic picture from his own numbers.',
    goodLooksLike: [
      '- Explains that the figure comes from the calculator’s default assumptions, a 25% increase in captured leads and a 25% relative improvement in close rate with an illustrative $500 monthly cost, not from his practice or from an observed customer result.',
      '- Notes that $500 is not one of the named plan prices, and that the 108x multiple compares incremental revenue with cost, not profit.',
      '- Asks for his own numbers: how many inquiries he gets a month, how many become clients, and what a typical case is worth to him.',
      '- Does the math out loud with his numbers, keeps any scenario modest, and includes what happens if nothing changes.',
      '- Does not replace the calculator figure with a different multiple, a forecast of its own, or a promise; any scenario uses his numbers and is framed as an assumption to test.',
      '- Proposes a next step tied to his numbers, such as a short evaluation focused on the inquiries he currently misses or answers late.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“If I put my own numbers in, it’s a lot less exciting. Is it still worth it?”',
      '“So what’s the cheapest plan, and would it actually cover me?”',
      '“Most of my cases are flat fees, and half my clients pay in installments. Does your model even work for that?”',
    ],
    assessed: ['product_accuracy', 'discovery', 'empathy_clarity', 'advancing'],
    defaults: [3, 3, 4],
    sources: [
      { collection: 'ravenly-product', sections: ['19 · ', '12 · ', '21 · '] },
      { collection: 'sales-playbook', sections: ['3. '] },
    ],
  },

  // ------------------------------------------------------------ disc-ravenly-evaluation-plan
  {
    slug: 'disc-ravenly-evaluation-plan-v2',
    concept: 'disc-ravenly-evaluation-plan',
    title: 'Intake director needs a test plan for the partner',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'discovery',
    roles: ['ae'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You are near the end of a discovery call for Ravenly with the intake director of a 25-attorney Social Security disability firm. She has told you that chat and web form inquiries land in two different inboxes, her team re-enters each one into the case management system, and duplicate records are common.',
    buyerLine:
      '“So that’s our setup. If I take this to the managing partner, I need to tell him exactly what we’d test and how we’d know it worked. What would you suggest?”',
    objective:
      'Close discovery with a specific evaluation agreement she can take to the managing partner: the main gap in her words, the workflow to test, the measures, the open requirements, and who decides by when.',
    goodLooksLike: [
      '- Plays back her problem in her words, such as two inboxes, re-entry, and duplicates, and checks that nothing is missing.',
      '- Names one main gap and one workflow to evaluate, such as every web inquiry landing in one place with an owner and a next task, instead of offering a feature tour.',
      '- Proposes a baseline and a few measures her team can track, such as time to first meaningful response, the share of inquiries with an owner and a next task, and staff minutes per inquiry, sampled the same way before and after.',
      '- Lists the open requirements to confirm without promising them: the handoff into the case management system (which event sends which fields, in which direction), and messaging registration and consent wording if texting is included.',
      '- Asks who decides and proposes a dated review with the managing partner, for example at the end of a 10-day trial in which her team works agreed scenarios.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Will it stop the duplicates? That’s half my team’s headaches.”',
      '“My team is slammed. How much of their time would a trial actually take?”',
      '“The managing partner’s first question will be whether it connects to our case management system. Does it?”',
    ],
    assessed: ['discovery', 'product_accuracy', 'persuasion', 'advancing'],
    defaults: [3, 3, 3],
    sources: [
      { collection: 'ravenly-product', sections: ['16 · ', '19 · ', '20 · ', '06 · ', '10 · '] },
      { collection: 'sales-playbook', sections: ['5. '] },
    ],
  },
  {
    slug: 'disc-ravenly-evaluation-plan-v3',
    concept: 'disc-ravenly-evaluation-plan',
    title: 'Marketing manager gets one shot with the partners',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'discovery',
    roles: ['ae'],
    personas: ['marketing_manager'],
    personaLines: {},
    situation:
      'You are near the end of a discovery call for Ravenly with the marketing manager of a 45-attorney personal injury and employment firm. She has told you the firm spends on Google Ads and Local Services Ads, the intake team works leads from a shared inbox, and the partners want to know which campaigns produce retained clients.',
    buyerLine:
      '“I’ve sat through three vendor demos this quarter, and every one ended with ‘let’s set up a trial.’ The partners will give me one shot at this. What exactly would we evaluate, how would I prove it worked, and by when?”',
    objective:
      'Close discovery with an evaluation agreement precise enough for her partners: one gap, one workflow, measures with definitions and limits, open requirements, and a dated decision with the right people.',
    goodLooksLike: [
      '- Plays back the problem in her words, checks that nothing is missing, and names one main gap rather than proposing a broad trial.',
      '- Proposes one workflow to evaluate, such as tracing paid inquiries from campaign through owner and next task to a recorded outcome, instead of a feature tour.',
      '- Defines the measures and their limits: a baseline, time to first acknowledgement and to first meaningful staff response tracked separately, the share of inquiries with a usable source and complete outcome fields, and retained outcomes only as the firm records them.',
      '- Says plainly that a 10-day trial can validate setup and workflow but may be too short to show retained revenue, and proposes how outcomes would be judged over a longer period, allowing for campaign changes and seasonality.',
      '- Lists the open requirements to confirm without promising them, such as the Google Ads conversion mappings, the Local Services Ads import cadence, the case management handoff, and messaging registration.',
      '- Asks who decides and proposes a dated review with the partners and the intake lead.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“The partners don’t care about response times. They want cost per signed case by campaign. Can your reports give me that?”',
      '“Our intake team doesn’t update stages consistently. Won’t that make the numbers useless?”',
      '“If the trial doesn’t show retained cases, the partners will kill it. Promise me it will, or I’m wasting my one shot.”',
    ],
    assessed: ['discovery', 'product_accuracy', 'objection_handling', 'advancing'],
    defaults: [5, 4, 4],
    sources: [
      { collection: 'ravenly-product', sections: ['16 · ', '19 · ', '09 · ', '08 · ', '10 · '] },
      { collection: 'sales-playbook', sections: ['5. '] },
    ],
  },

  // ------------------------------------------------------------ disc-second-office
  {
    slug: 'disc-second-office-v2',
    concept: 'disc-second-office',
    title: 'Office manager is setting up the second office',
    brand: 'both',
    product: 'general',
    subject: 'sales_technique',
    stage: 'discovery',
    roles: ['ae', 'am'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You are on a video call with the office manager of an eight-attorney immigration firm, who is setting up the phones, front desk, and calendars for a second office the firm will open across town in the fall. If you are an AE, you are qualifying a new firm; if you are an AM, the firm is an existing client. You represent your own company: Omnizant or Ravenly.',
    buyerLine:
      '“We’re opening a second office in the fall, and I’m the one getting it ready: phones, front desk, scheduling, all of it. The partners want it full of clients from day one, so I’m trying to figure out what we need.”',
    objective:
      'Explore the expansion before offering anything: what the partners expect from the new office, how new clients will reach it, what happens if they do not, and who decides, so any recommendation is built from the firm’s own plan.',
    goodLooksLike: [
      '- Shows interest in her project and asks what “full of clients” means to the partners: how many new clients a month, by when, and for which kinds of matters.',
      '- Asks how new clients reach the firm today and how the new office will get its share, such as its own phone line, its own web pages, or referrals.',
      '- Asks how inquiries for the new office will be handled and by whom, and what happens if they wait in the first few months.',
      '- Asks who decides on the new office and its budget, and when things need to be in place, without asking whether the firm can afford it.',
      '- Does not pitch, quote, or promise results before the diagnosis, and offers a next step she can take to the partners.',
    ].join('\n'),
    roleGuidance: {
      ae: [
        '- Qualifies the new firm: who signs off on spending for the new office, the budget for setting it up, and the opening date as a real reason to act.',
        '- Asks who else should be part of the decision, since she prepares the office but the partners decide.',
        '- Aims for a dated meeting with a partner on it, built around the new office’s goals.',
      ].join('\n'),
      am: [
        '- Connects the new office to what the account already has: what works today, and what the current scope does and does not cover for a second location.',
        '- Uncovers the need before proposing any change in scope or price, and confirms what a change would involve before quoting it.',
        '- Brings in the client’s sponsor with her and sets a dated planning session well before the opening.',
      ].join('\n'),
    },
    pushbacks: [
      '“I just need to know what to buy. Can you send me a list of options I can show the partners?”',
      '“Honestly, the partners haven’t even decided whether the new office gets its own phone number. I can’t answer half your questions.”',
      '“Everything for the new office has to fit the budget the partners already set, and I don’t know how much of it is left.”',
    ],
    assessed: ['discovery', 'empathy_clarity', 'advancing'],
    defaults: [2, 2, 1],
    sources: [{ collection: 'sales-playbook', sections: ['3. ', '4. ', '6. '] }],
  },
  {
    slug: 'disc-second-office-v3',
    concept: 'disc-second-office',
    title: 'Solo is opening a satellite office',
    brand: 'both',
    product: 'general',
    subject: 'sales_technique',
    stage: 'discovery',
    roles: ['ae', 'am'],
    personas: ['solo_attorney'],
    personaLines: {},
    situation:
      'On a phone call, a solo workers’ compensation attorney tells you he is opening a satellite office in his hometown, two hours away, and will split his week between the two. If you are an AE, you are qualifying a new practice; if you are an AM, the practice is an existing client. You represent your own company: Omnizant or Ravenly.',
    buyerLine:
      '“I’m opening a second office back home, two days a week. I need it busy fast, because I’m paying rent on two places now. Just tell me what you’d do to fill it.”',
    objective:
      'Resist prescribing on demand: explore what busy means for the new office, where its clients will come from, what it costs if they do not come, and what he can realistically handle, before recommending anything.',
    goodLooksLike: [
      '- Acknowledges the pressure of two rents and does not jump to a plan, a quote, or a promise of cases.',
      '- Asks what busy means: how many new cases a month the new office needs to cover its costs, by when, and of what kind.',
      '- Asks where his clients come from today and what will carry over to his hometown, such as referrals or people who already know him there.',
      '- Asks how he will handle inquiries for both offices while splitting his week and appearing in court, and what happens to one that arrives on the wrong day.',
      '- Gets the cost of the gap in his numbers, such as the monthly rent the new office has to cover, and does the math out loud with him.',
      '- Covers budget and timing without asking whether he can afford it, and ends with a dated next step.',
    ].join('\n'),
    roleGuidance: {
      ae: [
        '- Qualifies the new practice: budget for the expansion, his timing, and whether anyone else has a say in the decision.',
        '- Uses the opening date and the second rent as real reasons to act, without inventing urgency.',
        '- Aims for a dated meeting framed around the new office’s numbers.',
      ].join('\n'),
      am: [
        '- Connects the new office to what the practice already has from your company, what is working, and what the current scope does and does not cover.',
        '- Uncovers the need before proposing any change in scope or price, and confirms what a change would involve before quoting it.',
        '- Sets a dated planning session well before the opening.',
      ].join('\n'),
    },
    pushbacks: [
      '“I don’t have time for twenty questions. I’m in court tomorrow. What’s your plan?”',
      '“I already spent a fortune on the lease and furniture. I can’t take on another big monthly bill right now.”',
      '“Another company already told me they’d get me fifteen cases a month out there. Can you beat that?”',
    ],
    assessed: ['discovery', 'objection_handling', 'advancing'],
    defaults: [4, 4, 1],
    sources: [{ collection: 'sales-playbook', sections: ['3. ', '4. ', '6. ', '1. '] }],
  },

  // ------------------------------------------------------------ disc-price-before-questions
  {
    slug: 'disc-price-before-questions-v2',
    concept: 'disc-price-before-questions',
    title: 'Office manager needs a price before booking partners',
    brand: 'both',
    product: 'general',
    subject: 'sales_technique',
    stage: 'discovery',
    roles: ['ae'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You are a few minutes into a scheduled discovery call with the office manager of a seven-attorney family law firm. She screens every vendor before the partners will meet with one. You represent your own company: Omnizant or Ravenly.',
    buyerLine:
      '“Before we go any further, I need a price. The partners always ask me that first, and I’m not putting anyone on their calendar if it’s out of our range.”',
    objective:
      'Respect her role as the gatekeeper without dodging: acknowledge the request, earn a few questions so any number is the right one, and give her what she needs to bring the partners.',
    goodLooksLike: [
      '- Acknowledges that price is a fair first question and that she protects the partners’ time.',
      '- Uses a frame-control line, such as offering to get her a number and asking two or three quick questions first so it is the right number.',
      '- Keeps the questions short and useful to her, such as what prompted the call, what problem the partners want solved, and what range they have in mind.',
      '- Does not invent prices, packages, or discounts to keep her on the line.',
      '- Gives her something to bring the partners, such as the problem in her words and what a recommendation would depend on, and proposes a dated next step, ideally with a partner on it.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Just give me a range. I won’t hold you to it.”',
      '“The last vendor who met with the partners gave them an hour-long pitch, and I heard about it for a week. How do I know you won’t do the same?”',
      '“If you can’t give me a number today, I’m crossing you off the list. I have three other companies to call.”',
    ],
    assessed: ['discovery', 'objection_handling', 'advancing'],
    defaults: [3, 3, 1],
    sources: [{ collection: 'sales-playbook', sections: ['1. ', '3. ', '6. '] }],
  },
  {
    slug: 'disc-price-before-questions-v3',
    concept: 'disc-price-before-questions',
    title: 'Marketing manager needs a number for the budget',
    brand: 'both',
    product: 'general',
    subject: 'sales_technique',
    stage: 'discovery',
    roles: ['ae'],
    personas: ['marketing_manager'],
    personaLines: {},
    situation:
      'You are one minute into a scheduled discovery call with the marketing manager of a 30-attorney immigration firm. She is finishing next year’s marketing budget this week. You represent your own company: Omnizant or Ravenly.',
    buyerLine:
      '“I’ll save us both time. I have a line in next year’s budget for this, and I need a number before I spend an hour on discovery. What does it cost?”',
    objective:
      'Keep control without dodging her deadline: acknowledge the budget pressure, earn a few questions so the number fits what she actually needs, and agree on when she will have it.',
    goodLooksLike: [
      '- Acknowledges her deadline and does not ignore or refuse the request.',
      '- Uses a frame-control line that respects her time, such as offering to get her a number and asking three quick questions first so it is the right one.',
      '- Asks short, high-value questions, such as what the budget line is meant to fix, how the partners will judge it, and who approves it.',
      '- Does not invent prices, ranges, packages, or discounts to fit her budget line.',
      '- Commits to a specific time when she will have a scoped number before her budget deadline, and proposes a dated next step.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Just tell me whether it’s closer to two thousand a month or ten. I only need a ballpark for the spreadsheet.”',
      '“If I put in a placeholder and it’s wrong, the partners will hold me to it. That’s why I need your number now.”',
      '“Your competitor gave me a price in the first five minutes. Why can’t you?”',
    ],
    assessed: ['discovery', 'objection_handling', 'advancing'],
    defaults: [4, 4, 1],
    sources: [{ collection: 'sales-playbook', sections: ['1. ', '3. ', '6. ', '4. '] }],
  },
];
