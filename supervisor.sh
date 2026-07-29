#!/usr/bin/env bash
# ditcoin-ws supervisor — restarts the WebSocket relay if it ever exits.
# The sandbox reaper tends to kill lone background bun processes, so we wrap
# the service in an infinite restart loop. Idempotent: kills any existing
# supervisor + service first.
set -u
cd "$(dirname "$0")"

# Kill any previous supervisor + service.
pkill -f "ditcoin-ws/supervisor.sh" 2>/dev/null
pkill -f "ditcoin-ws/index.ts" 2>/dev/null
sleep 1

LOG="$(pwd)/dev.log"
echo "[supervisor] starting (pid $$), logging to $LOG" >> "$LOG"

while true; do
  # Re-spawn the relay. `exec` replaces the fork'd child so signals land on bun directly.
  bun index.ts >> "$LOG" 2>&1
  EC=$?
  echo "[supervisor] bun exited (code $EC) — restarting in 2s…" >> "$LOG"
  sleep 2
done
