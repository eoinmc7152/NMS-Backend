# src/services/firebase.py
from __future__ import annotations
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime, timezone
import os
import uuid

from google.cloud import firestore
from google.oauth2 import service_account
from google.api_core.exceptions import FailedPrecondition

# ---- Client init -----------------------------------------------------------

_CLIENT: Optional[firestore.Client] = None
COLLECTION_RESULTS = os.getenv("FIRESTORE_COLLECTION_RESULTS", "results")

def get_client() -> firestore.Client:
    """Singleton Firestore client. Uses explicit key if set, else ADC."""
    global _CLIENT
    if _CLIENT is None:
        key_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS") or os.getenv("FIREBASE_KEY_PATH")
        if key_path and os.path.exists(key_path):
            creds = service_account.Credentials.from_service_account_file(key_path)
            _CLIENT = firestore.Client(credentials=creds, project=creds.project_id)
        else:
            _CLIENT = firestore.Client()  # Application Default Credentials
    return _CLIENT

# ---- App API ---------------------------------------------------------------

def save_questionnaire(patient_id: str, payload: Dict[str, Any], risk: Dict[str, Any]) -> str:
    """Persist a questionnaire submission and computed risk. Returns result_id."""
    if not patient_id:
        raise ValueError("patient_id is required")

    result_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    doc = {
        "id": result_id,
        "patientId": patient_id,
        "answers": payload.get("answers", []),
        "risk": risk,
        "createdAt": now,  # ISO 8601 UTC string; sorts lexicographically
    }

    db = get_client()
    db.collection(COLLECTION_RESULTS).document(result_id).set(doc)
    return result_id

def list_results(
    patient_id: Optional[str] = None,
    limit: int = 20,
    cursor_doc_id: Optional[str] = None
) -> Tuple[List[Dict[str, Any]], Optional[str]]:
    """
    List results, optionally filtered by patientId, newest first.
    Supports simple pagination via cursor_doc_id (last document ID from previous page).
    Returns (items, next_cursor_doc_id_or_None).
    """
    db = get_client()
    col = db.collection(COLLECTION_RESULTS)

    # Preferred, index-backed path
    try:
        if patient_id:
            q = col.where("patientId", "==", patient_id).order_by(
                "createdAt", direction=firestore.Query.DESCENDING
            )
        else:
            q = col.order_by("createdAt", direction=firestore.Query.DESCENDING)

        if cursor_doc_id:
            snap = col.document(cursor_doc_id).get()
            if snap.exists:
                q = q.start_after(snap)

        q = q.limit(limit)
        docs = list(q.stream())

        items: List[Dict[str, Any]] = []
        for d in docs:
            data = d.to_dict() or {}
            data.setdefault("id", d.id)
            items.append(data)

        next_cursor = items[-1]["id"] if len(items) == limit else None
        return items, next_cursor

    except FailedPrecondition:
        # Fallback while composite index (patientId+createdAt) is building.
        if not patient_id:
            return [], None

        docs_iter = col.where("patientId", "==", patient_id).stream()
        all_items: List[Dict[str, Any]] = []
        for d in docs_iter:
            data = d.to_dict() or {}
            data.setdefault("id", d.id)
            all_items.append(data)

        # Sort newest-first by createdAt
        all_items.sort(key=lambda x: x.get("createdAt", ""), reverse=True)

        # Cursor by last doc id
        start_idx = 0
        if cursor_doc_id:
            for i, it in enumerate(all_items):
                if it.get("id") == cursor_doc_id:
                    start_idx = i + 1
                    break

        page = all_items[start_idx:start_idx + limit]
        next_cursor = page[-1]["id"] if len(page) == limit else None
        return page, next_cursor

def get_result(result_id: str) -> Optional[Dict[str, Any]]:
    """Fetch one result by ID."""
    db = get_client()
    snap = db.collection(COLLECTION_RESULTS).document(result_id).get()
    if not snap.exists:
        return None
    data = snap.to_dict() or {}
    data.setdefault("id", snap.id)
    return data

def delete_result(result_id: str) -> bool:
    db = get_client()
    ref = db.collection(COLLECTION_RESULTS).document(result_id)
    if not ref.get().exists:
        return False
    ref.delete()
    return True

def update_result(result_id: str, data: Dict[str, Any]) -> bool:
    db = get_client()
    ref = db.collection(COLLECTION_RESULTS).document(result_id)
    if not ref.get().exists:
        return False
    # Only allow certain fields to be updated (adjust as needed)
    allowed = {}
    if "answers" in data: allowed["answers"] = data["answers"]
    if "risk" in data: allowed["risk"] = data["risk"]
    if not allowed: return True
    ref.update(allowed)
    return True
