const express = require('express');
const { requireSecret } = require('../middleware/auth');
const { QUIET_WINDOW_MS, MAX_BURST_WINDOW_MS } = require('../config/env');
const {
  dailyStats,
  resetDailyStatsIfNeeded,
} = require('../state/stats');
const {
  conversations,
  paused,
  followUps,
  followUpAttempts,
  leadTypes,
  contactNames,
  lastActivity,
  replyTracker,
  linkSentCache,
  recentWebhooks,
  replyCooldown,
  processingContacts,
  pendingReplySeq,
  burstStartedAt,
  lastInboundAt,
} = require('../state/memory');
const {
  sanitize,
  sleep,
  isEnglish,
  trimConversation,
  getTurnCount,
} = require('../lib/utils');
const { checkRateLimit } = require('../lib/rateLimit');
const { createDedupHelpers } = require('../lib/dedup');
const { supabase } = require('../db/supabase');
const {
  dbGetOrCreateContact,
  dbUpdateContactClassification,
  dbFlagContact,
} = require('../db/contacts');
const {
  dbGetOrCreateConversation,
  dbMarkLinkSent,
  dbUpdateConversationStatus,
} = require('../db/conversations');
const {
  dbSaveMessage,
  dbLoadMessages,
} = require('../db/messages');
const { logToElla } = require('../lib/logger');
const { createClassifier } = require('../ai/classify');
const { callOpenAI } = require('../ai/replies');

const router = express.Router();

const { classifyIntent } = createClassifier(logToElla);
const { dbDedup, startDedupCleanup } = createDedupHelpers(supabase);
startDedupCleanup();

function silentResponse(meta = {}) {
  return {
    reply: '',
    ai_reply: '',
    paused: Boolean(meta.paused),
    escalated: Boolean(meta.escalated),
    model_lead: Boolean(meta.model_lead),
    version: 'v2',
    content: { messages: [] },
    _meta: { paused: false, escalated: false, model_lead: false, ...meta },
  };
}

router.post('/webhook', requireSecret, async (req, res) => {
  try {
    const { contact_id, contact_name, latest_message, event_id, message_id, mid, timestamp, sent_at } = req.body;

    if (!contact_id || !latest_message) {
      return res.status(400).json({ error: 'contact_id and latest_message are required' });
    }

    const cid = sanitize(contact_id);
    const cname = sanitize(contact_name || 'Unknown');
    const msg = sanitize(latest_message);
    const eventKey = sanitize(String(event_id || message_id || mid || ''));
    const messageTs = Number(timestamp || sent_at || Date.now()) || Date.now();

    const dedupKey = eventKey ? `${cid}:event:${eventKey}` : `${cid}:msg:${msg.slice(0, 80)}`;
    const nowTs = Date.now();

    if (recentWebhooks[dedupKey] && nowTs - recentWebhooks[dedupKey] < 30000) {
      console.log('[DEDUP] Blocked duplicate (memory) from:', cid);
      return res.status(200).json(silentResponse());
    }

    recentWebhooks[dedupKey] = nowTs;

    const isDup = await dbDedup(dedupKey);
    if (isDup) {
      console.log('[DEDUP] Blocked duplicate (supabase) from:', cid);
      return res.status(200).json(silentResponse());
    }

    if (!isEnglish(msg)) {
      console.log('[LANG] Non-English message — going silent for:', cid);
      return res.status(200).json(silentResponse());
    }

    if (!checkRateLimit(cid)) {
      return res.status(429).json({ error: 'Rate limit exceeded (30/hr per contact)' });
    }

    resetDailyStatsIfNeeded(logToElla);
    console.log('[WEBHOOK] Received:', { cid, cname, msg, eventKey });

    if (msg.toLowerCase().trim() === 'yes tell me more' || msg.toLowerCase().trim() === 'private access') {
      if (!conversations[cid]) conversations[cid] = [];
      if (conversations[cid].length === 0) {
        conversations[cid].push({ role: 'user', content: 'hey i saw your content and i want to know more about what you do' });
      }
    }

    contactNames[cid] = cname;
    lastActivity[cid] = new Date().toISOString();
    dailyStats.totalInbound++;

    const dbContact = await dbGetOrCreateContact(cid, cname);
    let dbConvo = null;
    if (dbContact) dbConvo = await dbGetOrCreateConversation(dbContact.id);

    if (!conversations[cid]) dailyStats.newContacts++;

    if (replyTracker[cid] && !replyTracker[cid].gotReply) {
      replyTracker[cid].gotReply = true;
      replyTracker[cid].replyDelayMs = Date.now() - replyTracker[cid].sentAt;
      dailyStats.repliesReceived++;
    }

    if (paused[cid]) {
      if (!conversations[cid]) conversations[cid] = [];
      conversations[cid].push({ role: 'user', content: msg });
      trimConversation(cid);

      if (dbConvo && dbContact) {
        await dbSaveMessage(dbConvo.id, dbContact.id, 'inbound', msg);
      }

      logToElla('info', 'dm_received_paused', { cid, name: cname });
      return res.status(200).json(silentResponse({ paused: true }));
    }

    if (followUps[cid]) delete followUps[cid];

    if (!conversations[cid]) {
      if (dbContact) {
        const dbHistory = await dbLoadMessages(dbContact.id, 40);
        conversations[cid] = dbHistory || [];
      } else {
        conversations[cid] = [];
      }
    }

    conversations[cid].push({ role: 'user', content: msg });
    trimConversation(cid);

    if (dbConvo && dbContact) {
      await dbSaveMessage(dbConvo.id, dbContact.id, 'inbound', msg);
    }

    const inboundNow = Date.now();
    const previousInboundAt = lastInboundAt[cid] || 0;

    if (!burstStartedAt[cid] || inboundNow - previousInboundAt > MAX_BURST_WINDOW_MS) {
      burstStartedAt[cid] = inboundNow;
    }

    lastInboundAt[cid] = Math.max(inboundNow, messageTs || inboundNow);

    const mySeq = (pendingReplySeq[cid] || 0) + 1;
    pendingReplySeq[cid] = mySeq;

    const burstElapsedMs = Math.max(0, inboundNow - burstStartedAt[cid]);
    const remainingBurstMs = Math.max(0, MAX_BURST_WINDOW_MS - burstElapsedMs);
    const waitMs = Math.min(QUIET_WINDOW_MS, remainingBurstMs || QUIET_WINDOW_MS);

    console.log('[BURST] queued', { cid, mySeq, waitMs, burstElapsedMs });
    await sleep(waitMs);

    if (pendingReplySeq[cid] !== mySeq) {
      console.log('[BURST] superseded before generation:', { cid, mySeq, latest: pendingReplySeq[cid] });
      return res.status(200).json(silentResponse());
    }

    while (processingContacts[cid]) {
      await sleep(250);
      if (pendingReplySeq[cid] !== mySeq) {
        console.log('[BURST] superseded while waiting for generation lock:', { cid, mySeq, latest: pendingReplySeq[cid] });
        return res.status(200).json(silentResponse());
      }
    }

    processingContacts[cid] = true;

    try {
      if (pendingReplySeq[cid] !== mySeq) {
        console.log('[BURST] superseded after generation lock:', { cid, mySeq, latest: pendingReplySeq[cid] });
        return res.status(200).json(silentResponse());
      }

      const convoMeta = {
        message_count: getTurnCount(cid),
        has_sent_link: linkSentCache[cid] || dbConvo?.has_sent_link || false,
      };

      let aiText;

      try {
        aiText = await callOpenAI(conversations[cid], convoMeta);
      } catch (firstErr) {
        console.warn('[WEBHOOK] OpenAI failed, retrying in 2s:', firstErr.message);
        await sleep(2000);

        try {
          aiText = await callOpenAI(conversations[cid], convoMeta);
        } catch (retryErr) {
          console.error('[WEBHOOK] OpenAI retry failed:', retryErr.message);
          return res.json({
            reply: 'hey give me a sec',
            ai_reply: 'hey give me a sec',
            paused: false,
            escalated: false,
            model_lead: false,
            version: 'v2',
            content: { messages: [{ type: 'text', text: 'hey give me a sec' }] },
            _meta: { paused: false, escalated: false, model_lead: false },
          });
        }
      }

      if (pendingReplySeq[cid] !== mySeq) {
        console.log('[BURST] stale OpenAI reply discarded:', { cid, mySeq, latest: pendingReplySeq[cid] });
        return res.status(200).json(silentResponse());
      }

      const shouldOfferLink = /\b(join|sign up|signup|start|buy|price|cost|how much|where|link|website|site|apply|interested|ready)\b/i.test(msg);

      if (shouldOfferLink && !convoMeta.has_sent_link && !aiText.includes('www.thejungle.life')) {
        aiText += '\nwww.thejungle.life';
      }

      let modelLead = false;
      let escalated = false;

      if (aiText.includes('[MODEL_LEAD]')) {
        modelLead = true;
        aiText = aiText.replace(/\n?\r?\n?\[MODEL_LEAD\]/g, '').trim();
        paused[cid] = { at: new Date().toISOString(), reason: 'model_lead' };
        leadTypes[cid] = 'MODEL';
        await dbUpdateContactClassification(cid, 'MODEL');
        await dbFlagContact(cid, true);

        if (dbConvo) await dbUpdateConversationStatus(dbConvo.id, 'flagged');
        if (dbConvo && dbContact) {
          await dbSaveMessage(dbConvo.id, dbContact.id, 'outbound', aiText || '[MODEL_LEAD]');
        }

        dailyStats.modelLeads++;
        return res.status(200).json(silentResponse({ paused: true, model_lead: true }));
      }

      if (aiText.includes('[ESCALATE]')) {
        escalated = true;
        aiText = aiText.replace(/\n?\r?\n?\[ESCALATE\]/g, '').trim();
        paused[cid] = { at: new Date().toISOString(), reason: 'escalate' };
        await dbFlagContact(cid, true);

        if (dbConvo) await dbUpdateConversationStatus(dbConvo.id, 'flagged');
      }

      if (!leadTypes[cid] && !modelLead) {
        try {
          const classification = await classifyIntent(msg);
          leadTypes[cid] = classification;
          await dbUpdateContactClassification(cid, classification);
        } catch (_) {
          leadTypes[cid] = 'BUYER';
          await dbUpdateContactClassification(cid, 'BUYER');
        }
      }

      conversations[cid].push({ role: 'assistant', content: aiText });
      trimConversation(cid);

      if (dbConvo && dbContact) {
        await dbSaveMessage(dbConvo.id, dbContact.id, 'outbound', aiText);
      }

      if (aiText.includes('www.thejungle.life') && !convoMeta.has_sent_link) {
        linkSentCache[cid] = true;
        if (dbConvo) await dbMarkLinkSent(dbConvo.id);
        convoMeta.has_sent_link = true;
      }

      if (!paused[cid] && leadTypes[cid] === 'BUYER') {
        const attemptsSent = followUpAttempts[cid] || 0;

        if (attemptsSent < 2) {
          const delay = attemptsSent === 0 ? 48 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
          const fuMsg = attemptsSent === 0 ? '[FOLLOW_UP_1]' : '[FOLLOW_UP_2]';

          followUps[cid] = {
            msg: fuMsg,
            sendAt: new Date(Date.now() + delay).toISOString(),
            attempt: attemptsSent + 1,
            contactName: cname,
          };
        }
      }

      dailyStats.totalOutbound++;
      if (aiText.includes('www.thejungle.life')) dailyStats.closes++;
      if (modelLead) dailyStats.modelLeads++;
      if (escalated) dailyStats.escalations++;

      replyTracker[cid] = {
        lastAiReply: aiText,
        sentAt: Date.now(),
        gotReply: false,
        replyDelayMs: null,
      };

      logToElla('info', 'dm_exchange', {
        cid,
        name: cname,
        lead_type: leadTypes[cid],
        turns: getTurnCount(cid),
        model_lead: modelLead,
        escalated,
        close: aiText.includes('www.thejungle.life'),
      });

      const cleanReply = (text) => text
        .replace(/\n{3,}/g, '\n\n')
        .replace(/\n +/g, '\n')
        .replace(/\n /g, '\n')
        .replace(/\[([^\]]*)\]/g, '')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();

      const finalText = cleanReply(aiText);

      replyCooldown[cid] = Date.now();

      return res.json({
        reply: finalText,
        ai_reply: finalText,
        paused: false,
        escalated,
        model_lead: modelLead,
        version: 'v2',
        content: { messages: [{ type: 'text', text: finalText }] },
        _meta: { paused: false, escalated, model_lead: modelLead },
      });
    } finally {
      delete processingContacts[cid];
      if (pendingReplySeq[cid] === mySeq) delete burstStartedAt[cid];
    }
  } catch (err) {
    console.error('[WEBHOOK ERROR]', err.message);
    logToElla('error', 'webhook_error', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'Internal error', detail: err.message });
  }
});

module.exports = router;