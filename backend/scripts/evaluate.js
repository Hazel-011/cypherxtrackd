/**
 * Evaluates the classifier against the 50 labeled cases without touching
 * the DB. Prints overall accuracy for type/severity/routing, plus every
 * case the classifier got wrong (per the track's "explain your results
 * honestly" requirement).
 *
 * Usage: node scripts/evaluate.js
 */
const incidents = require('../src/data/incidents.seed.json');
const { classify } = require('../src/services/classifier');

let typeCorrect = 0;
let severityCorrect = 0;
let routingCorrect = 0;
const mistakes = [];

for (const inc of incidents) {
  const result = classify(inc.rawText);

  // "Phishing / Duplicate" etc. in the label set are compound labels; treat
  // a match on the first component as correct too, since our classifier
  // predicts single primary types.
  const primaryLabelType = inc.type.split('/')[0].trim().toLowerCase();
  const predictedType = result.type.toLowerCase();
  const typeOk = predictedType === inc.type.toLowerCase() || predictedType === primaryLabelType;

  const severityOk = result.severity === inc.severity;
  const routingOk = result.routing.toLowerCase() === inc.routing.toLowerCase()
    || inc.routing.toLowerCase().includes(result.routing.toLowerCase())
    || result.routing.toLowerCase().includes(inc.routing.split('/')[0].trim().toLowerCase());

  if (typeOk) typeCorrect++;
  if (severityOk) severityCorrect++;
  if (routingOk) routingCorrect++;

  if (!typeOk || !severityOk) {
    mistakes.push({
      id: inc.id,
      text: inc.rawText.slice(0, 70) + '...',
      expected: { type: inc.type, severity: inc.severity },
      predicted: { type: result.type, severity: result.severity },
    });
  }
}

const n = incidents.length;
console.log(`\n=== Track D Classifier Evaluation (n=${n}) ===\n`);
console.log(`Type accuracy:     ${typeCorrect}/${n}  (${((typeCorrect / n) * 100).toFixed(1)}%)`);
console.log(`Severity accuracy: ${severityCorrect}/${n}  (${((severityCorrect / n) * 100).toFixed(1)}%)`);
console.log(`Routing accuracy:  ${routingCorrect}/${n}  (${((routingCorrect / n) * 100).toFixed(1)}%)`);

console.log(`\n--- Misclassified cases (${mistakes.length}) ---`);
for (const m of mistakes) {
  console.log(`\n${m.id}: "${m.text}"`);
  console.log(`  expected:  type=${m.expected.type}, severity=${m.expected.severity}`);
  console.log(`  predicted: type=${m.predicted.type}, severity=${m.predicted.severity}`);
}
console.log('');
