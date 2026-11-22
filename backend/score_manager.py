"""
Persists and ranks high scores in a flat JSON file (scores.json).

No database needed for a project this size — a small JSON file next to
the app is simple, inspectable, and git-ignored so every player gets a
clean slate on clone.
"""
from __future__ import annotations

import json
import os
import re
import threading

SCORES_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "scores.json")
MAX_SCORES = 10
MAX_NAME_LENGTH = 16

_lock = threading.Lock()


class ScoreValidationError(ValueError):
    pass


def _read_scores() -> list:
    if not os.path.isfile(SCORES_PATH):
        return []
    try:
        with open(SCORES_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                return data
            return []
    except (json.JSONDecodeError, OSError):
        return []


def _write_scores(scores: list) -> None:
    with open(SCORES_PATH, "w", encoding="utf-8") as f:
        json.dump(scores, f, indent=2)


def get_top_scores(limit: int = MAX_SCORES) -> list:
    scores = _read_scores()
    scores.sort(key=lambda s: s.get("score", 0), reverse=True)
    return scores[:limit]


def _sanitize_name(name: str) -> str:
    name = (name or "Player").strip()
    # Strip anything that isn't alphanumeric, space, dash or underscore.
    name = re.sub(r"[^A-Za-z0-9 _-]", "", name)
    name = name[:MAX_NAME_LENGTH].strip()
    return name or "Player"


def submit_score(payload: dict) -> dict:
    """Validate and persist a submitted score.

    Expected payload: {"name": str, "score": int, "level": int}
    Returns {"rank": int, "saved": True} on success.
    Raises ScoreValidationError on bad input.
    """
    if not isinstance(payload, dict):
        raise ScoreValidationError("Payload must be a JSON object")

    score = payload.get("score")
    level = payload.get("level")

    if not isinstance(score, (int, float)) or isinstance(score, bool):
        raise ScoreValidationError("'score' must be a number")
    if score < 0 or score > 10_000_000:
        raise ScoreValidationError("'score' out of plausible range")
    if not isinstance(level, int) or isinstance(level, bool) or not (1 <= level <= 3):
        raise ScoreValidationError("'level' must be an integer between 1 and 3")

    name = _sanitize_name(payload.get("name", "Player"))

    entry = {"name": name, "score": int(score), "level": level}

    with _lock:
        scores = _read_scores()
        scores.append(entry)
        scores.sort(key=lambda s: s.get("score", 0), reverse=True)
        scores = scores[:MAX_SCORES]
        _write_scores(scores)
        rank = next((i + 1 for i, s in enumerate(scores) if s is entry), len(scores))

    return {"rank": rank, "saved": True}