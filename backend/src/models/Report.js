const mongoose = require('mongoose');

const SEVERITY_ORDER = { Critical: 3, High: 2, Medium: 1, Low: 0 };

const reportSchema = new mongoose.Schema(
  {
    externalId: { type: String }, // e.g. INC-001 for seeded data
    rawText: { type: String, required: true },
    cleanedText: { type: String, required: true },
    type: { type: String, required: true },
    severity: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], required: true },
    technicalDetails: { type: String },
    routing: { type: String },
    explanation: { type: String },
    confidence: { type: Number },
    groupId: { type: String, index: true },
    status: { type: String, enum: ['Open', 'In Progress', 'Resolved'], default: 'Open' },
    // ground-truth labels, only present for seeded/evaluation data
    labeled: {
      type: { type: String },
      severity: { type: String },
      routing: { type: String },
    },
  },
  { timestamps: true }
);

reportSchema.statics.SEVERITY_ORDER = SEVERITY_ORDER;

module.exports = mongoose.model('Report', reportSchema);
