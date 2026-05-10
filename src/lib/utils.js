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

module.exports = {
  sanitize,
  sleep,
  isEnglish,
  trimConversation,
  getTurnCount,
};