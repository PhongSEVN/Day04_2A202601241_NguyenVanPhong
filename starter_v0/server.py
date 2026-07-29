from __future__ import annotations

import csv
import json
import os
import uuid
from pathlib import Path
from typing import Any

from flask import Flask, jsonify, request

from chat import now_iso, run_model_tool_loop
from env_loader import load_lab_env
from providers import make_provider
from tools import load_tool_declarations, to_openai_tools
from versioning import artifact_version_dict, build_artifact_version

ROOT = Path(__file__).parent
ARTIFACTS_DIR = ROOT / "artifacts"
SYSTEM_PROMPT_PATH = ARTIFACTS_DIR / "system_prompt.md"
TOOLS_PATH = ARTIFACTS_DIR / "tools.yaml"
VERSION_LOG_PATH = ARTIFACTS_DIR / "version_log.csv"
SESSIONS_DIR = ROOT / "transcripts"

load_lab_env(ROOT)

PROVIDER_NAME = os.getenv("LLM_PROVIDER", "openrouter")
HISTORY_WINDOW = 5
DEFAULT_MAX_TOOL_ROUNDS = 4

app = Flask(__name__)
_provider = make_provider(PROVIDER_NAME)

# Notable tool calls worth remembering across turns, keyed by tool name.
MEMORY_BUILDERS = {
    "clarify": lambda args: f'Đã hỏi người dùng: "{args.get("question", "")}"',
    "papers": lambda args: f'Đã tìm bài báo với từ khóa: "{args.get("query", "")}"',
    "paper_text": lambda args: f'Đã đọc nội dung bài báo: {args.get("arxiv_url", "")}',
    "lookup": lambda args: f'Đã tra cứu: "{args.get("query", "")}"',
    "fetch": lambda args: f"Đã lấy nội dung từ URL: {args.get('url', '')}",
    "policy": lambda args: f'Đã tìm chính sách nội bộ: "{args.get("query", "")}"',
}


def current_version_label() -> str:
    if not VERSION_LOG_PATH.exists():
        return "dev"
    with VERSION_LOG_PATH.open(encoding="utf-8", newline="") as file:
        rows = list(csv.DictReader(file))
    return rows[-1]["version"] if rows else "dev"


def current_artifact_version() -> dict[str, str]:
    version = build_artifact_version(current_version_label(), SYSTEM_PROMPT_PATH, TOOLS_PATH)
    return artifact_version_dict(version)


def tool_declarations() -> list[dict[str, Any]]:
    return load_tool_declarations(TOOLS_PATH)


def session_path(session_id: str) -> Path:
    safe_id = "".join(ch for ch in session_id if ch.isalnum() or ch in "-_")
    return SESSIONS_DIR / f"ui_{safe_id}.transcript.json"


def load_session(session_id: str) -> dict[str, Any] | None:
    path = session_path(session_id)
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def save_session(session: dict[str, Any]) -> None:
    SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
    session["updated_at"] = now_iso()
    session_path(session["session_id"]).write_text(
        json.dumps(session, ensure_ascii=False, indent=2, default=str), encoding="utf-8"
    )


def new_session(session_id: str, title: str) -> dict[str, Any]:
    return {
        "session_id": session_id,
        "title": title[:80],
        "provider": PROVIDER_NAME,
        "model": _provider.default_model,
        **current_artifact_version(),
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "turns": [],
        "memories": [],
    }


def history_messages(session: dict[str, Any]) -> list[dict[str, str]]:
    pairs: list[dict[str, str]] = []
    for turn in session["turns"][-HISTORY_WINDOW:]:
        pairs.append({"role": "user", "content": turn["user"]})
        if turn.get("assistant_text"):
            pairs.append({"role": "assistant", "content": turn["assistant_text"]})
    return pairs


def enrich_tool_events(turn: dict[str, Any]) -> None:
    """Gắn `round` + `status` + `error` vào từng tool event.

    README yêu cầu trace hiển thị: tên tool, args, round/status, result/error.
    `run_model_tool_loop` chỉ trả về `tool`/`args`/`result`, và nó append cùng một
    dict vào cả `rounds[].tool_results` lẫn `tool_events` phẳng — nên mutate ở đây
    là cả hai view đều có, không cần đụng vào `chat.py` (file dùng chung với eval).
    """
    for round_record in turn.get("rounds") or []:
        for event in round_record.get("tool_results") or []:
            result = event.get("result")
            error_name = result.get("error") if isinstance(result, dict) else None
            awaiting = isinstance(result, dict) and result.get("awaiting_user")
            event["round"] = round_record.get("round")
            if error_name:
                event["status"] = "error"
                event["error"] = f"{error_name}: {result.get('message', '')}".rstrip(": ")
            else:
                event["status"] = "awaiting_user" if awaiting else "ok"
                event["error"] = None


def extract_memories(tool_events: list[dict[str, Any]]) -> list[str]:
    notes: list[str] = []
    for event in tool_events:
        builder = MEMORY_BUILDERS.get(event.get("tool", ""))
        if not builder:
            continue
        note = builder(event.get("args", {}) or {})
        if note:
            notes.append(note)
    return notes


@app.get("/api/health")
def health():
    has_api_key = bool(os.getenv(_provider.api_key_env))
    return jsonify({
        "status": "ok" if has_api_key else "degraded",
        "provider": PROVIDER_NAME,
        "model": _provider.default_model,
        "has_api_key": has_api_key,
        "tools": [item["name"] for item in tool_declarations()],
        "artifact_version": current_artifact_version(),
    })


@app.get("/api/tools")
def list_tools():
    out = []
    for item in tool_declarations():
        props = (item.get("parameters") or {}).get("properties", {})
        out.append({
            "name": item["name"],
            "description": item.get("description", ""),
            "input_schema": {key: value.get("description", "") for key, value in props.items()},
            "write": item["name"] == "send",
        })
    return jsonify(out)


@app.get("/api/sessions")
def list_sessions():
    SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
    items = []
    for path in SESSIONS_DIR.glob("ui_*.transcript.json"):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        items.append({
            "session_id": data["session_id"],
            "title": data.get("title") or "Cuộc trò chuyện",
            "created_at": data.get("created_at"),
            "updated_at": data.get("updated_at"),
            "turn_count": len(data.get("turns", [])),
        })
    items.sort(key=lambda item: item["updated_at"] or "", reverse=True)
    return jsonify(items)


@app.get("/api/sessions/<session_id>")
def get_session(session_id: str):
    session = load_session(session_id)
    if not session:
        return jsonify({"error": "not_found"}), 404
    return jsonify(session)


@app.delete("/api/sessions/<session_id>")
def delete_session(session_id: str):
    path = session_path(session_id)
    if path.exists():
        path.unlink()
    return jsonify({"ok": True})


@app.post("/api/chat")
def chat():
    body = request.get_json(force=True, silent=True) or {}
    message = (body.get("message") or "").strip()
    if not message:
        return jsonify({"error": "message trống"}), 400

    session_id = body.get("session_id") or uuid.uuid4().hex[:12]
    session = load_session(session_id) or new_session(session_id, message)

    declarations = tool_declarations()
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT_PATH.read_text(encoding="utf-8")},
        *history_messages(session),
        {"role": "user", "content": message},
    ]

    turn: dict[str, Any] = {
        "turn_index": len(session["turns"]) + 1,
        "started_at": now_iso(),
        "user": message,
    }

    try:
        result = run_model_tool_loop(
            provider=_provider,
            messages=messages,
            tools=to_openai_tools(declarations),
            model=None,
            max_tool_rounds=int(body.get("max_tool_rounds") or DEFAULT_MAX_TOOL_ROUNDS),
        )
        turn.update(result)
    except Exception as exc:  # provider/network failure — surface it to the UI, keep the session usable
        turn.update({
            "status": "provider_error",
            "assistant_text": None,
            "rounds": [],
            "tool_events": [],
            "error": f"{type(exc).__name__}: {exc}",
        })

    enrich_tool_events(turn)
    turn["ended_at"] = now_iso()
    session["turns"].append(turn)

    seen = set(session.get("memories", []))
    for note in extract_memories(turn.get("tool_events", [])):
        if note not in seen:
            session["memories"].append(note)
            seen.add(note)
    session["memories"] = session["memories"][-30:]

    save_session(session)

    return jsonify({
        "session_id": session_id,
        "title": session["title"],
        "status": turn.get("status"),
        "assistant_text": turn.get("assistant_text"),
        "error": turn.get("error"),
        "rounds": turn.get("rounds", []),
        "tool_events": turn.get("tool_events", []),
        "memories": session["memories"],
        "artifact_version": current_artifact_version(),
    })


if __name__ == "__main__":
    app.run(port=8000, debug=True)
