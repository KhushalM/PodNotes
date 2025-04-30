FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install pvfalcon

# Copy the rest of the application
COPY . .

# Create necessary directories
RUN mkdir -p /app/data /app/model_cache /app/temp

# Set environment variables
ENV IS_LOCAL=false
ENV IS_AWS=true
ENV MOCK_MODE=false
ENV DIARIZATION=false
ENV VECTOR_STORE_DIR=/app/data/vector_stores
ENV PYTHONUNBUFFERED=1

# Expose the port the app runs on
EXPOSE 8001

# Command to run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]