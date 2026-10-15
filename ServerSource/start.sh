#!/bin/bash
# Spouštěcí skript pro Linux a Raspberry Pi 4

cd "$(dirname "$0")"

echo "========================================================"
echo "   VOXELOVÝ SVĚT – SPUŠTĚNÍ SERVERU (Raspberry Pi / Linux)"
echo "========================================================"
echo ""

# Automatická kontrola a instalace Node.js a npm, pokud na systému chybí
if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
    echo "[INFO] Node.js nebo npm není nainstalováno!"
    echo "[INFO] Spouštím automatickou instalaci (může vyžadovat heslo správce sudo)..."
    echo ""
    
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y nodejs npm
    else
        echo "[CHYBA] Nebyl nalezen balíčkovací správce apt-get."
        echo "Nainstalujte prosím Node.js a npm ručně pro vaši distribuci."
        exit 1
    fi
    echo ""
    echo "[INFO] Instalace Node.js byla úspěšně dokončena!"
    echo ""
fi

# Kontrola a instalace potřebné knihovny ws
if [ ! -d "node_modules/ws" ]; then
    echo "[INFO] Instaluji potřebné herní závislosti (npm install)..."
    npm install
    echo ""
fi

echo "[START] Spouštím herní server..."
echo "[INFO] Administrace dostupná na: http://localhost:3000/admin"
echo ""

node server.js
