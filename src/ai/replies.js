const { SYSTEM_PROMPT } = require('./prompts');
const { callClaudeRaw } = require('./anthropic');
const {
  humanizeReply,
  enforceLength,
  isTooSimilarReply,
  findMostSimilarReply,
} = require('../lib/text');
const { userExplicitlyAsksForLink } = require('../lib/utils');

function userShowsLinkIntent(text) {
  return /\b(join|sign up|signup|start|buy|price|cost|how much|where|link|website|site|apply|interested|ready)\b/i.test(text || '');
}

async function callOpenAI(messages, convoMeta = {}, extraInstruction = '') {
  const msgCount = convoMeta.message_count || 0;
  const linkSent = convoMeta.has_sent_link || false;

  const lastUserMessage =
    [...messages].reverse().find(m => m.role === 'user')?.content || '';

  const userAskedAgain = userExplicitlyAsksForLink(lastUserMessage);

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

  if (linkSent && !userAskedAgain) {
    contextNote += `

LINK RULE FOR THIS REPLY (very important):
- you have ALREADY sent www.thejungle.life to this person earlier in the conversation
- do NOT paste the link again in this reply
- if you need to refer to it, say something like "in the link i sent above", "check the link above", or "it's in the link i sent" — do not paste the URL
- the user did not explicitly ask for the link again, so do not include it`;
  } else if (linkSent && userAskedAgain) {
    contextNote += `

LINK RULE FOR THIS REPLY:
- the user is explicitly asking for the link again — it's ok to send it
- end your reply with the link on its own line:
www.thejungle.life`;
  } else if (!linkSent && userShowsLinkIntent(lastUserMessage)) {
    contextNote += `

LINK RULE FOR THIS REPLY:
- if it feels natural here, include the link on its own line at the end:
www.thejungle.life`;
  } else if (!linkSent) {
    contextNote += `
- only paste www.thejungle.life if they ask for the link, ask pricing, ask for proof, or clearly sound ready to join`;
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
