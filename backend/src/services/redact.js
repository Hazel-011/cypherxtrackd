/**
 * Lightweight PII redaction for the "cleaned version that is safe to share".
 * Regex/heuristic-based on purpose: transparent, explainable, no external
 * calls, works offline (see track constraint on power/network cuts).
 *
 * Honest limitation: this is NOT full named-entity recognition. It catches
 * structured PII (emails, phone numbers, ID-length numbers, card numbers)
 * reliably, and catches personal names only when they appear after a
 * recognizable trigger (a title like "Mr./Dr.", or a self-identifying
 * phrase like "my name is ..."). A bare name with no trigger phrase, or a
 * name the reporter mentions about someone else without such a lead-in,
 * will NOT be caught. A production version would need a trained NER model.
 */

const STRUCTURED_PATTERNS = [
  [/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, '[EMAIL_REDACTED]'],
  [/\b(?:\+?234|0)\d{10}\b/g, '[PHONE_REDACTED]'],
  [/\b\d{11}\b/g, '[BVN_OR_ID_REDACTED]'],
  [/\b(?:\d[ -]*?){13,19}\b/g, '[CARD_NUMBER_REDACTED]'],
];

// Title + capitalized name (e.g. "Mr. Adewale Johnson", "Dr Okafor")
const TITLES = ['mr', 'mrs', 'ms', 'miss', 'dr', 'prof', 'engr', 'barr', 'chief'];

// Self-identifying / third-party-identifying trigger phrases followed by a
// capitalized name (e.g. "my name is Chidi Obi", "this is Grace Eze",
// "called Musa Bello"). Note: "from" was deliberately excluded as a trigger
// — several real reports in the dataset say "login notification from
// Lagos", where "Lagos" is a place, not a person; including "from" here
// would falsely redact place names.
const NAME_TRIGGERS = ['my name is', 'this is', 'called', 'reported by'];

/**
 * Finds `trigger` case-insensitively, then checks the text immediately
 * following it — case-SENSITIVELY — for a run of capitalized words (a
 * likely name). Keeping the name check case-sensitive, separately from the
 * case-insensitive trigger match, avoids a subtle bug where a combined
 * case-insensitive regex would treat lowercase words (like "and") as
 * "capitalized" too and over-redact into the rest of the sentence.
 */
function redactAfterTriggers(text, triggers, maxWords = 3) {
  const escaped = triggers.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const triggerRe = new RegExp(`\\b(?:${escaped.join('|')})\\.?\\s+`, 'gi');
  const nameRe = new RegExp(`^[A-Z][a-z]+(?:\\s+[A-Z][a-z]+){0,${maxWords - 1}}`);

  let result = '';
  let lastIndex = 0;
  let match;
  while ((match = triggerRe.exec(text))) {
    const triggerEnd = match.index + match[0].length;
    const rest = text.slice(triggerEnd);
    const nameMatch = rest.match(nameRe);
    result += text.slice(lastIndex, match.index) + match[0];
    if (nameMatch) {
      result += '[NAME_REDACTED]';
      lastIndex = triggerEnd + nameMatch[0].length;
    } else {
      lastIndex = triggerEnd;
    }
    triggerRe.lastIndex = lastIndex;
  }
  result += text.slice(lastIndex);
  return result;
}

function redact(rawText) {
  let cleaned = rawText;
  for (const [re, replacement] of STRUCTURED_PATTERNS) {
    cleaned = cleaned.replace(re, replacement);
  }
  cleaned = redactAfterTriggers(cleaned, TITLES, 3);
  cleaned = redactAfterTriggers(cleaned, NAME_TRIGGERS, 3);
  return cleaned;
}

module.exports = { redact };
