import json
import os

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from database import get_db, init_db

load_dotenv()

app = FastAPI(title="CareNest API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "https://project-caregiver.vercel.app", "https://project-caregiver.onrender.com"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BOLNA_API_KEY = os.getenv("BOLNA_API_KEY")
BOLNA_AGENT_ID = os.getenv("BOLNA_AGENT_ID")
BOLNA_API_URL = "https://api.bolna.ai/call"


@app.on_event("startup")
def startup():
    init_db()


# ── Models ──────────────────────────────────────────────


class TriggerCallRequest(BaseModel):
    caregiver_id: int


class BatchCallRequest(BaseModel):
    caregiver_ids: list[int]


class BolnaWebhookPayload(BaseModel):
    model_config = {"extra": "allow"}
    execution_id: str | None = None
    run_id: str | None = None
    extracted_data: dict | str | None = None
    transcript: str | None = None
    status: str | None = None
    duration: float | None = None


# ── Caregivers ──────────────────────────────────────────


@app.get("/api/caregivers")
def list_caregivers():
    db = get_db()
    rows = db.execute("SELECT * FROM caregivers ORDER BY name").fetchall()
    db.close()
    return [dict(r) for r in rows]


@app.post("/api/caregivers")
def create_caregiver(data: dict):
    db = get_db()
    db.execute(
        "INSERT INTO caregivers (name, phone, patient_name, care_manager, city) VALUES (?, ?, ?, ?, ?)",
        (data["name"], data["phone"], data["patient_name"], data["care_manager"], data["city"]),
    )
    db.commit()
    db.close()
    return {"status": "created"}


# ── Calls ───────────────────────────────────────────────


@app.post("/api/calls/trigger")
async def trigger_call(req: TriggerCallRequest):
    db = get_db()
    caregiver = db.execute("SELECT * FROM caregivers WHERE id = ?", (req.caregiver_id,)).fetchone()
    if not caregiver:
        db.close()
        raise HTTPException(status_code=404, detail="Caregiver not found")

    # Create pending check-in
    cursor = db.execute(
        "INSERT INTO checkins (caregiver_id, call_status) VALUES (?, 'calling')",
        (req.caregiver_id,),
    )
    checkin_id = cursor.lastrowid
    db.commit()

    # Call Bolna API
    payload = {
        "agent_id": BOLNA_AGENT_ID,
        "recipient_phone_number": caregiver["phone"],
        "user_data": {
            "caregiver_name": caregiver["name"],
            "patient_name": caregiver["patient_name"],
            "care_manager_name": caregiver["care_manager"],
        },
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                BOLNA_API_URL,
                json=payload,
                headers={
                    "Authorization": f"Bearer {BOLNA_API_KEY}",
                    "Content-Type": "application/json",
                },
                timeout=30,
            )

        if resp.status_code == 200:
            resp_data = resp.json()
            execution_id = resp_data.get("execution_id") or resp_data.get("id")
            if execution_id:
                db.execute(
                    "UPDATE checkins SET execution_id = ? WHERE id = ?",
                    (execution_id, checkin_id),
                )
                db.commit()
            db.close()
            return {"status": "call_initiated", "checkin_id": checkin_id, "bolna_response": resp_data}
        else:
            db.execute("UPDATE checkins SET call_status = 'failed' WHERE id = ?", (checkin_id,))
            db.commit()
            db.close()
            raise HTTPException(status_code=resp.status_code, detail=f"Bolna API error: {resp.text}")
    except httpx.RequestError as e:
        db.execute("UPDATE checkins SET call_status = 'failed' WHERE id = ?", (checkin_id,))
        db.commit()
        db.close()
        raise HTTPException(status_code=502, detail=f"Failed to reach Bolna API: {str(e)}")


@app.post("/api/calls/batch")
async def batch_trigger(req: BatchCallRequest):
    results = []
    for cid in req.caregiver_ids:
        try:
            result = await trigger_call(TriggerCallRequest(caregiver_id=cid))
            results.append({"caregiver_id": cid, "status": "initiated"})
        except HTTPException as e:
            results.append({"caregiver_id": cid, "status": "failed", "error": e.detail})
    return {"results": results}


# ── Webhook ─────────────────────────────────────────────


@app.post("/api/webhook/bolna")
async def bolna_webhook(payload: BolnaWebhookPayload):
    import logging
    logging.info(f"Webhook received: status={payload.status}, exec_id={payload.execution_id}, run_id={payload.run_id}")

    db = get_db()

    # Try to find the matching check-in by execution_id or run_id
    exec_id = payload.execution_id or payload.run_id
    existing = None
    if exec_id:
        existing = db.execute(
            "SELECT id, caregiver_id FROM checkins WHERE execution_id = ?", (exec_id,)
        ).fetchone()

    # If no match, find the most recent check-in that isn't completed/failed
    if not existing:
        existing = db.execute(
            """SELECT id, caregiver_id FROM checkins
               WHERE call_status NOT IN ('completed', 'failed')
               ORDER BY created_at DESC LIMIT 1"""
        ).fetchone()

    # If still no match, find the absolute most recent check-in (within last 5 min)
    if not existing:
        existing = db.execute(
            """SELECT id, caregiver_id FROM checkins
               WHERE created_at > datetime('now', '-5 minutes')
               ORDER BY created_at DESC LIMIT 1"""
        ).fetchone()

    if not existing:
        db.close()
        return {"status": "no_matching_checkin"}

    # Intermediate statuses — just update call_status, don't create new rows
    intermediate = {"initiated", "ringing", "in-progress", "queued"}
    if payload.status in intermediate:
        db.execute(
            "UPDATE checkins SET call_status = ? WHERE id = ?",
            (payload.status, existing["id"]),
        )
        db.commit()
        db.close()
        return {"status": "received"}

    # Final statuses — parse extracted_data and update fully
    extracted = payload.extracted_data
    if isinstance(extracted, str):
        try:
            extracted = json.loads(extracted)
        except json.JSONDecodeError:
            extracted = {}
    if not isinstance(extracted, dict):
        extracted = {}

    mood = extracted.get("caregiver_mood") or "unknown"
    patient_condition = extracted.get("patient_condition") or "unknown"
    medication_issues = extracted.get("medication_issues") or "none"
    urgent = extracted.get("urgent_flag", False)
    if isinstance(urgent, str):
        urgent = urgent.lower() in ("true", "yes", "1")

    status = payload.status or "completed"
    if status in ("call-disconnected", "call_disconnected"):
        status = "completed"

    db.execute(
        """UPDATE checkins
           SET caregiver_mood = ?, patient_condition = ?, medication_issues = ?,
               urgent_flag = ?, transcript = ?, call_status = ?, call_duration = ?
           WHERE id = ?""",
        (mood, patient_condition, medication_issues, int(urgent),
         payload.transcript, status, payload.duration, existing["id"]),
    )

    db.commit()
    db.close()
    return {"status": "received"}


# ── Check-ins ───────────────────────────────────────────


@app.get("/api/checkins")
def list_checkins():
    db = get_db()
    rows = db.execute("""
        SELECT c.*, cg.name as caregiver_name, cg.patient_name, cg.city
        FROM checkins c
        JOIN caregivers cg ON c.caregiver_id = cg.id
        ORDER BY c.created_at DESC
    """).fetchall()
    db.close()
    return [dict(r) for r in rows]


@app.get("/api/checkins/{checkin_id}")
def get_checkin(checkin_id: int):
    db = get_db()
    row = db.execute("""
        SELECT c.*, cg.name as caregiver_name, cg.patient_name, cg.city
        FROM checkins c
        JOIN caregivers cg ON c.caregiver_id = cg.id
        WHERE c.id = ?
    """, (checkin_id,)).fetchone()
    db.close()
    if not row:
        raise HTTPException(status_code=404, detail="Check-in not found")
    return dict(row)


@app.get("/api/caregivers/{caregiver_id}/checkins")
def caregiver_checkins(caregiver_id: int):
    db = get_db()
    caregiver = db.execute("SELECT * FROM caregivers WHERE id = ?", (caregiver_id,)).fetchone()
    if not caregiver:
        db.close()
        raise HTTPException(status_code=404, detail="Caregiver not found")
    rows = db.execute("""
        SELECT * FROM checkins
        WHERE caregiver_id = ?
        ORDER BY created_at DESC
    """, (caregiver_id,)).fetchall()
    db.close()
    return {"caregiver": dict(caregiver), "checkins": [dict(r) for r in rows]}


# ── Dashboard ───────────────────────────────────────────


@app.get("/api/dashboard/stats")
def dashboard_stats():
    db = get_db()

    total_caregivers = db.execute("SELECT COUNT(*) FROM caregivers").fetchone()[0]
    total_checkins = db.execute("SELECT COUNT(*) FROM checkins").fetchone()[0]
    completed_checkins = db.execute(
        "SELECT COUNT(*) FROM checkins WHERE call_status = 'completed'"
    ).fetchone()[0]
    urgent_flags = db.execute(
        "SELECT COUNT(*) FROM checkins WHERE urgent_flag = 1"
    ).fetchone()[0]
    caregivers_contacted = db.execute(
        "SELECT COUNT(DISTINCT caregiver_id) FROM checkins WHERE call_status = 'completed'"
    ).fetchone()[0]

    coverage_rate = round((caregivers_contacted / total_caregivers * 100), 1) if total_caregivers else 0

    mood_dist = db.execute("""
        SELECT caregiver_mood, COUNT(*) as count
        FROM checkins WHERE caregiver_mood IS NOT NULL AND call_status = 'completed'
        GROUP BY caregiver_mood
    """).fetchall()

    db.close()

    return {
        "total_caregivers": total_caregivers,
        "total_checkins": total_checkins,
        "completed_checkins": completed_checkins,
        "urgent_flags": urgent_flags,
        "coverage_rate": coverage_rate,
        "mood_distribution": {r["caregiver_mood"]: r["count"] for r in mood_dist},
    }
