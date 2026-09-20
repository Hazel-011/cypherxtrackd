import React, { useEffect, useState, useCallback } from 'react';
import Queue from './Queue.jsx';
import { fetchQueue, updateStatus } from '../api.js';

export default function AdminView({ onLogout }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchQueue();
      setReports(data);
      setError(null);
    } catch (err) {
      if (err.message === 'UNAUTHORIZED') {
        onLogout();
        return;
      }

      setError('Could not reach the API. Is the backend running on :5000?');
    } finally {
      setLoading(false);
    }
  }, [onLogout]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusChange = async (id, status) => {
    try {
      await updateStatus(id, status);
      await load();
    } catch (err) {
      if (err.message === 'UNAUTHORIZED') {
        onLogout();
      }
    }
  };

  const counts = reports.reduce(
    (acc, report) => {
      acc[report.status] = (acc[report.status] || 0) + 1;
      return acc;
    },
    {}
  );

  // Number of original reports before duplicate grouping
  const totalRawReports = reports.reduce(
    (sum, report) => sum + (report.duplicateCount || 1),
    0
  );

  // Number of unique incidents currently displayed in the queue
  const distinctIncidents = reports.length;

  const groupedDuplicates = totalRawReports - distinctIncidents;

  return (
    <div className="admin-view">
      <header>
        <div className="header-row">
          <h1>Incident Triage Queue</h1>

          <button className="logout" onClick={onLogout}>
            Log out
          </button>
        </div>

        <p className="subtitle">
          Reports are classified, scored, redacted and deduplicated automatically.
          Sorted by urgency, most severe first.
        </p>

        <div className="status-summary">
          <div className="stat-card">
            <span className="stat-label">Open <strong>{counts.Open || 0}</strong></span>
            
          </div>

          <div className="stat-card">
            <span className="stat-label">In Progress <strong>{counts['In Progress'] || 0}</strong></span>
            
          </div>

          <div className="stat-card">
            <span className="stat-label">Resolved <strong>{counts.Resolved || 0}</strong></span>
            
          </div>

          <div className="stat-card">
            <span className="stat-label">Distinct Incidents <strong>{distinctIncidents}</strong></span>
            
          </div>

          <div className="stat-card dedup-stat-card">
            <span className="stat-label">Reports Received <strong>{totalRawReports}</strong></span>
          </div>
          {groupedDuplicates > 0 && (
              <span className="dedup-note">
                {groupedDuplicates} duplicate
                {groupedDuplicates !== 1 ? 's' : ''} grouped
              </span>
            )}
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      <Queue
        reports={reports}
        loading={loading}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}