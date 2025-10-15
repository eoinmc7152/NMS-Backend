import os
from src.services.app import app

def test_health():
    c = app.test_client()
    r = c.get('/health/')
    assert r.status_code == 200

def test_create_and_get(monkeypatch):
    os.environ['API_KEY'] = 'dev-secret-123'
    c = app.test_client()

    body = {"patientId": "abc123", "answers": [{"q": "age", "value": 42}]}
    r = c.post('/patient/questionnaire/', json=body, headers={"X-API-Key": "dev-secret-123"})
    assert r.status_code == 201
    rid = r.get_json()['resultId']

    r2 = c.get(f'/results/{rid}')
    assert r2.status_code == 200
    data = r2.get_json()['data']
    assert data['patientId'] == 'abc123'
