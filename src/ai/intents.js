// Hardcoded intent → reply mapping for high-frequency DM scenarios.
// Runs BEFORE the LLM in the webhook handler. If a pattern matches,
// the bot replies with the exact template. Only unmatched messages
// fall through to Claude.
//
// Order matters — list highest-specificity intents first so they
// don't get swallowed by more general ones.

const INTENTS = [
  // 16. ready to join — strongest buy signal, runs first
  {
    name: 'wanna_join',
    test: (m) => /\b(i\s*(wanna|want\s*to|wana)\s*join|i'?m\s*in\b|sign\s*me\s*up|im\s*ready\s*to\s*join|ready\s*to\s*join|let'?s\s*do\s*(this|it)|how\s*do\s*i\s*(join|sign\s*up|start))\b/i.test(m),
    reply: "let's go. checkout's here\nwww.thejungle.life",
  },

  // 15. send link
  {
    name: 'send_link',
    test: (m) => /\b(send\s*(me\s*)?(the\s*)?link|drop\s*(the\s*)?link|share\s*(the\s*)?link|link\s*(please|pls)?\s*$|the\s*link\s*$|whats\s*the\s*(link|website|site|url)|what'?s\s*the\s*(link|website|site|url)|gimme\s*the\s*link|need\s*the\s*link)\b/i.test(m),
    reply: 'www.thejungle.life\nread it then come back if you got questions',
  },

  // 13. i'm a model — silent flag handoff
  {
    name: 'model_lead',
    test: (m) => /\b(i'?m\s*a\s*(model|creator|content\s*creator|influencer|onlyfans\s*(model|creator)|of\s*creator)|i\s*do\s*(content|onlyfans|of)\b|i\s*create\s*(content|of)|need\s*(help|management)\s*(for|with)\s*my\s*(page|account|of)|want\s*(management|representation|to\s*be\s*managed)|can\s*you\s*(manage|help\s*with)\s*my\s*(page|account|of)|want\s*to\s*join\s*elegancy)\b/i.test(m),
    reply: 'ok one sec, someone will hit you up\n[MODEL_LEAD]',
    modelLead: true,
  },

  // 11. broke / payment plans
  {
    name: 'broke_payment',
    test: (m) => /\b(broke\s*(rn|right\s*now)?|cant\s*afford|can'?t\s*afford|can\s*i\s*pay\s*(later|in\s*installments)|payment\s*plan|installments|too\s*expensive|no\s*money\s*(rn|right\s*now)|short\s*on\s*cash|cant\s*pay\s*now|can'?t\s*pay\s*now)\b/i.test(m),
    reply: "no payment plans. 69 is already the floor. if it's out of reach rn, save 2 weeks and come back, we'll be here",
  },

  // 19. scam (check before "legit" — has specific keyword)
  {
    name: 'scam',
    test: (m) => /\b(scam|isn'?t\s*(a\s*)?scam|is\s*(this|it)\s*(a\s*)?scam|sus|sketchy|fake|bs|bullshit)\b/i.test(m),
    reply: "i get it, internet's full of fakes. judge by the proof not my word. real student wins on the site, real names, real numbers. money back if it's bullshit\nwww.thejungle.life",
  },

  // 5. is this legit
  {
    name: 'legit',
    test: (m) => /\b(is\s*(this|it)\s*(legit|real|legitimate|for\s*real)|legit\s*\??\s*$|is\s*it\s*legit|are\s*you\s*legit|y'?all\s*legit)\b/i.test(m),
    reply: "yeah it's legit. real students, real numbers on the site, money back if it's not what i said\nwww.thejungle.life",
  },

  // 12. proof / does this work
  {
    name: 'proof',
    test: (m) => /\b(show\s*me\s*proof|got\s*proof|any\s*proof|proof\s*(this|it)\s*works|results|testimonials|student\s*wins|does\s*(this|it)\s*(actually\s*)?work|show\s*me\s*results|show\s*me\s*(it|this)\s*works|where'?s\s*the\s*proof)\b/i.test(m),
    reply: 'results page on the site, plus my reels show student wins weekly. real names, real screenshots\nwww.thejungle.life',
  },

  // 20. what's included for 69 (specific dollar version, before generic "what's included")
  {
    name: 'whats_included_69',
    test: (m) => /\b(what'?s\s*included\s*(for|in)\s*\$?69|whats\s*included\s*(for|in)\s*\$?69|what\s*do\s*(i|you)\s*get\s*for\s*\$?69|what\s*(does|do)\s*\$?69\s*(include|get|cover))\b/i.test(m),
    reply: 'full course (find creators, run pages, ads, scaling), private discord, weekly group calls, contracts + dm scripts you can copy paste. cancel anytime',
  },

  // 7. what do i get
  {
    name: 'what_i_get',
    test: (m) => /\b(what\s*do\s*i\s*(actually\s*)?get|what'?s\s*included|whats\s*included|what\s*comes\s*with|what\s*do\s*you\s*get|what'?s\s*in\s*(the\s*jungle|it|this)|what\s*are\s*you\s*offering)\b/i.test(m),
    reply: 'full course (modules on finding creators, chatting, ads, scaling), private discord, weekly group calls, contracts and dm scripts you can copy paste',
  },

  // 4. how much / price
  {
    name: 'price',
    test: (m) => /\b(how\s*much\s*(is\s*(it|this))?|whats\s*the\s*(price|cost)|what'?s\s*the\s*(price|cost)|whats\s*it\s*cost|what'?s\s*it\s*cost|price\s*\??\s*$|cost\s*\??\s*$|how\s*much\s*does\s*(it|this)\s*cost|pricing|how\s*much\s*for\s*the\s*jungle)\b/i.test(m),
    reply: '69 a month. cancel anytime. covers the full course, the discord, and the weekly calls',
  },

  // 8. how long before money
  {
    name: 'how_long',
    test: (m) => /\b(how\s*long\s*(b4|before|until|till)\s*(i|you|one|u)\s*(make|start\s*making|see)|how\s*fast.*money|when\s*(will|do|am\s*i)\s*(i\s*)?(start\s*)?(making|seeing|earning)|time\s*to\s*first|how\s*long\s*to\s*(sign|make|first)|how\s*long\s*does\s*it\s*take)\b/i.test(m),
    reply: 'if you actually put in work, first creator signed in 2 to 4 weeks. first 5k month usually 60 to 90 days. faster if you have ad budget',
  },

  // 17. hours per day
  {
    name: 'hours_per_day',
    test: (m) => /\b(how\s*many\s*hours|how\s*much\s*time\s*(per\s*day|a\s*day|daily)|time\s*commitment|hours\s*(a|per)\s*day|how\s*long\s*(per|a)\s*day|how\s*much\s*work\s*(per|a)\s*day)\b/i.test(m),
    reply: "2 to 4 hours a day to start. once you sign a creator and learn the chat flow it drops to 1 to 2. part time if you're efficient",
  },

  // 18. do i need money to start
  {
    name: 'need_money',
    test: (m) => /\b(do\s*i\s*need\s*(money|cash|capital|budget)\s*to\s*start|need\s*money\s*to\s*start|how\s*much\s*(capital|budget)\s*to\s*start|starting\s*budget|need\s*cash\s*to\s*start|can\s*i\s*start\s*with\s*no\s*money|broke\s*can\s*i\s*start)\b/i.test(m),
    reply: "you can start at 0 with organic only. with 200 to 500 for ads you scale way faster. but ads aren't required",
  },

  // 9. do i need a model already
  {
    name: 'need_model',
    test: (m) => /\b(do\s*i\s*need\s*a\s*(model|creator|girl)|need\s*a\s*(model|creator)\s*already|already\s*have\s*(a\s*)?(model|creator)|do\s*you\s*provide\s*(a\s*)?(model|creator))\b/i.test(m),
    reply: 'no. the first module is literally how to find and sign creators from 0. most people start with nothing',
  },

  // 10. calls or vids
  {
    name: 'calls_vids',
    test: (m) => /\b(do\s*(u|you)\s*(guys\s*)?do\s*calls|just\s*vids|calls\s*or\s*vids|video\s*lessons|are\s*there\s*(calls|live)|live\s*calls|group\s*calls)\b/i.test(m),
    reply: "weekly group calls + daily discord support + the course on demand. you're not alone in it",
  },

  // 14. what's different from other courses
  {
    name: 'different',
    test: (m) => /\b(what'?s\s*(different|diff)|how\s*(is|are)\s*(this|you)\s*different|why\s*not\s*(other|another)|vs\s*other|compared\s*to\s*other|different\s*from\s*other)\b/i.test(m),
    reply: 'most courses teach organic only which caps fast. we teach hybrid (paid traffic + organic + retention systems) which is why students scale past 10k/month instead of stalling at 1 to 2k',
  },

  // 6. how does the jungle work
  {
    name: 'how_it_works',
    test: (m) => /\b(how\s*does\s*(the\s*jungle|this|it)\s*work|how\s*does\s*this\s*work|how\s*does\s*it\s*work|whats\s*the\s*process|what'?s\s*the\s*process|how\s*it\s*works|what\s*is\s*the\s*jungle)\b/i.test(m),
    reply: 'you join. you get the full playbook (finding creators, running pages, scaling with ads). plus daily discord and weekly group calls. 69/month',
  },

  // 3. teach me ofm
  {
    name: 'teach_ofm',
    test: (m) => /\b(teach\s*me\s*ofm|teach\s*me\s*how|how\s*(do|to)\s*(i|you)\s*(start|do)\s*ofm|break\s*it\s*down|explain\s*ofm|how\s*does\s*ofm\s*work|walk\s*me\s*through|teach\s*me\s*the\s*business)\b/i.test(m),
    reply: 'ok 3 parts. 1) find a creator. 2) run her page (chatting, posting, marketing, ads). 3) take 30 to 50 percent of revenue. the hybrid version uses paid traffic so it scales instead of capping at 2k a month like organic does',
  },

  // 2. what is ofm
  {
    name: 'what_is_ofm',
    test: (m) => /\b(what\s*is\s*ofm|whats\s*ofm|what'?s\s*ofm|ofm\s*meaning|define\s*ofm|whats\s*this\s*ofm|what'?s\s*this\s*ofm)\b/i.test(m),
    reply: "ofm = onlyfans management. you run a creator's page for her, take 30 to 50 percent. no camera, no face. backend only",
  },

  // 1. greeting + mentions reel/content
  {
    name: 'greeting_reel',
    test: (m) => /\b(yo|hey|hi|sup|wassup|whats\s*up|what'?s\s*up)\b.*\b(reel|video|post|content|page|story)\b/i.test(m) ||
                 /\b(reel|video|post|content)\b.*\b(yo|hey|hi|sup|hit\s*you\s*up|hmu)\b/i.test(m),
    reply: 'yo. you trying to actually learn ofm or just looking around',
  },

  // 1b. pure greeting fallback
  {
    name: 'greeting_only',
    test: (m) => /^(yo|hey|hi|sup|wassup|whats\s*up|what'?s\s*up|hello|hola|👋|hiya)\s*[!.?]*\s*$/i.test(m.trim()),
    reply: "yo what's good. you trying to actually learn ofm or just looking around",
  },
];

function matchIntent(message) {
  const trimmed = (message || '').trim();
  if (!trimmed) return null;
  for (const intent of INTENTS) {
    if (intent.test(trimmed)) {
      return {
        intent: intent.name,
        reply: intent.reply,
        modelLead: !!intent.modelLead,
      };
    }
  }
  return null;
}

module.exports = {
  matchIntent,
};
