const { OPENAI_API_KEY } = require('../config/env');
const { CLASSIFY_PROMPT } = require('./prompts');
const { callOpenAIRaw } = require('./openai');

function createClassifier(logToElla) {
  async function classifyIntent(message) {
    if (!OPENAI_API_KEY || !OPENAI_API_KEY.startsWith('sk-')) {
      const msg = message.toLowerCase();
      if (/\b(onlyfans|model|creator|content|management)\b/i.test(msg)) return 'MODEL';
      if (/\b(party|hangout|pull up|come through)\b/i.test(msg)) return 'PERSONAL';
      if (/^(hey|sup|yo|hi|\?)$/i.test(msg.trim())) return 'UNCLEAR';
      return 'BUYER';
    }

    try {
      const result = await callOpenAIRaw(
        'gpt-4o-mini',
        CLASSIFY_PROMPT,
        [{ role: 'user', content: message }],
        10
      );

      const cleaned = result.trim().toUpperCase();
      if (['BUYER', 'MODEL', 'PERSONAL', 'UNCLEAR'].includes(cleaned)) {
        return cleaned;
      }

      return 'BUYER';
    } catch (err) {
      if (typeof logToElla === 'function') {
        logToElla('error', 'classify_failed', { error: err.message });
      }
      return 'BUYER';
    }
  }

  return {
    classifyIntent,
  };
}

module.exports = {
  createClassifier,
};