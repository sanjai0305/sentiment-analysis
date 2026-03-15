@echo off
echo ==========================================
echo Starting Sentiment Analysis Platform...
echo ==========================================

echo Starting Backend API (FastAPI)...
cd backend
start "Backend API" cmd /k "call ..\.venv\Scripts\activate.bat && uvicorn main:app --reload"
cd ..

echo Starting Frontend (React/Vite)...
cd frontend
start "Frontend UI" cmd /k "npm run dev"
cd ..

echo Done! Both servers are starting in new command windows. You can close this window.
pause
