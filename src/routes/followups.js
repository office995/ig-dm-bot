const express = require('express');
const { requireSecret } = require('../middleware/auth');
const {
  followUps,
  followUpAttempts,
  contactNames,
} = require('../state/memory');

const router = express.Router();

router.get('/followups', requireSecret, (req, res) => {
  const now = new Date();
  const due = [];

  for (const [cid, fu] of Object.entries(followUps)) {
    if (new Date(fu.sendAt) <= now) {
      due.push({
        contact_id: cid,
        contact_name: fu.contactName || contactNames[cid] || 'Unknown',
        follow_up_message: fu.msg,
        attempt: fu.attempt,
      });

      followUpAttempts[cid] = fu.attempt;
      delete followUps[cid];
    }
  }

  res.json({ due });
});

module.exports = router;