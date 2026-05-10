const { SYSTEM_PROMPT } = require('./prompts');
const { callOpenAIRaw } = require('./openai');
const {
  humanizeReply,
  enforceLength,
  isTooSimilarReply,
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
    .filter(Boolean)
    .join('\n- ');

  let contextNote = `

conversation state:
- this is message #${msgCount}
- keep it concise
- one short line most of the time
- two short lines max when needed
- answer exactly what they asked
- stay natural and conversational
- do not overexplain
- avoid repeating the same opener or wording
- if they ask the same thing again, respond with the same meaning in different words`;

  if (!linkSent && userShowsLinkIntent(lastUserMessage)) {
    contextNote += `
- if it feels natural here, include:
www.thejungle.life
- keep the link on its own line`;
  }

  const avoidNote = recentAssistantReplies
    ? `

recent assistant replies to avoid repeating:
- ${recentAssistantReplies}
do not reuse the same wording, opener, or sentence structure from any of those.`
    : '';

  const extraNote = extraInstruction
    ? `

extra instruction:
${extraInstruction}`
    : '';

  const fullPrompt = SYSTEM_PROMPT + contextNote + avoidNote + extraNote;

  let text = await callOpenAIRaw('gpt-4o-mini', fullPrompt, messages, 80);
  let finalText = humanizeReply(enforceLength(text));

  if (isTooSimilarReply(messages, finalText)) {
    text = await callOpenAIRaw(
      'gpt-4o-mini',
      fullPrompt + '\n\nsay the same thing in a fresh, natural, conversational way. keep it concise and clear.',
      messages,
      80,
    );
    finalText = humanizeReply(enforceLength(text));
  }

  return finalText;
}

module.exports = {
  callOpenAI,
};