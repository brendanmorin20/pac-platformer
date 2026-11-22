"""
Server-side level loading and validation.

The actual game simulation (physics, collision, scoring) runs client-side
in JavaScript for a smooth 60 FPS loop. This module's job is narrower:
read level JSON off disk, make sure it is well-formed before it ever
reaches the browser, and expose small helpers the routes layer can call.
"""
from __future__ import annotations

import json
import os

LEVELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "levels")

# How many levels ship with the game. Keep in sync with the files in levels/.
TOTAL_LEVELS = 3

REQUIRED_TOP_LEVEL_KEYS = {
    "name", "width", "height", "gravity", "playerStart",
    "platforms", "hazards", "coins", "goal",
}

REQUIRED_RECT_KEYS = {"x", "y", "w", "h"}
REQUIRED_POINT_KEYS = {"x", "y"}


class LevelValidationError(ValueError):
    """Raised when a level JSON file is missing required fields or malformed."""


def _require_keys(obj: dict, required: set, context: str) -> None:
    missing = required - obj.keys()
    if missing:
        raise LevelValidationError(f"{context} missing keys: {sorted(missing)}")


def validate_level(data: dict) -> dict:
    """Validate a level dict's shape. Returns the data unchanged if valid.

    Raises LevelValidationError with a human-readable message otherwise.
    This keeps malformed level files from ever reaching the client as a
    confusing runtime JS error.
    """
    if not isinstance(data, dict):
        raise LevelValidationError("Level data must be a JSON object")

    _require_keys(data, REQUIRED_TOP_LEVEL_KEYS, "Level")

    if not isinstance(data["width"], (int, float)) or data["width"] <= 0:
        raise LevelValidationError("Level 'width' must be a positive number")
    if not isinstance(data["height"], (int, float)) or data["height"] <= 0:
        raise LevelValidationError("Level 'height' must be a positive number")
    if not isinstance(data["gravity"], (int, float)) or data["gravity"] <= 0:
        raise LevelValidationError("Level 'gravity' must be a positive number")

    _require_keys(data["playerStart"], REQUIRED_POINT_KEYS, "playerStart")
    _require_keys(data["goal"], REQUIRED_RECT_KEYS, "goal")

    if not isinstance(data["platforms"], list):
        raise LevelValidationError("'platforms' must be a list")
    for i, plat in enumerate(data["platforms"]):
        _require_keys(plat, REQUIRED_RECT_KEYS, f"platforms[{i}]")

    for mp in data.get("movingPlatforms", []):
        _require_keys(mp, REQUIRED_RECT_KEYS | {"axis", "range", "speed"}, "movingPlatforms entry")

    if not isinstance(data["hazards"], list):
        raise LevelValidationError("'hazards' must be a list")
    for i, hz in enumerate(data["hazards"]):
        _require_keys(hz, REQUIRED_RECT_KEYS, f"hazards[{i}]")

    if not isinstance(data["coins"], list):
        raise LevelValidationError("'coins' must be a list")
    for i, coin in enumerate(data["coins"]):
        _require_keys(coin, REQUIRED_POINT_KEYS, f"coins[{i}]")

    data.setdefault("coinsRequired", 0)
    data.setdefault("checkpoints", [])
    data.setdefault("movingPlatforms", [])

    return data


def load_level(level_number: int) -> dict:
    """Load, validate, and return level `level_number` (1-indexed).

    Raises FileNotFoundError if the level doesn't exist, or
    LevelValidationError if its JSON is malformed.
    """
    path = os.path.join(LEVELS_DIR, f"level{level_number}.json")
    if not os.path.isfile(path):
        raise FileNotFoundError(f"No such level: {level_number}")

    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    return validate_level(data)


def level_exists(level_number: int) -> bool:
    return 1 <= level_number <= TOTAL_LEVELS