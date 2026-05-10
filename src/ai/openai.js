const https = require('https');
const { OPENAI_API_KEY } = require('../config/env');
const { checkGlobalRateLimit } = require('../lib/rateLimit');
const { mockReply } = require('./fallback');

function callOpenAIRaw(model, systemPrompt, messages, maxTokens = 80) {
  return new Promise((resolve, reject) => {
    if (!OPENAI_API_KEY || !OPENAI_API_KEY.startsWith('sk-')) {
      return resolve(mockReply(messages));
    }

    if (!checkGlobalRateLimit()) {
      return reject(new Error('Global API rate limit exceeded'));
    }

    const chatMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ];

    const body = JSON.stringify({
      model,
      messages: chatMessages,
      max_tokens: maxTokens,
      temperature: 0.72,
      frequency_penalty: 0.25,
      presence_penalty: 0.1,
    });

    const options = {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
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

          if (parsed.error) {
            return reject(new Error(parsed.error.message || JSON.stringify(parsed.error)));
          }

          const out = parsed?.choices?.[0]?.message?.content || '';
          resolve(out);
        } catch (e) {
          reject(new Error('Failed to parse OpenAI response: ' + data.slice(0, 200)));
        }
      });
    });

    req.on('error', reject);

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('OpenAI API timeout'));
    });

    req.write(body);
    req.end();
  });
}

module.exports = {
  callOpenAIRaw,
};