const conversations = {};
const paused = {};
const followUps = {};
const followUpAttempts = {};
const leadTypes = {};
const contactNames = {};
const lastActivity = {};
const rateLimits = {};
const globalApiCalls = [];
const replyTracker = {};
const linkSentCache = {};
const recentWebhooks = {};
const replyCooldown = {};
const processingContacts = {};
const pendingReplySeq = {};
const burstStartedAt = {};
const lastInboundAt = {};

module.exports = {
  conversations,
  paused,
  followUps,
  followUpAttempts,
  leadTypes,
  contactNames,
  lastActivity,
  rateLimits,
  globalApiCalls,
  replyTracker,
  linkSentCache,
  recentWebhooks,
  replyCooldown,
  processingContacts,
  pendingReplySeq,
  burstStartedAt,
  lastInboundAt,
};
