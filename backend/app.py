from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Any, Dict, List

from fastapi import FastAPI
from pydantic import BaseModel


BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "study_history.db"

app = FastAPI(title="IA Study API", version="1.0.0")


class AskRequest(BaseModel):
    prompt: str
    category: str | None = None


class AskResponse(BaseModel):
    resposta: str
    prompt: str
    category: str | None
    saved: bool


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def initialize_database() -> None:
    conn = get_connection()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS study_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prompt TEXT NOT NULL,
            category TEXT,
            response TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    conn.commit()
    conn.close()


@app.on_event("startup")
def startup_event() -> None:
    initialize_database()


@app.get("/health")
def health_check() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/api/ask", response_model=AskResponse)
def ask_ai(payload: AskRequest) -> AskResponse:
    response_text = (
        f"Recebi sua solicitação sobre '{payload.prompt}'. "
        "Vou organizar uma rotina de estudo com foco em revisão, tópicos prioritários "
        "e um plano prático de aprendizagem."
    )

    conn = get_connection()
    conn.execute(
        "INSERT INTO study_history (prompt, category, response) VALUES (?, ?, ?)",
        (payload.prompt, payload.category, response_text),
    )
    conn.commit()
    conn.close()

    return AskResponse(
        resposta=response_text,
        prompt=payload.prompt,
        category=payload.category,
        saved=True,
    )


@app.get("/api/history")
def get_history() -> Dict[str, List[Dict[str, Any]]]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT id, prompt, category, response, created_at FROM study_history ORDER BY id DESC"
    ).fetchall()
    conn.close()

    items = [
        {
            "id": row["id"],
            "prompt": row["prompt"],
            "category": row["category"],
            "response": row["response"],
            "created_at": row["created_at"],
        }
        for row in rows
    ]
    return {"items": items}
