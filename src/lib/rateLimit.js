const { rateLimits, globalApiCalls } = require('../state/memory');

function checkRateLimit(contactId) {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;

  if (!rateLimits[contactId]) {
    rateLimits[contactId] = [];
  }

  rateLimits[contactId] = rateLimits[contactId].filter(ts => now - ts < windowMs);

  if (rateLimits[contactId].length >= 30) {
    return false;
  }

  rateLimits[contactId].push(now);
  return true;
}

function checkGlobalRateLimit() {
  const now = Date.now();
  const windowMs = 60 * 1000;

  while (globalApiCalls.length > 0 && now - globalApiCalls[0] > windowMs) {
    globalApiCalls.shift();
  }

  if (globalApiCalls.length >= 50) {
    return false;
  }

  globalApiCalls.push(now);
  return true;
}

module.exports = {
  checkRateLimit,
  checkGlobalRateLimit
};
