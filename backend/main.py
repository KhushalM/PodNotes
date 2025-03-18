from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import logging
import os
import shutil
import boto3

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
        def langchain_ask_question(question, context): return "Question answering service unavailable due to numpy import error"
    
    # Try to import optional services, but don't fail if they're not available
    try:
        from services.chromadb_service import setup_ChromaVS, retrieve_from_ChromaVS
        logger.info("Successfully imported ChromaDB service")
    except ImportError as e:
        logger.warning(f"ChromaDB service not available: {str(e)}")
        # Define dummy functions to avoid errors
        def setup_ChromaVS(docs): return None
        def retrieve_from_ChromaVS(vs, query): return []
    
    from datetime import datetime
    
    logger.info("AWS services initialized successfully")
except Exception as e:
    logger.error(f"Error importing services: {str(e)}")
    aws_available = False
    
    # Define dummy functions for all services
    def upload_file_to_s3(file_name, bucket, object_name=None): return "mock-s3-url"
    def save_podcast_to_dynamodb(podcast_id, type, content, timestamp): return True
    def transcribe_audio(audio_file_path): return "Mock transcription text"
    def summarise_podcast(transcript): return "Mock summary of podcast"
    def langchain_ask_question(question, context): return "Mock answer to your question"
    def setup_ChromaVS(docs): return None
    def retrieve_from_ChromaVS(vs, query): return []
    table = None

# Enable mock mode for testing without AWS services
MOCK_MODE = os.environ.get('MOCK_MODE', 'false').lower() == 'true'
if MOCK_MODE:
    logger.info("Running in MOCK_MODE - AWS services will be simulated")

# If AWS is not available and we're not in mock mode, enable mock mode automatically
if not aws_available and not MOCK_MODE:
    logger.warning("AWS services are not available. Enabling MOCK_MODE automatically.")
    MOCK_MODE = True

@app.get("/test")
async def test_endpoint():
    """Simple endpoint to test if the API is working"""
    logger.info("Test endpoint called!")
    return {
        "status": "ok", 
        "message": "Backend API is working!",
        "aws_available": aws_available,
        "mock_mode": MOCK_MODE
    }

@app.post("/upload/")
async def upload_podcast(file: UploadFile = File(...)):
    try:
        if not aws_available and not MOCK_MODE:
            logger.error("AWS services are not available and MOCK_MODE is disabled")
            raise HTTPException(status_code=500, detail="AWS services are not available")
        
        logger.info(f"Received upload request for file: {file.filename}")
        
        # Create temp directory if it doesn't exist
        temp_dir = "temp"
        if not os.path.exists(temp_dir):
            os.makedirs(temp_dir)
            logger.info(f"Created temp directory: {temp_dir}")
        
        # Save the uploaded file temporarily
        temp_file_path = os.path.join(temp_dir, file.filename)
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        logger.info(f"Saved uploaded file to: {temp_file_path}")
        
        # If in mock mode, generate mock data
        if MOCK_MODE:
            logger.info("MOCK_MODE: Generating mock transcript and summary")
            transcript = "This is a mock transcript for testing purposes. It simulates the transcribed content of the podcast."
            summary = "This is a mock summary of the podcast. It highlights the key points discussed in the podcast."
            
            # Clean up
            os.remove(temp_file_path)
            logger.info(f"Removed temporary file: {temp_file_path}")
            
            return {
                "transcript": transcript,
                "summary": summary
            }
        
        # Upload to S3
        try:
            logger.info("Attempting to upload to S3...")
            object_name = file.filename
            bucket_name = "pod-notes"
            s3_url = upload_file_to_s3(open(temp_file_path, "rb"), bucket_name, object_name)
            logger.info(f"Uploaded to S3: {s3_url}")
        except Exception as e:
            logger.error(f"Error uploading to S3: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error uploading to S3: {str(e)}")
        
        # Transcribe the audio
        try:
            logger.info("Starting transcription...")
            transcript = transcribe_audio(temp_file_path)
            logger.info("Transcription completed")
        except Exception as e:
            logger.error(f"Error transcribing audio: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error transcribing audio: {str(e)}")
        
        # Save transcript to DynamoDB
        try:
            logger.info("Saving transcript to DynamoDB...")
            save_podcast_to_dynamodb(object_name, "transcript", transcript, datetime.now())
            logger.info("Transcript saved to DynamoDB")
        except Exception as e:
            logger.error(f"Error saving transcript to DynamoDB: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error saving transcript to DynamoDB: {str(e)}")
        
        # Generate summary
        try:
            logger.info("Setting up ChromaVS...")
            vector_store = setup_ChromaVS([transcript])
            logger.info("Generating summary...")
            summary = summarise_podcast("gemma3:4b", transcript)
            logger.info("Summary generated")
            
            logger.info("Saving summary to DynamoDB...")
            save_podcast_to_dynamodb(object_name, "summary", summary, datetime.now())
            logger.info("Summary saved to DynamoDB")
        except Exception as e:
            logger.error(f"Error generating or saving summary: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error generating or saving summary: {str(e)}")
        
        # Clean up
        os.remove(temp_file_path)
        logger.info(f"Removed temporary file: {temp_file_path}")
        
        return {
            "transcript": transcript,
            "summary": summary
        }
    except Exception as e:
        logger.error(f"Unexpected error in upload_podcast: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/qa/{podcast_id}")
async def process_question(podcast_id: str, question: str = Form(...)):
    try:
        if not aws_available and not MOCK_MODE:
            logger.error("AWS services are not available and MOCK_MODE is disabled")
            raise HTTPException(status_code=500, detail="AWS services are not available")
        
        logger.info(f"Received question for podcast: {podcast_id}")
        logger.info(f"Question: {question}")
        
        # If in mock mode, generate mock answer
        if MOCK_MODE:
            logger.info("MOCK_MODE: Generating mock answer")
            mock_answer = f"This is a mock answer to your question: '{question}'. In a real application, this would be generated based on the podcast transcript."
            return {"answer": mock_answer}
        
        # Get transcript from DynamoDB
        try:
            response = table.get_item(
                Key={
                    'PodcastId': podcast_id,
                    'Type': 'transcript'
                }
            )
            transcript = response.get('Item', {}).get('Content', '')
            if not transcript:
                logger.error(f"Transcript not found for podcast: {podcast_id}")
                raise HTTPException(status_code=404, detail="Transcript not found")
            
            logger.info(f"Retrieved transcript for podcast: {podcast_id}")
        except Exception as e:
            logger.error(f"Error retrieving transcript: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error retrieving transcript: {str(e)}")
        
        # Process question using LangChain
        try:
            logger.info("Processing question with LangChain...")
            answer = langchain_ask_question(question, transcript)
            logger.info("Answer generated")
            return {"answer": answer}
        except Exception as e:
            logger.error(f"Error processing question: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error processing question: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error in process_question: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
