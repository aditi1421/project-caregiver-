const API = "http://localhost:8000";

export async function fetchStats() {
  const res = await fetch(`${API}/api/dashboard/stats`);
  return res.json();
}

export async function fetchCheckins() {
  const res = await fetch(`${API}/api/checkins`);
  return res.json();
}

export async function fetchCheckinById(id) {
  const res = await fetch(`${API}/api/checkins/${id}`);
  return res.json();
}

export async function fetchCaregivers() {
  const res = await fetch(`${API}/api/caregivers`);
  return res.json();
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
