Set-Content -Encoding UTF8 .\README.md @"
# NMS Backend (Flask + Firestore)

## Quickstart (Windows PowerShell)
```powershell
python -m venv .venv
. .\.venv\Scripts\Activate.ps1
pip install -r src/services/requirements.txt

# env from .env (auto via python-dotenv)
python -m src.services.app
