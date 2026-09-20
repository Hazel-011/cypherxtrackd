import React, { useState } from 'react';
import { checkAdminKey } from '../api.js';
import '../assets/css/AdminLogin.css';

export default function AdminLogin({ onSuccess }) {
  const [key, setKey] = useState('');
  const [error, setError] = useState(null);
  const [checking, setChecking] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setChecking(true);
    setError(null);
    const ok = await checkAdminKey(key);
    setChecking(false);
    if (ok) {
      sessionStorage.setItem('adminKey', key);
      onSuccess();
    } else {
      setError('Incorrect passcode.');
    }
  };

  return (
    <div className="login-card">
  <div className="login-icon">
    ✓
  </div>

  <h2>Staff / Admin Login</h2>

  <p className="subtitle">
    Access the triage queue securely. Reports are confidential and
    only authorized staff can view them.
  </p>

  <form onSubmit={handleSubmit}>
    <label htmlFor="admin-passcode">
      Admin passcode
    </label>

    <input
      id="admin-passcode"
      type="password"
      placeholder="Enter your passcode"
      value={key}
      onChange={(e) => setKey(e.target.value)}
    />

    <button type="submit" disabled={checking}>
      {checking ? 'Checking…' : 'Enter securely'}
    </button>
  </form>

  {error && <p className="error">{error}</p>}

  <a className="admin-link" href="#">
    ← Back to report form
  </a>
</div>
  );
}
