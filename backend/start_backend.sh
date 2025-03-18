#!/bin/bash

# Use the project's virtual environment instead of Anaconda
source ../PN/bin/activate

# Set environment variables
export IS_LOCAL=true
export MOCK_MODE=true

echo "Starting backend with IS_LOCAL=$IS_LOCAL and MOCK_MODE=$MOCK_MODE"
echo "Using Python: $(which python)"

# Start the server
uvicorn main:app --reload --port 8000
