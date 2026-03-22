import { useState, useEffect, useRef, useCallback } from "react";
import {
  fetchCaregivers,
  triggerCall,
  triggerBatchCalls,
  fetchCheckinById,
  createCaregiver,
  fetchCaregiverCheckins,
} from "../api";

function Caregivers() {
  const [caregivers, setCaregivers] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [calling, setCalling] = useState(new Map()); // id -> checkin_id
  const [message, setMessage] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [historyPanel, setHistoryPanel] = useState(null); // { caregiver, checkins }
  const pollTimers = useRef(new Map());

  useEffect(() => {
    fetchCaregivers().then(setCaregivers);
    return () => {
      pollTimers.current.forEach((t) => clearInterval(t));
    };
  }, []);

  // Poll a checkin until it's no longer "calling"
  const startPolling = useCallback((caregiverId, checkinId) => {
    const timer = setInterval(async () => {
      try {
        const data = await fetchCheckinById(checkinId);
        if (data.call_status !== "calling") {
          clearInterval(timer);
          pollTimers.current.delete(caregiverId);
          setCalling((prev) => {
            const next = new Map(prev);
            next.delete(caregiverId);
            return next;
          });
          setMessage({
            type: data.call_status === "completed" ? "success" : "error",
            text: data.call_status === "completed"
              ? `Call completed — ${data.caregiver_name}: mood ${data.caregiver_mood || "unknown"}`
              : `Call ${data.call_status}`,
          });
        }
      } catch {
        // keep polling
      }
    }, 3000);
    pollTimers.current.set(caregiverId, timer);
  }, []);

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === caregivers.length) setSelected(new Set());
    else setSelected(new Set(caregivers.map((c) => c.id)));
  };

  const handleCall = async (id) => {
    setCalling((prev) => new Map(prev).set(id, null));
    setMessage(null);
    try {
      const result = await triggerCall(id);
      const checkinId = result.checkin_id;
      setCalling((prev) => new Map(prev).set(id, checkinId));
      setMessage({ type: "success", text: "Call initiated — polling for result..." });
      if (checkinId) startPolling(id, checkinId);
    } catch {
      setCalling((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
      setMessage({ type: "error", text: "Failed to initiate call." });
    }
  };

  const handleBatchCall = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    ids.forEach((id) => setCalling((prev) => new Map(prev).set(id, null)));
    setMessage(null);
    try {
      const result = await triggerBatchCalls(ids);
      const succeeded = result.results.filter((r) => r.status === "initiated").length;
      setMessage({ type: "success", text: `${succeeded}/${ids.length} calls initiated` });
    } catch {
      setMessage({ type: "error", text: "Batch call failed." });
    }
    setCalling(new Map());
    setSelected(new Set());
  };

  const handleAddCaregiver = async (data) => {
    await createCaregiver(data);
    setShowAddForm(false);
    fetchCaregivers().then(setCaregivers);
    setMessage({ type: "success", text: "Caregiver added!" });
  };

  const openHistory = async (caregiver) => {
    const data = await fetchCaregiverCheckins(caregiver.id);
    setHistoryPanel(data);
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h2 className="section-title" style={{ marginBottom: 0 }}>Caregivers</h2>
          <span className="section-subtitle">{caregivers.length} registered</span>
        </div>
        <div className="caregiver-actions">
          {message && (
            <span className={`status-msg ${message.type}`}>
              {message.type === "success" && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4, verticalAlign: -1 }}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              {message.text}
            </span>
          )}
          <button className="btn btn-ghost" onClick={() => setShowAddForm(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Caregiver
          </button>
          <button
            className="btn btn-primary"
            disabled={selected.size === 0}
            onClick={handleBatchCall}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            Call Selected ({selected.size})
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th className="select-col">
                <input type="checkbox" checked={selected.size === caregivers.length && caregivers.length > 0} onChange={toggleAll} />
              </th>
              <th>Name</th>
              <th>Phone</th>
              <th>Patient</th>
              <th>Care Manager</th>
              <th>City</th>
              <th style={{ textAlign: "center" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {caregivers.map((c) => (
              <tr
                key={c.id}
                className={calling.has(c.id) ? "row-calling" : ""}
                style={selected.has(c.id) ? { background: "var(--amber-soft)" } : undefined}
              >
                <td className="select-col">
                  <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} />
                </td>
                <td>
                  <button className="name-link" onClick={() => openHistory(c)}>
                    {c.name}
                  </button>
                </td>
                <td><span className="phone-text">{c.phone}</span></td>
                <td>{c.patient_name}</td>
                <td style={{ color: "var(--text)" }}>{c.care_manager}</td>
                <td><span className="city-badge">{c.city}</span></td>
                <td style={{ textAlign: "center" }}>
                  {calling.has(c.id) ? (
                    <span className="calling-indicator">
                      <span className="pulse-dot" />
                      Calling...
                    </span>
                  ) : (
                    <button className="btn btn-sm btn-primary" onClick={() => handleCall(c.id)}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                      Call
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Caregiver Modal */}
      {showAddForm && <AddCaregiverModal onClose={() => setShowAddForm(false)} onSubmit={handleAddCaregiver} />}

      {/* Call History Panel */}
      {historyPanel && <HistoryPanel data={historyPanel} onClose={() => setHistoryPanel(null)} />}
    </div>
  );
}

function AddCaregiverModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({ name: "", phone: "", patient_name: "", care_manager: "", city: "" });
  const [submitting, setSubmitting] = useState(false);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit(form);
    setSubmitting(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h3>Add Caregiver</h3>
          <button className="btn btn-sm btn-ghost" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="form-stack">
          <div className="form-field">
            <label>Caregiver Name</label>
            <input type="text" required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Priya Sharma" />
          </div>
          <div className="form-field">
            <label>Phone Number</label>
            <input type="tel" required value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+919876543210" />
          </div>
          <div className="form-field">
            <label>Patient Name</label>
            <input type="text" required value={form.patient_name} onChange={(e) => set("patient_name", e.target.value)} placeholder="e.g. Ramesh Sharma" />
          </div>
          <div className="form-field">
            <label>Care Manager</label>
            <input type="text" required value={form.care_manager} onChange={(e) => set("care_manager", e.target.value)} placeholder="e.g. Dr. Anita Desai" />
          </div>
          <div className="form-field">
            <label>City</label>
            <input type="text" required value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="e.g. Bangalore" />
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting} style={{ width: "100%", marginTop: 8 }}>
            {submitting ? "Adding..." : "Add Caregiver"}
          </button>
        </form>
      </div>
    </div>
  );
}

function HistoryPanel({ data, onClose }) {
  const [expandedId, setExpandedId] = useState(null);
  const { caregiver, checkins } = data;

  return (
    <div className="slide-panel-overlay" onClick={onClose}>
      <div className="slide-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <div>
            <h3>{caregiver.name}</h3>
            <p className="panel-subtitle">
              Patient: {caregiver.patient_name} &middot; {caregiver.city}
            </p>
          </div>
          <button className="btn btn-sm btn-ghost" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="panel-body">
          {checkins.length === 0 ? (
            <div className="empty" style={{ padding: "40px 20px" }}>
              <div className="empty-title">No check-ins yet</div>
              <div className="empty-desc">Trigger a call to start the history</div>
            </div>
          ) : (
            <div className="history-list">
              {checkins.map((c) => (
                <div key={c.id} className="history-item">
                  <div className="history-row" onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}>
                    <div className="history-date">
                      {new Date(c.created_at).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                      <span className="history-time">
                        {new Date(c.created_at).toLocaleTimeString("en-IN", {
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="history-badges">
                      {c.caregiver_mood && (
                        <span className={`badge ${c.caregiver_mood.toLowerCase()}`}>{c.caregiver_mood}</span>
                      )}
                      {c.patient_condition && (
                        <span className={`badge ${c.patient_condition.toLowerCase()}`}>{c.patient_condition}</span>
                      )}
                      {c.urgent_flag ? <span className="badge urgent">Urgent</span> : null}
                    </div>
                    <svg
                      width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      style={{ transition: "transform 0.2s", transform: expandedId === c.id ? "rotate(180deg)" : "rotate(0)" }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                  {expandedId === c.id && (
                    <div className="history-expanded">
                      <div className="history-detail">
                        <span className="detail-label">Status</span>
                        <span className={`badge ${(c.call_status || "pending").toLowerCase()}`}>{c.call_status}</span>
                      </div>
                      {c.medication_issues && (
                        <div className="history-detail">
                          <span className="detail-label">Medication</span>
                          <span>{c.medication_issues}</span>
                        </div>
                      )}
                      {c.call_duration && (
                        <div className="history-detail">
                          <span className="detail-label">Duration</span>
                          <span>{Math.round(c.call_duration)}s</span>
                        </div>
                      )}
                      {c.transcript && (
                        <div className="history-transcript">
                          <span className="detail-label">Transcript</span>
                          <pre>{c.transcript}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Caregivers;
