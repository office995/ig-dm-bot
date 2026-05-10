const fs = require('fs');
const path = require('path');
const os = require('os');

const ELLA_LOG_DIR = path.join(os.homedir(), 'AI-Assistant-System', 'logs');
const ELLA_LOG_FILE = path.join(ELLA_LOG_DIR, 'dm_system.log');

function logToElla(level, message, data = {}) {
  try {
    if (!fs.existsSync(ELLA_LOG_DIR)) {
      fs.mkdirSync(ELLA_LOG_DIR, { recursive: true });
    }

    const entry = JSON.stringify({
      ts: new Date().toISOString(),
      system: 'jungle-dm-ai',
      level,
      message,
      ...data,
    });

    fs.appendFile(ELLA_LOG_FILE, entry + '\n', () => {});
  } catch (_) {}
}

module.exports = {
  logToElla,
};