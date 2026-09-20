/**
 * Groups repeat reports of the same underlying incident.
 * Method: Jaccard similarity over token sets, restricted to reports of the
 * same classified type within a time window. Simple, explainable, no
 * external dependencies — appropriate for a prototype where "why were these
 * grouped" must be answerable in one sentence.
 */

const { tokenize } = require('./classifier');

const SIMILARITY_THRESHOLD = 0.35;
const WINDOW_MS = 48 * 60 * 60 * 1000; // 48 hours

function jaccard(aTokens, bTokens) {
  const a = new Set(aTokens);
  const b = new Set(bTokens);
  const intersection = [...a].filter((x) => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * reports: array of { _id, rawText, type, createdAt, groupId }
 * Returns the same array with a groupId assigned (existing group reused
 * when a strong enough match is found).
 */
function assignGroups(reports) {
  const withTokens = reports.map((r) => ({ ...r, _tokens: tokenize(r.rawText) }));
  let nextGroupId = 1;

  for (let i = 0; i < withTokens.length; i++) {
    if (withTokens[i].groupId) continue;
    for (let j = 0; j < i; j++) {
      if (withTokens[j].type !== withTokens[i].type) continue;
      const dt = Math.abs(new Date(withTokens[i].createdAt) - new Date(withTokens[j].createdAt));
      if (dt > WINDOW_MS) continue;
      const sim = jaccard(withTokens[i]._tokens, withTokens[j]._tokens);
      if (sim >= SIMILARITY_THRESHOLD) {
        withTokens[i].groupId = withTokens[j].groupId || `GRP-${nextGroupId++}`;
        withTokens[j].groupId = withTokens[i].groupId;
        break;
      }
    }
    if (!withTokens[i].groupId) {
      withTokens[i].groupId = `GRP-${nextGroupId++}`;
    }
  }
  return withTokens.map(({ _tokens, ...rest }) => rest);
}

module.exports = { assignGroups, jaccard };
