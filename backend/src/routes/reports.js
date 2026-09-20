const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/requireAdmin');
const {
  createReport, getQueue, listReports, updateStatus,
} = require('../controllers/reportsController');

// Public: anyone can submit a raw report. They get back only THEIR OWN
// triaged result, not the full queue.
router.post('/', createReport);

// Admin/triage-staff only: seeing every report, the urgency queue, and
// changing status is restricted — a reporter should not see other
// people's (possibly sensitive) reports.
router.get('/queue', requireAdmin, getQueue);
router.get('/', requireAdmin, listReports);
router.patch('/:id/status', requireAdmin, updateStatus);

module.exports = router;
