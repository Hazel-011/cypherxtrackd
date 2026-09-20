import React, { useState } from 'react';
import SubmitForm from './SubmitForm.jsx';
import { submitReport } from '../api.js';

const SEVERITY_COLORS = {
  Critical: '#b91c1c', High: '#c2410c', Medium: '#a16207', Low: '#4d7c0f',
};

export default function ReporterView() {
  const [lastResult, setLastResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (rawText) => {
    setError(null);
    try {
      const report = await submitReport(rawText);
      setLastResult(report);
    } catch (err) {
      setError('Could not submit your report. Is the backend running?');
    }
  };

  return (
    <div className="reporter-view">
      <header>
        <h1>Report a Security Incident</h1>
        <p className="subtitle">
          Describe what happened in your own words — English or Pidgin is fine. Your report
          goes straight to the security team; you don't need to know how serious it is or
          who to send it to.
        </p>
      </header>

      

      <SubmitForm onSubmit={handleSubmit} />

      {error && <p className="error">{error}</p>}

      {lastResult && (
        <div className="confirmation">
          <h3>Report received</h3>
          <p>
            <span className="severity-badge" style={{ backgroundColor: SEVERITY_COLORS[lastResult.severity] }}>
              {lastResult.severity}
            </span>{' '}
            classified as <strong>{lastResult.type}</strong>, routed to{' '}
            <strong>{lastResult.routing}</strong>.
          </p>
          <p className="note">
            This is the only report you can see here — the full queue is only visible to
            triage staff. Reference ID: <code>{lastResult._id.slice(-8)}</code>
          </p>
        </div>
      )}

      <a className="admin-link" href="#admin">Staff / Admin login →</a>
    </div>
  );
}
