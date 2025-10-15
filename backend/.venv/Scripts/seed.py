import os, json, sys
from datetime import datetime, timezone
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from src.services.firebase import save_questionnaire  # noqa

def main():
    patient = "abc123"
    payload = {"answers": [{"q": "age", "value": 42}, {"q": "bp", "value": "120/80"}]}
    risk = {"score": 0.42, "label": "moderate", "seededAt": datetime.now(timezone.utc).isoformat()}
    rid = save_questionnaire(patient, payload, risk)
    print(json.dumps({"seeded": True, "resultId": rid, "patientId": patient}, indent=2))

if __name__ == "__main__":
    main()
