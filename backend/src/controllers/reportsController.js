const Report = require('../models/Report');
const { classify } = require('../services/classifier');
const { redact } = require('../services/redact');
const { assignGroups } = require('../services/dedup');

// POST /api/reports  — ingest a raw report, run the full pipeline, store it
async function createReport(req, res) {
  try {
    const { rawText, externalId } = req.body;
    if (!rawText || !rawText.trim()) {
      return res.status(400).json({ error: 'rawText is required' });
    }

    const result = classify(rawText);
    const cleanedText = redact(rawText);

    const report = await Report.create({
      externalId,
      rawText,
      cleanedText,
      type: result.type,
      severity: result.severity,
      technicalDetails: result.technicalDetails,
      routing: result.routing,
      explanation: result.explanation,
      confidence: result.confidence,
    });

    // Re-run grouping across all reports of this type so the new one gets
    // slotted into an existing cluster if it matches.
    await regroupByType(result.type);
    const refreshed = await Report.findById(report._id);

    res.status(201).json(refreshed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create report' });
  }
}

async function regroupByType(type) {
  const reports = await Report.find({ type }).sort({ createdAt: 1 }).lean();
  const grouped = assignGroups(reports);
  await Promise.all(
    grouped.map((r) => Report.updateOne({ _id: r._id }, { groupId: r.groupId }))
  );
}

// GET /api/reports/queue — urgency-sorted, deduped queue
async function getQueue(req, res) {
  try {
    const reports = await Report.find().lean();
    const order = Report.SEVERITY_ORDER;

    // Show one representative per group (most recent), but attach the full
    // list of other reports in that group — not just a count — so admin
    // staff can actually verify what got grouped, not just trust a number.
    const groups = {};
    for (const r of reports) {
      const key = r.groupId || r._id.toString();
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    }

    const queue = Object.values(groups).map((members) => {
      const representative = members.reduce((a, b) =>
        new Date(a.createdAt) > new Date(b.createdAt) ? a : b
      );
      const groupedReports = members
        .filter((m) => m._id.toString() !== representative._id.toString())
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .map((m) => ({
          _id: m._id,
          externalId: m.externalId,
          rawText: m.rawText,
          cleanedText: m.cleanedText,
          createdAt: m.createdAt,
        }));
      return { ...representative, duplicateCount: members.length, groupedReports };
    });

    queue.sort((a, b) => {
      const sevDiff = (order[b.severity] ?? 0) - (order[a.severity] ?? 0);
      if (sevDiff !== 0) return sevDiff;
      return new Date(a.createdAt) - new Date(b.createdAt); // older first as tiebreak
    });

    res.json(queue);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch queue' });
  }
}

// GET /api/reports — all reports, unfiltered
async function listReports(req, res) {
  const reports = await Report.find().sort({ createdAt: -1 });
  res.json(reports);
}

// PATCH /api/reports/:id/status
async function updateStatus(req, res) {
  try {
    const { status } = req.body;
    const report = await Report.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!report) return res.status(404).json({ error: 'Not found' });
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
}

module.exports = { createReport, getQueue, listReports, updateStatus, regroupByType };