// canned replies for when the api key is missing or the api is unreachable.
// keep the voice on-brand: lowercase, direct, no fluff, no emojis.

function mockReply(messages) {
  const last = (messages[messages.length - 1]?.content || '').toLowerCase().trim();
  const turnCount = messages.filter(m => m.role === 'user').length;

  if (/\b(onlyfans|i'm a model|i am a model|i do content|creator|management|join elegancy|need help with my page)\b/i.test(last)) {
    return 'ok one sec, someone will hit you up\n[MODEL_LEAD]';
  }
  if (/^(hey|hi|yo|sup|what's up|wsp|👋)$/i.test(last)) return "yo what's good. you trying to learn ofm or just looking around";
  if (/how much|price|cost/i.test(last)) return '69 a month. cancel anytime. covers the full course, discord, weekly calls, contracts and scripts';
  if (/scam|legit|real/i.test(last)) return 'fair question. judge by the proof not my word. real student wins on the site\nwww.thejungle.life';
  if (/what do you do|what is this|ofm|backend/i.test(last)) return 'ofm = onlyfans management. you run a creator\'s page, take 30 to 50 percent. no camera, no face. backend only';
  if (/teach|learn|how does it work|how it works/i.test(last)) return '3 parts. find a creator, run her page, take 30 to 50 percent. hybrid version uses paid traffic so it scales past 10k instead of capping at 1 to 2k like organic';
  if (/proof|results|testimonials|student/i.test(last)) return 'results page on the site, plus my reels show student wins weekly. real names, real screenshots\nwww.thejungle.life';
  if (/what.*included|what.*get|whats included/i.test(last)) return 'full course, private discord, weekly calls, contracts and dm scripts. 69 a month';
  if (/ready|join|start|buy|sign up|signup/i.test(last)) return "let's go. checkout's here\nwww.thejungle.life";
  if (/link|website|site/i.test(last)) return 'www.thejungle.life\nread it then come back if you got questions';
  if (/how long|how fast|when.*money|time/i.test(last)) return 'if you actually put in work, first creator in 2 to 4 weeks. first 5k month usually 60 to 90 days';
  if (/hours|how much time|time commitment/i.test(last)) return '2 to 4 hours a day to start. drops to 1 to 2 once it\'s running. part time if you\'re efficient';
  if (/model|do i need.*creator/i.test(last)) return 'no. first module is how to find and sign creators from zero';
  if (/money to start|budget|broke|no money/i.test(last)) return 'you can start at 0 with organic. 200 to 500 for ads makes scaling faster, not required';
  if (turnCount <= 1) return "yo what's good. what made you reach out";
  return 'what specifically are you trying to figure out';
}

module.exports = {
  mockReply,
};
