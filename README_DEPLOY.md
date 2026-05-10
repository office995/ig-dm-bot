# The Jungle — DM AI Sales System

## What This Is
Automated Instagram DM sales AI for The Jungle Hybrid OFM course. Receives DMs via Make.com webhook, classifies intent (buyer/model/personal/unclear), runs a full sales conversation through Claude API, returns replies for ManyChat to send.

## Quick Start (Local)

```bash
cp .env.example .env
# Edit .env with your real values
npm install
node server.js
# Visit http://localhost:3000/health
```

## Deploy to Production (3 options)

### Option A: One-Command Deploy (fastest)
```bash
bash deploy.sh YOUR_GITHUB_PERSONAL_ACCESS_TOKEN
```
Get a token at https://github.com/settings/tokens/new (check `repo` scope only).
This creates a private GitHub repo and pushes your code. Then follow the Render steps it prints.

### Option B: Manual GitHub + Render
1. Create a private repo on GitHub
2. Push this code to it
3. Go to [render.com](https://render.com) → New → Web Service → Connect GitHub → select repo
4. Settings auto-fill from `render.yaml`
5. Add environment variables (see below)
6. Click "Create Web Service" → wait 60 seconds
7. Visit `https://YOUR-URL/health` to confirm

### Option C: Any Node.js host
Works on Railway, Fly.io, Heroku, DigitalOcean, VPS, anything that runs `node server.js`.
Just set the 3 env vars and expose the port.

## Environment Variables

| Variable | Value | Required |
|---|---|---|
| `ANTHROPIC_API_KEY` | From [console.anthropic.com](https://console.anthropic.com) | Yes |
| `WEBHOOK_SECRET` | Any random string (must match Make.com header) | Yes |
| `DASHBOARD_PASS` | Your dashboard login password | Yes |
| `PORT` | Defaults to 3000 | No |

## ManyChat Setup

1. Go to [manychat.com](https://manychat.com) → connect your Instagram business account
2. Go to **Automation** → **Flows** → Create new flow
3. Trigger: **Instagram → Default Reply** (catches all DMs)
4. Add step: **Action → External Request**
   - Method: POST
   - URL: Your Make.com webhook URL (from step below)
   - Body type: JSON
   - Body:
   ```json
   {
     "contact_id": "{{ig_id}}",
     "contact_name": "{{first_name}}",
     "latest_message": "{{last_input_text}}"
   }
   ```
5. Alternatively, use ManyChat's Make.com integration directly

## Make.com Setup (Main Scenario)

Create a scenario with these 5 modules:

### Module 1: Webhooks → Custom Webhook
- Create webhook, copy URL
- This is what ManyChat POSTs to

### Module 2: HTTP → Make a Request
- **URL:** `https://YOUR-RENDER-URL/webhook`
- **Method:** POST
- **Headers:**
  - `Content-Type: application/json`
  - `x-webhook-secret: YOUR_WEBHOOK_SECRET`
- **Body (JSON):**
```json
{
  "contact_id": "{{1.contact_id}}",
  "contact_name": "{{1.contact_name}}",
  "latest_message": "{{1.latest_message}}"
}
```

### Module 3: Router (3 branches)

**Branch A — Normal Reply:**
- Filter: `{{2.data.reply}}` exists AND `{{2.data.paused}}` = false AND `{{2.data.model_lead}}` = false
- → Module 4A: ManyChat Send Message API with `{{2.data.reply}}`

**Branch B — Model Lead:**
- Filter: `{{2.data.model_lead}}` = true
- → Module 4B: Send reply via ManyChat + notify you (email/Slack/text)

**Branch C — Paused/Escalated:**
- Filter: `{{2.data.paused}}` = true OR `{{2.data.escalated}}` = true
- → Module 4C: Notify you that human takeover is needed

### Module 4: ManyChat API — Send Reply
- **Method:** POST
- **URL:** `https://api.manychat.com/fb/sending/sendContent`
- **Headers:** `Authorization: Bearer YOUR_MANYCHAT_API_KEY`
- **Body:**
```json
{
  "subscriber_id": "{{1.contact_id}}",
  "data": {
    "version": "v2",
    "content": {
      "messages": [
        {
          "type": "text",
          "text": "{{2.data.reply}}"
        }
      ]
    }
  }
}
```

## Make.com Follow-Up Scenario (separate, runs every 6 hours)

1. **Schedule trigger** → every 6 hours
2. **HTTP GET** → `https://YOUR-URL/followups` with `x-webhook-secret` header
3. **Iterator** over `{{1.data.due}}` array
4. For each: **HTTP POST** to `/webhook` with:
```json
{
  "contact_id": "{{item.contact_id}}",
  "contact_name": "{{item.contact_name}}",
  "latest_message": "{{item.follow_up_message}}"
}
```
5. Send the reply via ManyChat API (same as Module 4 above)

## Dashboard

Visit `https://YOUR-URL/dashboard`
- Username: `admin`
- Password: your `DASHBOARD_PASS` value

Shows: total contacts, AI active/paused counts, model leads, escalations, follow-up queue. Full conversation viewer. Pause/Resume/Reset controls per contact.

## Test Every Endpoint

```bash
# Health check (no auth needed)
curl https://YOUR-URL/health

# Send a test DM
curl -X POST https://YOUR-URL/webhook \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: YOUR_SECRET" \
  -d '{"contact_id":"test1","contact_name":"Test User","latest_message":"hey I saw your reel about OFM"}'

# Check due follow-ups
curl https://YOUR-URL/followups -H "x-webhook-secret: YOUR_SECRET"

# Pause a contact
curl -X POST https://YOUR-URL/pause/test1 -H "x-webhook-secret: YOUR_SECRET"

# Resume a contact
curl -X POST https://YOUR-URL/resume/test1 -H "x-webhook-secret: YOUR_SECRET"

# List paused contacts
curl https://YOUR-URL/paused -H "x-webhook-secret: YOUR_SECRET"

# View all conversations
curl https://YOUR-URL/conversations -H "x-webhook-secret: YOUR_SECRET"

# View one conversation
curl https://YOUR-URL/conversations/test1 -H "x-webhook-secret: YOUR_SECRET"

# Performance metrics
curl https://YOUR-URL/metrics -H "x-webhook-secret: YOUR_SECRET"

# Reset a contact
curl -X POST https://YOUR-URL/reset/test1 -H "x-webhook-secret: YOUR_SECRET"

# Dashboard (browser — will prompt for login)
open https://YOUR-URL/dashboard
```

## All Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | None | Server status + env check |
| POST | `/webhook` | x-webhook-secret | Main DM handler |
| GET | `/followups` | x-webhook-secret | Due follow-ups (consumed on read) |
| POST | `/pause/:id` | x-webhook-secret | Pause AI for contact |
| POST | `/resume/:id` | x-webhook-secret | Resume AI for contact |
| GET | `/paused` | x-webhook-secret | List paused contacts |
| POST | `/reset/:id` | x-webhook-secret | Clear all state for contact |
| GET | `/conversations` | x-webhook-secret | List all contacts |
| GET | `/conversations/:id` | x-webhook-secret | Full conversation history |
| GET | `/metrics` | x-webhook-secret | Performance analytics |
| GET | `/dashboard` | Basic auth (admin) | Admin control panel |

## Architecture

Single file (`server.js`), one dependency (`express`). Claude API called via native Node.js `https`. All state in-memory (resets on restart). Conversations logged to `conversations.log`.

## Going Live Checklist

- [ ] Server deployed and `/health` returns `status: ok`
- [ ] ManyChat connected to Instagram business account
- [ ] ManyChat Default Reply flow sends DMs to Make.com webhook
- [ ] Make.com Scenario 1: webhook → your server → ManyChat reply
- [ ] Make.com Scenario 2: scheduled follow-up check every 6 hours
- [ ] Test with second Instagram account — send a DM, verify AI replies
- [ ] Dashboard accessible and showing conversations
- [ ] WEBHOOK_SECRET matches between your server and Make.com headers
