# src/services/app.py
import os
import re
from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS

# Load .env for local dev. (Cloud Run uses env vars you set during deploy.)
load_dotenv()

from src.routes.health import bp as health_bp
from src.routes.questionnaire import bp as questionnaire_bp
from src.routes.results import bp as results_bp

app = Flask(__name__)

# CORS: allow local dev frontends + any Cloud Run URL (*.a.run.app)
CORS(app, resources={
    r"/*": {
        "origins": [
            "http://localhost:3000",
            "http://localhost:5173",
            re.compile(r"^https://.*\.a\.run\.app$"),
        ]
    }
})

# Blueprints
app.register_blueprint(health_bp, url_prefix="/health")
app.register_blueprint(questionnaire_bp, url_prefix="/patient/questionnaire")
app.register_blueprint(results_bp, url_prefix="/results")

# JSON error envelopes
@app.errorhandler(400)
def _bad_request(e):
    return jsonify(ok=False, error=str(e)), 400

@app.errorhandler(404)
def _not_found(e):
    return jsonify(ok=False, error="Not Found"), 404

@app.errorhandler(500)
def _server_error(e):
    return jsonify(ok=False, error="Internal Server Error"), 500

if __name__ == "__main__":
    # Local dev server
    app.run(debug=True, port=5000)
