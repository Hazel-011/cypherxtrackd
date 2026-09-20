/**
 * Lightweight passcode gate for the admin/triage-staff routes (full queue,
 * status changes). This is a PROTOTYPE-LEVEL control, not production
 * authentication: a single shared passcode, no per-user accounts, no
 * session expiry, no rate limiting on guesses. It exists to demonstrate
 * the reporter/admin separation the brief implies ("sending a report to
 * the wrong place means nobody acts on it" — the flip side is that not
 * everyone should see every report). A production deployment needs real
 * auth (roles tied to accounts, e.g. the ward/duty-based access pattern
 * described in the Health track brief would be a reasonable model to
 * borrow from).
 */
function requireAdmin(req, res, next) {
  const provided = req.headers['x-admin-key'];
  const expected = process.env.ADMIN_PASSCODE || 'change-me-before-demo';
  if (!provided || provided !== expected) {
    return res.status(401).json({ error: 'Admin passcode required' });
  }
  next();
}

module.exports = { requireAdmin };
