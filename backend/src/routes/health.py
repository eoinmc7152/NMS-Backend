from flask import Blueprint, jsonify
from datetime import datetime, timezone
import os

from google.cloud import firestore
from google.oauth2 import service_account

bp = Blueprint("health", __name__)

@bp.get("/")
def health_root():
    return jsonify(status="ok", service="nms-backend"), 200

def _client():
    # Prefer explicit key path; else try ADC
    key_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS") or os.getenv("FIREBASE_KEY_PATH")
    if key_path and os.path.exists(key_path):
        creds = service_account.Credentials.from_service_account_file(key_path)
        return firestore.Client(credentials=creds, project=creds.project_id)
    return firestore.Client()

@bp.get("/firestore")
def firestore_ping():
    try:
        db = _client()
        doc_ref = db.collection("meta").document("ping")
        doc_ref.set({"ts": datetime.now(timezone.utc).isoformat()})
        doc = doc_ref.get()
        return jsonify(ok=True, firestore=doc.exists, project=db.project), 200
    except Exception as e:
        return jsonify(ok=False, firestore_error=str(e)), 500
