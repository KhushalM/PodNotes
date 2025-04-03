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
export MOCK_MODE=false
export DIARIZATION=false

# OpenSearch configuration
# These should be set in your .env file, not hardcoded here
# export OPENSEARCH_DOMAIN_ENDPOINT="your-endpoint-here"
# export OPENSEARCH_AUTH_METHOD="master_user"
# export OPENSEARCH_MASTER_USERNAME="your-username"
# export OPENSEARCH_MASTER_PASSWORD="your-password"

echo "Starting backend with IS_LOCAL=$IS_LOCAL and MOCK_MODE=$MOCK_MODE"
echo "Using OpenSearch at: $OPENSEARCH_DOMAIN_ENDPOINT"
echo "Using Python: $(which python)"

# Start the server
uvicorn main:app --reload --port 8001
