const https = require('https');
const { ANTHROPIC_API_KEY } = require('../config/env');
const { checkGlobalRateLimit } = require('../lib/rateLimit');
const { mockReply } = require('./fallback');

function callClaudeRaw(model, systemPrompt, messages, maxTokens = 80) {
  return new Promise((resolve, reject) => {
    if (!ANTHROPIC_API_KEY || !ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
      return resolve(mockReply(messages));
    }

    if (!checkGlobalRateLimit()) {
      return reject(new Error('Global API rate limit exceeded'));
    }

    // Anthropic requires alternating user/assistant turns and doesn't allow
    // a leading assistant message. Normalize defensively.
    const normalized = [];
    for (const m of messages) {
      const role = m.role === 'assistant' ? 'assistant' : 'user';
      const content = String(m.content || '').trim();
      if (!content) continue;
      if (normalized.length === 0 && role === 'assistant') continue;
      const prev = normalized[normalized.length - 1];
      if (prev && prev.role === role) {
        prev.content += '\n' + content;
      } else {
        normalized.push({ role, content });
      }
    }

    if (normalized.length === 0) {
      normalized.push({ role: 'user', content: 'hey' });
    }

    const body = JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: normalized,
      temperature: 0.72,
    });

    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);

          if (parsed.type === 'error' || parsed.error) {
            const errMsg =
              parsed.error?.message ||
              parsed.message ||
              JSON.stringify(parsed.error || parsed);
            return reject(new Error(errMsg));
          }

          // Anthropic returns content as an array of blocks; concatenate text blocks.
          const out = Array.isArray(parsed?.content)
            ? parsed.content
                .filter((b) => b?.type === 'text')
                .map((b) => b.text)
                .join('')
            : '';

          resolve(out);
        } catch (e) {
          reject(new Error('Failed to parse Anthropic response: ' + data.slice(0, 200)));
        }
      });
    });

    req.on('error', reject);

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Anthropic API timeout'));
    });

    req.write(body);
    req.end();
  });
}

module.exports = {
  callClaudeRaw,
};
