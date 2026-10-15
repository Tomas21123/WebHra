#!/bin/bash
# Spouštěcí skript pro Linux a Raspberry Pi 4

cd "$(dirname "$0")"

echo "========================================================"
echo "   VOXELOVÝ SVĚT – SPUŠTĚNÍ SERVERU (Raspberry Pi / Linux)"
echo "========================================================"
echo ""

if [ ! -d "node_modules/ws" ]; then
    echo "[INFO] Instaluji potřebné závislosti (npm install)..."
    npm install
    echo ""
fi

echo "[START] Spouštím herní server..."
echo "[INFO] Administrace dostupná na: http://localhost:3000/admin"
echo ""

node server.js
