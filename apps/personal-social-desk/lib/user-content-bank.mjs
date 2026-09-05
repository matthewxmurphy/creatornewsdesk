const bankId = 'user-bank-2026-07-22';

function item(id, title, body, lane = 'ready', notes = '') {
  return Object.freeze({ id, title, body, lane, notes });
}

export const USER_CONTENT_BANK = Object.freeze({
  id: bankId,
  label: 'Matthew Murphy content bank · July 22, 2026',
  importedAt: '2026-07-22T00:00:00.000Z',
  items: Object.freeze([
    item('business-math', 'Business math is wild', 'Write a short, personal story about someone spending $300 every month on junk while calling a $59.95 money-making tool “too much.” End with: What’s the most backwards money logic you’ve seen?', 'outline'),
    item('table-takers', 'Not everyone at your table is there to eat with you', 'Write a sharp, relatable story about a friend or business partner who took advantage and then acted as if they helped. End with: Ever have someone take from you and act like they helped you?', 'outline'),
    item('social-cafeteria', 'Social media is the new high school cafeteria', 'Write a sarcastic post about people who follow and watch everything but never react or comment. End with: Who’s lurking in your cafeteria?', 'outline'),
    item('five-killers', 'Five killers beat fifty babysitters', 'Write about why small, focused teams outperform big, lazy ones. End with: What’s your dream team size?', 'outline'),
    item('become-the-trend', 'Stop chasing trends — become the trend', 'Write a hot take on why originality pays longer than copying what is trending. End with: What’s one thing you do differently than everyone else?', 'outline'),
    item('network-paycheck', 'Your network is worth more than your paycheck', 'Add a true personal story about a connection that opened a big door. End with: Who’s someone you’re glad you met?', 'outline'),
    item('rent-lifestyle', 'Free game: Don’t rent your lifestyle', 'Write a blunt post about financing appearances instead of building real wealth. End with: What’s the dumbest thing you’ve seen someone finance?', 'outline'),
    item('overnight-success', 'Most people quit because they think it’s taking too long', 'Write a business patience reality check with a sarcastic jab at overnight success. End with: How long did it really take you to see results?', 'outline'),
    item('silent-friends', 'If your friends don’t share your posts, are they really supporting you?', 'Write about the silent circle that wants to see success but will not lift a finger. End with: How do you deal with friends who don’t support?', 'outline'),
    item('comfort-kills-dreams', 'Comfort is killing more dreams than failure', 'Write a blunt motivational post with a true example of when comfort almost cost you. End with: What comfort zone did you have to break out of?', 'outline'),

    item('eat-it-hot', 'Eat it while it is hot', `Women who cook with love get mad when you don’t eat while it’s hot. 🥴😭🤣
#EatItHot #CookingWithLove #DinnerRules`),
    item('roblox-haunted-house', 'The Roblox haunted house', `A haunted house, but it’s filled with children telling you about Roblox. 🎃
#TrueHorror #ParentLife #RobloxOverload`),
    item('early-thanksgiving', 'An early Thanksgiving feast', `My appetite’s gearing up for a feast; how about an early Thanksgiving celebration this weekend? 🤷‍♂️😂🦃
#ThanksgivingFeels #EarlyFeast #AlwaysHungry`, 'seasonal', 'Hold for the Thanksgiving season.'),
    item('cooking-with-heart', 'Cooking with heart means eating now', `A woman’s culinary passion is apparent when she insists you enjoy the meal piping hot. 🥴😭🍲
#HotAndFresh #CookingWithHeart #EatNow`),
    item('dinner-time-relative', 'Dinner time is relative', `“Dinner at 4” now reads “6:30”—guess it’s a Thanksgiving rehearsal. Timing is everything! 🤧🕓😂
#TimeIsRelative #ThanksgivingPrep #HungryAndWaiting`, 'seasonal', 'Hold for the Thanksgiving season.'),
    item('snore-denial', 'Snore denial', `Some can saw logs all night and then claim with a straight face they never dozed off. 😂💤
#SnoreDenial #SleepConfessions #LiesWeTell`),
    item('gross-pay-santa', 'My holiday gross-pay wish', `This holiday season, Santa, can we discuss my gross pay as my gift? 🎅🤧💰
#HolidayWishlist #PayMeSanta #FinancialSanta`, 'seasonal', 'Hold for the holiday season.'),
    item('bed-life-thoughts', 'Quiet bed thoughts', `Ever find yourself pondering life’s reality during a quiet moment on your bed? 😅🛌🌌
#LateNightThoughts #Life`),
    item('ghosts-bored', 'Do ghosts get tired of haunting?', `You thinking if ghosts ever get tired of haunting the same old places. 👻
#dadjokes #GhostlyThoughts #SpicyLife #Humor`),
    item('owls-forever-vibe', 'Do owls get bored of hooting?', `Time to stop with the energy drinks. I spent hours wondering if owls ever get bored of hooting or if that’s just their forever vibe. 🦉
#dadjokes #OwlLife #Overthinking #FunnyThoughts`),
    item('dragon-tongues', 'Are dragon tongues fireproof?', `I’m taking a break from spicy ramen. I ended up sitting for hours thinking if dragons have fireproof tongues or if it just burns a little every time. 🐉
#dadjokes #DragonThoughts #RamenOverload #Humor`),
    item('dolphin-gossip', 'Dolphins probably gossip about us', `Last time I eat chips at midnight! I sat there wondering if dolphins ever gossip about humans, like, “Did you see what that one did with the jet ski?” 🐬
#dadjokes #DolphinDrama #MidnightMusings #Humor`),
    item('red-light-party', 'Every red light joins the party', `You know what really grinds my gears? When you’re running late and every red light decides to join the party. 🚦
#RedLightRage #NeverOnTime`),
    item('typing-then-stops', 'Typing… then nothing', `You know what really grinds my gears? When you send a risky text and the person starts typing… then stops. 😳
#TextAnxiety #SaySomething`),
    item('know-it-all-ergy', 'Know-it-All-ergy', `Why do some folks act like they’ve read every book? 📚
They’re clearly battling Know-it-All-ergy! 😂🤓📖
#KnowItAll #BookFlex #CantTellThemAnything #HumorTherapy`),
    item('dramaqueenitis', 'Dramaqueenitis', `Know that person who makes drama out of nothing? 🎥
Seems like they’ve caught Dramaqueenitis! 😆👑🎭
#DramaQueen #DramaKing #OverTheTop #LaughItOff`),
    item('delusional-hero', 'Delusional Hero Complex', `Ever met someone who’s a legend in their own mind? 🦸‍♂️
They must have Delusional Hero Complex! 🤣🚀😉
#LegendInTheirOwnMind #DelusionalVibes #HeroComplex #LOL`),
    item('yesterdaysitis', 'Chronic Yesterdaysitis', `Why are some so obsessed with the past? ⏳
Living with Chronic Yesterdaysitis, perhaps? 😅🔍📆
#StuckInThePast #ChronicYesterdaysitis #MoveForward #LightHumor`),
    item('short-link-blocked', 'Short-link fake-profile speed run', `.gd and .me profiles be like: “Hey handsome…” Me: Blocked before you even finished typing. 💀
#FakeProfilesBeGone #StayVigilant`),
    item('connections-skill', 'Connections, trust, and opportunity', `Making connections is a Skill
Building trust is a Discipline
Turning relationships into opportunities is an Art
#Networking101 #RelationshipGoals #TrustMatters`),
    item('goals-skill', 'Goals, focus, and greatness', `Chasing goals is a Skill
Staying focused is a Discipline
Achieving greatness is an Art
#StayFocused #GoalChaser #GreatnessAwaits`),
    item('business-skill', 'Starting, sustaining, and scaling', `Starting a business is a Skill
Keeping it afloat is a Discipline
Scaling it to success is an Art
#EntrepreneurLife #BusinessGrowth #SuccessMindset`),
    item('peace-skill', 'Peace, balance, and harmony', `Finding peace is a Skill
Maintaining balance is a Discipline
Living in harmony is an Art
#InnerPeace #BalanceInLife #HarmonyGoals`),
    item('ideas-skill', 'Ideas, execution, and reality', `Generating ideas is a Skill
Executing them is a Discipline
Turning them into reality is an Art
#IdeaToAction #ExecutionMatters #DreamBig`),
    item('productivity-skill', 'Productivity, consistency, and purpose', `Being productive is a Skill
Staying consistent is a Discipline
Thriving in your purpose is an Art
#ProductivityHacks #ConsistencyIsKey #PurposeDriven`),
    item('meta-short-link-logic', 'Meta logic and short links', `Meta: Let’s revolutionize social media! Also Meta: Still lets .me and arah.in links slide into my DMs like it’s nothing. 🤦‍♂️
#MetaLogic #FixTheFake`),
    item('kindness-humility', 'Kindness without superiority', `It’s funny how people preach kindness but act like they’re too good for anyone else. Stay humble. 💙
#WalkTheWalk #HumilityWins #BeReal`),
    item('support-show-up', 'Support has to show up', `They can talk about “support” all day, but if they don’t show up when it matters, the words mean nothing. 💔
#TrueSupport #ShowUpOrStaySilent #RealTalk`),
    item('half-truth', 'Half the truth is not honesty', `There are people who talk about honesty but only tell you half the truth. Keep it real or keep it moving. 👋
#BeReal #HonestyFirst #TrueColors`),
    item('loyalty-actions', 'Loyalty is not a trend', `It’s easy to talk about loyalty, but when things get real, some people disappear. Loyalty isn’t a trend. 💪
#StayLoyal #RealOnesOnly #ActionsOverWords`),
    item('conditional-positivity', 'Positivity with conditions', `A lot of people are “positive” until they get a chance to throw shade. Real positivity doesn’t come with conditions. 🌞
#StayPositive #BeReal #UnconditionalVibes`),
    item('clap-for-others', 'Support means clapping for others', `It’s crazy how some people talk about being supportive, but can’t clap for anyone but themselves. 👏
#SupportEachOther #ActionsMatter #BeHappyForOthers`),
    item('kindness-mask', 'Kindness is shown', `Some people wear masks of kindness, but behind it all, they’re quick to judge. Kindness is shown, not just said. 💫
#BeKind #RealTalk #TrueKindness`),
    item('pin-reel-tip', 'Creators: pin your strongest Reel', `Pinning your most engaging Reel keeps it at the top, grabbing everyone’s attention when they visit your profile. It’s a must for creators! 📌👀
#PinToWin #ReelStrategy #CreatorsListenUp`),
    item('weekend-plans', 'What kind of weekend plans?', `Them: “So, any big plans this weekend?”
Me: “You mean real plans, plans to sleep, or the plans I make just to cancel?”
Them: “I think I understand.”
#WeekendPlans #SleepGoals #ProCanceling`),
    item('best-life-versions', 'Which best life?', `Them: “Are you living your best life?”
Me: “You mean the one on Instagram, the one in my head, or the one where I’m wearing pajamas at 3 PM?”
Them: “Got it.”
#BestLife #PajamaDay #InstagramVsReality`),
    item('high-school-keeping-up', 'Keeping up with high school', `Them: “Are you keeping up with anyone from high school?”
Me: “Like real people, Facebook friends, or just people I stalk online occasionally?”
Them: “Let’s move on.”
#Throwback #HighSchoolVibes #InternetDetective`),
    item('seeing-anyone', 'So, are you seeing anyone?', `Them: “So, you seeing anyone lately?”
Me: “You mean in person, on my social feed, or just the stress dreams at night?”
Them: “Forget I asked.”
#DatingLife #StressDreams #SocialMediaLove`),
    item('what-for-fun', 'What do you do for fun?', `Them: “What do you do for fun?”
Me: “You mean actual hobbies, scrolling endlessly, or thinking about things I’ll never do?”
Them: “Nevermind.”
#HobbyGoals #ScrollLife #Overthinker`),
    item('weather-the-storm', 'Weather the storm', `A storm may be fierce, but it passes, leaving behind calm skies. Whatever challenges you face, know that you have the strength to weather the storm and emerge stronger. ⛈️🌈
#WeatherTheStorm #StrongerEveryDay`),

    item('november-5-sharing', 'Holiday season creator support', `It’s almost holiday season, and while you’re out giving thanks, don’t forget to share, tag, and support your fellow creators. We’re all in this together. 🙌
#GratefulForYou #SocialSupport`, 'seasonal', 'Original note says November 5.'),
    item('november-6-giving', 'Giving season support', `November is the start of giving season. Whether it’s your favorite creator or a small business, sharing is caring—and your support matters. 🙏
#GiveBack #SupportSmall`, 'seasonal', 'Original note says November 6.'),
    item('november-7-social-gold', 'Sharing is social gold', `Trick or treat season is over, but the real treat is sharing your friends’ content. Spread that social wealth and make a difference. 🎉
#SupportYourFriends #SocialGold`, 'seasonal', 'Original note says November 7.'),

    item('bank-loan-heist', 'Thirty-year loan math', `Bank loan: 30 years of payments. Bank heist: 5-10 years, no payments. Just a thought… Follow me for more “financial guidance.” 😂
#MoneyMoves #FinancialAdvice #KiddingNotKidding`, 'tone-review', 'Crime joke: review wording before publishing.'),
    item('prison-plan', 'The prison plan', `Stressed about debt? Remember, the prison plan is shorter than the mortgage plan. Follow for more “innovative” finance tips. 🕶️💰
#DebtFreeLife #FinancialHumor #JustJokes`, 'tone-review', 'Crime joke: review wording before publishing.'),
    item('sentence-life-hack', 'A shorter sentence', `If you’re gonna work hard for 30 years, might as well work smart. Like a 5-10 year “sentence” with free meals and a roof. Follow for more life hacks! 🍽️
#AlternativeFinance #FunnyFinance #Humor`, 'tone-review', 'Crime joke: review wording before publishing.'),
    item('free-rent-joke', 'The free-rent plan', `Why get a mortgage when you can get “free rent” for 5-10 years? 😆 Follow me for more clever “financial advice.”
#HouseHack #FinanceTips #JustKidding`, 'tone-review', 'Crime joke: review wording before publishing.'),

    item('eminem-quote-collection', 'Eminem quote and lyric collection', 'A collection of user-supplied Eminem quotations and lyric excerpts was supplied with this bank. It is intentionally excluded from automatic scheduling until attribution, quote accuracy, and reuse rights are reviewed.', 'rights-review', 'Do not auto-publish copyrighted lyric excerpts or unverified attributions.'),
  ]),
});

export function userContentBankSummary(queueItems = []) {
  const counts = USER_CONTENT_BANK.items.reduce((result, entry) => {
    result[entry.lane] = Number(result[entry.lane] || 0) + 1;
    return result;
  }, {});
  const sourcePrefix = `user-content-bank:${USER_CONTENT_BANK.id}:`;
  const queuedIds = new Set((queueItems || [])
    .map((entry) => String(entry.source || ''))
    .filter((source) => source.startsWith(sourcePrefix))
    .map((source) => source.slice(sourcePrefix.length)));
  return {
    id: USER_CONTENT_BANK.id,
    label: USER_CONTENT_BANK.label,
    counts,
    total: USER_CONTENT_BANK.items.length,
    queued: queuedIds.size,
    readyUnqueued: USER_CONTENT_BANK.items.filter((entry) => entry.lane === 'ready' && !queuedIds.has(entry.id)).length,
  };
}

