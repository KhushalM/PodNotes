#!/bin/bash

# Use the project's virtual environment instead of Anaconda
source ../PN/bin/activate

# Load environment variables from .env file if it exists
if [ -f .env ]; then
    echo "Loading environment variables from .env file"
    export $(grep -v '^#' .env | xargs)
fi

# Set environment variables
export IS_LOCAL=true
export MOCK_MODE=false
export DIARIZATION=true

# OpenSearch configuration
# Set IS_LOCAL=false to use OpenSearch instead of local ChromaDB
# These should be set in your .env file, not hardcoded here
# export OPENSEARCH_DOMAIN_ENDPOINT="your-domain-endpoint.us-east-1.es.amazonaws.com"
# export OPENSEARCH_AUTH_METHOD="iam"  # Options: "iam" or "master_user"
# export OPENSEARCH_MASTER_USERNAME="your-username"  # Only needed if AUTH_METHOD is "master_user"
# export OPENSEARCH_MASTER_PASSWORD="your-password"  # Only needed if AUTH_METHOD is "master_user"

# HuggingFace token for pyannote.audio (required for speaker diarization)
# You need to accept the user agreement at https://huggingface.co/pyannote/speaker-diarization
# and https://huggingface.co/pyannote/segmentation
# Then get your token from https://huggingface.co/settings/tokens
if [ -z "$HUGGINGFACE_TOKEN" ]; then
    echo "Warning: HUGGINGFACE_TOKEN is not set. Pyannote.audio diarization will not work."
    echo "Please add your HuggingFace token to the .env file."
fi

echo "Starting backend with IS_LOCAL=$IS_LOCAL and MOCK_MODE=$MOCK_MODE"
echo "Using Python: $(which python)"

# Start the server
uvicorn main:app --reload --port 8001
