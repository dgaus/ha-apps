#!/bin/sh
set -e

# Ensure data directory exists
if [ -d "/data" ]; then
    echo "Using Home Assistant /data directory for persistence"
    export DATA_DIR="/data"
else
    # Ensure local data directory exists if not using HA
    echo "Using Home Assistant /data directory for persistence"
    mkdir -p data
fi

# Use exec to let node handle signals and be the primary process
exec npm start --prefix /app
