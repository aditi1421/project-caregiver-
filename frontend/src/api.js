const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function fetchStats() {
  try {
    const res = await fetch(`${API}/api/dashboard/stats`);
    return res.json();
  } catch {
    return { total_caregivers: 0, total_checkins: 0, completed_checkins: 0, urgent_flags: 0, coverage_rate: 0, mood_distribution: {} };
  }
}

export async function fetchCheckins() {
  try {
    const res = await fetch(`${API}/api/checkins`);
    return res.json();
  } catch { return []; }
}

export async function fetchCheckinById(id) {
  const res = await fetch(`${API}/api/checkins/${id}`);
  return res.json();
}

export async function fetchCaregivers() {
  try {
    const res = await fetch(`${API}/api/caregivers`);
    return res.json();
  } catch { return []; }
}

export async function createCaregiver(data) {
  const res = await fetch(`${API}/api/caregivers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function fetchCaregiverCheckins(caregiverId) {
  const res = await fetch(`${API}/api/caregivers/${caregiverId}/checkins`);
  return res.json();
}

export async function triggerCall(caregiverId) {
  const res = await fetch(`${API}/api/calls/trigger`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ caregiver_id: caregiverId }),
  });
  return res.json();
}

export async function triggerBatchCalls(caregiverIds) {
  const res = await fetch(`${API}/api/calls/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ caregiver_ids: caregiverIds }),
  });
  return res.json();
}
