from langchain_community.vectorstores import Chroma
from langchain_core import embeddings
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.retrievers import BM25Retriever
from langchain.retrievers import EnsembleRetriever
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
    

def retrieve_from_ChromaVS(podcast_id, query, hybrid=True, filter_metadata=None, query_type=None):
    """
    Retrieve relevant documents from a Chroma vector store.
    
    Args:
        podcast_id (str): The podcast ID
        query (str): The query to search for
        hybrid (bool): Whether to use hybrid search (semantic + BM25)
        filter_metadata (dict, optional): Metadata filters to apply (e.g., speaker, time range)
        query_type (str, optional): Type of query ('factual', 'conceptual', or None for auto-detection)
        
    Returns:
        langchain.retrievers.Retriever: The retriever object or None if error
    """
    try:
        local_path = VECTOR_STORE_DIR / f"{podcast_id}.chroma"
        embeddings = get_embeddings()
        
        if local_path.exists():
            # Prepare search kwargs with metadata filters if provided
            search_kwargs = {"k": 5}  # Number of documents to retrieve
            
            if filter_metadata:
                search_kwargs["filter"] = filter_metadata
            
            vector_store = Chroma(persist_directory=str(local_path), embedding_function=embeddings)
            
            if hybrid:
                try:
                    # Import necessary components for hybrid search
                    from langchain_community.retrievers import BM25Retriever
                    from langchain.retrievers import EnsembleRetriever
                    
                    # Get all documents from the vector store
                    all_docs = vector_store.get()
                    documents = []
                    
                    # Convert to Document objects
                    if 'documents' in all_docs and 'metadatas' in all_docs:
                        for i, (doc, metadata) in enumerate(zip(all_docs['documents'], all_docs['metadatas'])):
                            documents.append(Document(page_content=doc, metadata=metadata))
                    
                    # Create BM25 retriever
                    bm25_retriever = BM25Retriever.from_documents(documents)
                    bm25_retriever.k = 5
                    
                    # Create vector store retriever with metadata filters
                    vector_retriever = vector_store.as_retriever(
                        search_type="similarity",
                        search_kwargs=search_kwargs
                    )
                    
                    # Determine weights based on query type
                    if query_type is None:
                        # Auto-detect query type based on query characteristics
                        query_type = classify_query(query)
                    
                    if query_type == "factual":
                        # Factual queries benefit more from keyword search
                        weights = [0.7, 0.3]  # Higher weight for BM25
                        logger.info(f"Using factual query weights (BM25: 0.7, Semantic: 0.3) for query: {query}")
                    elif query_type == "conceptual":
                        # Conceptual queries benefit more from semantic search
                        weights = [0.3, 0.7]  # Higher weight for semantic search
                        logger.info(f"Using conceptual query weights (BM25: 0.3, Semantic: 0.7) for query: {query}")
                    else:
                        # Default balanced weights
                        weights = [0.5, 0.5]
                        logger.info(f"Using balanced weights (BM25: 0.5, Semantic: 0.5) for query: {query}")
                    
                    # Create ensemble retriever with determined weights
                    ensemble_retriever = EnsembleRetriever(
                        retrievers=[bm25_retriever, vector_retriever],
                        weights=weights
                    )
                    
                    logger.info(f"Using hybrid retrieval (BM25 + semantic) for podcast: {podcast_id}")
                    return ensemble_retriever
                except Exception as e:
                    # If hybrid retrieval fails, fall back to semantic-only retrieval
                    logger.error(f"Error setting up hybrid retrieval, falling back to semantic-only: {str(e)}")
                    # Continue to semantic-only retrieval below
            
            # Configure the retriever with search parameters (semantic only)
            retriever = vector_store.as_retriever(
                search_type="similarity",
                search_kwargs=search_kwargs
            )
            
            logger.info(f"Using semantic-only retrieval for podcast: {podcast_id}")
            return retriever
        else:
            error_msg = f"Vector store not found for podcast: {podcast_id}"
            logger.error(error_msg)
            # Return a default empty retriever instead of an error string
            from langchain.schema import BaseRetriever
            class EmptyRetriever(BaseRetriever):
                def get_relevant_documents(self, query):
                    return []
            return EmptyRetriever()
    except Exception as e:
        error_msg = f"Error retrieving from vector store: {str(e)}"
        logger.error(error_msg)
        # Return a default empty retriever instead of an error string
        from langchain.schema import BaseRetriever
        class EmptyRetriever(BaseRetriever):
            def get_relevant_documents(self, query):
                return []
        return EmptyRetriever()

def retrieve_with_metadata_filters(podcast_id, query, speaker=None, start_time=None, end_time=None, hybrid=True, query_type=None):
    """
    Retrieve documents with specific metadata filters.
    
    Args:
        podcast_id (str): The podcast ID
        query (str): The query to search for
        speaker (str, optional): Filter by speaker name
        start_time (float, optional): Filter by start time in seconds
        end_time (float, optional): Filter by end time in seconds
        hybrid (bool): Whether to use hybrid search
        query_type (str, optional): Type of query ('factual', 'conceptual', or None for auto-detection)
        
    Returns:
        langchain.retrievers.Retriever: The retriever object
    """
    # Build metadata filter
    filter_metadata = {}
    
    if speaker:
        filter_metadata["speaker"] = speaker
    
    if start_time is not None:
        filter_metadata["start_seconds"] = {"$gte": float(start_time)}
    
    if end_time is not None:
        filter_metadata["end_seconds"] = {"$lte": float(end_time)}
    
    # Log the metadata filters being applied
    if filter_metadata:
        logger.info(f"Applying metadata filters: {filter_metadata}")
    
    # Use the main retrieve function with filters
    return retrieve_from_ChromaVS(
        podcast_id=podcast_id,
        query=query,
        hybrid=hybrid,
        filter_metadata=filter_metadata,
        query_type=query_type
    )

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

def classify_query(query):
    """
    Classify a query as factual or conceptual based on its characteristics.
    
    Args:
        query (str): The query to classify
        
    Returns:
        str: 'factual' or 'conceptual'
    """
    # List of factual question indicators
    factual_indicators = [
        "who", "what", "when", "where", "how many", "which", 
        "name", "list", "identify", "mention", "specific", 
        "exact", "date", "time", "location", "person", "number"
    ]
    
    # List of conceptual question indicators
    conceptual_indicators = [
        "why", "how", "explain", "describe", "compare", "contrast",
        "analyze", "evaluate", "interpret", "opinion", "perspective",
        "meaning", "significance", "implications", "relationship", 
        "connection", "difference", "similarity"
    ]
    
    # Convert query to lowercase for case-insensitive matching
    query_lower = query.lower()
    
    # Count occurrences of indicators
    factual_count = sum(1 for indicator in factual_indicators if indicator in query_lower)
    conceptual_count = sum(1 for indicator in conceptual_indicators if indicator in query_lower)
    
    # Check for presence of quotes (often indicates factual search for exact phrases)
    if '"' in query or "'" in query:
        factual_count += 1
    
    # Determine query type based on indicator counts
    if factual_count > conceptual_count:
        return "factual"
    elif conceptual_count > factual_count:
        return "conceptual"
    else:
        # If tied or no indicators found, default to balanced
        return "balanced"

def view_vector_store(podcast_id, limit=None, offset=0, include_embeddings=False, filter_metadata=None):
    """
    View and inspect the contents of a ChromaDB vector store.
    
    Args:
        podcast_id (str): The podcast ID
        limit (int, optional): Maximum number of documents to return
        offset (int, optional): Number of documents to skip
        include_embeddings (bool): Whether to include embeddings in the output
        filter_metadata (dict, optional): Metadata filters to apply
        
    Returns:
        dict: The vector store contents
    """
    try:
        local_path = VECTOR_STORE_DIR / f"{podcast_id}.chroma"
        embeddings = get_embeddings()
        
        if not local_path.exists():
            logger.error(f"Vector store not found for podcast: {podcast_id}")
            return {"error": f"Vector store not found for podcast: {podcast_id}"}
        
        # Initialize the vector store
        vector_store = Chroma(persist_directory=str(local_path), embedding_function=embeddings)
        
        # Get all documents from the vector store
        if filter_metadata:
            all_docs = vector_store.get(where=filter_metadata)
        else:
            all_docs = vector_store.get()
        
        # Format the results
        results = []
        
        if 'documents' in all_docs and 'metadatas' in all_docs:
            # Apply offset and limit
            start_idx = offset
            end_idx = None if limit is None else offset + limit
            
            for i, (doc, metadata) in enumerate(zip(all_docs['documents'][start_idx:end_idx], 
                                                   all_docs['metadatas'][start_idx:end_idx])):
                result = {
                    "id": i + offset,
                    "content": doc,
                    "metadata": metadata
                }
                
                # Include embeddings if requested
                if include_embeddings and 'embeddings' in all_docs:
                    result["embedding"] = all_docs['embeddings'][i + offset]
                
                results.append(result)
        
        # Return statistics along with the results
        return {
            "podcast_id": podcast_id,
            "total_documents": len(all_docs.get('documents', [])),
            "returned_documents": len(results),
            "documents": results
        }
    except Exception as e:
        error_msg = f"Error viewing vector store: {str(e)}"
        logger.error(error_msg)
        return {"error": error_msg}

def get_vector_store_stats(podcast_id=None):
    """
    Get statistics about the vector stores.
    
    Args:
        podcast_id (str, optional): The podcast ID to get stats for.
                                   If None, returns stats for all podcasts.
        
    Returns:
        dict: Statistics about the vector stores
    """
    try:
        stats = {}
        
        if podcast_id:
            # Get stats for a specific podcast
            local_path = VECTOR_STORE_DIR / f"{podcast_id}.chroma"
            
            if not local_path.exists():
                return {"error": f"Vector store not found for podcast: {podcast_id}"}
            
            embeddings = get_embeddings()
            vector_store = Chroma(persist_directory=str(local_path), embedding_function=embeddings)
            
            # Get document count
            all_docs = vector_store.get()
            doc_count = len(all_docs.get('documents', []))
            
            # Get unique speakers
            speakers = set()
            for metadata in all_docs.get('metadatas', []):
                if 'speaker' in metadata:
                    speakers.add(metadata['speaker'])
            
            # Calculate total duration
            total_duration = 0
            for metadata in all_docs.get('metadatas', []):
                if 'duration' in metadata:
                    total_duration += metadata['duration']
            
            stats[podcast_id] = {
                "document_count": doc_count,
                "speakers": list(speakers),
                "total_duration_seconds": total_duration,
                "total_duration_formatted": f"{int(total_duration // 3600):02d}:{int((total_duration % 3600) // 60):02d}:{int(total_duration % 60):02d}"
            }
        else:
            # Get stats for all podcasts
            all_podcasts = []
            
            # List all .chroma directories in the vector store directory
            for item in os.listdir(VECTOR_STORE_DIR):
                if item.endswith('.chroma') and os.path.isdir(VECTOR_STORE_DIR / item):
                    podcast_id = item[:-7]  # Remove .chroma suffix
                    all_podcasts.append(podcast_id)
            
            # Get stats for each podcast
            for podcast_id in all_podcasts:
                podcast_stats = get_vector_store_stats(podcast_id)
                if 'error' not in podcast_stats:
                    stats[podcast_id] = podcast_stats[podcast_id]
        
        return stats
    except Exception as e:
        error_msg = f"Error getting vector store stats: {str(e)}"
        logger.error(error_msg)
        return {"error": error_msg}
