from langchain_community.vectorstores import Chroma
from langchain_core import embeddings
from langchain_huggingface import HuggingFaceEmbeddings
from langchain.docstore.document import Document
import os
import logging
from pathlib import Path
from functools import lru_cache
from langchain.text_splitter import RecursiveCharacterTextSplitter
import torch
import shutil
import time
from decimal import Decimal
import re

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Check if we're in AWS environment
IS_AWS = os.environ.get('IS_AWS', 'false').lower() == 'true'

MODEL_CACHE = Path("./model_cache")
MODEL_CACHE.mkdir(exist_ok=True)

def get_device():
    if torch.backends.mps.is_available():
        logger.info("Using MPS device")
        return "mps"
    elif torch.backends.cuda.is_available():
        logger.info("Using CUDA device")
        return "cuda"
    logger.info("Using CPU device")
    return "cpu"

# Directory to store vector stores for each podcast
VECTOR_STORE_DIR = Path(os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "vector_stores"))
os.makedirs(VECTOR_STORE_DIR, exist_ok=True)


@lru_cache(maxsize=1)
def get_embeddings():
    device = get_device()
    logger.info(f"Using device: {device}")
    return HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2", model_kwargs={'device': device}, cache_folder=str(MODEL_CACHE))

vector_stores = {}

def convert_timestamp_to_seconds(timestamp):
    """
    Convert a timestamp string (HH:MM:SS.ms or MM:SS.ms or SS.ms) to seconds.
    
    Args:
        timestamp (str or float): The timestamp to convert
        
    Returns:
        float: The timestamp in seconds
    """
    if isinstance(timestamp, (int, float, Decimal)):
        return float(timestamp)
    
    if not timestamp or timestamp == "":
        return 0.0
    
    # Handle different timestamp formats
    parts = timestamp.split(':')
    if len(parts) == 3:  # HH:MM:SS.ms
        hours, minutes, seconds = parts
        return int(hours) * 3600 + int(minutes) * 60 + float(seconds)
    elif len(parts) == 2:  # MM:SS.ms
        minutes, seconds = parts
        return int(minutes) * 60 + float(seconds)
    else:  # SS.ms
        return float(parts[0])

def extract_text_from_transcript(transcript):
    """
    Extract text content from various transcript formats.
    
    Args:
        transcript: The transcript data (string, dict, or list)
        
    Returns:
        str: The extracted text content
    """
    if isinstance(transcript, str):
        return transcript
    
    if isinstance(transcript, dict):
        # Try to extract text from dictionary format
        if "text" in transcript:
            return transcript["text"]
        elif "timestamped_text" in transcript:
            return transcript["timestamped_text"]
        elif "segments" in transcript and isinstance(transcript["segments"], list):
            # Extract text from segments
            return "\n".join([segment.get("text", "") for segment in transcript["segments"]])
    
    if isinstance(transcript, list):
        # Process list of segments
        segments_text = []
        for segment in transcript:
            if isinstance(segment, dict) and "text" in segment:
                segments_text.append(segment["text"])
            elif isinstance(segment, str):
                segments_text.append(segment)
        
        return "\n".join(segments_text)
    
    # If we can't extract text, return empty string
    logger.warning(f"Could not extract text from transcript of type {type(transcript)}")
    return ""

def process_transcript_segments(transcript):
    """
    Process transcript segments to extract enhanced metadata.
    
    Args:
        transcript: The transcript data (string, dict, or list)
        
    Returns:
        list: List of segments with enhanced metadata
    """
    segments = []
    
    # Handle different transcript formats
    if isinstance(transcript, str):
        # For plain text, create a single segment
        segments.append({
            "text": transcript,
            "start": 0,
            "end": 0,
            "duration": 0,
            "speaker": "Unknown",
            "segment_id": 0
        })
    
    elif isinstance(transcript, dict):
        # Try to extract segments from dictionary format
        if "segments" in transcript and isinstance(transcript["segments"], list):
            segments = transcript["segments"]
        elif "text" in transcript:
            # Create a single segment from the text
            segments.append({
                "text": transcript["text"],
                "start": transcript.get("start", 0),
                "end": transcript.get("end", 0),
                "speaker": transcript.get("speaker", "Unknown"),
                "segment_id": 0
            })
    
    elif isinstance(transcript, list):
        # Process list of segments
        segments = transcript
    
    # Enhance metadata for each segment
    enhanced_segments = []
    for i, segment in enumerate(segments):
        if isinstance(segment, dict):
            # Convert timestamps to seconds for numerical filtering
            start_seconds = convert_timestamp_to_seconds(segment.get("start", 0))
            end_seconds = convert_timestamp_to_seconds(segment.get("end", 0))
            
            # Calculate duration
            duration = end_seconds - start_seconds if end_seconds > start_seconds else 0
            
            # Create enhanced segment
            enhanced_segment = {
                "text": segment.get("text", ""),
                "start": segment.get("start", 0),
                "end": segment.get("end", 0),
                "start_seconds": start_seconds,
                "end_seconds": end_seconds,
                "duration": duration,
                "speaker": segment.get("speaker", "Unknown"),
                "segment_id": segment.get("segment_id", i)
            }
            
            # Add any additional metadata that might be present
            for key, value in segment.items():
                if key not in enhanced_segment:
                    enhanced_segment[key] = value
            
            enhanced_segments.append(enhanced_segment)
        elif isinstance(segment, str):
            # Create a basic segment for string items
            enhanced_segments.append({
                "text": segment,
                "start": 0,
                "end": 0,
                "start_seconds": 0,
                "end_seconds": 0,
                "duration": 0,
                "speaker": "Unknown",
                "segment_id": i
            })
    
    return enhanced_segments

def setup_ChromaVS(podcast_id, transcript):
    """
    Set up a ChromaDB vector store for a podcast transcript
    Args:
        podcast_id (str): The podcast ID
        transcript (str or dict): The transcript text or structured transcript data
    Returns:
        dict: Success status and vector store path
    """
    try:
        # Create a local directory for the vector store
        local_path = VECTOR_STORE_DIR / f"{podcast_id}.chroma"
        # Remove the existing directory if it exists
        if os.path.exists(local_path):
            shutil.rmtree(local_path)
        # Create a new directory
        os.makedirs(local_path, exist_ok=True)     
        embeddings = get_embeddings()
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
        )

        vector_store = Chroma(persist_directory=str(local_path), embedding_function=embeddings)
        
        # Process transcript segments with enhanced metadata
        enhanced_segments = process_transcript_segments(transcript)
        
        # Format transcript segments with timestamps and speaker information
        formatted_segments = []
        for segment in enhanced_segments:
            start_time = segment.get("start", "")
            end_time = segment.get("end", "")
            speaker = segment.get("speaker", "Unknown")
            text = segment.get("text", "")
            
            # Format each segment with timestamp and speaker info
            formatted_text = f"[{start_time} - {end_time}]\nSpeaker: {speaker}\nText: {text}"
            formatted_segments.append({
                "text": formatted_text,
                "metadata": segment
            })
        
        # Create Document objects for each segment
        documents = []
        for i, segment in enumerate(formatted_segments):
            doc_id = f"{podcast_id}-segment-{i}"
            # Create a Document object with the segment text and metadata
            doc = Document(
                page_content=segment["text"],
                metadata={
                    "podcast_id": podcast_id,
                    "segment_id": i,
                    "start": segment["metadata"].get("start", ""),
                    "end": segment["metadata"].get("end", ""),
                    "start_seconds": segment["metadata"].get("start_seconds", 0),
                    "end_seconds": segment["metadata"].get("end_seconds", 0),
                    "duration": segment["metadata"].get("duration", 0),
                    "speaker": segment["metadata"].get("speaker", "Unknown")
                }
            )
            documents.append(doc)
        
        # Add documents to the vector store
        vector_store.add_documents(documents)
        
        # Persist the vector store
        vector_store.persist()
        logger.info(f"Created ChromaDB vector store for podcast {podcast_id}")
        return {"success": True, "path": str(local_path)}
    except Exception as e:
        logger.error(f"Error setting up vector store: {str(e)}")
        return {"success": False, "error": str(e)}
    

def retrieve_from_ChromaVS(podcast_id, query):
    """
    Retrieve relevant documents from a Chroma vector store.
    
    Args:
        podcast_id (str): The podcast ID
        query (str): The query to search for
        
    Returns:
        langchain.retrievers.Retriever: The retriever object
    """
    try:
        local_path = VECTOR_STORE_DIR / f"{podcast_id}.chroma"
        embeddings = get_embeddings()
        
        if local_path.exists():
            vector_store = Chroma(persist_directory=str(local_path), embedding_function=embeddings)
            
            # Configure the retriever with search parameters
            retriever = vector_store.as_retriever(
                search_type="similarity",
                search_kwargs={
                    "k": 5  # Number of documents to retrieve
                }
            )
            return retriever
        else:
            error_msg = f"Vector store not found for podcast: {podcast_id}"
            logger.error(error_msg)
            return error_msg
    except Exception as e:
        error_msg = f"Error retrieving from vector store: {str(e)}"
        logger.error(error_msg)
        return error_msg

def add_chat_message_to_ChromaVS(message, podcast_id):
    """
    Add a chat message to the vector store for a podcast.
    
    Args:
        message (str): The message text to add
        podcast_id (str): The podcast ID
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        embeddings = get_embeddings()
        local_path = VECTOR_STORE_DIR / f"{podcast_id}.chroma"
        
        # Get the vector store
        if local_path.exists():
            vector_store = Chroma(persist_directory=str(local_path), embedding_function=embeddings)
            
            # Create a document with metadata
            timestamp = time.time()
            doc = Document(
                page_content=message,
                metadata={
                    "podcast_id": podcast_id,
                    "type": "chat_message",
                    "timestamp": timestamp,
                    "is_user": message.startswith("User question:"),
                    "is_ai": message.startswith("AI answer:")
                }
            )
            
            # Add document to vector store
            vector_store.add_documents([doc])
            vector_store.persist()
            return True
        else:
            logger.error(f"Vector store not found for podcast: {podcast_id}")
            return False
    except Exception as e:
        logger.error(f"Error adding chat message to vector store: {str(e)}")
        return False

def filter_by_speaker(podcast_id, speaker):
    """
    Filter vector store documents by speaker.
    
    Args:
        podcast_id (str): The podcast ID
        speaker (str): The speaker name to filter by
        
    Returns:
        list: The filtered documents
    """
    try:
        local_path = VECTOR_STORE_DIR / f"{podcast_id}.chroma"
        embeddings = get_embeddings()
        
        if local_path.exists():
            vector_store = Chroma(persist_directory=str(local_path), embedding_function=embeddings)
            
            # Filter by speaker metadata
            filtered_docs = vector_store.get(
                where={"speaker": speaker}
            )
            
            return filtered_docs
        else:
            logger.error(f"Vector store not found for podcast: {podcast_id}")
            return []
    except Exception as e:
        logger.error(f"Error filtering by speaker: {str(e)}")
        return []

def filter_by_time_range(podcast_id, start_time, end_time):
    """
    Filter vector store documents by time range.
    
    Args:
        podcast_id (str): The podcast ID
        start_time (float): The start time in seconds
        end_time (float): The end time in seconds
        
    Returns:
        list: The filtered documents
    """
    try:
        local_path = VECTOR_STORE_DIR / f"{podcast_id}.chroma"
        embeddings = get_embeddings()
        
        if local_path.exists():
            vector_store = Chroma(persist_directory=str(local_path), embedding_function=embeddings)
            
            # Filter by time range metadata
            filtered_docs = vector_store.get(
                where={
                    "start_seconds": {"$gte": start_time},
                    "end_seconds": {"$lte": end_time}
                }
            )
            
            return filtered_docs
        else:
            logger.error(f"Vector store not found for podcast: {podcast_id}")
            return []
    except Exception as e:
        logger.error(f"Error filtering by time range: {str(e)}")
        return []
