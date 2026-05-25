@echo off
title Local Preview Server + ngrok

echo =========================================
echo   Starting local preview server + ngrok
echo =========================================
echo.

:: Check if Python is installed, install via winget if missing
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Python not found. Attempting to install via winget...
    winget install Python.Python.3 --accept-source-agreements --accept-package-agreements
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] Automatic installation failed.
        echo Please install Python manually from https://www.python.org/downloads/
        echo Make sure to check "Add Python to PATH" during installation.
        echo.
        pause
        exit /b
    )
    :: Refresh PATH so python is available in this session
    for /f "tokens=2*" %%A in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "SYS_PATH=%%B"
    for /f "tokens=2*" %%A in ('reg query "HKCU\Environment" /v Path 2^>nul') do set "USR_PATH=%%B"
    set "PATH=%SYS_PATH%;%USR_PATH%"
    echo [INFO] Python installed successfully.
    echo.
)

:: Check if ngrok is installed, install via winget if missing
ngrok version >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] ngrok not found. Attempting to install via winget...
    winget install ngrok.ngrok --accept-source-agreements --accept-package-agreements
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] Automatic installation failed.
        echo Please install ngrok manually from https://ngrok.com/download
        echo Extract it and add the folder to your PATH, or place ngrok.exe here.
        echo.
        pause
        exit /b
    )
    :: Refresh PATH so ngrok is available in this session
    for /f "tokens=2*" %%A in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "SYS_PATH=%%B"
    for /f "tokens=2*" %%A in ('reg query "HKCU\Environment" /v Path 2^>nul') do set "USR_PATH=%%B"
    set "PATH=%SYS_PATH%;%USR_PATH%"
    echo [INFO] ngrok installed successfully.
    echo.
)

set PORT=5500

:: Start Python HTTP server in the background
echo [1/3] Starting Python HTTP server on port %PORT%...
start /B python -m http.server %PORT%

:: Start ngrok tunnel minimized in the background
echo [2/3] Starting ngrok tunnel...
start /MIN "" ngrok http %PORT%

:: Wait for ngrok to initialize and expose its local API (up to 2 seconds)
echo [3/3] Waiting for ngrok to initialize...
set NGROK_URL=
set NGROK_WAIT=0

:NGROK_POLL
timeout /t 1 >nul
set /a NGROK_WAIT+=1
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Invoke-RestMethod http://localhost:4040/api/tunnels -ErrorAction SilentlyContinue).tunnels | Where-Object { $_.proto -eq 'https' } | Select-Object -ExpandProperty public_url" 2^>nul') do set NGROK_URL=%%i
if not "%NGROK_URL%"=="" goto NGROK_READY
if %NGROK_WAIT% lss 2 goto NGROK_POLL

:: Took more than 2 seconds — fall back to local
echo.
echo [WARN] ngrok took too long to initialize. Opening local server instead...
start "" "http://localhost:%PORT%"
echo.
echo Press any key to shut down the server...
pause >nul
taskkill /F /IM ngrok.exe >nul 2>&1
taskkill /F /IM python.exe >nul 2>&1
echo Stopped. You can close this window.
pause
exit /b

:NGROK_READY

if "%NGROK_URL%"=="" (
    echo.
    echo [WARN] Could not retrieve ngrok URL. Make sure ngrok is authenticated.
    echo Run: ngrok config add-authtoken ^<your-token^>
    echo Get your token at: https://dashboard.ngrok.com/get-started/your-authtoken
    echo.
    echo [FALLBACK] Opening local Python server instead...
    start "" "http://localhost:%PORT%"
    echo.
    echo Press any key to shut down the server...
    pause >nul
    taskkill /F /IM ngrok.exe >nul 2>&1
    taskkill /F /IM python.exe >nul 2>&1
    echo Stopped. You can close this window.
    pause
    exit /b
)

echo.
echo =========================================
echo   Public URL: %NGROK_URL%
echo =========================================
echo.

:: Open browser using the ngrok public URL
start "" "%NGROK_URL%"

echo Press any key to shut down the server and tunnel...
pause >nul

:: Clean up both processes
taskkill /F /IM ngrok.exe >nul 2>&1
taskkill /F /IM python.exe >nul 2>&1
echo Stopped. You can close this window.
pause