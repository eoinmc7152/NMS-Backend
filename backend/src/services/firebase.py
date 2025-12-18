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


# ---- Helpers ---------------------------------------------------------------

def _now_iso_utc() -> str:
    return datetime.now(timezone.utc).isoformat()


def _extract_age(answers: List[Dict[str, Any]]) -> Optional[int]:
    """
    Find age from answers where q == 'age' (case-insensitive).
    Returns int or None.
    """
    for a in answers:
        q = (a.get("q") or "").strip().lower()
        if q == "age":
            v = a.get("value")
            try:
                return int(v)
            except (TypeError, ValueError):
                return None
    return None


def _truthy(v: Any) -> bool:
    if v is True:
        return True
    if isinstance(v, (int, float)) and v == 1:
        return True
    if isinstance(v, str) and v.strip().lower() in {"true", "yes", "y", "1"}:
        return True
    return False


def _derive_notes(answers: List[Dict[str, Any]]) -> List[str]:
    """
    Derive short clinician-friendly notes from answers.
    Adjust/extend these mappings to match your questionnaire keys.
    """
    notes: List[str] = []

    def get(qname: str) -> Any:
        qname = qname.strip().lower()
        for a in answers:
            if (a.get("q") or "").strip().lower() == qname:
                return a.get("value")
        return None

    # Smoker
    smoker = get("smoker") or get("smoking") or get("smoking_status")
    if _truthy(smoker):
        notes.append("Smoker")

    # Memory issues
    mem = get("memory_loss") or get("memory_issues") or get("memory")
    if mem is not None:
        # consider any non-empty, non-"none" value as present
        s = str(mem).strip().lower()
        if s not in {"", "none", "no", "false", "0"}:
            notes.append("Memory issues")

    # You can add more quick notes if desired:
    # high blood pressure
    bp = get("bp") or get("blood_pressure") or get("hypertension")
    if bp is not None:
        s = str(bp).strip().lower()
        if s in {"high", "hypertension", "yes", "true", "1"}:
            notes.append("High blood pressure")

    return notes


def _clean_notes(notes_in: Any) -> Optional[List[str]]:
    if not isinstance(notes_in, list):
        return None
    out: List[str] = []
    for x in notes_in:
        if isinstance(x, str) and x.strip():
            out.append(x.strip())
    return out


# ---- App API ---------------------------------------------------------------

def save_questionnaire(patient_id: str, payload: Dict[str, Any], risk: Dict[str, Any]) -> str:
    """
    Persist a questionnaire submission and computed risk. Returns result_id.

    Stores BOTH:
    - raw answers (for audit / detail view)
    - summary fields (patientName, age, notes, updatedAt) for doctor dashboard
    """
    if not patient_id:
        raise ValueError("patient_id is required")

    result_id = str(uuid.uuid4())
    now = _now_iso_utc()

    answers = payload.get("answers", []) or []
    if not isinstance(answers, list):
        answers = []

    # allow either patientName or name (to be flexible with clients)
    patient_name = payload.get("patientName") or payload.get("name")

    # derive age from answers (preferred) or accept explicit age if supplied
    age = _extract_age(answers)
    if age is None:
        age_in = payload.get("age")
        try:
            age = int(age_in) if age_in is not None else None
        except (TypeError, ValueError):
            age = None

    # allow client-provided notes OR derive from answers
    notes = _clean_notes(payload.get("notes"))
    if notes is None:
        notes = _derive_notes(answers)

    doc: Dict[str, Any] = {
        "id": result_id,
        "patientId": patient_id,
        "patientName": patient_name,
        "age": age,
        "notes": notes,

        "answers": answers,
        "risk": risk,

        "createdAt": now,
        "updatedAt": now,  # used as “last updated”
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
    Supports pagination via cursor_doc_id (last doc ID from previous page).
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
            # Ensure updatedAt exists (older docs might not have it)
            data.setdefault("updatedAt", data.get("createdAt"))
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
            data.setdefault("updatedAt", data.get("createdAt"))
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
    data.setdefault("updatedAt", data.get("createdAt"))
    return data


def delete_result(result_id: str) -> bool:
    db = get_client()
    ref = db.collection(COLLECTION_RESULTS).document(result_id)
    if not ref.get().exists:
        return False
    ref.delete()
    return True


def update_result(result_id: str, data: Dict[str, Any]) -> bool:
    """
    Update allowed fields and bump updatedAt.
    """
    db = get_client()
    ref = db.collection(COLLECTION_RESULTS).document(result_id)
    if not ref.get().exists:
        return False

    allowed: Dict[str, Any] = {}

    # allow updating key fields (adjust as needed)
    if "answers" in data: allowed["answers"] = data["answers"]
    if "risk" in data: allowed["risk"] = data["risk"]
    if "patientName" in data: allowed["patientName"] = data["patientName"]
    if "age" in data:
        try:
            allowed["age"] = int(data["age"]) if data["age"] is not None else None
        except (TypeError, ValueError):
            pass
    if "notes" in data:
        cleaned = _clean_notes(data["notes"])
        if cleaned is not None:
            allowed["notes"] = cleaned

    if not allowed:
        return True

    allowed["updatedAt"] = _now_iso_utc()
    ref.update(allowed)
    return True
