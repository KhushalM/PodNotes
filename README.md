# PodNotes

![PodNotes Logo](frontend/public/podnotes-logo.png)

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
- **Vector Search**: Semantic search capabilities using OpenSearch or ChromaDB

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

```
┌─────────────┐    ┌─────────────┐    ┌───────────────┐
│             │    │             │    │    AWS S3     │
│   Frontend  │    │   Backend   │    │  (Audio &     │
│  (React/TS) │◄───┤   (FastAPI) │◄───┤   Transcript  │
│             │    │             │    │   Storage)    │
└─────────────┘    └─────────────┘    └───────────────┘
                          │                   ▲
                          ▼                   │
                   ┌─────────────┐    ┌───────────────┐
                   │ AWS DynamoDB│    │ AWS OpenSearch│
                   │ (Metadata   │    │ (Vector       │
                   │  Storage)   │    │  Storage)     │
                   └─────────────┘    └───────────────┘
```

## How RAG Works in PodNotes

PodNotes uses Retrieval-Augmented Generation (RAG) to provide accurate answers to questions about podcast content:

1. **Document Processing**:
   - Podcast audio is transcribed to text
   - Text is split into smaller chunks
   - Each chunk is converted to a vector embedding

2. **Storage**:
   - Vector embeddings are stored in OpenSearch (AWS) or ChromaDB (local)
   - Metadata and references are stored in DynamoDB

3. **Retrieval**:
   - When a question is asked, it's converted to a vector embedding
   - Similar chunks from the transcript are retrieved based on vector similarity
   - Retrieved chunks provide context for the LLM

4. **Generation**:
   - The LLM generates an answer using the retrieved context
   - The system maintains conversation history for follow-up questions

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
   - Create a DynamoDB table with primary key `PodcastID`
   - Add necessary attributes for metadata storage

3. **OpenSearch**:
   - Create an OpenSearch domain
   - Configure security settings (master user or IAM)
   - Set up network access policies

4. **IAM Permissions**:
   - Create an IAM role with permissions for S3, DynamoDB, and OpenSearch
   - Generate access keys for backend authentication

#### Backend Deployment

1. **Configure AWS credentials**:
   ```bash
   aws configure
   ```

2. **Set up environment variables**:
   Create a `.env` file with:
   ```
   IS_LOCAL=false
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   AWS_REGION=your_region
   S3_BUCKET_NAME=your_bucket_name
   DYNAMODB_TABLE_NAME=your_table_name
   OPENSEARCH_DOMAIN_ENDPOINT=your_opensearch_endpoint
   OPENSEARCH_AUTH_METHOD=master_user  # or iam
   OPENSEARCH_MASTER_USERNAME=your_username  # if using master_user
   OPENSEARCH_MASTER_PASSWORD=your_password  # if using master_user
   ```

3. **Start the backend with OpenSearch**:
   ```bash
   ./start_backend_opensearch.sh
   ```

#### Frontend Deployment

1. **Build the frontend**:
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy to hosting service** (e.g., AWS Amplify, Vercel, Netlify)

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

1. **OpenSearch Connection Issues**:
   - Verify credentials in environment variables
   - Check network access and security groups
   - Run the OpenSearch test script to diagnose

2. **Transcription Errors**:
   - Ensure Whisper model is properly installed
   - Check audio file format (WAV or MP3 recommended)

3. **Vector Store Issues**:
   - Verify OpenSearch is running and accessible
   - Check if ChromaDB is properly initialized in local mode

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [OpenAI Whisper](https://github.com/openai/whisper) for audio transcription
- [LangChain](https://github.com/langchain-ai/langchain) for RAG implementation
- [FastAPI](https://fastapi.tiangolo.com/) for the backend framework
- [React](https://reactjs.org/) for the frontend framework
