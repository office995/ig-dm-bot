function mockReply(messages) {
  const last = (messages[messages.length - 1]?.content || '').toLowerCase().trim();
  const turnCount = messages.filter(m => m.role === 'user').length;

  if (/\b(onlyfans|i'm a model|i am a model|i do content|creator|management|join elegancy|need help with my page)\b/i.test(last)) {
    return '[MODEL_LEAD]';
  }
  if (/^(hey|hi|yo|sup|what's up|wsp|👋)$/i.test(last)) return "yo what's good";
  if (/how much|price|cost/i.test(last)) return '69 a month rn';
  if (/scam|legit|real/i.test(last)) return 'look at it yourself\nwww.thejungle.life';
  if (/what do you do|what is this|ofm|backend/i.test(last)) return 'backend side for creators';
  if (/tell me more|interested/i.test(last)) return 'depends what you wanna know';
  if (/ready|join|start|buy/i.test(last)) return "it's on here\nwww.thejungle.life";
  if (turnCount <= 1) return 'what made you reach out';
  return 'depends what you want';
}

module.exports = {
  mockReply,
};