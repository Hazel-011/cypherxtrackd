import React, { useState } from 'react';

const SEVERITY_COLORS = {
  Critical: '#b91c1c',
  High: '#c2410c',
  Medium: '#a16207',
  Low: '#4d7c0f',
};

function GroupedReportRow({ report }) {
  const [showRaw, setShowRaw] = useState(false);
  return (
    <div className="grouped-report-row">
      <div className="grouped-report-header">
        <span className="grouped-id">{report.externalId || report._id.slice(-6)}</span>
        <span className="grouped-time">{new Date(report.createdAt).toLocaleString()}</span>
      </div>
      <p className="grouped-text">{report.cleanedText}</p>
      <button className="link-btn" onClick={() => setShowRaw((s) => !s)}>
        {showRaw ? 'Hide raw' : 'Show raw'}
      </button>
      {showRaw && <p className="raw-text-inline">{report.rawText}</p>}
    </div>
  );
}

export default function ReportCard({ report, onStatusChange }) {
  const [showRaw, setShowRaw] = useState(false);
  const [showGroup, setShowGroup] = useState(false);
  const hasGroup = report.duplicateCount > 1 && report.groupedReports?.length > 0;

  return (
    <div className="card">
      <div className="card-header">
        <span
          className="severity-badge"
          style={{ backgroundColor: SEVERITY_COLORS[report.severity] || '#555' }}
        >
          {report.severity}
        </span>
        <span className="type-badge">{report.type}</span>
        {report.duplicateCount > 1 && (
          <span className="dup-badge">×{report.duplicateCount} reports (grouped)</span>
        )}
        <span className="id-badge">{report.externalId || report._id.slice(-6)}</span>
      </div>

      <p className="cleaned-text">{report.cleanedText}</p>

      <div className="meta-row">
        <div><strong>Technical details:</strong> {report.technicalDetails}</div>
        <div><strong>Routed to:</strong> {report.routing}</div>
      </div>

      <p className="explanation">{report.explanation}</p>

      <div className="card-actions">
        <button onClick={() => setShowRaw((s) => !s)}>
          {showRaw ? 'Hide raw report' : 'Show raw report'}
        </button>
        
        {hasGroup && (
          <button onClick={() => setShowGroup((s) => !s)}>
            {showGroup
              ? 'Hide grouped reports'
              : `Show ${report.groupedReports.length} grouped report(s)`}
          </button>
        )}
        <select
          value={report.status}
          onChange={(e) => onStatusChange(report._id, e.target.value)}
        >
          <option>Open</option>
          <option>In Progress</option>
          <option>Resolved</option>
        </select>
      </div>

      {showRaw && (
        <div className="raw-text">
          <em>Raw (unredacted, for authorized triage staff only):</em>
          <p>{report.rawText}</p>
        </div>
      )}

      {showGroup && hasGroup && (
        <div className="grouped-panel">
          <p className="grouped-panel-title">
            These {report.duplicateCount - 1} report(s) were matched to this incident by text
            similarity (same type, similar wording, within a 48-hour window):
          </p>
          {report.groupedReports.map((r) => (
            <GroupedReportRow key={r._id} report={r} />
          ))}
        </div>
      )}
    </div>
  );
}