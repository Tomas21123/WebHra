@echo off
title Voxelový Svět – Dedikovaný Server
cd /d "%~dp0"

echo ========================================================
echo   VOXELOVY SVET - SPUSTENI SERVERU
echo ========================================================
echo.

:: Kontrola zda existuje slozka node_modules/ws
if not exist "node_modules\ws" (
    echo [INFO] Knihovna 'ws' neni nainstalovana. Spoustim instalaci...
    npm install
    echo.
)

echo [START] Spoustim server pomoci Node.js...
echo [INFO] Po spusteni muzes otevrit administraci na: http://localhost:3000/admin
echo.
node server.js
pause
