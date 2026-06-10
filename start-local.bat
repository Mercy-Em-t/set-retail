@echo off
echo ==============================================
echo STARTING SET-RETAIL DUAL-BRAIN ARCHITECTURE
echo ==============================================

echo [1/4] Starting React Frontend (Port 5173)...
start cmd /k "npm run dev"

echo [2/4] Starting Python Data Science Engine (Port 8000)...
start cmd /k "cd discrete_engine && .venv\Scripts\uvicorn.exe main:app --reload"

echo [3/4] Starting Node.js API Gateway (Port 3000)...
start cmd /k "node backend/index.js"

echo [4/4] Starting BullMQ Worker (Background)...
start cmd /k "node backend/worker.js"

echo.
echo All microservices have been dispatched!
echo Press any key to exit this launcher...
pause >nul
