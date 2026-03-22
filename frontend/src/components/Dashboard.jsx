import { useState, useEffect, useMemo } from "react";
import { fetchStats, fetchCheckins, fetchCaregivers } from "../api";

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [checkins, setCheckins] = useState([]);
  const [transcript, setTranscript] = useState(null);

  // Filters
  const [moodFilter, setMoodFilter] = useState("all");
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [cityFilter, setCityFilter] = useState("all");
  const [allCities, setAllCities] = useState([]);

  useEffect(() => {
    fetchStats().then(setStats);
    fetchCheckins().then(setCheckins);
    fetchCaregivers().then((cgs) => {
      const set = new Set(cgs.map((c) => c.city).filter(Boolean));
      setAllCities([...set].sort());
    });
  }, []);

  const filtered = useMemo(() => {
    return checkins.filter((c) => {
      if (moodFilter !== "all" && (c.caregiver_mood || "").toLowerCase() !== moodFilter) return false;
      if (urgentOnly && !c.urgent_flag) return false;
      if (cityFilter !== "all" && c.city !== cityFilter) return false;
      return true;
    });
  }, [checkins, moodFilter, urgentOnly, cityFilter]);

  if (!stats) return <div className="loading">Loading dashboard...</div>;

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon amber">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
          </div>
          <div className="label">Total Caregivers</div>
          <div className="value">{stats.total_caregivers}</div>
          <div className="sub-text">Registered in system</div>
        </div>
        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon sage">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--sage)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 11 12 14 22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </div>
          </div>
          <div className="label">Completed Check-ins</div>
          <div className="value green">{stats.completed_checkins}</div>
          <div className="sub-text">of {stats.total_checkins} total calls</div>
        </div>
        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon sky">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--sky)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
          </div>
          <div className="label">Coverage Rate</div>
          <div className="value sky">{stats.coverage_rate}%</div>
          <div className="sub-text">Caregivers reached</div>
        </div>
        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon critical">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--critical)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
          </div>
          <div className="label">Urgent Flags</div>
          <div className="value urgent">{stats.urgent_flags}</div>
          <div className="sub-text">Require attention</div>
        </div>
      </div>

      <div className="section-header">
        <h2 className="section-title">Recent Check-ins</h2>
        {checkins.length > 0 && (
          <span className="section-subtitle">
            {filtered.length} of {checkins.length} records
          </span>
        )}
      </div>

      {/* Filter Bar */}
      {checkins.length > 0 && (
        <div className="filter-bar">
          <div className="filter-group">
            <label className="filter-label">Mood</label>
            <select
              className="filter-select"
              value={moodFilter}
              onChange={(e) => setMoodFilter(e.target.value)}
            >
              <option value="all">All Moods</option>
              <option value="good">Good</option>
              <option value="happy">Happy</option>
              <option value="okay">Okay</option>
              <option value="stressed">Stressed</option>
              <option value="tired">Tired</option>
              <option value="anxious">Anxious</option>
              <option value="sad">Sad</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">City</label>
            <select
              className="filter-select"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
            >
              <option value="all">All Cities</option>
              {allCities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <button
            className={`filter-toggle ${urgentOnly ? "active" : ""}`}
            onClick={() => setUrgentOnly(!urgentOnly)}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Urgent Only
          </button>

          {(moodFilter !== "all" || urgentOnly || cityFilter !== "all") && (
            <button
              className="filter-clear"
              onClick={() => { setMoodFilter("all"); setUrgentOnly(false); setCityFilter("all"); }}
            >
              Clear
            </button>
          )}
        </div>
      )}

      <div className="table-wrap">
        {filtered.length === 0 && checkins.length === 0 ? (
          <div className="empty">
            <div className="empty-visual">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
            <div className="empty-title">No check-ins yet</div>
            <div className="empty-desc">Switch to the Caregivers tab to initiate wellness calls</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-title">No matching check-ins</div>
            <div className="empty-desc">Try adjusting your filters</div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Caregiver</th>
                <th>Patient</th>
                <th>Mood</th>
                <th>Patient Condition</th>
                <th>Medication</th>
                <th>Status</th>
                <th>Urgent</th>
                <th>Transcript</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className={c.call_status === "calling" ? "row-calling" : ""}>
                  <td className="caregiver-name">{c.caregiver_name}</td>
                  <td>{c.patient_name}</td>
                  <td>
                    <span className={`badge ${(c.caregiver_mood || "unknown").toLowerCase()}`}>
                      {c.caregiver_mood || "--"}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${(c.patient_condition || "unknown").toLowerCase()}`}>
                      {c.patient_condition || "--"}
                    </span>
                  </td>
                  <td>{c.medication_issues || "--"}</td>
                  <td>
                    {c.call_status === "calling" ? (
                      <span className="calling-indicator">
                        <span className="pulse-dot" />
                        Calling...
                      </span>
                    ) : (
                      <span className={`badge ${(c.call_status || "pending").toLowerCase()}`}>
                        {c.call_status}
                      </span>
                    )}
                  </td>
                  <td>
                    {c.urgent_flag ? (
                      <span className="badge urgent">Urgent</span>
                    ) : (
                      <span style={{ color: "var(--text-muted)", fontSize: 12 }}>--</span>
                    )}
                  </td>
                  <td>
                    {c.transcript ? (
                      <button className="btn btn-sm btn-ghost" onClick={() => setTranscript(c.transcript)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        View
                      </button>
                    ) : (
                      <span style={{ color: "var(--text-muted)", fontSize: 12 }}>--</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {transcript && (
        <div className="modal-overlay" onClick={() => setTranscript(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Call Transcript</h3>
              <button className="btn btn-sm btn-ghost" onClick={() => setTranscript(null)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <pre>{transcript}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
