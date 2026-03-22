import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "carenest.db")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS caregivers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            patient_name TEXT NOT NULL,
            care_manager TEXT NOT NULL,
            city TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS checkins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            caregiver_id INTEGER NOT NULL,
            execution_id TEXT,
            caregiver_mood TEXT,
            patient_condition TEXT,
            medication_issues TEXT,
            urgent_flag BOOLEAN DEFAULT 0,
            transcript TEXT,
            call_status TEXT DEFAULT 'pending',
            call_duration REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (caregiver_id) REFERENCES caregivers(id)
        );
    """)
    conn.commit()

    # Seed sample data if empty
    cursor = conn.execute("SELECT COUNT(*) FROM caregivers")
    if cursor.fetchone()[0] == 0:
        conn.executemany(
            "INSERT INTO caregivers (name, phone, patient_name, care_manager, city) VALUES (?, ?, ?, ?, ?)",
            [
                ("Priya Sharma", "+919876543210", "Ramesh Sharma", "Dr. Anita Desai", "Bangalore"),
                ("Kavitha Nair", "+919876543211", "Lakshmi Nair", "Dr. Anita Desai", "Chennai"),
                ("Arjun Reddy", "+919876543212", "Sarojini Reddy", "Dr. Meena Rao", "Hyderabad"),
                ("Fatima Khan", "+919876543213", "Zainab Khan", "Dr. Meena Rao", "Mumbai"),
                ("Deepa Iyer", "+919876543214", "Gopal Iyer", "Dr. Anita Desai", "Bangalore"),
            ],
        )
        conn.commit()

    conn.close()
