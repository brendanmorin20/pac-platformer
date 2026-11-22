"""
Pac-Platformer — application entry point.

Run with:  python app.py
Then open: http://127.0.0.1:5000
"""
from backend.routes import create_app

app = create_app()

if __name__ == "__main__":
    # debug=True is fine for local development; disable before any real deployment.
    app.run(host="127.0.0.1", port=5000, debug=True)