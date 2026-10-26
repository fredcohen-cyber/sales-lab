// More versions of this stage's existing concepts: each tests the same skill as the question its
// concept names, with a different buyer, situation, or level.
export const QUESTIONS = [
  // ------------------------------------------------------------ am-adoption-email (seeded drill)
  {
    slug: 'adopt-am-adoption-email-v2',
    concept: 'am-adoption-email',
    title: 'Intake team passes leads around by email',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'am_adoption',
    roles: ['am'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You are the account manager for a six-attorney family law firm, four weeks after its Ravenly launch. On your monthly call, you mention that no automations are saved and few leads have an owner or a task, and the intake director, who runs three coordinators, explains how her team works.',
    buyerLine:
      '“Oh, we just forward the Ravenly emails to each other, and whoever’s free takes it. It’s been fine, I think. Is there a better way we should be doing it?”',
    objective:
      'Find out where the email routine can let leads slip, propose one practical workflow to set up first, and be honest about what it depends on.',
    goodLooksLike: [
      '- Asks how a coordinator knows a lead is hers and how the team avoids two people calling the same person, or nobody calling, before suggesting a change.',
      '- Recommends one starting workflow: an approved acknowledgement to each new, non-spam inquiry by a channel the person agreed to, plus a task for the intake owner; names what to validate first: opt-in, sender setup, merge fields, and duplicate prevention.',
      '- Is honest about prerequisites: texts depend on completed messaging registration and a configured sender, and the firm approves the template wording.',
      '- Shows where the team can work instead of the inbox: the Action Center for messages awaiting response, tasks due, and priority leads, and the unassigned quick view in the lead list.',
      '- Is clear that the workflow acknowledges the inquiry and assigns the next step; it does not hold the conversation, so a coordinator still makes the call.',
      '- Agrees on a dated working session with her and one coordinator to set up the first workflow.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“If every lead needs an owner, can Ravenly just rotate them between the three of us?”',
      '“If someone fills out the chat and then the form, will they get two texts? That would look sloppy.”',
      '“Honestly, the emails work. Why add steps to something that isn’t broken?”',
    ],
    assessed: ['discovery', 'product_accuracy', 'advancing'],
    defaults: [2, 1, 3],
    sources: [{ collection: 'ravenly-product', sections: ['08 · ', '06 · ', '07 · ', '05 · ', '20 · ', '03 · '] }],
  },
  {
    slug: 'adopt-am-adoption-email-v3',
    concept: 'am-adoption-email',
    title: 'Marketing manager finds nothing set up after two months',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'am_adoption',
    roles: ['am'],
    personas: ['marketing_manager'],
    personaLines: {},
    situation:
      'You are the account manager for a 25-attorney employment law firm, two months after its Ravenly launch. The marketing manager, who runs the firm’s paid campaigns and pushed for the purchase, has just found out how intake really handles new leads, and she calls you.',
    buyerLine:
      '“So intake works every lead out of the notification emails, nobody has built a single workflow, and most leads are still sitting in the first stage. I was told this would basically run itself. What should have been set up, and why wasn’t it?”',
    objective:
      'Correct the expectation that it runs itself, without blame or defensiveness, find where leads stall, and propose one workflow to set up first, with honest prerequisites and a realistic plan for the reports she needs.',
    goodLooksLike: [
      '- Acknowledges the gap without blaming her or the intake team, and corrects the expectation plainly: workflows have to be configured for the firm, and each should be approved and tested before it goes live.',
      '- Asks where leads stall today, such as who owns a new inquiry once the email arrives and how quickly someone responds, before recommending anything.',
      '- Recommends one workflow to start, so each campaign inquiry gets an acknowledgement and an owner: an approved acknowledgement to each new, non-spam inquiry by a channel the person agreed to, plus a task for the intake owner; names what to validate first: opt-in, sender setup, merge fields, and duplicate prevention.',
      '- Is honest about prerequisites: messaging registration must be complete before any text goes out, and the firm approves the templates and consent wording.',
      '- Explains that the channel reports she wants depend on intake keeping owners and stages current, and proposes agreeing with the intake lead which stages mean retained.',
      '- Does not promise that signed cases by channel will show up in the next report; sets a dated working session that includes the intake lead.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Can’t your team just build the workflows for us? We’re paying enough for this.”',
      '“The partners want to know how fast we respond to campaign leads. Can Ravenly show them that?”',
      '“If I tell the partners we’ve been paying for an email forwarder for two months, they’ll want to cancel. What do I say?”',
    ],
    assessed: ['discovery', 'product_accuracy', 'objection_handling', 'advancing'],
    defaults: [4, 4, 4],
    sources: [{ collection: 'ravenly-product', sections: ['08 · ', '06 · ', '20 · ', '09 · ', '19 · ', '18 · '] }],
  },

  // ------------------------------------------------------------ adopt-ravenly-everything-by-monday
  {
    slug: 'adopt-ravenly-everything-by-monday-v2',
    concept: 'adopt-ravenly-everything-by-monday',
    title: 'Solo attorney wants every feature live this week',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'am_adoption',
    roles: ['am'],
    personas: ['solo_attorney'],
    personaLines: {},
    situation:
      'You are the account manager for a solo immigration attorney who signed up for Ravenly last week. She spent the weekend going through her new account and calls you on Monday morning, excited.',
    buyerLine:
      '“I went through everything this weekend, and I love it. I want the chat, the form, the case evaluation, and the texts all on my site this week. What do I need to do?”',
    objective:
      'Turn her enthusiasm into a phased launch: one format and one workflow first, honest prerequisites, and a dated next step that takes little of her time.',
    goodLooksLike: [
      '- Matches her enthusiasm, then asks what she needs most, such as catching inquiries that arrive while she is in court or after hours, so the first launch solves that.',
      '- Recommends starting with one visitor format and one workflow, then adding the others in planned steps, rather than launching everything at once.',
      '- Lists what launch depends on in plain terms: her approval of the intake questions and consent wording, access to her website or to whoever manages it, completed messaging registration before texts go out, and, if she wants visitors to book time, a Calendly integration confirmed for her plan and set up.',
      '- Does not promise everything this week or that texts will go out from day one; commits to dates once access and approvals are in hand.',
      '- Keeps her part small, such as one short session to approve the questions, and books it.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“What do you need from me, exactly? I’m in court most of this week.”',
      '“Can the chat be in Spanish? A lot of my clients would rather use it in Spanish.”',
      '“If the texts can’t go out right away, is there any point turning on the rest?”',
    ],
    assessed: ['product_accuracy', 'empathy_clarity', 'advancing'],
    defaults: [2, 1, 3],
    sources: [{ collection: 'ravenly-product', sections: ['20 · ', '04 · ', '10 · ', '12 · ', '02 · '] }],
  },
  {
    slug: 'adopt-ravenly-everything-by-monday-v3',
    concept: 'adopt-ravenly-everything-by-monday',
    title: 'Intake director wants a straight answer on launch',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'am_adoption',
    roles: ['am'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You are the account manager for a ten-attorney workers’ compensation firm in its first week on Ravenly Ascend. The partners have told the intake director to have everything running by the first of the month, nine days away. She calls you with their list, and she has been burned by vendors before.',
    buyerLine:
      '“The partners want the chat, the form, the case evaluation, Spanish, text alerts, and Calendly booking all live on the first. I’ve had vendors say yes to everything and then disappear. So tell me straight: what will actually be working on the first, and what won’t?”',
    objective:
      'Give her a straight, accurate answer she can take to the partners: a phased launch with honest prerequisites, owners, and dates, without promising what depends on approvals, access, and registration.',
    goodLooksLike: [
      '- Answers directly instead of agreeing to the whole list: names what can realistically go first, such as one visitor format with approved questions plus an internal alert or task, and what depends on steps outside your control.',
      '- States the prerequisites precisely: approved intake questions and consent wording, website access, verification of the embed code by Ravenly’s product or web team before it goes on the site, completed messaging registration before any text goes out, and a configured Calendly integration for booking.',
      '- Treats Spanish accurately: it is among the chat’s language options and Ascend lists multilingual support, but the Spanish flow and messages should be tested with the firm before launch.',
      '- Does not promise a registration timeline or that every feature will be ready on the first, and flags early that registration can hold up texts.',
      '- Proposes controlled tests, with her approval, of each format, the Spanish branch, the consent choices, and the routing path before go-live.',
      '- Gives her a plan for the partners, with what goes first, what follows, an owner for each approval, and dates tied to access and approvals, and sets the next working session.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Which of these needs something from the partners? They’re the slowest part of every approval.”',
      '“Our website company takes two weeks to change anything. Can’t you just install it yourselves?”',
      '“If I tell the partners only part of it is live on the first, they’ll say we bought the wrong product. Give me something better than ‘it depends.’”',
    ],
    assessed: ['product_accuracy', 'objection_handling', 'empathy_clarity', 'advancing'],
    defaults: [5, 5, 5],
    sources: [{ collection: 'ravenly-product', sections: ['20 · ', '04 · ', '10 · ', '12 · ', '07 · '] }],
  },

  // ------------------------------------------------------------ adopt-ravenly-texts-not-sending
  {
    slug: 'adopt-ravenly-texts-not-sending-v2',
    concept: 'adopt-ravenly-texts-not-sending',
    title: 'Prospect says she never got the firm’s text',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'am_adoption',
    roles: ['am'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You are the account manager for a five-attorney estate planning firm in its third week on Ravenly. The office manager set up a workflow to text an acknowledgement to every new inquiry, and she emails you after a prospect mentioned on a callback that she never received it.',
    buyerLine: '“A woman we called back today said she never got our text. I thought every new inquiry gets one now. Could you take a look?”',
    objective:
      'Find the likely cause by checking the setup and the lead with her rather than guessing, give her a fallback for now, and agree on how and when it gets resolved.',
    goodLooksLike: [
      '- Thanks her for flagging it and gathers specifics before diagnosing: when the inquiry came in, which form it came through, and whether other new leads received the text.',
      '- Checks the known prerequisites with her: whether messaging registration is complete, which sender or number is configured, the workflow’s trigger, conditions, and timing, and the prospect’s contact preference and opt-in on the lead record.',
      '- Explains that a lead who chose email or did not opt in to texts may get no text by design, depending on the workflow’s conditions, so a missing text is not always a fault.',
      '- Suggests a fallback while it is checked, such as calling or emailing each new inquiry directly and adding a task for each one.',
      '- Does not guess a cause or promise a fix time; if the setup checks out, raises it with support through the in-app support dialog with screenshots, and agrees on a controlled test with her approval and a dated follow-up.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“She definitely gave us her cell number. Doesn’t that mean she should get texts?”',
      '“Should I turn the text off until we know what’s wrong? I’d hate for some people to get it and others not.”',
      '“The partners keep asking me whether the new system is working. What do I tell them?”',
    ],
    assessed: ['discovery', 'product_accuracy', 'empathy_clarity', 'advancing'],
    defaults: [2, 2, 4],
    sources: [{ collection: 'ravenly-product', sections: ['07 · ', '08 · ', '06 · ', '04 · ', '11 · '] }],
  },
  {
    slug: 'adopt-ravenly-texts-not-sending-v3',
    concept: 'adopt-ravenly-texts-not-sending',
    title: 'Partner asks if the text failed or his staff did',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'am_adoption',
    roles: ['am'],
    personas: ['managing_partner'],
    personaLines: {},
    situation:
      'You are the account manager for a four-attorney immigration firm, three weeks after launch on Ravenly. An associate built a workflow to text an acknowledgement to every new inquiry. The managing partner calls after a man whose brother had been detained filled out the firm’s form, heard nothing, and hired another lawyer.',
    buyerLine:
      '“He filled out our form on Tuesday night, never got a text or a call, and hired someone else to help his brother. That text was supposed to go out automatically. I want to know today whether your system failed or my people dropped the ball.”',
    objective:
      'Find out what happened from the record instead of guessing or assigning blame, separate the automatic acknowledgement from the staff follow-up, and agree on a tested fix and a dated follow-up.',
    goodLooksLike: [
      '- Stays calm, acknowledges the lost client, and does not blame his staff or the product before checking.',
      '- Commits to checking the record first: the lead’s messages, tasks, activity history, and owner, and the prospect’s contact preference and opt-in, so he gets facts rather than a guess.',
      '- Names the known prerequisites for the text: completed messaging registration, a configured sender or number, and the workflow’s trigger, conditions, and timing.',
      '- Separates the two misses: the text only acknowledges an inquiry, and each new lead still needs an owner and a next task, which the team can check daily in the lead list’s unassigned view and the Action Center’s tasks due.',
      '- Does not promise a fix time or that it cannot happen again; raises it with support if the setup checks out, proposes a controlled test with his approval, and sets a dated follow-up.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“My associate says she tested it when she set it up. So what changed?”',
      '“How do I know this isn’t happening with every lead?”',
      '“If an automatic text needs this much checking, why should I rely on it at all?”',
    ],
    assessed: ['discovery', 'product_accuracy', 'objection_handling', 'advancing'],
    defaults: [4, 4, 4],
    sources: [{ collection: 'ravenly-product', sections: ['07 · ', '08 · ', '06 · ', '11 · '] }],
  },

  // ------------------------------------------------------------ adopt-ravenly-missed-alert
  {
    slug: 'adopt-ravenly-missed-alert-v2',
    concept: 'adopt-ravenly-missed-alert',
    title: 'Weekend case set off no alert for the partners',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'am_adoption',
    roles: ['am'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You are the account manager for an eight-attorney medical malpractice firm, two weeks after launch on Ravenly. The intake director set up text alerts so the two senior partners hear about high-priority leads. An inquiry about a surgical error came in on Saturday morning, neither partner got a text, and one of them asked her why first thing Monday. She calls you.',
    buyerLine:
      '“I set the partners up for high-priority texts, and Saturday’s surgical case didn’t set off anything. One of them asked me this morning what went wrong, and I honestly don’t know. Where do I start?”',
    objective:
      'Help her find the cause accurately without guessing or blaming her setup, address the weekend gap honestly, and agree on a tested fix and a dated review she can report to the partners.',
    goodLooksLike: [
      '- Asks first whether someone has contacted the prospect, and makes clear you will find the cause together before anyone assigns blame.',
      '- Finds out how the alert was set up, through each partner’s own notification preferences or through an automation, and what the inquiry scored.',
      '- Explains the likely causes accurately: notifications are set per user and per channel; the high-priority alert depends on a score above 80, which is a triage aid, not a case value; and an automation that fires when a lead is created may not see the final score, while a stage-based trigger fires only when a lead’s stage is set, so either needs a timing test before the partners rely on it over a weekend.',
      '- Suggests reviewing the scoring inputs she controls, such as the case type’s priority and the firm’s criteria, without promising what any inquiry will score.',
      '- Notes that text alerts also depend on messaging registration and delivery setup, and that an alert helps only if someone is set to receive it and act on it over the weekend; suggests a backup channel.',
      '- Proposes a controlled test with her approval, offers a short summary she can give the partner, and sets a dated review.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“It was obviously a serious case. Why wouldn’t it score high?”',
      '“Nobody works here on weekends. Can Ravenly cover Saturdays for us somehow?”',
      '“The partner who asked is already talking about going back to our old answering service. What do I tell him?”',
    ],
    assessed: ['discovery', 'product_accuracy', 'empathy_clarity', 'advancing'],
    defaults: [3, 2, 4],
    sources: [{ collection: 'ravenly-product', sections: ['07 · ', '05 · ', '08 · ', '02 · ', '18 · '] }],
  },
  {
    slug: 'adopt-ravenly-missed-alert-v3',
    concept: 'adopt-ravenly-missed-alert',
    title: 'Solo’s high-priority text never came overnight',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'am_adoption',
    roles: ['am'],
    personas: ['solo_attorney'],
    personaLines: {},
    situation:
      'You are the account manager for a solo criminal defense attorney, three weeks after launch on Ravenly. She set her phone to get a text for high-priority leads. A woman whose husband had just been arrested filled out the attorney’s case evaluation at 1 a.m., the attorney saw it at 9 a.m., and by then the woman had hired someone else.',
    buyerLine:
      '“I turned on the high-priority text so I’d never miss something like this. Somebody’s husband gets arrested at one in the morning, and my phone doesn’t make a sound. Why didn’t it go off?”',
    objective:
      'Own the problem without excuses or guesses, explain the likely causes accurately, be clear about what an overnight alert can and cannot do, and agree on a tested fix and a dated check-in.',
    goodLooksLike: [
      '- Acknowledges the lost client without excuses and does not blame her setup before checking.',
      '- Asks whether the text came from her own notification preferences or from an automation, and checks what the inquiry scored.',
      '- Explains the likely causes accurately: notification preferences are set per user and per channel; the high-priority text depends on a score above 80, a triage aid rather than a judgment of the case; scoring happens shortly after a lead is created, so a rule that fires at creation can miss it; and texts depend on messaging registration and delivery setup.',
      '- Is clear about overnight limits: an alert works only if she sees it, and capturing inquiries after hours does not mean anyone responds around the clock; an approved acknowledgement to the prospect, by a channel the prospect agreed to, can be part of the plan.',
      '- Proposes a controlled test with her approval, adds a backup channel, and sets a dated check-in after the test.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Forget the score. Can it just text me every time any new lead comes in?”',
      '“Can’t Ravenly call these people back for me at night?”',
      '“I’m one person. If I can’t count on this to wake me up, what am I paying for?”',
    ],
    assessed: ['product_accuracy', 'objection_handling', 'empathy_clarity', 'advancing'],
    defaults: [4, 4, 4],
    sources: [{ collection: 'ravenly-product', sections: ['07 · ', '05 · ', '08 · ', '02 · ', '21 · '] }],
  },

  // ------------------------------------------------------------ adopt-ravenly-back-to-spreadsheet
  {
    slug: 'adopt-ravenly-back-to-spreadsheet-v2',
    concept: 'adopt-ravenly-back-to-spreadsheet',
    title: 'Intake director says her team is faster without it',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'am_adoption',
    roles: ['am'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You are the account manager for a 14-attorney personal injury firm, five weeks after launch on Ravenly. Activity in Ravenly has dropped, and when you ask the intake director, who runs four coordinators, she is blunt.',
    buyerLine:
      '“My coordinators are faster in our spreadsheet, and so am I. Logging a call in Ravenly takes more clicks, and now every lead lives in two places. I’m not slowing my team down so the partners can have a nicer dashboard.”',
    objective:
      'Find out what is really slowing her team down, win her over rather than push her, and agree on one small change and a measure she can stand behind.',
    goodLooksLike: [
      '- Treats her objection as useful and asks to see the work: which steps take longer, such as logging a call or finding the next lead, and what the spreadsheet does that the team relies on.',
      '- Offers to sit with a coordinator for a few leads and fix the specific friction, rather than retraining everyone.',
      '- Shows how Ravenly can do the spreadsheet’s job without double entry: the Action Center for messages awaiting response, tasks due, and priority leads; quick views such as unassigned and priority; and messaging templates for repeat replies.',
      '- Proposes one small change first, such as working new leads in Ravenly with an owner and a next task while the spreadsheet stays as a reference, rather than a full switch overnight.',
      '- Is honest that the partners’ reports depend on owners and stages being current, and agrees with her on what she will report and when, such as the share of leads with an owner, a next task, and a current stage.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“The spreadsheet shows me every open lead on one screen. Can Ravenly do that?”',
      '“If I move my team over and we lose a signed case in the switch, that’s on me.”',
      '“Give me one way this makes my coordinators’ day easier. I don’t mean the partners’ reports.”',
    ],
    assessed: ['discovery', 'product_accuracy', 'objection_handling', 'advancing'],
    defaults: [4, 4, 3],
    sources: [{ collection: 'ravenly-product', sections: ['06 · ', '03 · ', '07 · ', '19 · ', '20 · '] }],
  },
  {
    slug: 'adopt-ravenly-back-to-spreadsheet-v3',
    concept: 'adopt-ravenly-back-to-spreadsheet',
    title: 'Partner notices intake is back on the spreadsheet',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'am_adoption',
    roles: ['am'],
    personas: ['managing_partner'],
    personaLines: {},
    situation:
      'You are the account manager for a seven-attorney family law firm, six weeks after launch on Ravenly. On a short call about something else, the managing partner brings up the intake team.',
    buyerLine:
      '“I walked past intake yesterday, and they’re back on the old spreadsheet. I don’t want to force anything on them, but I didn’t buy Ravenly for it to sit there. What do you suggest?”',
    objective:
      'Find out what is driving the team back to the spreadsheet, propose a way to win them over rather than a mandate, and give the partner a simple way to see progress.',
    goodLooksLike: [
      '- Thanks him for raising it early and asks what he has heard from the team about why they went back, without blaming them.',
      '- Offers to talk with the intake team directly, for example by watching them work a few leads, to find the specific friction.',
      '- Suggests one small change rather than a mandate, such as working new leads in Ravenly with an owner and a next task, plus a short daily review the team agrees on.',
      '- Is honest that what he sees in Ravenly depends on the team keeping owners and stages current, and offers a simple measure he can check, such as the share of new leads with an owner and a next task.',
      '- Agrees on a date for the session with the team and a short follow-up with him.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Should I just tell them they have to use it?”',
      '“What will I be able to see in Ravenly that the spreadsheet can’t show me?”',
      '“If they’re still on the spreadsheet next month, I’m not renewing.”',
    ],
    assessed: ['discovery', 'product_accuracy', 'empathy_clarity', 'advancing'],
    defaults: [2, 3, 3],
    sources: [{ collection: 'ravenly-product', sections: ['06 · ', '03 · ', '19 · ', '09 · ', '20 · '] }],
  },

  // ------------------------------------------------------------ adopt-ravenly-duplicate-leads
  {
    slug: 'adopt-ravenly-duplicate-leads-v2',
    concept: 'adopt-ravenly-duplicate-leads',
    title: 'Two coordinators called the same prospect',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'am_adoption',
    roles: ['am'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You are the account manager for a nine-attorney employment law firm, three weeks after launch on Ravenly. Some prospects use both the chat and the webform, and the intake director has noticed what happens next.',
    buyerLine:
      '“Twice this week, two of my coordinators called the same person, because she came in once through the chat and once through the form. It looks unprofessional. How do I stop it?”',
    objective:
      'Explain accurately how Ravenly flags and handles duplicates, set a clear definition of a lead, and agree on a routine and a date to check that the double calls have stopped.',
    goodLooksLike: [
      '- Takes the problem seriously and asks how coordinators pick up new leads today and how one would know that another has already called.',
      '- Explains what Ravenly offers: possible-duplicate warnings in the lead list and a merge action on the lead record; does not claim duplicates are blocked or merged automatically.',
      '- Explains that a lead is an inquiry record, so one person can appear as two leads until they are merged.',
      '- Proposes a routine: one owner for each new lead, a check for the possible-duplicate warning before calling, and a named person who reviews duplicates each day; offers to confirm what a merge keeps from each record, such as the chat and form answers, before the team starts merging.',
      '- Does not guess whether duplicates count toward the firm’s monthly lead allowance; offers to confirm how they are treated.',
      '- Agrees on a date to review whether the double calls have stopped.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Can’t it just stop the second one from being created?”',
      '“If we merge two leads, do we lose the chat answers or the form answers?”',
      '“My coordinators don’t have time to hunt for duplicates on top of everything else. What’s the least they can do?”',
    ],
    assessed: ['discovery', 'product_accuracy', 'objection_handling', 'advancing'],
    defaults: [3, 3, 4],
    sources: [{ collection: 'ravenly-product', sections: ['06 · ', '09 · ', '12 · ', '03 · '] }],
  },
  {
    slug: 'adopt-ravenly-duplicate-leads-v3',
    concept: 'adopt-ravenly-duplicate-leads',
    title: 'Solo asks if duplicates use up her lead allowance',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'am_adoption',
    roles: ['am'],
    personas: ['solo_attorney'],
    personaLines: {},
    situation:
      'You are the account manager for a solo bankruptcy attorney on Ravenly’s Launch plan, which lists 25 leads a month. A month in, she has noticed some people appearing twice in her lead list, and she raises it on your check-in call.',
    buyerLine: '“I keep seeing the same people twice, once from the chat and once from the form. Are those eating into my 25 leads a month?”',
    objective:
      'Answer honestly about what you can confirm, show her how to spot and merge duplicates, and give her a simple habit and a dated answer.',
    goodLooksLike: [
      '- Answers honestly: the published allowance excludes phone calls and spam, and whether duplicates count is something you will confirm by a set date rather than guess.',
      '- Explains what she can do now: possible-duplicate warnings in the lead list and a merge action on the lead record; does not claim duplicates merge automatically, and offers to confirm what a merge or a delete keeps before she relies on either.',
      '- Explains that a lead is an inquiry record, so one person who uses both the chat and the form can show up twice.',
      '- Asks how many duplicates she is seeing and how close she usually comes to 25, so the answer fits her situation.',
      '- Suggests a simple habit, such as checking for duplicate warnings when she reviews new leads, and agrees on when you will come back with the confirmed answer.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Can I just delete the extra one?”',
      '“And if duplicates push me over 25, do I get a surprise charge?”',
      '“Should I just take the chat off my site so there’s only one way in?”',
    ],
    assessed: ['product_accuracy', 'discovery', 'advancing'],
    defaults: [2, 2, 3],
    sources: [{ collection: 'ravenly-product', sections: ['06 · ', '12 · ', '09 · ', '04 · '] }],
  },

  // ------------------------------------------------------------ adopt-ravenly-import-old-leads
  {
    slug: 'adopt-ravenly-import-old-leads-v2',
    concept: 'adopt-ravenly-import-old-leads',
    title: 'Intake director wants 400 open inquiries loaded',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'am_adoption',
    roles: ['am'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You are the account manager for a six-attorney Social Security disability firm in its second week on Ravenly Ascend. The intake director’s team tracked inquiries in a spreadsheet before Ravenly, and about 400 are still open.',
    buyerLine:
      '“We have about 400 open inquiries in our old spreadsheet, and my team can’t work from two places. Can you import them this week, with the notes and who’s handling each one?”',
    objective:
      'Answer honestly about what you can confirm, find out which inquiries the team still works, avoid surprises with the allowance and automations, and agree on a practical way forward.',
    goodLooksLike: [
      '- Asks how many of the 400 are actively being worked, by whom, and what the team needs to see for each, before discussing how to bring them in.',
      '- Does not promise or rule out a bulk import: the reviewed product shows an Add Lead control and CSV export, so offers to confirm whether an import option exists and what it would carry over, such as notes and owners.',
      '- Before anything is loaded, offers to confirm whether added or imported leads count toward Ascend’s 50 leads a month, and checks that no workflow that starts on new leads would text or email old prospects.',
      '- Suggests a practical step once both checks are back, such as adding the actively worked inquiries with Add Lead, each with an owner and a next task, and keeping the rest in the spreadsheet as a reference; meanwhile, the team marks which inquiries are active and who owns each.',
      '- Agrees on a date to come back with the confirmed answer and a short session to set up the active inquiries.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“If there’s no import, my team can’t retype 400 inquiries. What’s the realistic option?”',
      '“Will the old ones throw off the reports? The partners just started looking at them.”',
      '“Every other system we’ve bought came with an import. Why is this so complicated?”',
    ],
    assessed: ['discovery', 'product_accuracy', 'advancing'],
    defaults: [3, 3, 4],
    sources: [{ collection: 'ravenly-product', sections: ['06 · ', '12 · ', '08 · ', '09 · '] }],
  },
  {
    slug: 'adopt-ravenly-import-old-leads-v3',
    concept: 'adopt-ravenly-import-old-leads',
    title: 'Marketing manager wants last year’s leads for a baseline',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'am_adoption',
    roles: ['am'],
    personas: ['marketing_manager'],
    personaLines: {},
    situation:
      'You are the account manager for a 30-attorney business law firm, two weeks after launch on Ravenly. The marketing manager wants to show the partners how intake results change now that Ravenly is in place, and she emails you.',
    buyerLine:
      '“I need last year’s 2,000 inquiries loaded into Ravenly, with their sources and outcomes, so the partners can compare before and after. Without them I have no baseline. When can you have them in?”',
    objective:
      'Answer honestly about importing, find out what the partners want to compare, and help her build a baseline that holds up, whether or not the old records go into Ravenly.',
    goodLooksLike: [
      '- Asks what the partners want to compare and which measures matter to them, such as retained matters by source, before deciding whether the old records need to be in Ravenly at all.',
      '- Does not promise or rule out a bulk import: the reviewed product shows an Add Lead control and CSV export, so offers to confirm whether an import option exists and what it would keep.',
      '- Before any load, offers to confirm whether imported leads count toward the plan’s monthly lead allowance, and checks that no workflow triggered by new leads would contact old prospects.',
      '- Suggests a baseline that does not depend on an import: last year’s figures from the firm’s own records, compared with Ravenly’s on agreed definitions of lead, qualified, and retained, with the date ranges named.',
      '- Names what can distort a before-and-after comparison, such as seasonality, campaign changes, and the lag between inquiry and retention.',
      '- Agrees on a date to deliver the confirmed import answer and a working session on the baseline definitions.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Our old source labels don’t match your channels. Can Ravenly map them?”',
      '“If I send you a CSV, can’t your team just load it?”',
      '“The partners meet in two weeks. If I show up without a before-and-after, they’ll say this was a waste of money.”',
    ],
    assessed: ['discovery', 'product_accuracy', 'persuasion', 'advancing'],
    defaults: [4, 3, 5],
    sources: [{ collection: 'ravenly-product', sections: ['06 · ', '12 · ', '09 · ', '19 · ', '08 · '] }],
  },

  // ------------------------------------------------------------ adopt-ravenly-add-all-staff
  {
    slug: 'adopt-ravenly-add-all-staff-v2',
    concept: 'adopt-ravenly-add-all-staff',
    title: 'Office manager about to invite the whole firm',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'am_adoption',
    roles: ['am'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You are the account manager for a seven-attorney estate planning firm on Ravenly Ascend. The office manager is setting up users this afternoon and emails you first.',
    buyerLine:
      '“I’m about to invite everyone: our three intake staff, the two paralegals, and all seven attorneys. Anything I should know before I hit send?”',
    objective:
      'Help her set up access that fits the plan and the work, explain the user limit accurately without inventing prices, and agree on a next step.',
    goodLooksLike: [
      '- Thanks her for checking first, then asks who will work leads day to day and who mainly needs to know when a lead needs them.',
      '- Notes accurately that Ascend lists five users, so twelve needs a confirmed answer on additional users or a different plan before the invites go out, and does not quote a price.',
      '- Explains that clear ownership prevents dropped leads more than wide access does: an owner and a next task on each lead, teams tied to case types with a default team, and the Action Center for each person’s work.',
      '- Does not promise view-only access or particular roles, since detailed role permissions are not established; offers to confirm.',
      '- Suggests inviting the intake staff now so they can start, and agrees on a date for the confirmed option for everyone else.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“The attorneys only want to look at their own cases. Can they have read-only logins?”',
      '“Can I add the attorneys now and take them off later if we go over?”',
      '“The managing partner told me to add everyone. How do I go back and tell him we can’t?”',
    ],
    assessed: ['product_accuracy', 'discovery', 'advancing'],
    defaults: [1, 1, 3],
    sources: [{ collection: 'ravenly-product', sections: ['12 · ', '11 · ', '06 · ', '05 · '] }],
  },
  {
    slug: 'adopt-ravenly-add-all-staff-v3',
    concept: 'adopt-ravenly-add-all-staff',
    title: 'Solo wants four people on a two-user plan',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'am_adoption',
    roles: ['am'],
    personas: ['solo_attorney'],
    personaLines: {},
    situation:
      'You are the account manager for a solo elder law attorney on Ravenly’s Launch plan. Two weeks in, she wants her part-time assistant, her contract paralegal, and her virtual receptionist to have access, and she calls you.',
    buyerLine:
      '“I need my assistant, my paralegal, and my virtual receptionist in there, plus me. And don’t tell me I have to move up a plan for three people who work twenty hours a week between them.”',
    objective:
      'Find out who actually needs access and why, state the published user limits accurately, and recommend one option without inventing prices.',
    goodLooksLike: [
      '- Asks what each person would do in Ravenly, such as who answers new inquiries and who only needs case details later, before discussing plans.',
      '- States the published scope accurately: Launch lists two users and Ascend five; if price comes up, gives the published rates correctly (Ascend $199 a month on yearly billing or $229 monthly, against Launch at $99 or $119) and confirms the terms for her agreement; does not quote a price for additional users and offers to confirm whether a user can be added to Launch.',
      '- Recommends the setup that fits what she described, for example access for herself and the person who works new inquiries, with an owner and a next task on each lead, rather than upselling by default.',
      '- Does not promise a cheaper user type or suggest workarounds such as a shared login; offers to confirm what the agreement allows.',
      '- Agrees on a dated next step: the confirmed options and her decision.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“My paralegal only needs to see a case once I’ve taken it. Does she really need a login?”',
      '“Can my assistant and I just share my login?”',
      '“I picked the cheapest plan on purpose. If adding people means paying for Ascend, I’d rather cancel.”',
    ],
    assessed: ['product_accuracy', 'discovery', 'persuasion', 'advancing'],
    defaults: [4, 4, 4],
    sources: [
      { collection: 'ravenly-product', sections: ['12 · ', '11 · ', '06 · ', '07 · '] },
      { collection: 'sales-playbook', sections: ['4. '] },
    ],
  },

  // ------------------------------------------------------------ adopt-ravenly-developer-install
  {
    slug: 'adopt-ravenly-developer-install-v2',
    concept: 'adopt-ravenly-developer-install',
    title: 'Office manager relays the website company’s questions',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'am_adoption',
    roles: ['am'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You are the account manager for a six-attorney real estate law firm that just started on Ravenly. The office manager handles the firm’s website company, which wants answers before it adds anything to the site, and she emails you.',
    buyerLine:
      '“Our website company says they need the code and some details before they’ll add it, and they want to know whether it affects our search rankings. Who should they talk to?”',
    objective:
      'Treat the website company’s caution as legitimate, avoid promising anything about search impact, and set up a dated technical call without making her the go-between.',
    goodLooksLike: [
      '- Thanks her for passing it on and treats the website company’s questions as reasonable.',
      '- Explains in plain terms what the install is: Ravenly is added to an existing site with a snippet, described for platforms such as WordPress, Squarespace, Wix, and Duda.',
      '- Does not promise the code has no effect on search rankings or site speed; says Ravenly’s product or web team will confirm the installation code and answer the company’s questions.',
      '- Asks which platform the site runs on and who at the website company will do the work, and proposes a short technical call between them and the right Ravenly contact on a specific date.',
      '- Keeps her role light: she makes the introduction, and the technical questions go directly between the two teams.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“They said most vendors just send a snippet to paste in. Is there a reason we can’t do it that way?”',
      '“Our site is a custom build, not WordPress. Does that matter?”',
      '“They quoted three hours to install it. Is that on us?”',
    ],
    assessed: ['product_accuracy', 'empathy_clarity', 'advancing'],
    defaults: [2, 2, 3],
    sources: [{ collection: 'ravenly-product', sections: ['10 · ', '20 · ', '12 · ', '21 · '] }],
  },
  {
    slug: 'adopt-ravenly-developer-install-v3',
    concept: 'adopt-ravenly-developer-install',
    title: 'SEO agency wants proof before adding the script',
    brand: 'ravenly',
    product: 'ravenly',
    subject: 'product',
    stage: 'am_adoption',
    roles: ['am'],
    personas: ['marketing_manager'],
    personaLines: {},
    situation:
      'You are the account manager for a 35-attorney workers’ compensation firm that just started on Ravenly. The marketing manager owns the website, which an outside agency built and maintains for SEO. The agency will not install anything until its questions are answered, and she calls you.',
    buyerLine:
      '“Our SEO agency won’t put a third-party script on a site that ranks for our most valuable terms unless someone proves it won’t hurt rankings or page speed. They want it in writing by Friday. What can you give them?”',
    objective:
      'Treat the agency’s caution as legitimate, commit only to what can be confirmed, and get the agency and Ravenly’s product or web team on a dated technical call.',
    goodLooksLike: [
      '- Treats the agency’s caution as reasonable and asks what exactly they need answered: rankings, page speed, cookies and consent, or conflicts with other site tools.',
      '- Explains the install plainly: a snippet added to the existing site, described for WordPress, Squarespace, Wix, Duda, and custom modern CMS sites.',
      '- Does not promise, verbally or in writing, that the code will not affect indexing, rankings, or speed, and does not send the embed code before Ravenly’s product or web team has verified it.',
      '- Commits to what can be delivered: a technical call between the agency and Ravenly’s product or web team on a specific date, with written answers on whatever that team confirms.',
      '- Asks which platform and pages are involved and who at the agency signs off, so the launch date waits on that review rather than on her.',
      '- Keeps her informed without making her the go-between on technical questions.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“They specifically asked whether your script adds anything that tells Google not to index our pages.”',
      '“They also want to know what it does with cookies and with our consent banner.”',
      '“If this holds up launch for a month, the partners will ask why we bought a tool we can’t install. What do I tell them?”',
    ],
    assessed: ['product_accuracy', 'objection_handling', 'empathy_clarity', 'advancing'],
    defaults: [5, 5, 5],
    sources: [{ collection: 'ravenly-product', sections: ['10 · ', '20 · ', '21 · ', '17 · ', '11 · '] }],
  },

  // ------------------------------------------------------------ adopt-overwhelmed-champion
  {
    slug: 'adopt-overwhelmed-champion-v2',
    concept: 'adopt-overwhelmed-champion',
    title: 'Office manager can give the rollout an hour a week',
    brand: 'both',
    product: 'general',
    subject: 'sales_technique',
    stage: 'am_adoption',
    roles: ['am'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You are the account manager for a nine-attorney firm, five weeks after launch. The office manager became the project lead because no one else had time; she also runs the front desk and the attorneys’ calendars, and she has canceled your last two calls. You represent your own company: Omnizant or Ravenly.',
    buyerLine:
      '“I’m sorry, I keep canceling on you. I run the front desk, the attorneys’ calendars, and now this, and the partners keep asking me when it’ll be done. Realistically, I can give it an hour a week.”',
    objective:
      'Plan around the hour she can give: cut the list to what matters most, take on what your side can, and agree on a rhythm and a dated next step that fit her week.',
    goodLooksLike: [
      '- Thanks her for being direct, adds no guilt about the canceled calls, and treats her hour as the budget to plan around.',
      '- Asks what the partners expect to see first and what is weighing on her most, then cuts the plan to the one or two items that matter most this month.',
      '- Takes on what your side can do, and asks whether specific items could go to someone else, such as a partner who approves content or a colleague who can provide access.',
      '- Proposes a rhythm that fits her hour, such as a short weekly call with one action item at a fixed time, and books the next one now.',
      '- Offers to give the partners a short status update or join a brief check-in with them, so she is not the go-between on every question.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“The partners think I’m dragging my feet. Can you tell them it’s on track?”',
      '“If I hand pieces to other people, I’ll spend more time chasing them than doing it myself.”',
      '“Honestly, it might be easier to pause the whole thing until after our busy season.”',
    ],
    assessed: ['empathy_clarity', 'discovery', 'advancing'],
    defaults: [3, 2, 1],
    sources: [{ collection: 'sales-playbook', sections: ['1. ', '3. ', '4. ', '6. '] }],
  },
  {
    slug: 'adopt-overwhelmed-champion-v3',
    concept: 'adopt-overwhelmed-champion',
    title: 'Solo hasn’t started on anything from the last call',
    brand: 'both',
    product: 'general',
    subject: 'sales_technique',
    stage: 'am_adoption',
    roles: ['am'],
    personas: ['solo_attorney'],
    personaLines: {},
    situation:
      'You are the account manager for a solo personal injury attorney, two weeks after launch. On your scheduled call, he admits he has not started on anything you agreed on last time. You represent your own company: Omnizant or Ravenly.',
    buyerLine:
      '“I’ll be honest, I haven’t done any of the things from our last call. Between court and clients, I just haven’t had a minute.”',
    objective:
      'Make it easy to restart: cut the list to the one item that matters most, take on what your side can, and book a short, fixed time around his schedule.',
    goodLooksLike: [
      '- Thanks him for saying so and makes it easy to restart, with no guilt about the missed items.',
      '- Asks which one result would help his practice most right now, then cuts the list to that one item.',
      '- Offers to handle what your side can and keeps his part to a short approval or a single decision.',
      '- Books a short, fixed time that works around court, offering two specific options, and sets the next date before the call ends.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Can you just do all of it and send me what to approve?”',
      '“Mornings are court. Evenings are the only time I have.”',
      '“If this keeps needing my time, I’m not sure it’s worth it for a one-person office.”',
    ],
    assessed: ['empathy_clarity', 'discovery', 'advancing'],
    defaults: [1, 1, 1],
    sources: [{ collection: 'sales-playbook', sections: ['1. ', '3. ', '4. ', '5. '] }],
  },

  // ------------------------------------------------------------ adopt-omnizant-content-missing
  {
    slug: 'adopt-omnizant-content-missing-v2',
    concept: 'adopt-omnizant-content-missing',
    title: 'Office manager still chasing attorney bios',
    brand: 'omnizant',
    product: 'omnizant_web',
    subject: 'sales_technique',
    stage: 'am_adoption',
    roles: ['am'],
    personas: ['office_manager'],
    personaLines: {},
    situation:
      'You are the account manager for a new Omnizant website client, a seven-attorney family law firm. The office manager is your day-to-day contact, and three weeks after kickoff she has collected some of the attorney bios but not all of them.',
    buyerLine:
      '“I have four of the seven bios, but the other attorneys keep putting me off, and nobody has scheduled photos. Is there a way to keep the site moving while I chase them?”',
    objective:
      'Keep the project moving without blame, make it easier to collect what is missing, and agree on owners and dates without promising a launch date.',
    goodLooksLike: [
      '- Thanks her for the progress and acknowledges that chasing busy attorneys is hard, without blaming anyone.',
      '- Asks what is needed first and narrows the request, so work continues on what she already has while the rest arrive.',
      '- Makes it easier for the attorneys, such as offering each one a short call to gather what is needed, and asks whether a partner could nudge the others.',
      '- Does not promise a launch date or a workaround it cannot confirm, such as launching with placeholder bios; offers to confirm what the team can do with partial content.',
      '- Agrees on an owner and a date for each remaining item and a time to review progress.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Could your team write the bios from their profiles online and just have them approve?”',
      '“One partner says his old headshot is fine. Can we just use the photos we already have?”',
      '“The managing partner asked me why it’s taking so long. What do I tell him?”',
    ],
    assessed: ['empathy_clarity', 'objection_handling', 'advancing'],
    defaults: [2, 1, 1],
    sources: [{ collection: 'sales-playbook', sections: ['1. ', '4. ', '6. ', '3. '] }],
  },
  {
    slug: 'adopt-omnizant-content-missing-v3',
    concept: 'adopt-omnizant-content-missing',
    title: 'Solo asks Omnizant to write his practice pages',
    brand: 'omnizant',
    product: 'omnizant_web',
    subject: 'sales_technique',
    stage: 'am_adoption',
    roles: ['am'],
    personas: ['solo_attorney'],
    personaLines: {},
    situation:
      'You are the account manager for a new Omnizant website client, a solo bankruptcy attorney. Five weeks after kickoff, he still has not sent the details of his practice, and the new site cannot move forward without them. You call him.',
    buyerLine:
      '“I know, I owe you the practice stuff. But you’re the marketing people. Can’t you just write it? You know what bankruptcy lawyers do.”',
    objective:
      'Explain why his input matters without lecturing, make it as easy as possible to give, and agree on a dated next step without promising writing help or a launch date you cannot confirm.',
    goodLooksLike: [
      '- Stays calm about the delay and takes his request seriously, without lecturing him about what he owes.',
      '- Explains why his input matters: what the site says about his practice has to be accurate and approved by him, because it speaks for his firm.',
      '- Makes it easy: narrows the request to the two or three items needed first and offers a short call to capture the facts only he can give, such as the cases he takes and how he works with clients.',
      '- Does not promise that Omnizant will write the content or that writing is included, and does not invent a launch date; offers to confirm what help is available.',
      '- Agrees on a date for the call and on what each side does afterward, depending on the help you confirm.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“What exactly do you need from me? Keep it short.”',
      '“Can’t you launch the homepage now and add the practice pages later?”',
      '“I’m paying you, and five weeks in nothing’s live. Why am I paying for a site I can’t use?”',
    ],
    assessed: ['empathy_clarity', 'objection_handling', 'advancing'],
    defaults: [3, 3, 1],
    sources: [{ collection: 'sales-playbook', sections: ['6. ', '1. ', '4. '] }],
  },

  // ------------------------------------------------------------ adopt-omnizant-not-ranking-yet
  {
    slug: 'adopt-omnizant-not-ranking-yet-v2',
    concept: 'adopt-omnizant-not-ranking-yet',
    title: 'Partners searched and found competitors on top',
    brand: 'omnizant',
    product: 'omnizant_web',
    subject: 'sales_technique',
    stage: 'am_adoption',
    roles: ['am'],
    personas: ['managing_partner'],
    personaLines: {},
    situation:
      'You are the account manager for a six-attorney personal injury firm, six weeks into an Omnizant SEO program. At this morning’s partner meeting, the partners searched for the firm’s main practice area in their city, and the managing partner calls you right afterward.',
    buyerLine:
      '“My partners searched ‘car accident lawyer’ plus our city in the meeting this morning. Two competitors came up on top, and we were nowhere. I vouched for you. Convince me this isn’t money down the drain.”',
    objective:
      'Stay steady under pressure, reset expectations honestly without promising rankings or a date, and turn one search into agreed measures and a dated review with the partners.',
    goodLooksLike: [
      '- Stays calm, acknowledges the embarrassment in front of his partners, and does not get defensive or blame the competitors.',
      '- Says plainly that no one can promise a ranking or a date, including for a single search, and does not repeat or add to any promise made in the sale.',
      '- Offers to walk the partners through the work completed and planned from the account’s actual plan, rather than listing deliverables or timelines from memory.',
      '- Asks what the partners judge success by, such as calls or signed cases in the practice areas they want, and moves the conversation from one search to agreed measures on a set schedule.',
      '- Does not invent results or timelines, offers to confirm any specifics, and proposes a dated review with the partners.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Those firms probably spend half what we pay you. How are they beating us?”',
      '“Give me a date when we’ll be on the first page, or I can’t defend this to my partners.”',
      '“You have one month. If we’re not on page one by then, we’re done.”',
    ],
    assessed: ['objection_handling', 'empathy_clarity', 'advancing'],
    defaults: [5, 5, 1],
    sources: [{ collection: 'sales-playbook', sections: ['6. ', '3. ', '8. ', '1. '] }],
  },
  {
    slug: 'adopt-omnizant-not-ranking-yet-v3',
    concept: 'adopt-omnizant-not-ranking-yet',
    title: 'Marketing manager needs more than “SEO takes time”',
    brand: 'omnizant',
    product: 'omnizant_web',
    subject: 'sales_technique',
    stage: 'am_adoption',
    roles: ['am'],
    personas: ['marketing_manager'],
    personaLines: {},
    situation:
      'You are the account manager for a 20-attorney estate planning firm, five weeks into an Omnizant SEO program. The marketing manager updates the partners every week, and she calls you before Thursday’s partner meeting.',
    buyerLine:
      '“The partners keep asking why we don’t show up for ‘estate planning attorney’ in our city yet. I need something better than ‘SEO takes time.’ What can I actually show them on Thursday?”',
    objective:
      'Help her give the partners an honest picture: what has been done, what will be measured and when, and why no one can promise a ranking or a date.',
    goodLooksLike: [
      '- Acknowledges the pressure she is under and asks what the partners were told to expect and what they judge success by.',
      '- Offers to walk her through the work completed and the next steps from the account’s actual plan, in a form she can share, rather than reciting deliverables or timelines from memory.',
      '- Says plainly that no one can promise a ranking or a date, and replaces a single search with agreed measures reviewed on a set schedule.',
      '- Suggests tying the reporting to what the partners care about, such as estate planning inquiries, and asks how the firm records where new clients come from.',
      '- Agrees on a dated review, possibly with the partners, and offers to confirm any specifics she asks about.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Can you give me a plain-English summary of what’s been done so far?”',
      '“One partner wants to know why a competitor ranks and we don’t. What do I say?”',
      '“If I can’t show progress by next month’s meeting, they’ll move the budget to ads.”',
    ],
    assessed: ['discovery', 'empathy_clarity', 'advancing'],
    defaults: [3, 3, 1],
    sources: [{ collection: 'sales-playbook', sections: ['3. ', '6. ', '8. ', '4. '] }],
  },

  // ------------------------------------------------------------ adopt-omnizant-reporting-cadence
  {
    slug: 'adopt-omnizant-reporting-cadence-v2',
    concept: 'adopt-omnizant-reporting-cadence',
    title: 'Partner wants one page a month, or nothing',
    brand: 'omnizant',
    product: 'omnizant_web',
    subject: 'sales_technique',
    stage: 'am_adoption',
    roles: ['am'],
    personas: ['managing_partner'],
    personaLines: {},
    situation:
      'You are the account manager for a new Omnizant website and SEO client, a four-attorney criminal defense firm. At the kickoff call, the managing partner sets his terms before you get to your agenda.',
    buyerLine:
      '“I don’t read fifty-page reports. Once a month, one page: is this bringing in cases or not? And don’t call me unless there’s something worth calling about.”',
    objective:
      'Agree on a reporting rhythm and format that suit him, be honest about what reports can show about cases, and set the first review date without promising results.',
    goodLooksLike: [
      '- Agrees to keep it short, then asks how he judges the firm’s marketing today and how the firm records where each new case came from.',
      '- Agrees on a rhythm and format that suit him, such as a short monthly summary in plain terms and a brief review call, and offers to confirm exactly what the standard reports include rather than inventing contents.',
      '- Is honest that reports show the work and the progress, that tying cases to SEO depends on how the firm tracks where inquiries come from, and that no one can promise rankings, leads, or cases.',
      '- Ties the summary to the cases he wants more of, such as the charges he prefers to defend, rather than activity for its own sake.',
      '- Agrees that every contact will carry a finding or a decision, not a check-in, and sets the date of the first review.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“How soon should those reports start showing more cases?”',
      '“My last agency’s reports were all charts and no answers. Why would yours be different?”',
      '“If three months of reports don’t show more cases, I’m out.”',
    ],
    assessed: ['discovery', 'empathy_clarity', 'advancing'],
    defaults: [4, 4, 1],
    sources: [{ collection: 'sales-playbook', sections: ['3. ', '7. ', '1. ', '4. '] }],
  },
  {
    slug: 'adopt-omnizant-reporting-cadence-v3',
    concept: 'adopt-omnizant-reporting-cadence',
    title: 'Solo asks how often he’ll hear from you',
    brand: 'omnizant',
    product: 'omnizant_web',
    subject: 'sales_technique',
    stage: 'am_adoption',
    roles: ['am'],
    personas: ['solo_attorney'],
    personaLines: {},
    situation:
      'You are the account manager for a new Omnizant SEO client, a solo employment law attorney. At kickoff, after you outline the first month, he asks about communication.',
    buyerLine:
      '“So how often will I hear from you, and what will you need from me? I can’t spend hours on this, and my last vendor only called when the invoice was due.”',
    objective:
      'Set a light, clear rhythm for updates and for what you need from him, tie the reports to the cases he wants, and avoid promising results.',
    goodLooksLike: [
      '- Asks what he most wants to know each month and which kinds of cases he wants more of, before describing anything.',
      '- Agrees on a light, regular rhythm, such as a short monthly update and a quarterly review, and says what you will need from him and when, offering to confirm specifics, so it takes little of his time.',
      '- Offers to confirm exactly what the reports include rather than inventing contents, and ties them to his goals, such as inquiries for the cases he wants.',
      '- Sets honest expectations in plain terms: updates show the work and the progress, and no one can promise rankings, calls, or cases.',
      '- Does not criticize his previous vendor, and agrees on the date of the first update.',
    ].join('\n'),
    roleGuidance: {},
    pushbacks: [
      '“Can you just email me? I don’t have time for calls.”',
      '“Will the reports tell me which clients came from Google?”',
      '“If I don’t see more calls in three months, why would I keep paying?”',
    ],
    assessed: ['discovery', 'empathy_clarity', 'advancing'],
    defaults: [3, 4, 1],
    sources: [{ collection: 'sales-playbook', sections: ['3. ', '1. ', '4. ', '7. ', '6. '] }],
  },
];
