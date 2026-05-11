const { conversations } = require('../state/memory');

function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>]/g, '').trim().slice(0, 2000);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isEnglish(text) {
  if (!text || text.length < 3) return true;
  const nonAsciiCount = (text.match(/[^\x00-\x7F]/g) || []).length;
  return (nonAsciiCount / text.length) < 0.2;
}

function trimConversation(contactId) {
  if (conversations[contactId] && conversations[contactId].length > 40) {
    conversations[contactId] = conversations[contactId].slice(-40);
  }
}

function getTurnCount(contactId) {
  if (!conversations[contactId]) return 0;
  return conversations[contactId].filter(m => m.role === 'user').length;
}

const LINK_URL = 'www.thejungle.life';
const LINK_REGEX = /(https?:\/\/(?:www\.)?thejungle\.life\/?|www\.thejungle\.life)/gi;

// Strict: only matches when the user clearly asks to be sent the URL.
// Used to override the "link already sent — don't repeat it" rule.
function userExplicitlyAsksForLink(text) {
  return /\b(send\s*(me\s*)?(the\s*)?link|drop\s*(the\s*)?link|share\s*(the\s*)?link|gimme\s*(the\s*)?link|need\s*(the\s*)?link|where'?s\s*the\s*link|where\s*is\s*the\s*link|whats\s*the\s*(link|website|site|url|address)|what'?s\s*the\s*(link|website|site|url|address)|link\s*again|website\s*again|resend\s*(the\s*)?link|send\s*it\s*again)\b/i.test(text || '');
}

// Splits an AI-generated reply into (body, link) so they can be sent as
// two separate Instagram DMs. Returns { body, link } where link may be ''.
function splitBodyAndLink(text) {
  if (!text) return { body: '', link: '' };
  const hasLink = LINK_REGEX.test(text);
  LINK_REGEX.lastIndex = 0;
  if (!hasLink) return { body: text.trim(), link: '' };

  const body = text
    .replace(LINK_REGEX, '')
    .replace(/\n{2,}/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .trim();

  return { body, link: LINK_URL };
}

module.exports = {
  sanitize,
  sleep,
  isEnglish,
  trimConversation,
  getTurnCount,
  LINK_URL,
  LINK_REGEX,
  userExplicitlyAsksForLink,
  splitBodyAndLink,
};