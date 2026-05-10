const express = require('express');
const { requireSecret } = require('../middleware/auth');
const {
  dailyStats,
  resetDailyStatsIfNeeded,
} = require('../state/stats');
const {
  replyTracker,
  paused,
  contactNames,
  conversations,
} = require('../state/memory');
const { logToElla } = require('../lib/logger');

const router = express.Router();

router.get('/daily-report', requireSecret, (req, res) => {
  resetDailyStatsIfNeeded(logToElla);

  const trackedContacts = Object.keys(replyTracker);
  const gotReplies = trackedContacts.filter(id => replyTracker[id].gotReply).length;
  const replyRate = trackedContacts.length > 0
    ? ((gotReplies / trackedContacts.length) * 100).toFixed(1) + '%'
    : 'N/A';

  const delays = trackedContacts
    .filter(id => replyTracker[id].gotReply && replyTracker[id].replyDelayMs)
    .map(id => replyTracker[id].replyDelayMs);

  const avgDelayMin = delays.length > 0
    ? (delays.reduce((a, b) => a + b, 0) / delays.length / 60000).toFixed(1) + ' min'
    : 'N/A';

  const needsAttention = Object.entries(paused)
    .filter(([_, p]) => p.reason === 'escalate' || p.reason === 'model_lead')
    .map(([id, p]) => ({
      contact_id: id,
      name: contactNames[id] || 'Unknown',
      reason: p.reason,
      since: p.at,
    }));

  const report = {
    date: dailyStats.date,
    summary: { ...dailyStats, reply_rate: replyRate, avg_reply_delay: avgDelayMin },
    total_active_contacts: Object.keys(conversations).length,
    needs_attention: needsAttention,
    uptime_hours: (process.uptime() / 3600).toFixed(1),
  };

  logToElla('info', 'daily_report_requested', report);
  res.json(report);
});

module.exports = router;