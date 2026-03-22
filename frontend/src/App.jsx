import { useState } from "react";
import Dashboard from "./components/Dashboard";
import Caregivers from "./components/Caregivers";
import "./App.css";

function App() {
  const [tab, setTab] = useState("dashboard");

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <div className="header-logo">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <h1>CareNest</h1>
          <span className="subtitle">Wellness Check-in</span>
        </div>
        <nav className="tabs">
          <button
            className={tab === "dashboard" ? "tab active" : "tab"}
            onClick={() => setTab("dashboard")}
          >
            Dashboard
          </button>
          <button
            className={tab === "caregivers" ? "tab active" : "tab"}
            onClick={() => setTab("caregivers")}
          >
            Caregivers
          </button>
        </nav>
      </header>
      <main className="main">
        {tab === "dashboard" ? <Dashboard /> : <Caregivers />}
      </main>
    </div>
  );
}

export default App;
