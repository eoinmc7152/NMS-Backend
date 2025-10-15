from flask import Blueprint, request, jsonify
from werkzeug.exceptions import BadRequest
from src.utils.auth import require_api_key
from src.services.risk_engine import score_risk
from src.services.firebase import save_questionnaire

bp = Blueprint("questionnaire", __name__)

@bp.get("/")
def questionnaire_ping():
    return jsonify(ok=True, where="questionnaire"), 200

@bp.post("/")
@require_api_key
def questionnaire_submit():
    payload = request.get_json(silent=True)
    if not payload:
        raise BadRequest("Expected JSON body")

    patient_id = payload.get("patientId")
    answers = payload.get("answers")

    # Basic validation
    if not isinstance(patient_id, str) or not patient_id.strip():
        raise BadRequest("Missing or invalid field: patientId (string required)")
    if not isinstance(answers, list) or any(
        not isinstance(x, dict) or "q" not in x or "value" not in x
        for x in answers
    ):
        raise BadRequest("answers must be a list of {q, value} objects")

    # Compute a risk score
    risk = score_risk(answers)

    # Persist and return the new resource location
    result_id = save_questionnaire(patient_id, payload, risk)

    resp = jsonify(ok=True, resultId=result_id, patientId=patient_id, risk=risk)
    resp.status_code = 201
    resp.headers["Location"] = f"/results/{result_id}"
    return resp
