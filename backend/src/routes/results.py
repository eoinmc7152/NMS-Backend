from flask import Blueprint, jsonify, request
from src.services.firebase import list_results, get_result, update_result, delete_result
from src.utils.auth import require_api_key

bp = Blueprint("results", __name__)

@bp.get("/")
def list_results_route():
    patient_id = request.args.get("patientId")

    # clamp limit 1..100
    try:
        limit = int(request.args.get("limit", 20))
    except ValueError:
        limit = 20
    limit = max(1, min(limit, 100))

    cursor = request.args.get("cursorDoc")  # last document ID from previous page
    items, next_cursor = list_results(
        patient_id=patient_id, limit=limit, cursor_doc_id=cursor
    )
    return jsonify(results=items, nextCursor=next_cursor), 200

@bp.get("/<result_id>")
def get_result_route(result_id: str):
    item = get_result(result_id)
    if item is None:
        return jsonify(ok=False, error="Not found"), 404
    return jsonify(ok=True, data=item), 200

@bp.delete("/<result_id>")
@require_api_key
def delete_result_route(result_id: str):
    ok = delete_result(result_id)
    if not ok:
        return jsonify(ok=False, error="Not found"), 404
    return "", 204

@bp.put("/<result_id>")
@require_api_key
def update_result_route(result_id: str):
    payload = request.get_json(silent=True) or {}
    ok = update_result(result_id, payload)
    if not ok:
        return jsonify(ok=False, error="Not found"), 404
    return jsonify(ok=True), 200
