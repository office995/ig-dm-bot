const express = require('express');
const { requireDashboardAuth } = require('../middleware/auth');
const {
  conversations,
  contactNames,
  leadTypes,
  paused,
  lastActivity,
} = require('../state/memory');
const { getTurnCount } = require('../lib/utils');

const router = express.Router();

router.get('/dashboard', requireDashboardAuth, (req, res) => {
  const contactIds = Object.keys(conversations);
  const rows = contactIds.map((cid) => ({
    id: cid,
    name: contactNames[cid] || 'Unknown',
    lead: leadTypes[cid] || 'UNKNOWN',
    status: paused[cid] ? paused[cid].reason : 'active',
    turns: getTurnCount(cid),
    latest: conversations[cid]?.[conversations[cid].length - 1]?.content || '',
    lastActivity: lastActivity[cid] || '',
  }));

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Jungle Dashboard</title>
  <style>
    body { font-family: Arial, sans-serif; background:#0e0e0e; color:#fff; padding:20px; }
    h1 { margin-top:0; }
    table { width:100%; border-collapse: collapse; }
    th, td { border:1px solid #333; padding:10px; text-align:left; vertical-align:top; }
    th { background:#1a1a1a; }
    tr:nth-child(even) { background:#141414; }
    .paused { color:#ff8a8a; }
    .active { color:#8aff9d; }
    .small { font-size:12px; color:#aaa; }
    button { background:#1f1f1f; color:#fff; border:1px solid #444; padding:6px 10px; cursor:pointer; }
    form { display:inline-block; margin-right:6px; }
  </style>
</head>
<body>
  <h1>jungle dm dashboard</h1>
  <p>contacts: ${rows.length}</p>
  <table>
    <thead>
      <tr>
        <th>name</th>
        <th>id</th>
        <th>lead</th>
        <th>status</th>
        <th>turns</th>
        <th>latest</th>
        <th>actions</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map(r => `
      <tr>
        <td>${r.name}</td>
        <td class="small">${r.id}</td>
        <td>${r.lead}</td>
        <td class="${r.status === 'active' ? 'active' : 'paused'}">${r.status}</td>
        <td>${r.turns}</td>
        <td>${String(r.latest).replace(/</g, '&lt;')}</td>
        <td>
          <form method="post" action="/pause/${r.id}"><button>pause</button></form>
          <form method="post" action="/resume/${r.id}"><button>resume</button></form>
          <form method="post" action="/reset/${r.id}"><button>reset</button></form>
        </td>
      </tr>`).join('')}
    </tbody>
  </table>
</body>
</html>`;

  res.send(html);
});

module.exports = router;