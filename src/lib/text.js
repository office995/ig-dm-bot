function humanizeReply(text) {
  if (!text) return '';

  return String(text)
    .replace(/\r/g, '')
    .replace(/—/g, ',')
    .replace(/--+/g, ' ')
    .replace(/^[-*•]\s*/gm, '')
    .replace(/^\s*(great question|let me explain|in summary|to clarify)[,:]?\s*/i, '')
    .replace(/\s+([,.!?])/g, '$1')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function smartTrim(text, maxLen) {
  if (text.length <= maxLen) return text;

  const slice = text.slice(0, maxLen);
  const lastPunct = Math.max(
    slice.lastIndexOf('.'),
    slice.lastIndexOf('!'),
    slice.lastIndexOf('?'),
    slice.lastIndexOf('\n')
  );

  if (lastPunct >= Math.floor(maxLen * 0.6)) {
    return slice.slice(0, lastPunct + 1).trim();
  }

  const lastSpace = slice.lastIndexOf(' ');
  if (lastSpace >= Math.floor(maxLen * 0.6)) {
    return slice.slice(0, lastSpace).trim();
  }

  return slice.trim();
}

function enforceLength(text) {
  if (!text) return '';

  text = String(text)
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const linkMatch = text.match(/(https:\/\/thejungle\.life\/|www\.thejungle\.life)/i);
  const link = linkMatch ? linkMatch[1] : '';
  let body = link ? text.replace(linkMatch[1], '').trim() : text;

  body = body
    .replace(/^[-*•]\s*/gm, '')
    .replace(/\s*[-–—]{2,}\s*/g, ' ')
    .trim();

  let chunks = body
    .split(/\n|(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean);

  if (chunks.length > 2) {
    chunks = chunks.slice(0, 2);
  }

  let trimmed = chunks.join('\n').trim();

  // softer limit: preserve natural phrasing
  trimmed = smartTrim(trimmed, 220);

  // final cleanup for dangling punctuation/spaces
  trimmed = trimmed
    .replace(/[,:;\-\s]+$/g, '')
    .trim();

  if (link) {
    return trimmed ? `${trimmed}\n${link}` : link;
  }

  return trimmed;
}

function normalizeForSimilarity(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/https:\/\/thejungle\.life\/|www\.thejungle\.life/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(yo|yeah|nah|look|like|just|really|literally|basically)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isTooSimilarReply(messages, candidate) {
  const cand = normalizeForSimilarity(candidate);
  if (!cand) return false;

  const assistantReplies = messages
    .filter(m => m.role === 'assistant')
    .slice(-8)
    .map(m => normalizeForSimilarity(m.content))
    .filter(Boolean);

  return assistantReplies.some(prev => {
    if (!prev) return false;
    if (prev === cand) return true;
    if (prev.includes(cand) || cand.includes(prev)) return true;

    const prevWords = new Set(prev.split(' '));
    const candWords = cand.split(' ');
    const overlap = candWords.filter(w => prevWords.has(w)).length;
    const ratio = candWords.length ? overlap / candWords.length : 0;

    return ratio >= 0.8;
  });
}

module.exports = {
  humanizeReply,
  enforceLength,
  normalizeForSimilarity,
  isTooSimilarReply,
};