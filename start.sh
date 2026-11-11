#!/usr/bin/env bash
# Starts backend (FastAPI, :8123) and frontend (Next.js, :4200) together.
# Stop both with Ctrl+C.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f backend/.env ]; then
  echo "backend/.env is missing. Copy backend/.env.example to backend/.env first."
  exit 1
fi

if ! command -v claude >/dev/null 2>&1; then
  echo "The 'claude' CLI is not on PATH. Install Claude Code and run 'claude login' (or 'claude setup-token' for headless auth) first."
  exit 1
fi

cleanup() {
  kill $(jobs -p) 2>/dev/null || true
}
trap cleanup EXIT

(
  cd backend
  source .venv/bin/activate
  uvicorn app.main:app --port 8123 --reload
) &

(
  cd frontend
  npm run dev -- --port 4200
) &

wait
