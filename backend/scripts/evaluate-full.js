/**
 * Evaluates the classifier against the FULL dataset: the 50 organizer-
 * provided cases plus the generated synthetic set. Reports accuracy
 * separately for each source, since the 50 were used while designing the
 * classifier rules and the generated set is a more honest test of
 * generalization to new phrasing.
 *
 * Usage: node scripts/evaluate-full.js
 */
const seedIncidents = require('../src/data/incidents.seed.json');
const generatedIncidents = require('../src/data/incidents.generated.json');
const { classify } = require('../src/services/classifier');

function evaluate(incidents, label) {
  let typeCorrect = 0, severityCorrect = 0, routingCorrect = 0;
  const mistakes = [];

  for (const inc of incidents) {
    const result = classify(inc.rawText);
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
      mistakes.push({ id: inc.id, expected: inc.type, predicted: result.type,
        expectedSev: inc.severity, predictedSev: result.severity });
    }
  }

  const n = incidents.length;
  console.log(`\n=== ${label} (n=${n}) ===`);
  console.log(`Type accuracy:     ${typeCorrect}/${n}  (${((typeCorrect / n) * 100).toFixed(1)}%)`);
  console.log(`Severity accuracy: ${severityCorrect}/${n}  (${((severityCorrect / n) * 100).toFixed(1)}%)`);
  console.log(`Routing accuracy:  ${routingCorrect}/${n}  (${((routingCorrect / n) * 100).toFixed(1)}%)`);
  return { n, typeCorrect, severityCorrect, routingCorrect, mistakes };
}

const seedResult = evaluate(seedIncidents, 'Organizer-provided set (used during rule design)');
const genResult = evaluate(generatedIncidents, 'Generated synthetic set (held-out generalization test)');

const totalN = seedResult.n + genResult.n;
const totalType = seedResult.typeCorrect + genResult.typeCorrect;
const totalSev = seedResult.severityCorrect + genResult.severityCorrect;
const totalRoute = seedResult.routingCorrect + genResult.routingCorrect;

console.log(`\n=== Combined (n=${totalN}) ===`);
console.log(`Type accuracy:     ${totalType}/${totalN}  (${((totalType / totalN) * 100).toFixed(1)}%)`);
console.log(`Severity accuracy: ${totalSev}/${totalN}  (${((totalSev / totalN) * 100).toFixed(1)}%)`);
console.log(`Routing accuracy:  ${totalRoute}/${totalN}  (${((totalRoute / totalN) * 100).toFixed(1)}%)`);
console.log(`\n(Full per-case mistake list available by running evaluate.js for the organizer set,`);
console.log(`or inspecting genResult.mistakes in this script for the generated set.)\n`);
