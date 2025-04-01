#!/bin/bash

# Use the project's virtual environment instead of Anaconda
source ../PN/bin/activate

# Set environment variables
export IS_LOCAL=true
export MOCK_MODE=false

# OpenSearch configuration
# Set IS_LOCAL=false to use OpenSearch instead of local ChromaDB
# export IS_LOCAL=false
# export OPENSEARCH_DOMAIN_ENDPOINT="https://your-domain-endpoint.us-east-1.es.amazonaws.com"
# export OPENSEARCH_AUTH_METHOD="iam"  # Options: "iam" or "master_user"
# export OPENSEARCH_MASTER_USERNAME="admin"  # Only needed if AUTH_METHOD is "master_user"
# export OPENSEARCH_MASTER_PASSWORD="your-password"  # Only needed if AUTH_METHOD is "master_user"

echo "Starting backend with IS_LOCAL=$IS_LOCAL and MOCK_MODE=$MOCK_MODE"
echo "Using Python: $(which python)"

# Start the server
uvicorn main:app --reload --port 8000
