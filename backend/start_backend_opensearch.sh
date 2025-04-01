#!/bin/bash

# Use the project's virtual environment instead of Anaconda
source ./PN/bin/activate

# Set environment variables
export IS_LOCAL=false
export MOCK_MODE=false

# OpenSearch configuration
export OPENSEARCH_DOMAIN_ENDPOINT="https://***REMOVED***"
export OPENSEARCH_AUTH_METHOD="master_user"
export OPENSEARCH_MASTER_USERNAME="***REMOVED***"
export OPENSEARCH_MASTER_PASSWORD="***REMOVED***"

echo "Starting backend with IS_LOCAL=$IS_LOCAL and MOCK_MODE=$MOCK_MODE"
echo "Using OpenSearch at: $OPENSEARCH_DOMAIN_ENDPOINT"
echo "Using Python: $(which python)"

# Start the server
uvicorn main:app --reload --port 8000
