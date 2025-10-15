from flask import Flask, jsonify
from flask_cors import CORS
from src.routes.health import bp as health_bp
from src.routes.questionnaire import bp as questionnaire_bp
from src.routes.results import bp as results_bp

app = Flask(__name__)

# Allow your common local frontends
CORS(app, resources={r"/*": {"origins": ["http://localhost:3000", "http://localhost:5173"]}})

# Blueprints
app.register_blueprint(health_bp, url_prefix="/health")
app.register_blueprint(questionnaire_bp, url_prefix="/patient/questionnaire")
app.register_blueprint(results_bp, url_prefix="/results")

# Friendly JSON errors
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
    app.run(debug=True, port=5000)
