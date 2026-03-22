# CareNest

**Automated caregiver wellness check-in system powered by voice AI.**

CareNest solves a critical gap in home healthcare: care managers oversee dozens of caregivers but have no scalable way to check on their wellbeing. Burnout, medication errors, and patient emergencies go undetected until it's too late.

CareNest uses [Bolna](https://bolna.ai) voice AI to make automated phone calls to caregivers, conduct empathetic wellness conversations, and extract structured data — mood, patient condition, medication issues, and urgency flags — into a real-time dashboard.

---

## How It Works

```
Care Manager triggers calls (individual or batch)
        │
        ▼
  ┌─────────────┐        ┌──────────────┐
  │  CareNest   │──POST──▶   Bolna API   │
  │  Backend    │        │  Voice Agent  │
  │  (FastAPI)  │◀─POST──│  (Webhook)   │
  └──────┬──────┘        └──────┬───────┘
         │                      │
         │               Phone call to
         │               caregiver
         ▼
  ┌─────────────┐
  │  CareNest   │  Dashboard with mood badges,
  │  Frontend   │  urgency flags, transcripts,
  │  (React)    │  filters, and call history
  └─────────────┘
```

**Call flow:**
1. Care manager clicks "Call" on a caregiver in the dashboard
2. Backend sends a request to Bolna's API with caregiver context (name, patient name, care manager)
3. Bolna's voice agent calls the caregiver's phone and conducts a wellness check-in conversation
4. After the call, Bolna sends a webhook with extracted data: caregiver mood, patient condition, medication issues, urgency flag, and full transcript
5. Dashboard updates with the results — urgent cases are flagged immediately

---

## Architecture

### Backend — FastAPI + SQLite

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/caregivers` | GET | List all caregivers |
| `/api/caregivers` | POST | Add a new caregiver |
| `/api/caregivers/{id}/checkins` | GET | Call history for a caregiver |
| `/api/calls/trigger` | POST | Initiate a single Bolna voice call |
| `/api/calls/batch` | POST | Batch-trigger calls for multiple caregivers |
| `/api/webhook/bolna` | POST | Receive post-call data from Bolna |
| `/api/checkins` | GET | List all check-in results |
| `/api/checkins/{id}` | GET | Get a single check-in (used for polling) |
| `/api/dashboard/stats` | GET | Summary stats (coverage rate, urgent flags, etc.) |

**Database tables:**
- `caregivers` — name, phone, patient_name, care_manager, city
- `checkins` — caregiver_mood, patient_condition, medication_issues, urgent_flag, transcript, call_status, call_duration

### Frontend — React + Vite

- **Dashboard tab** — Stat cards (total caregivers, completed check-ins, coverage rate, urgent flags) + filterable check-in table with mood badges, urgency flags, and transcript viewer
- **Caregivers tab** — Caregiver list with individual/batch call triggers, add caregiver form, and per-caregiver call history panel
- **Live call status** — Pulsing indicator during active calls with 3-second polling until completion
- **Filters** — Mood dropdown, city dropdown, urgent-only toggle (client-side)

---

## Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- A [Bolna](https://bolna.ai) account with a configured voice agent

### 1. Clone

```bash
git clone https://github.com/aditi1421/project-caregiver-.git
cd project-caregiver-
```

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file:

```
BOLNA_API_KEY=your_bolna_api_key
BOLNA_AGENT_ID=your_bolna_agent_id
```

Start the server:

```bash
uvicorn main:app --reload --port 8000
```

The database is auto-created with sample caregivers on first run.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

### 4. Webhook (for receiving call results)

Bolna needs a public URL to send post-call data. Use ngrok:

```bash
ngrok http 8000
```

Copy the `https://...ngrok-free.dev` URL and set your Bolna agent's webhook to:

```
https://<your-ngrok-url>/api/webhook/bolna
```

---

## Bolna Agent Configuration

Your Bolna voice agent should be configured to extract these fields in its post-call `extracted_data`:

```json
{
  "caregiver_mood": "happy | okay | stressed | tired | anxious | sad",
  "patient_condition": "stable | good | critical",
  "medication_issues": "description or none",
  "urgent_flag": true | false
}
```

The agent receives `user_data` with each call containing `caregiver_name`, `patient_name`, and `care_manager_name` to personalize the conversation.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python, FastAPI, SQLite, httpx |
| Frontend | React, Vite |
| Voice AI | Bolna API |
| Tunnel | ngrok (for webhook in development) |
| Fonts | Instrument Serif, Outfit, IBM Plex Mono |

---

## License

MIT
