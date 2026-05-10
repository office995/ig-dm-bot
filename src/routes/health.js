const express = require('express');
const { supabase } = require('../db/supabase');
const {
  conversations,
  paused,
  followUps,
  leadTypes,
} = require('../state/memory');
const { OPENAI_API_KEY, WEBHOOK_SECRET } = require('../config/env');

const router = express.Router();

router.get('/health', (req, res) => {
  const contactIds = Object.keys(conversations);
  const pausedIds = Object.keys(paused);
  const followUpIds = Object.keys(followUps);

  res.json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    contacts: contactIds.length,
    active: contactIds.filter(id => !paused[id]).length,
    paused: pausedIds.length,
    followups_queued: followUpIds.length,
    model_leads: Object.values(leadTypes).filter(t => t === 'MODEL').length,
    env: {
      OPENAI_API_KEY: OPENAI_API_KEY ? 'set' : 'MISSING',
      WEBHOOK_SECRET: WEBHOOK_SECRET ? 'set' : 'MISSING',
      SUPABASE: supabase ? 'connected' : 'MISSING (memory-only)',
    },
  });
});

module.exports = router;