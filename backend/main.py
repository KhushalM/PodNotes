from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import logging
import os
import shutil
import boto3
import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:8080", "http://localhost:3000", "http://127.0.0.1:5173"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import AWS services with error handling
try:
    from services.aws_service import upload_file_to_s3, save_podcast_to_dynamodb, table, aws_available
    
    # Try to import services that depend on numpy, but don't fail if they're not available
    try:
        from services.ollama_service import transcribe_audio
        from services.langchain_service import summarise_podcast, ask_question as langchain_ask_question
        logger.info("Successfully imported AI services (ollama and langchain)")
    except ImportError as e:
        logger.warning(f"Error importing AI services: {str(e)}")
        # Define dummy functions to avoid errors
        def transcribe_audio(audio_file_path): return "Transcription service unavailable due to numpy import error"
        def summarise_podcast(transcript): return "Summary service unavailable due to numpy import error"
        def langchain_ask_question(question, podcast_id): return "Question answering service unavailable due to numpy import error"
    
    # Try to import optional services, but don't fail if they're not available
    try:
        from services.chromadb_service import setup_ChromaVS, retrieve_from_ChromaVS
        from services.opensearch_service import setup_opensearch_vector_store, retrieve_from_opensearch
        logger.info("Successfully imported vector database services")
    except ImportError as e:
        logger.warning(f"Vector database services not available: {str(e)}")
        # Define dummy functions to avoid errors
        def setup_ChromaVS(docs): return None
        def retrieve_from_ChromaVS(vs, query): return []
        def setup_opensearch_vector_store(transcript, object_name): return None
        def retrieve_from_opensearch(object_name, query): return []
    
    logger.info("AWS services initialized successfully")
except Exception as e:
    logger.error(f"Error importing services: {str(e)}")
    aws_available = False
    
    # Define dummy functions for all services
    def upload_file_to_s3(file_name, bucket, object_name=None): return "mock-s3-url"
    def save_podcast_to_dynamodb(podcast_id, content_type, content, timestamp): return True
    def transcribe_audio(audio_file_path): return "Mock transcription text"
    def summarise_podcast(transcript): return "Mock summary of podcast"
    def langchain_ask_question(question, podcast_id): return "Mock answer to your question"
    def setup_ChromaVS(docs): return None
    def retrieve_from_ChromaVS(vs, query): return []
    def setup_opensearch_vector_store(transcript, object_name): return None
    def retrieve_from_opensearch(object_name, query): return []
    table = None

# Enable mock mode for testing without AWS services
MOCK_MODE = os.environ.get('MOCK_MODE', 'false').lower() == 'true'
logger.info(f"MOCK_MODE environment variable: {os.environ.get('MOCK_MODE', 'not set')}")
logger.info(f"MOCK_MODE: {MOCK_MODE}")

if not aws_available:
    logger.warning("AWS services are not available. Enabling MOCK_MODE automatically.")
    MOCK_MODE = True

if MOCK_MODE:
    logger.info("Running in MOCK_MODE - AWS services will be simulated")

# Check if we're in local mode
IS_LOCAL = os.environ.get('IS_LOCAL', 'true').lower() == 'true'

@app.get("/")
@app.head("/")
async def root():
    """
    Simple root endpoint to check if the backend is available.
    
    Returns:
        dict: Status information about the backend
    """
    return {
        "status": "ok",
        "message": "PodNotes API is running",
        "timestamp": datetime.datetime.now().isoformat()
    }

@app.post("/upload/")
async def upload_file(file: UploadFile = File(...), mock: bool = Form(False)):
    """
    Upload a podcast file, transcribe it, and save to DynamoDB.
    
    Args:
        file: The uploaded file
        mock: Whether to use mock mode
        
    Returns:
        dict: Response with transcript and summary
    """
    try:
        # Save file temporarily
        temp_dir = "temp"
        os.makedirs(temp_dir, exist_ok=True)
        temp_file_path = os.path.join(temp_dir, file.filename)
        
        with open(temp_file_path, "wb") as f:
            f.write(await file.read())
        
        logger.info(f"Processing podcast: {file.filename}")
        
        # Transcribe the audio
        if mock:
            transcript = "This is a mock transcript for testing purposes."
        else:
            transcript = transcribe_audio(temp_file_path)
        
        # Use object_name as the PodcastID, but sanitize it for DynamoDB
        # Replace spaces and special characters that might cause issues
        original_filename = file.filename
        podcast_id = original_filename #replace(" ", "_").replace(".", "_")
        logger.info(f"Using sanitized podcast ID: {podcast_id} (from {original_filename})")
        
        # Handle both dictionary and string transcript formats
        transcript_content = transcript
    
        # Save transcript to DynamoDB

        save_podcast_to_dynamodb(
            podcast_id=podcast_id,
            content_type="transcript",
            content=transcript_content
        )
        
        # Set up vector store
        vector_store = setup_opensearch_vector_store(transcript_content, podcast_id)
        logger.info("Vector store setup completed")
        
        # Generate summary
        logger.info("Generating summary...")
        summary = summarise_podcast(transcript_content)
        logger.info("Summary generated")
        
        # Save summary to DynamoDB
        logger.info("Saving summary to DynamoDB...")
        save_podcast_to_dynamodb(podcast_id=podcast_id, content_type="summary", content=summary)
        logger.info("Summary saved to DynamoDB")
        
        # Clean up
        os.remove(temp_file_path)
        logger.info(f"Removed temporary file: {temp_file_path}")
        
        return {"transcript": transcript_content, "summary": summary}
    except Exception as e:
        logger.error(f"Error processing upload: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/qa/{podcast_id}")
async def process_question(podcast_id: str, question: str = Form(...)):
    """
    Process a question about a podcast.
    
    Args:
        podcast_id: The podcast ID
        question: The question
        
    Returns:
        dict: The answer to the question
    """
    try:
        logger.info(f"Received question for podcast: {podcast_id}")
        
        # Get transcript from DynamoDB
        try:
            response = table.get_item(
                Key={
                    'PodcastID': podcast_id,  # Changed from 'PodcastId' to 'PodcastID' to match DynamoDB schema
                    'Type': 'transcript'
                }
            )
           
            transcript = response.get('Item', {}).get('Content', '')
            if not transcript:
                logger.error(f"Transcript not found for podcast: {podcast_id}")
                raise HTTPException(status_code=404, detail="Transcript not found")
        except Exception as e:
            logger.error(f"Error retrieving transcript: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error retrieving transcript: {str(e)}")
        
        # Process question using LangChain
        try:
            answer = langchain_ask_question(question, podcast_id)
            return {"answer": answer}
        except Exception as e:
            logger.error(f"Error processing question: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error processing question: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error in process_question: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
