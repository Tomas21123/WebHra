@echo off
title Voxelový Svět – Dedikovaný Server
cd /d "%~dp0"

echo ========================================================
echo   VOXELOVY SVET - SPUSTENI SERVERU
echo ========================================================
echo.

:: 1. Kontrola, zda je Node.js dostupny v systemu nebo ve standardni slozce
set "PATH=%PATH%;C:\Program Files\nodejs\;%LOCALAPPDATA%\Programs\nodejs\;%APPDATA%\npm"
where node >nul 2>nul
if %ERRORLEVEL% equ 0 goto NODE_READY

echo [INFO] Node.js nebyl v systemu nalezen.
echo [INFO] Zahajuji plne automatickou instalaci Node.js...
echo.

:: Pokus A: winget (pokud je dostupny)
where winget >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [INFO] Instaluji pomoci nastroje winget...
    winget install OpenJS.NodeJS -e --accept-source-agreements --accept-package-agreements
    set "PATH=%PATH%;C:\Program Files\nodejs\;%APPDATA%\npm"
    where node >nul 2>nul
    if %ERRORLEVEL% equ 0 goto NODE_READY
)

:: Pokus B: Prime stazeni a instalace z nodejs.org pomoci PowerShellu
echo [INFO] Stahuji oficialni instalator Node.js z nodejs.org...
powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Write-Host 'Stahovani...'; (New-Object System.Net.WebClient).DownloadFile('https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi', 'node_setup.msi')"

if exist "node_setup.msi" (
    echo [INFO] Spoustim instalaci (prosim potvrdte pripadny dotaz Windows na povoleni)...
    start /wait msiexec /i node_setup.msi /passive /norestart
    del "node_setup.msi" 2>nul
    set "PATH=%PATH%;C:\Program Files\nodejs\;%LOCALAPPDATA%\Programs\nodejs\;%APPDATA%\npm"
    where node >nul 2>nul
    if %ERRORLEVEL% equ 0 (
        echo [INFO] Node.js byl uspesne nainstalovan!
        echo.
        goto NODE_READY
    )
)

echo [CHYBA] Automatickou instalaci se nepodarilo dokoncit.
echo Prosim stahnete a nainstalujte Node.js rucne z: https://nodejs.org/
pause
exit /b

:NODE_READY
echo [OK] Node.js je pripraven k pouziti.
echo.

:: 2. Kontrola zda existuje slozka node_modules/ws
if not exist "node_modules\ws" (
    echo [INFO] Knihovna 'ws' neni nainstalovana. Spoustim instalaci...
    call npm install
    echo.
)

:: 3. Spusteni serveru
echo [START] Spoustim herni server pomoci Node.js...
echo [INFO] Webova administrace: http://localhost:3000/admin
echo.
node server.js
pause
