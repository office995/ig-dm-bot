const express = require('express');
const { requireSecret } = require('../middleware/auth');
const {
  conversations,
  paused,
  followUps,
  followUpAttempts,
  leadTypes,
  contactNames,
  lastActivity,
  rateLimits,
  replyTracker,
  replyCooldown,
  processingContacts,
  pendingReplySeq,
  burstStartedAt,
  lastInboundAt,
  linkSentCache,
} = require('../state/memory');
const { sanitize } = require('../lib/utils');
const { logToElla } = require('../lib/logger');
const { dbFlagContact } = require('../db/contacts');

const router = express.Router();

router.post('/pause/:id', requireSecret, (req, res) => {
  const cid = sanitize(req.params.id);
  paused[cid] = { at: new Date().toISOString(), reason: 'manual_pause' };
  dbFlagContact(cid, true);
  res.json({ success: true, paused: cid });
});

router.post('/resume/:id', requireSecret, (req, res) => {
  const cid = sanitize(req.params.id);
  delete paused[cid];
  dbFlagContact(cid, false);
  res.json({ success: true, unpaused: cid });
});

router.post('/takeover/:id', (req, res) => {
  const cid = sanitize(req.params.id);
  paused[cid] = { at: new Date().toISOString(), reason: 'owner_takeover' };
  dbFlagContact(cid, true);
  res.json({ success: true, paused: cid });
});

router.post('/unpause/:id', (req, res) => {
  const cid = sanitize(req.params.id);
  delete paused[cid];
  dbFlagContact(cid, false);
  res.json({ success: true, unpaused: cid });
});

router.get('/paused', requireSecret, (req, res) => {
  const list = Object.entries(paused).map(([id, data]) => ({
    contact_id: id,
    ...data,
    name: contactNames[id] || 'Unknown',
  }));
  res.json({ paused: list });
});

router.post('/reset/:id', requireSecret, (req, res) => {
  const cid = sanitize(req.params.id);
  delete conversations[cid];
  delete paused[cid];
  delete followUps[cid];
  delete followUpAttempts[cid];
  delete leadTypes[cid];
  delete contactNames[cid];
  delete lastActivity[cid];
  delete rateLimits[cid];
  delete replyTracker[cid];
  delete replyCooldown[cid];
  delete processingContacts[cid];
  delete pendingReplySeq[cid];
  delete burstStartedAt[cid];
  delete lastInboundAt[cid];
  delete linkSentCache[cid];
  logToElla('info', 'contact_reset', { cid });
  res.json({ success: true, message: `All state cleared for ${cid}` });
});

module.exports = router;