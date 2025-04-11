#!/bin/bash

# Use the project's virtual environment instead of Anaconda
source ./PN/bin/activate

# Load environment variables from .env file if it exists
if [ -f .env ]; then
    echo "Loading environment variables from .env file"
    export $(grep -v '^#' .env | xargs)
fi

# Set environment variables
export IS_LOCAL=false
export IS_AWS=true
export MOCK_MODE=false
export DIARIZATION=false

# Vector store configuration
export VECTOR_STORE_DIR=${VECTOR_STORE_DIR:-"~/PodNotes_data/vector_stores"}
echo "Using vector store directory: $VECTOR_STORE_DIR"

# AWS configuration
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ] || [ -z "$AWS_REGION" ]; then
    echo "Warning: AWS credentials are not fully set. Make sure AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION are in your .env file."
fi

echo "Starting backend with IS_LOCAL=$IS_LOCAL, IS_AWS=$IS_AWS and MOCK_MODE=$MOCK_MODE"
echo "Using Python: $(which python)"

# Start the server
uvicorn main:app --reload --port 8001
