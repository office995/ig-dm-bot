// Functional intent matcher.
// Most user intents are handled by the LLM with the system prompt.
// Only intents that have functional side-effects (must flag, must pause)
// are matched here as a safety net so the LLM can't forget.

const INTENTS = [
  // Model lead — must flag and pause regardless of what the LLM says.
  // The LLM is also prompted to emit [MODEL_LEAD], but this catches cases
  // where the LLM misses the cue.
  {
    name: 'model_lead',
    test: (m) => /\b(i'?m\s*a\s*(model|creator|content\s*creator|influencer|onlyfans\s*(model|creator)|of\s*creator)|i\s*am\s*a\s*(model|creator|content\s*creator|influencer|onlyfans\s*(model|creator)|of\s*creator)|i\s*do\s*(content|onlyfans|of)\b|i\s*create\s*(content|of)\b|need\s*(help|management)\s*(for|with)\s*my\s*(page|account|of)|want\s*(management|representation|to\s*be\s*managed)|can\s*you\s*(manage|help\s*with)\s*my\s*(page|account|of)|want\s*to\s*join\s*elegancy|im\s*a\s*(model|creator|influencer))\b/i.test(m),
    reply: 'ok one sec, someone will hit you up\n[MODEL_LEAD]',
    modelLead: true,
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
