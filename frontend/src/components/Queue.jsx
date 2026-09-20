import React from 'react';
import ReportCard from './ReportCard.jsx';


export default function Queue({ reports, loading, onStatusChange }) {
  if (loading) return <p className="empty-state">Loading queue…</p>;
  if (!reports.length) return <p className="empty-state">No reports yet. Submit one to get started.</p>;

  return (
    <div className="queue">
      {reports.map((r) => (
        <ReportCard key={r._id} report={r} onStatusChange={onStatusChange} />
      ))}
    </div>
  );
}
