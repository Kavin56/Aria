#!/bin/bash
# RunPod: pull latest and start MAYA (use this after any code change so you get latest script).
# Usage: chmod +x runpod-run.sh && ./runpod-run.sh

set -e
cd "$(dirname "$0")"
# Reset scripts so pull never fails on local changes; fix CRLF if present
git checkout -- runpod-start.sh runpod-run.sh 2>/dev/null || true
sed -i 's/\r$//' runpod-start.sh runpod-run.sh 2>/dev/null || true
git pull origin main
chmod +x runpod-start.sh
pkill -9 ngrok 2>/dev/null || true
sleep 4
./runpod-start.sh
