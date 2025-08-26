# PodNotes

A full-stack application for podcast transcription, summarization, and interactive Q&A using Retrieval-Augmented Generation (RAG).

## Overview

PodNotes transforms your podcast listening experience by:

1. **Transcribing** audio files using Whisper
2. **Identifying** speakers with advanced diarization
3. **Summarizing** podcast content with AI
4. **Enabling** natural language Q&A about the podcast content
5. **Storing** podcasts for future reference

The application uses a modern tech stack with a FastAPI backend, React frontend, and leverages AWS services for production deployment.

## Features

- **Audio Processing**: Upload and transcribe podcast audio files
- **Transcription**: Convert speech to text using OpenAI's Whisper
- **Speaker Diarization**: Identify different speakers using DOVER-Lap fusion technology
- **AI Summarization**: Generate concise summaries of podcast content
- **Interactive Q&A**: Ask questions about podcast content using RAG
- **Cloud Storage**: Store podcasts, transcripts, and metadata in AWS
- **Vector Search**: Semantic search capabilities using ChromaDB

## Architecture

PodNotes uses a hybrid architecture that can run locally for development or on AWS for production:

### Local Development Mode

```
┌─────────────┐    ┌──────────────────────────────────────┐
│             │    │              Backend                 │
│   Frontend  │    │                                      │
│  (React/TS) │◄───┤  FastAPI + Whisper + ChromaDB + LLM  │
│             │    │                                      │
└─────────────┘    └──────────────────────────────────────┘
```

### AWS Production Mode

*Note: This architecture uses ChromaDB deployed alongside the backend (e.g., on EC2 or ECS) for vector storage, simplifying the stack compared to previous OpenSearch integration.*

```
┌─────────────┐    ┌──────────────────────────────┐    ┌───────────────┐
│             │    │     Backend (FastAPI/ECS)    │    │    AWS S3     │
│   Frontend  │    │ + Whisper + ChromaDB + LLM   │    │  (Audio &     │
│  (React/TS) │◄───┤                              │◄───┤   Transcript  │
│             │    │                              │    │   Storage)    │
└─────────────┘    └──────────────────────────────┘    └───────────────┘
                                      │
                                      ▼
                               ┌─────────────┐
                               │ AWS DynamoDB│
                               │ (Metadata   │
                               │  Storage)   │
                               └─────────────┘
```

### Backend Service Structure

The backend logic is organized into services within the `backend/services/` directory:

- `aws_service.py`: Handles interactions with AWS services like S3 and DynamoDB.
- `chromadb_service.py`: Manages vector storage and retrieval using ChromaDB for the RAG system.
- `langchain_service.py`: Orchestrates language model interactions (transcription, summarization, Q&A) using LangChain.
- `ollama_service.py`: Provides specific integration points for Ollama models if used.

## How RAG Works in PodNotes

PodNotes uses a standard **Retrieval-Augmented Generation (RAG)** approach to provide accurate answers to questions about podcast content:

1. **Document Processing**:
   - Podcast audio is transcribed to text using Whisper.
   - Text is split into smaller chunks.
   - Each chunk is converted to a vector embedding.
   - Vector embeddings and transcript metadata are stored in **ChromaDB**.
   - Original audio files and structured transcripts are stored in S3 (AWS) or locally.
   - Podcast metadata (like summaries) is stored in DynamoDB (AWS) or locally.

2. **Storage**:
   - Vector embeddings are stored in ChromaDB.
   - Metadata and references are stored in DynamoDB.

3. **Retrieval**:
   - When a question is asked, it's converted to a vector embedding.
   - Similar chunks from the transcript are retrieved based on vector similarity.
   - Retrieved chunks provide context for the LLM.

4. **Generation**:
   - The LLM generates an answer using the retrieved context.
   - The system maintains conversation history for follow-up questions.

## Advanced Speaker Diarization with DOVER-Lap

PodNotes uses DOVER-Lap (Diarization Output Voting Error Reduction - Label-Propagation) for accurate speaker identification in podcasts:

### How DOVER-Lap Works

1. **Multiple Diarization Systems**:
   - The system runs multiple speaker diarization algorithms in parallel:
     - **Pyannote.audio**: State-of-the-art neural speaker diarization
     - **PvFalcon**: Picovoice's speaker diarization technology

2. **System Fusion**:
   - DOVER-Lap combines the outputs from multiple diarization systems
   - Uses a graph-based label propagation algorithm to resolve disagreements
   - Produces a more accurate consensus diarization than any single system

3. **Integration with Whisper**:
   - Speaker labels are mapped to Whisper transcript segments
   - Each segment is assigned to the speaker with maximum temporal overlap
   - Results in a structured transcript with accurate speaker attribution

4. **Benefits**:
   - Improved speaker identification accuracy (10-20% error reduction)
   - More robust to different acoustic conditions and speaker overlaps
   - Enhanced transcript readability with clear speaker labels

### Setup Requirements

To use the DOVER-Lap diarization feature:

1. **HuggingFace Token**:
   - Create an account at [HuggingFace](https://huggingface.co/)
   - Accept the user agreements for:
     - [pyannote/speaker-diarization](https://huggingface.co/pyannote/speaker-diarization)
     - [pyannote/segmentation](https://huggingface.co/pyannote/segmentation)
   - Generate a token at [HuggingFace Settings](https://huggingface.co/settings/tokens)
   - Add the token to your `.env` file as `HUGGINGFACE_TOKEN=your-token-here`

2. **Enable Diarization**:
   - Set `DIARIZATION=true` in your environment or `.env` file
   - The system will automatically use DOVER-Lap when diarization is enabled

3. **System Requirements**:
   - Requires PyTorch and additional dependencies
   - Recommended: GPU for faster processing of longer podcasts

## Dockerized Local Development

PodNotes supports fully containerized local development using Docker Compose. This will start the backend, frontend, and Ollama LLM services with a single command.

### Prerequisites
- [Docker](https://www.docker.com/get-started) and [Docker Compose](https://docs.docker.com/compose/install/) installed

### Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/PodNotes.git
   cd PodNotes
   ```
2. **Configure environment variables:**
   - Copy and edit the example env files as needed:
     ```bash
     cp backend/env.example backend/.env
     # Edit backend/.env with your credentials and settings
     ```
   - (Optional) Configure HuggingFace, AWS, and other tokens as needed in `backend/.env`.
3. **Build and start all services:**
   ```bash
   docker-compose up --build
   ```
   This will:
   - Build and run the backend (FastAPI, ChromaDB integration, etc.) on port 8001
   - Build and run the frontend (React, Vite) on port 80
   - Start the Ollama LLM service on port 11434

4. **Access the application:**
   - Frontend: [http://localhost](http://localhost)
   - Backend API docs: [http://localhost:8001/docs](http://localhost:8001/docs)
   - Ollama API: [http://localhost:11434](http://localhost:11434)

5. **Stopping services:**
   ```bash
   docker-compose down
   ```

#### Notes
- The backend is configured to talk to Ollama at `http://ollama:11434` (as defined in `docker-compose.yml`).
- Ollama model data is persisted in a Docker volume (`ollama_data`).
- Uploaded files and temporary data are mapped to the host for development convenience.
- You can run `docker-compose up --build` anytime you change code or dependencies.

---

## Project Structure

```
PodNotes/
├── backend/        # FastAPI backend, AI services, vector DB logic
│   ├── services/   # Modular service files (AWS, ChromaDB, LangChain, Ollama, etc.)
│   ├── main.py     # FastAPI app entrypoint
│   ├── Dockerfile  # Backend Docker build config
│   └── ...
├── frontend/       # React (Vite) frontend
│   ├── src/        # React components, pages, utils
│   ├── Dockerfile  # Frontend Docker build config
│   └── ...
├── docker-compose.yml # Multi-service orchestration (backend, frontend, ollama)
└── README.md       # Project documentation
```

- **backend/services/**: Contains all major service modules (AWS, ChromaDB, LangChain, Ollama integration, etc.)
- **frontend/src/**: All frontend React/TypeScript code
- **docker-compose.yml**: Defines and networks all services for local development

---

## Docker Compose Reference

Here is a reference for the provided `docker-compose.yml`:

```yaml
services:
  backend:
    build:
      context: ./backend
    env_file:
      - ./backend/.env
    environment:
      - IS_LOCAL=false
      - IS_AWS=${IS_AWS:-false}
      - MOCK_MODE=${MOCK_MODE:-false}
      - DIARIZATION=${DIARIZATION:-false}
      - VECTOR_STORE_DIR=/app/data/vector_stores
      - OLLAMA_BASE_URL=http://ollama:11434
    volumes:
      - ./backend/temp:/app/temp
    ports:
      - "8001:8001"
    restart: unless-stopped
    depends_on:
      - ollama

  frontend:
    build:
      context: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    environment:
      - VITE_API_URL=http://backend:8001

  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    restart: unless-stopped

volumes:
  ollama_data:
```

---

## Troubleshooting Docker

- **Backend cannot connect to Ollama:** Ensure the Ollama service is running and the backend is using `OLLAMA_BASE_URL=http://ollama:11434`.
- **File permission errors:** Make sure your host user has permission to write to the mapped `backend/temp` directory.
- **Port conflicts:** Make sure ports 80, 8001, and 11434 are free on your host.
- **AWS/Cloud issues:** Double-check your `.env` configuration and IAM permissions.

---

## Setup and Installation

### Prerequisites

- Python 3.9+
- Node.js 18+
- AWS account (for production deployment)
- OpenAI API key (optional, for OpenAI models)

### Local Development Setup

#### Backend Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/PodNotes.git
   cd PodNotes/backend
   ```

2. **Create and activate a virtual environment**:
   ```bash
   python -m venv PN
   source PN/bin/activate  # On Windows: PN\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**:
   Create a `.env` file in the backend directory with:
   ```
   IS_LOCAL=true
   ```

5. **Start the backend server**:
   ```bash
   ./start_backend.sh
   # Or manually:
   # uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

#### Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd ../frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Access the application**:
   Open your browser and go to `http://localhost:5173`

### AWS Production Setup

#### AWS Services Configuration

1. **S3 Bucket**:
   - Create an S3 bucket for storing audio files and transcripts
   - Configure CORS settings to allow frontend access

2. **DynamoDB**:
   - Create a DynamoDB table named `Podcasts` with:
     - Primary Key: `PodcastID` (String)
     - Sort Key: `Type` (String)
   - Ensure appropriate IAM permissions for the backend to access this table

3. **ChromaDB Deployment**:
   - ChromaDB needs to be accessible by the backend. This could involve:
     - Running ChromaDB as a separate container/service (e.g., on ECS/EKS or a dedicated EC2 instance)
     - Running ChromaDB persistently on the same instance/container as the FastAPI backend (simpler, suitable for smaller scale)
   - Ensure the `CHROMA_HOST` and `CHROMA_PORT` environment variables point to the correct ChromaDB instance

4. **IAM Permissions**:
   - Create an IAM user or role for the backend application
   - Grant necessary permissions for S3 (GetObject, PutObject, ListBucket) and DynamoDB (GetItem, PutItem, Query, Scan)

#### Backend Deployment (Example: EC2/Docker)

1. **Set up an EC2 instance** or other compute environment
2. **Install Docker**
3. **Create `.env` file** on the server with production settings:
   ```
   IS_LOCAL=false
   AWS_REGION=your-aws-region
   # Add other necessary variables like LLM API keys, HuggingFace token, etc.
   CHROMA_HOST=your_chromadb_host_or_ip # Or 127.0.0.1 if running on same instance
   CHROMA_PORT=your_chromadb_port # e.g., 8000
   # Ensure AWS credentials are configured (e.g., via IAM role attached to EC2)
   ```
4. **Build and run the backend Docker container** (you might need a Dockerfile):
   ```bash
   # Example docker run command (adapt as needed)
   docker run -d --env-file .env -p 8000:8000 your-backend-image-name
   ```
5. **(If running ChromaDB separately)** Ensure the ChromaDB container/service is running and accessible

#### Frontend Deployment (Example: S3 + CloudFront)

1. **Build the frontend**: `npm run build`
2. **Upload the contents** of the `frontend/dist` directory to an S3 bucket configured for static website hosting
3. **(Optional) Configure CloudFront** as a CDN in front of the S3 bucket for better performance and HTTPS
4. **Update frontend API endpoint**: Ensure the frontend code points to the deployed backend URL

## Testing

### Backend Tests

The `tests` directory contains utilities for testing various components:

```bash
# Test OpenSearch connectivity
cd backend
./tests/opensearch/run_opensearch_test.sh
```

## Troubleshooting

### Common Issues

1. **AWS Credentials**: Ensure correct IAM permissions and that credentials (or IAM role) are properly configured for the backend environment
2. **DynamoDB Key Schema**: Verify the `Podcasts` table uses `PodcastID` (String) as HASH and `Type` (String) as RANGE key
3. **ChromaDB Connection**: Check `CHROMA_HOST` and `CHROMA_PORT` environment variables and network connectivity between the backend and ChromaDB
4. **LLM API Keys**: Make sure API keys for Whisper, summarization, or Q&A models are correctly set in the environment
5. **HuggingFace Token**: Required for `pyannote` models used in diarization

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request

## Dependencies

- [Whisper](https://github.com/openai/whisper) for transcription
- [LangChain](https://python.langchain.com/) for LLM orchestration
- [ChromaDB](https://www.trychroma.com/) for vector storage
- [FastAPI](https://fastapi.tiangolo.com/) for the backend framework
- [React](https://reactjs.org/) for the frontend framework

## License

This project is licensed under the MIT License - see the LICENSE file for details

## Acknowledgements

- [OpenAI Whisper](https://github.com/openai/whisper) for audio transcription
- [LangChain](https://github.com/langchain-ai/langchain) for RAG implementation
- [FastAPI](https://fastapi.tiangolo.com/) for the backend framework
- [React](https://reactjs.org/) for the frontend framework
