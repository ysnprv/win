#!/usr/bin/env bash
set -e

export PYTHONPATH="/app"

python -u /app/features/Virtual_interviewer/agent.py &

uvicorn main:app \
    --host 0.0.0.0 \
    --port 8000
