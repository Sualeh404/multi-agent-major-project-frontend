cd "C:\Users\suale\OneDrive\Desktop\major project final"
.\venv\Scripts\Activate.ps1
$venv:Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
