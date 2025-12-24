@echo off
echo =========================================
echo Stock Management System Setup
echo =========================================

echo.
echo Installing backend dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo Backend installation failed!
    pause
    exit /b %errorlevel%
)

echo.
echo Initializing database...
call npm run init-db
if %errorlevel% neq 0 (
    echo Database initialization failed!
    pause
    exit /b %errorlevel%
)

echo.
echo Installing frontend dependencies...
cd ..\frontend
call npm install
if %errorlevel% neq 0 (
    echo Frontend installation failed!
    pause
    exit /b %errorlevel%
)

cd ..

echo.
echo =========================================
echo Setup completed successfully!
echo =========================================
echo.
echo To start the application:
echo 1. Run 'start-backend.bat' to start the API server
echo 2. Run 'start-frontend.bat' to start the web interface
echo 3. Open http://localhost:3000 in your browser
echo 4. Login with: admin / admin123
echo.
pause
