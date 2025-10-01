from flask import Blueprint, jsonify
bp = Blueprint("results", __name__)

@bp.get("/<patient_id>")
def get_results(patient_id):
    return jsonify({
        "patient_id": patient_id,
        "risk_score": 0.42,
        "explanation": "Dummy score (prototype)"
    })
