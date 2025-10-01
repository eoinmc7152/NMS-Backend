from flask import Blueprint, request, jsonify
bp = Blueprint("questionnaire", __name__)

@bp.post("/")
def submit_questionnaire():
    body = request.get_json(force=True)
    return jsonify({"status": "stored", "dummy_risk_score": 0.42})
