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
export IS_AWS=false
export MOCK_MODE=false
export DIARIZATION=false

# Print environment variables for debugging
echo "DIARIZATION value in shell: $DIARIZATION"

# Vector store configuration
export VECTOR_STORE_DIR=${VECTOR_STORE_DIR:-"~/PodNotes_data/vector_stores"}
echo "Using vector store directory: $VECTOR_STORE_DIR"

# HuggingFace token for pyannote.audio (required for speaker diarization)
# You need to accept the user agreement at https://huggingface.co/pyannote/speaker-diarization
# and https://huggingface.co/pyannote/segmentation
# Then get your token from https://huggingface.co/settings/tokens
if [ -z "$HUGGINGFACE_TOKEN" ]; then
    echo "Warning: HUGGINGFACE_TOKEN is not set. Pyannote.audio diarization will not work."
    echo "Please add your HuggingFace token to the .env file."
fi

echo "Starting backend with IS_LOCAL=$IS_LOCAL, IS_AWS=$IS_AWS and MOCK_MODE=$MOCK_MODE"
echo "Using Python: $(which python)"

# Start the server
uvicorn main:app --reload --port 8001
