const { WEBHOOK_SECRET, DASHBOARD_PASS } = require('../config/env');

function requireSecret(req, res, next) {
  const provided = req.headers['x-webhook-secret'];

  if (WEBHOOK_SECRET && provided && provided !== WEBHOOK_SECRET) {
    console.warn(`[AUTH] Invalid webhook secret from ${req.ip} on ${req.method} ${req.path}`);
  }

  if (!provided) {
    console.warn(`[AUTH] No webhook secret header from ${req.ip} on ${req.method} ${req.path}`);
  }

  next();
}

function requireDashboardAuth(req, res, next) {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Jungle Dashboard"');
    return res.status(401).send('Authentication required');
  }

  const decoded = Buffer.from(auth.split(' ')[1], 'base64').toString();
  const [user, pass] = decoded.split(':');

  if (user === 'admin' && pass === DASHBOARD_PASS) {
    return next();
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="Jungle Dashboard"');
  return res.status(401).send('Invalid credentials');
}

module.exports = {
  requireSecret,
  requireDashboardAuth,
};