#!/usr/bin/env python3
"""
Elite Cockpit - SQLite-Backed Structured Memory

Queryable observation storage with FTS5 full-text search.
Designed for hook execution: fast, no external deps, fail-safe.

Database: .llm/memory.db
"""

import json
import os
import re
import sqlite3
import uuid
from datetime import datetime
from pathlib import Path


# ============================================================================
# Schema
# ============================================================================

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS sessions (
    id          TEXT PRIMARY KEY,
    started_at  TEXT NOT NULL,
    ended_at    TEXT,
    mode        TEXT,
    summary     TEXT,
    task_count  INTEGER DEFAULT 0,
    obs_count   INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS observations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  TEXT NOT NULL,
    timestamp   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    type        TEXT NOT NULL CHECK (type IN (
                    'decision', 'bugfix', 'feature', 'refactor',
                    'discovery', 'change', 'correction', 'pattern'
                )),
    title       TEXT NOT NULL,
    narrative   TEXT,
    facts       TEXT,
    concepts    TEXT,
    files_read  TEXT,
    files_mod   TEXT,
    agent       TEXT,
    source_file TEXT,
    token_est   INTEGER DEFAULT 0,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_obs_session ON observations(session_id);
CREATE INDEX IF NOT EXISTS idx_obs_type ON observations(type);
CREATE INDEX IF NOT EXISTS idx_obs_timestamp ON observations(timestamp);
CREATE INDEX IF NOT EXISTS idx_obs_agent ON observations(agent);

-- FTS5 full-text search index
CREATE VIRTUAL TABLE IF NOT EXISTS observations_fts USING fts5(
    title, narrative, facts, concepts,
    content='observations',
    content_rowid='id'
);

-- Keep FTS in sync with observations table
CREATE TRIGGER IF NOT EXISTS obs_fts_insert AFTER INSERT ON observations BEGIN
    INSERT INTO observations_fts(rowid, title, narrative, facts, concepts)
    VALUES (new.id, new.title, new.narrative, new.facts, new.concepts);
END;

CREATE TRIGGER IF NOT EXISTS obs_fts_delete AFTER DELETE ON observations BEGIN
    INSERT INTO observations_fts(observations_fts, rowid, title, narrative, facts, concepts)
    VALUES ('delete', old.id, old.title, old.narrative, old.facts, old.concepts);
END;

CREATE TRIGGER IF NOT EXISTS obs_fts_update AFTER UPDATE ON observations BEGIN
    INSERT INTO observations_fts(observations_fts, rowid, title, narrative, facts, concepts)
    VALUES ('delete', old.id, old.title, old.narrative, old.facts, old.concepts);
    INSERT INTO observations_fts(rowid, title, narrative, facts, concepts)
    VALUES (new.id, new.title, new.narrative, new.facts, new.concepts);
END;
"""


# ============================================================================
# Connection
# ============================================================================

def _get_db_path(project_root: str) -> str:
    return os.path.join(project_root, ".llm", "memory.db")


def get_connection(project_root: str) -> sqlite3.Connection:
    """Get a SQLite connection with WAL mode for concurrent access."""
    db_path = _get_db_path(project_root)
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path, timeout=5)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.row_factory = sqlite3.Row
    return conn


def init_db(project_root: str) -> None:
    """Create tables if they don't exist. Idempotent and fast."""
    conn = get_connection(project_root)
    try:
        conn.executescript(SCHEMA_SQL)
        conn.commit()
    finally:
        conn.close()


# ============================================================================
# Session Management
# ============================================================================

def create_session(project_root: str, mode: str = "light") -> str:
    """Create a new session, return session_id."""
    session_id = datetime.now().strftime("%Y%m%d-%H%M%S") + "-" + uuid.uuid4().hex[:6]
    conn = get_connection(project_root)
    try:
        conn.execute(
            "INSERT INTO sessions (id, started_at, mode) VALUES (?, ?, ?)",
            (session_id, datetime.now().isoformat(), mode)
        )
        conn.commit()
        return session_id
    finally:
        conn.close()


def end_session(project_root: str, session_id: str, summary: str = None) -> None:
    """Mark a session as ended with optional summary."""
    conn = get_connection(project_root)
    try:
        conn.execute(
            "UPDATE sessions SET ended_at = ?, summary = ?, "
            "obs_count = (SELECT COUNT(*) FROM observations WHERE session_id = ?) "
            "WHERE id = ?",
            (datetime.now().isoformat(), summary, session_id, session_id)
        )
        conn.commit()
    finally:
        conn.close()


def get_current_session_id(project_root: str) -> str | None:
    """Get the most recent open session (no ended_at)."""
    conn = get_connection(project_root)
    try:
        row = conn.execute(
            "SELECT id FROM sessions WHERE ended_at IS NULL "
            "ORDER BY started_at DESC LIMIT 1"
        ).fetchone()
        return row["id"] if row else None
    finally:
        conn.close()


def get_recent_sessions(project_root: str, limit: int = 5) -> list:
    """Get recent sessions."""
    conn = get_connection(project_root)
    try:
        rows = conn.execute(
            "SELECT * FROM sessions ORDER BY started_at DESC LIMIT ?",
            (limit,)
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


# ============================================================================
# Observation Storage
# ============================================================================

def store_observation(
    project_root: str,
    session_id: str,
    obs_type: str,
    title: str,
    narrative: str = None,
    facts: list = None,
    concepts: list = None,
    files_read: list = None,
    files_mod: list = None,
    agent: str = None,
    source_file: str = None,
) -> int:
    """Store an observation, return its id."""
    token_est = len(narrative or "") // 4
    conn = get_connection(project_root)
    try:
        cursor = conn.execute(
            "INSERT INTO observations "
            "(session_id, type, title, narrative, facts, concepts, "
            " files_read, files_mod, agent, source_file, token_est) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                session_id, obs_type, title, narrative,
                json.dumps(facts or []),
                json.dumps(concepts or []),
                json.dumps(files_read or []),
                json.dumps(files_mod or []),
                agent, source_file, token_est,
            )
        )
        conn.commit()
        return cursor.lastrowid
    finally:
        conn.close()


# ============================================================================
# Search & Retrieval
# ============================================================================

def search_observations(
    project_root: str,
    query: str,
    limit: int = 10,
    obs_type: str = None,
    agent: str = None,
) -> list:
    """Full-text search over observations."""
    conn = get_connection(project_root)
    try:
        sql = (
            "SELECT o.*, rank FROM observations o "
            "JOIN observations_fts f ON o.id = f.rowid "
            "WHERE observations_fts MATCH ? "
        )
        params = [query]

        if obs_type:
            sql += "AND o.type = ? "
            params.append(obs_type)
        if agent:
            sql += "AND o.agent = ? "
            params.append(agent)

        sql += "ORDER BY rank LIMIT ?"
        params.append(limit)

        rows = conn.execute(sql, params).fetchall()
        return [dict(r) for r in rows]
    except sqlite3.OperationalError:
        # FTS query syntax error or empty index
        return []
    finally:
        conn.close()


def get_recent_observations(
    project_root: str,
    limit: int = 20,
    obs_type: str = None,
    since: str = None,
    agent: str = None,
) -> list:
    """Get recent observations, optionally filtered."""
    conn = get_connection(project_root)
    try:
        sql = "SELECT * FROM observations WHERE 1=1 "
        params = []

        if obs_type:
            sql += "AND type = ? "
            params.append(obs_type)
        if since:
            sql += "AND timestamp >= ? "
            params.append(since)
        if agent:
            sql += "AND agent = ? "
            params.append(agent)

        sql += "ORDER BY timestamp DESC LIMIT ?"
        params.append(limit)

        rows = conn.execute(sql, params).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_session_observations(project_root: str, session_id: str) -> list:
    """Get all observations for a specific session."""
    conn = get_connection(project_root)
    try:
        rows = conn.execute(
            "SELECT * FROM observations WHERE session_id = ? ORDER BY timestamp",
            (session_id,)
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


# ============================================================================
# Progressive Disclosure — Context Injection
# ============================================================================

TYPE_ICONS = {
    "decision": "d",
    "bugfix": "b",
    "feature": "f",
    "refactor": "r",
    "discovery": "i",
    "change": "c",
    "correction": "!",
    "pattern": "p",
}


def get_context_summary(project_root: str, token_budget: int = 2000) -> str:
    """
    Build a context injection string within a token budget.
    Three layers of progressive disclosure:
      1. Recent session summaries (cheap)
      2. Recent observation titles (medium)
      3. Full correction/pattern details (high value)
    """
    lines = []
    tokens_used = 0

    # Layer 1: Recent session summaries (~30% budget)
    sessions = get_recent_sessions(project_root, limit=5)
    completed = [s for s in sessions if s.get("ended_at")]
    if completed:
        lines.append("### Recent Sessions")
        for s in completed:
            date = (s.get("started_at") or "")[:10]
            mode = s.get("mode") or "?"
            summary = s.get("summary") or "no summary"
            obs = s.get("obs_count") or 0
            line = f"- [{date}] {mode} ({obs} obs): {summary}"
            cost = len(line) // 4
            if tokens_used + cost > token_budget * 0.3:
                break
            lines.append(line)
            tokens_used += cost
        lines.append("")

    # Layer 2: Recent observation titles (~40% budget)
    recent = get_recent_observations(project_root, limit=30)
    if recent:
        lines.append("### Recent Observations")
        for obs in recent:
            icon = TYPE_ICONS.get(obs.get("type", ""), "?")
            title = obs.get("title", "")[:80]
            agent = obs.get("agent") or ""
            suffix = f" ({agent})" if agent else ""
            line = f"- [{icon}] {title}{suffix}"
            cost = len(line) // 4
            if tokens_used + cost > token_budget * 0.7:
                break
            lines.append(line)
            tokens_used += cost
        lines.append("")

    # Layer 3: Full details for corrections and patterns (~30% budget)
    corrections = get_recent_observations(project_root, limit=5, obs_type="correction")
    patterns = get_recent_observations(project_root, limit=5, obs_type="pattern")
    high_value = corrections + patterns
    if high_value:
        lines.append("### Active Corrections & Patterns")
        for obs in high_value:
            narrative = (obs.get("narrative") or "")[:200]
            detail = f"- **{obs.get('title', '')}**: {narrative}"
            cost = len(detail) // 4
            if tokens_used + cost > token_budget:
                break
            lines.append(detail)
            tokens_used += cost

    return "\n".join(lines)


# ============================================================================
# Privacy
# ============================================================================

def strip_private(text: str) -> str:
    """Remove <private>...</private> blocks before storage."""
    if not text:
        return text
    return re.sub(r"<private>.*?</private>", "[REDACTED]", text, flags=re.DOTALL)
