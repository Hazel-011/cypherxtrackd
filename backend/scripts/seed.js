require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../src/db');
const Report = require('../src/models/Report');
const { classify } = require('../src/services/classifier');
const { redact } = require('../src/services/redact');
const { regroupByType } = require('../src/controllers/reportsController');
const incidents = require('../src/data/incidents.seed.json');
const generated = require('../src/data/incidents.generated.json');

async function seed() {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/track-d-triage';
  await connectDB(MONGO_URI);
  await Report.deleteMany({});

  // Seed with the organizer's 50 cases plus a sample of the generated set,
  // so the live dashboard demo shows realistic volume/variety without
  // loading all 368 at once. Use `npm run generate` + edit this slice to
  // load more for a bigger demo.
  const allIncidents = [...incidents, ...generated.slice(0, 60)];

  // stagger createdAt so dedup/time-window logic and queue ordering have
  // something realistic to work with
  const baseTime = Date.now() - allIncidents.length * 15 * 60 * 1000;

  for (let i = 0; i < allIncidents.length; i++) {
    const inc = allIncidents[i];
    const result = classify(inc.rawText);
    const doc = await Report.create({
      externalId: inc.id,
      rawText: inc.rawText,
      cleanedText: redact(inc.rawText),
      type: result.type,
      severity: result.severity,
      technicalDetails: result.technicalDetails,
      routing: result.routing,
      explanation: result.explanation,
      confidence: result.confidence,
      labeled: { type: inc.type, severity: inc.severity, routing: inc.routing },
    });
    await Report.updateOne(
      { _id: doc._id },
      { createdAt: new Date(baseTime + i * 15 * 60 * 1000) }
    );
  }

  const types = [...new Set(allIncidents.map((i) => i.type))];
  for (const t of types) await regroupByType(t);
  // regroupByType uses classified type, so also regroup by whatever the
  // classifier actually assigned
  const assignedTypes = [...new Set((await Report.find().lean()).map((r) => r.type))];
  for (const t of assignedTypes) await regroupByType(t);

  console.log(`Seeded ${allIncidents.length} reports.`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
