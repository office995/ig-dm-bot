const express = require('express');
const https = require('https');

const { PORT } = require('./src/config/env');
const { logToElla } = require('./src/lib/logger');

const healthRoutes = require('./src/routes/health');
const metricsRoutes = require('./src/routes/metrics');
const dailyReportRoutes = require('./src/routes/dailyReport');
const followupRoutes = require('./src/routes/followups');
const adminRoutes = require('./src/routes/admin');
const conversationRoutes = require('./src/routes/conversations');
const dashboardRoutes = require('./src/routes/dashboard');
const webhookRoutes = require('./src/routes/webhook');

const app = express();

app.all('/ping', (req, res) => {
  console.log('[PING HIT]');
  res.status(200).json({ ok: true, method: req.method });
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Quick root check
app.get('/', (req, res) => {
  res.status(200).send('ig-dm-bot is running');
});

// Direct health check, even if route file breaks
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'ig-dm-bot',
    openai: process.env.OPENAI_API_KEY ? 'set' : 'missing',
    webhook_secret: process.env.WEBHOOK_SECRET ? 'set' : 'missing',
    port: PORT,
    uptime: Math.round(process.uptime()),
  });
});

// Register app routes
app.use(healthRoutes);
app.use(metricsRoutes);
app.use(dailyReportRoutes);
app.use(followupRoutes);
app.use(adminRoutes);
app.use(conversationRoutes);
app.use(dashboardRoutes);
app.use(webhookRoutes);

// Direct webhook fallback/test route.
// If src/routes/webhook is working, this will only run if no earlier route matched.
app.post('/webhook', async (req, res) => {
  try {
    console.log('[WEBHOOK FALLBACK RECEIVED]', req.body);

    return res.status(200).json({
      reply: 'Webhook is working',
      content: {
        messages: [
          {
            type: 'text',
            text: 'Webhook is working',
          },
        ],
      },
    });
  } catch (err) {
    console.error('[WEBHOOK FALLBACK ERROR]', err);

    return res.status(500).json({
      error: 'webhook_fallback_failed',
      message: err.message,
    });
  }
});

// 404 debug route
app.use((req, res) => {
  console.log('[404 NOT FOUND]', {
    method: req.method,
    path: req.path,
    body: req.body,
  });

  res.status(404).json({
    error: 'Not Found',
    method: req.method,
    path: req.path,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);

  try {
    logToElla('error', 'server_error', {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  } catch (_) {}

  res.status(500).json({
    error: 'server_error',
    message: err.message,
  });
});

// Keep Render free instance awake
setInterval(() => {
  try {
    https
      .get('https://ig-dm-bot-kcli.onrender.com/health', (res) => {
        res.resume();
      })
      .on('error', () => {});
  } catch (_) {}
}, 10 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`ig-dm-bot running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);

  try {
    logToElla('info', 'server_started', { port: PORT });
  } catch (_) {}
});

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err);

  try {
    logToElla('fatal', 'uncaught_exception', {
      error: err.message,
      stack: err.stack,
    });
  } catch (_) {}
});

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled rejection:', reason);

  try {
    logToElla('fatal', 'unhandled_rejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  } catch (_) {}
});
