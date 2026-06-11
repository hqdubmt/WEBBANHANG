#!/bin/bash
# Start AI Social Commerce API V3
set -e
cd "$(dirname "$0")/apps/api"

# Load env
export $(grep -v '^#' ../../.env | grep -v '^$' | xargs)

echo "Starting AI Social Commerce OS V3 on port $APP_PORT..."
node dist/main.js
