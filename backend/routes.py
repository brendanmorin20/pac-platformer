"""
backend/routes.py — Flask route definitions and the application factory.
"""
import os

from flask import Flask, jsonify, render_template, request

from .game_logic import (
    TOTAL_LEVELS,
    LevelValidationError,
    level_exists,
    load_level,
)
from .score_manager import ScoreValidationError, get_top_scores, submit_score

# backend/routes.py lives inside backend/, so go up one directory to reach
# the project root, where the real templates/ and static/ folders are.
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def create_app():
    app = Flask(
        __name__,
        template_folder=os.path.join(BASE_DIR, "templates"),
        static_folder=os.path.join(BASE_DIR, "static"),
    )

    @app.route("/")
    def index():
        return render_template("index.html", total_levels=TOTAL_LEVELS)

    @app.route("/api/levels/<int:level_number>")
    def get_level(level_number):
        if not level_exists(level_number):
            return jsonify({"error": "Level not found"}), 404
        try:
            data = load_level(level_number)
        except LevelValidationError:
            return jsonify({"error": "Level data is invalid"}), 500
        except FileNotFoundError:
            return jsonify({"error": "Level not found"}), 404
        return jsonify(data)

    @app.route("/api/scores")
    def get_scores():
        return jsonify(get_top_scores())

    @app.route("/api/score", methods=["POST"])
    def post_score():
        payload = request.get_json(silent=True)
        if payload is None:
            return jsonify({"error": "Request body must be JSON"}), 400
        try:
            result = submit_score(payload)
        except ScoreValidationError as exc:
            return jsonify({"error": str(exc)}), 400
        return jsonify(result), 201

    @app.route("/healthz")
    def healthz():
        return jsonify({"status": "ok"})

    @app.errorhandler(404)
    def not_found(_err):
        return jsonify({"error": "Not found"}), 404

    @app.errorhandler(500)
    def server_error(_err):
        return jsonify({"error": "Internal server error"}), 500

    return app