const express = require('express');
const { requireSecret } = require('../middleware/auth');
const {
  conversations,
  contactNames,
  leadTypes,
  paused,
  followUps,
  lastActivity,
} = require('../state/memory');
const { sanitize, getTurnCount } = require('../lib/utils');

const router = express.Router();

router.get('/conversations', requireSecret, (req, res) => {
  const list = Object.entries(conversations).map(([id, msgs]) => ({
    contact_id: id,
    name: contactNames[id] || 'Unknown',
    messages: msgs.length,
    turns: msgs.filter(m => m.role === 'user').length,
    lead_type: leadTypes[id] || 'UNKNOWN',
    status: paused[id] ? 'PAUSED' : 'ACTIVE',
    last_activity: lastActivity[id],
  }));

  res.json({ conversations: list });
});

router.get('/conversations/:id', requireSecret, (req, res) => {
  const cid = sanitize(req.params.id);

  if (!conversations[cid]) {
    return res.status(404).json({ error: 'Contact not found' });
  }

  res.json({
    contact_id: cid,
    name: contactNames[cid],
    lead_type: leadTypes[cid],
    status: paused[cid] ? 'PAUSED' : 'ACTIVE',
    paused_info: paused[cid] || null,
    follow_up: followUps[cid] || null,
    messages: conversations[cid],
  });
});

module.exports = router;