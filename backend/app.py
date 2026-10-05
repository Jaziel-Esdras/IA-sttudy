from __future__ import annotations

import sqlite3
from pathlib import Path
import os
import json
from urllib.parse import quote_plus
from typing import Any, Dict, List, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "study_history.db"

app = FastAPI(title="IA Study API", version="1.0.0")

cors_origins = [
    origin.strip()
    for origin in os.environ.get(
        "CORS_ORIGINS",
        "https://flowsttuffyyy.com,http://localhost:8000,http://127.0.0.1:8000",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


class AskRequest(BaseModel):
    prompt: str
    category: str | None = None


class AskResponse(BaseModel):
    resposta: str
    prompt: str
    category: str | None
    resumo: str | None = None
    video_links: List[str] = []
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
            resumo TEXT,
            video_links TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    # Ensure new columns exist for existing databases
    cur = conn.execute("PRAGMA table_info(study_history)").fetchall()
    cols = {row[1] for row in cur}
    if "resumo" not in cols:
        conn.execute("ALTER TABLE study_history ADD COLUMN resumo TEXT")
    if "video_links" not in cols:
        conn.execute("ALTER TABLE study_history ADD COLUMN video_links TEXT")

    conn.commit()
    conn.close()


def _generate_summary_and_links(prompt: str) -> tuple[str, List[str]]:
    # Try to use OpenAI if API key present and library installed, otherwise fallback
    openai_key = os.environ.get("OPENAI_API_KEY")
    if openai_key:
        try:
            import openai

            openai.api_key = openai_key
        except Exception:
            openai = None
    else:
        openai = None

    if openai:
        try:
            resp = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "Você é um assistente que retorna um JSON com campos 'resumo' e 'video_links' (lista)."},
                    {"role": "user", "content": f"Gere um breve resumo do pedido e sugira 3 links do YouTube relacionados ao assunto: {prompt}. Retorne apenas um JSON."},
                ],
                max_tokens=400,
            )
            text = resp.choices[0].message.content
            # Attempt to parse JSON from response
            try:
                parsed = json.loads(text)
                resumo = parsed.get("resumo") or parsed.get("summary") or None
                links = parsed.get("video_links") or parsed.get("video_links") or []
                if isinstance(links, str):
                    links = [links]
                return resumo, links
            except Exception:
                # fallback to naive parsing
                pass
        except Exception:
            pass

    # Fallback simple generator
    resumo = f"Resumo gerado localmente para: {prompt}"
    query = quote_plus(prompt)
    links = [f"https://www.youtube.com/results?search_query={query}"]
    return resumo, links


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
    resumo, video_links = _generate_summary_and_links(payload.prompt)

    conn = get_connection()
    conn.execute(
        "INSERT INTO study_history (prompt, category, response, resumo, video_links) VALUES (?, ?, ?, ?, ?)",
        (payload.prompt, payload.category, response_text, resumo, json.dumps(video_links)),
    )
    conn.commit()
    conn.close()

    return AskResponse(
        resposta=response_text,
        prompt=payload.prompt,
        category=payload.category,
        resumo=resumo,
        video_links=video_links,
        saved=True,
    )


@app.get("/api/history")
def get_history() -> Dict[str, List[Dict[str, Any]]]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT id, prompt, category, response, resumo, video_links, created_at FROM study_history ORDER BY id DESC"
    ).fetchall()
    conn.close()

    items = [
        {
            "id": row["id"],
            "prompt": row["prompt"],
            "category": row["category"],
            "response": row["response"],
            "resumo": row["resumo"],
            "video_links": json.loads(row["video_links"]) if row["video_links"] else [],
            "created_at": row["created_at"],
        }
        for row in rows
    ]
    return {"items": items}
