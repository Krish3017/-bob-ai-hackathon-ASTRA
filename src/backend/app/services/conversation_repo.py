"""
NaviOps Copilot — Conversation Repository

Handles all database reads and writes for copilot_conversations and
copilot_messages.  Uses the existing psycopg connection from PortRepository
so no duplicate connection logic is introduced.

All writes are guarded: if the database is unavailable the methods raise
ConversationDBError so the caller can decide how to handle the failure.
Ownership is always verified server-side — user_id is never trusted from
the frontend.
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from app.core.database import port_repo, clean_row

logger = logging.getLogger("naviops.copilot.conversations")


class ConversationDBError(Exception):
    """Raised when a database operation on conversation tables fails."""


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _conn():
    """Return a live psycopg connection or raise ConversationDBError."""
    try:
        c = port_repo.get_connection()
        if c is None:
            raise ConversationDBError("Database connection is not available.")
        return c
    except ConversationDBError:
        raise
    except Exception as exc:
        raise ConversationDBError(f"Could not acquire database connection: {exc}") from exc


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _generate_title(first_message: str) -> str:
    """
    Derive a short, safe title from the user's first message.
    Truncates to 60 chars, strips newlines — no LLM call required.
    """
    cleaned = " ".join(first_message.split())  # collapse whitespace
    if len(cleaned) <= 60:
        return cleaned or "New conversation"
    # Truncate at last word boundary before 60 chars
    truncated = cleaned[:57]
    last_space = truncated.rfind(" ")
    if last_space > 30:
        truncated = truncated[:last_space]
    return truncated + "…"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def create_conversation(user_id: str, title: str = "New conversation") -> Dict[str, Any]:
    """
    Insert a new copilot_conversations row for the given user.
    Returns the created row as a dict.
    Raises ConversationDBError on failure.
    """
    conn = _conn()
    conv_id = str(uuid.uuid4())
    now = _now()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO copilot_conversations (id, user_id, title, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, user_id, title, created_at, updated_at
                """,
                (conv_id, user_id, title[:200], now, now),
            )
            row = cur.fetchone()
            return clean_row(dict(row))
    except Exception as exc:
        logger.error("create_conversation failed | user=%s | error=%s", user_id, exc)
        raise ConversationDBError(f"Failed to create conversation: {exc}") from exc


def get_conversation(conversation_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetch a single conversation row only if it belongs to user_id.
    Returns None if not found or not owned — caller returns 404.
    """
    conn = _conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, user_id, title, created_at, updated_at
                FROM copilot_conversations
                WHERE id = %s AND user_id = %s
                """,
                (conversation_id, user_id),
            )
            row = cur.fetchone()
            return clean_row(dict(row)) if row else None
    except Exception as exc:
        logger.error("get_conversation failed | conv=%s | error=%s", conversation_id, exc)
        raise ConversationDBError(f"Failed to fetch conversation: {exc}") from exc


def list_conversations(user_id: str, limit: int = 30) -> List[Dict[str, Any]]:
    """
    Return conversation summaries for a user, most-recently-updated first.
    Does NOT include message bodies — lightweight list only.
    """
    conn = _conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, user_id, title, created_at, updated_at
                FROM copilot_conversations
                WHERE user_id = %s
                ORDER BY updated_at DESC
                LIMIT %s
                """,
                (user_id, min(limit, 100)),
            )
            rows = cur.fetchall()
            return [clean_row(dict(r)) for r in rows]
    except Exception as exc:
        logger.error("list_conversations failed | user=%s | error=%s", user_id, exc)
        raise ConversationDBError(f"Failed to list conversations: {exc}") from exc


def update_conversation_title(conversation_id: str, user_id: str, title: str) -> bool:
    """
    Update the title of a conversation owned by user_id.
    Returns True on success, False if not found/owned.
    """
    conn = _conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE copilot_conversations
                SET title = %s, updated_at = %s
                WHERE id = %s AND user_id = %s
                """,
                (title[:200], _now(), conversation_id, user_id),
            )
            return cur.rowcount > 0
    except Exception as exc:
        logger.error("update_conversation_title failed | conv=%s | error=%s", conversation_id, exc)
        raise ConversationDBError(f"Failed to update conversation title: {exc}") from exc


def touch_conversation(conversation_id: str) -> None:
    """Bump updated_at on the conversation after a new message is saved."""
    conn = _conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE copilot_conversations SET updated_at = %s WHERE id = %s",
                (_now(), conversation_id),
            )
    except Exception as exc:
        # Non-fatal: log and continue — the message was already saved
        logger.warning("touch_conversation failed | conv=%s | error=%s", conversation_id, exc)


def delete_conversation(conversation_id: str, user_id: str) -> bool:
    """
    Delete a conversation and all its messages (CASCADE) only if owned by user_id.
    Returns True on success, False if not found/owned.
    """
    conn = _conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM copilot_conversations WHERE id = %s AND user_id = %s",
                (conversation_id, user_id),
            )
            return cur.rowcount > 0
    except Exception as exc:
        logger.error("delete_conversation failed | conv=%s | error=%s", conversation_id, exc)
        raise ConversationDBError(f"Failed to delete conversation: {exc}") from exc


# ---------------------------------------------------------------------------
# Messages
# ---------------------------------------------------------------------------

def add_message(
    conversation_id: str,
    role: str,
    content: str,
) -> Dict[str, Any]:
    """
    Insert a single message into copilot_messages.
    role must be 'user' or 'assistant'.
    Raises ConversationDBError on failure.
    """
    if role not in ("user", "assistant"):
        raise ValueError(f"Invalid role: {role!r}. Must be 'user' or 'assistant'.")
    conn = _conn()
    msg_id = str(uuid.uuid4())
    now = _now()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO copilot_messages (id, conversation_id, role, content, created_at)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, conversation_id, role, content, created_at
                """,
                (msg_id, conversation_id, role, content, now),
            )
            row = cur.fetchone()
            return clean_row(dict(row))
    except Exception as exc:
        logger.error(
            "add_message failed | conv=%s | role=%s | error=%s",
            conversation_id, role, exc,
        )
        raise ConversationDBError(f"Failed to save message: {exc}") from exc


def get_messages(conversation_id: str, limit: int = 200) -> List[Dict[str, Any]]:
    """
    Return messages for a conversation in chronological order.
    Ownership is checked at the conversation level before calling this.
    """
    conn = _conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, conversation_id, role, content, created_at
                FROM copilot_messages
                WHERE conversation_id = %s
                ORDER BY created_at ASC
                LIMIT %s
                """,
                (conversation_id, min(limit, 500)),
            )
            rows = cur.fetchall()
            return [clean_row(dict(r)) for r in rows]
    except Exception as exc:
        logger.error("get_messages failed | conv=%s | error=%s", conversation_id, exc)
        raise ConversationDBError(f"Failed to fetch messages: {exc}") from exc


def get_history_for_groq(conversation_id: str, max_turns: int = 10) -> List[Dict[str, str]]:
    """
    Return the last `max_turns * 2` messages as a simple list of
    {"role": "user"|"assistant", "content": "..."} dicts for injection
    into the Groq message thread.  Oldest first.
    """
    conn = _conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT role, content
                FROM copilot_messages
                WHERE conversation_id = %s
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (conversation_id, max_turns * 2),
            )
            rows = cur.fetchall()
            # Reverse to chronological order
            return [{"role": r["role"], "content": r["content"]} for r in reversed(rows)]
    except Exception as exc:
        logger.warning(
            "get_history_for_groq failed | conv=%s | error=%s — using empty history",
            conversation_id, exc,
        )
        return []


# ---------------------------------------------------------------------------
# Migration helper
# ---------------------------------------------------------------------------

def ensure_tables_exist() -> bool:
    """
    Idempotently create copilot_conversations and copilot_messages if they
    do not exist yet.  Called once at application startup.
    Returns True if DB was reachable, False otherwise.
    """
    if not port_repo.is_connected:
        return False
    try:
        conn = _conn()
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS copilot_conversations (
                    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    title       VARCHAR(200) NOT NULL DEFAULT 'New conversation',
                    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_copilot_conversations_user_id
                    ON copilot_conversations(user_id);
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_copilot_conversations_updated_at
                    ON copilot_conversations(updated_at DESC);
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS copilot_messages (
                    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    conversation_id     UUID NOT NULL
                                        REFERENCES copilot_conversations(id) ON DELETE CASCADE,
                    role                VARCHAR(20) NOT NULL
                                        CHECK (role IN ('user', 'assistant')),
                    content             TEXT NOT NULL,
                    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_copilot_messages_conversation_id
                    ON copilot_messages(conversation_id);
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_copilot_messages_created_at
                    ON copilot_messages(conversation_id, created_at ASC);
            """)
        logger.info("Copilot conversation tables verified/created.")
        return True
    except Exception as exc:
        logger.warning("ensure_tables_exist failed: %s — persistence unavailable.", exc)
        return False
