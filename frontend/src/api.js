const BASE = '/api/reports';

function adminHeaders() {
  const key = sessionStorage.getItem('adminKey') || '';
  return { 'Content-Type': 'application/json', 'x-admin-key': key };
}

export async function fetchQueue() {
  const res = await fetch(`${BASE}/queue`, { headers: adminHeaders() });
  if (res.status === 401) throw new Error('UNAUTHORIZED');
  if (!res.ok) throw new Error('Failed to fetch queue');
  return res.json();
}

export async function submitReport(rawText) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawText }),
  });
  if (!res.ok) throw new Error('Failed to submit report');
  return res.json();
}

export async function updateStatus(id, status) {
  const res = await fetch(`${BASE}/${id}/status`, {
    method: 'PATCH',
    headers: adminHeaders(),
    body: JSON.stringify({ status }),
  });
  if (res.status === 401) throw new Error('UNAUTHORIZED');
  if (!res.ok) throw new Error('Failed to update status');
  return res.json();
}

export async function checkAdminKey(key) {
  // The queue endpoint doubles as a credential check: 200 means the key
  // is valid, 401 means it isn't.
  const res = await fetch(`${BASE}/queue`, {
    headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
  });
  return res.ok;
}
