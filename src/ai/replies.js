const { SYSTEM_PROMPT } = require('./prompts');
const { callClaudeRaw } = require('./anthropic');
const {
  humanizeReply,
  enforceLength,
  isTooSimilarReply,
  findMostSimilarReply,
} = require('../lib/text');

function userShowsLinkIntent(text) {
  return /\b(join|sign up|signup|start|buy|price|cost|how much|where|link|website|site|apply|interested|ready)\b/i.test(text || '');
}

async function callOpenAI(messages, convoMeta = {}, extraInstruction = '') {
  const msgCount = convoMeta.message_count || 0;
  const linkSent = convoMeta.has_sent_link || false;

  const lastUserMessage =
    [...messages].reverse().find(m => m.role === 'user')?.content || '';

  const recentAssistantReplies = messages
    .filter(m => m.role === 'assistant')
    .slice(-6)
    .map(m => m.content.trim())
    .filter(Boolean);

  let contextNote = `

conversation state:
- this is message #${msgCount}
- keep it concise
- one short line most of the time
- two short lines max when needed
- answer exactly what they asked
- stay natural and conversational
- do not overexplain`;

  if (!linkSent && userShowsLinkIntent(lastUserMessage)) {
    contextNote += `
- if it feels natural here, include:
www.thejungle.life
- keep the link on its own line`;
  }

  const avoidNote = recentAssistantReplies.length
    ? `

==================================================
your previous replies in this conversation (DO NOT REPEAT)
==================================================
${recentAssistantReplies.map((r, i) => `${i + 1}. "${r}"`).join('\n')}

hard rules:
- do not reuse any opener from above
- do not reuse the same sentence structure
- do not say the same thing the same way twice
- if you would say something similar to any of the above, change it. fresh wording, same meaning.`
    : '';

  const extraNote = extraInstruction
    ? `

extra instruction:
${extraInstruction}`
    : '';

  const fullPrompt = SYSTEM_PROMPT + contextNote + avoidNote + extraNote;

  // First attempt
  let text = await callClaudeRaw('claude-haiku-4-5', fullPrompt, messages, 80);
  let finalText = humanizeReply(enforceLength(text));

  // Retry up to twice if too similar to a prior reply, surfacing the offending text
  for (let attempt = 0; attempt < 2; attempt++) {
    if (!isTooSimilarReply(messages, finalText)) break;

    const offending = findMostSimilarReply(messages, finalText);
    const stricter =
      fullPrompt +
      `\n\nyour draft reply was too similar to a previous one. ${
        offending
          ? `you already said: "${offending}". do NOT use that phrasing, opener, or structure again.`
          : 'rephrase completely.'
      } same substance, totally different wording. shorter sentences, different opener.`;

    text = await callClaudeRaw('claude-haiku-4-5', stricter, messages, 80);
    finalText = humanizeReply(enforceLength(text));
  }

  return finalText;
}

module.exports = {
  callOpenAI,
};
