const fs = require('fs');
const path = require('path');

function loadDotEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;

  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadDotEnv();

const PORT = Number(process.env.PORT || 3000);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';
const DASHBOARD_PASS = process.env.DASHBOARD_PASS || '';
const QUIET_WINDOW_MS = Number(process.env.QUIET_WINDOW_MS || 10000);
const MAX_BURST_WINDOW_MS = Number(process.env.MAX_BURST_WINDOW_MS || 15000);
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

module.exports = {
  PORT,
  OPENAI_API_KEY,
  WEBHOOK_SECRET,
  DASHBOARD_PASS,
  QUIET_WINDOW_MS,
  MAX_BURST_WINDOW_MS,
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
};
