const express = require('express');
const {
  conversations,
  paused,
  followUps,
  leadTypes,
} = require('../state/memory');
const { requireSecret } = require('../middleware/auth');

const router = express.Router();

router.get('/metrics', requireSecret, (req, res) => {
  const contactIds = Object.keys(conversations);
  let totalTurns = 0;
  let closedCount = 0;
  let escalatedCount = 0;
  let modelLeads = 0;
  const avgTurnsToClose = [];

  for (const id of contactIds) {
    const msgs = conversations[id] || [];
    const userTurns = msgs.filter(m => m.role === 'user').length;
    totalTurns += userTurns;

    const hasCheckoutLink = msgs.some(
      m => m.role === 'assistant' && m.content.includes('www.thejungle.life')
    );

    if (hasCheckoutLink) {
      closedCount++;
      avgTurnsToClose.push(userTurns);
    }

    if (paused[id]?.reason === 'escalate') escalatedCount++;
    if (leadTypes[id] === 'MODEL') modelLeads++;
  }

  const avgClose = avgTurnsToClose.length > 0
    ? (avgTurnsToClose.reduce((a, b) => a + b, 0) / avgTurnsToClose.length).toFixed(1)
    : null;

  res.json({
    total_contacts: contactIds.length,
    total_buyer_leads: Object.values(leadTypes).filter(t => t === 'BUYER').length,
    total_model_leads: modelLeads,
    total_personal: Object.values(leadTypes).filter(t => t === 'PERSONAL').length,
    conversations_with_close: closedCount,
    close_rate: contactIds.length > 0
      ? ((closedCount / contactIds.length) * 100).toFixed(1) + '%'
      : '0%',
    avg_turns_to_close: avgClose,
    escalated: escalatedCount,
    followups_pending: Object.keys(followUps).length,
    avg_turns_per_contact: contactIds.length > 0
      ? (totalTurns / contactIds.length).toFixed(1)
      : 0,
  });
});

module.exports = router;