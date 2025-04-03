from langchain_community.vectorstores import Chroma
from langchain_core import embeddings
from langchain_huggingface import HuggingFaceEmbeddings
from langchain.docstore.document import Document
#from services.chromadb_service import get_llm
import os
import logging
from pathlib import Path
from functools import lru_cache
from langchain.text_splitter import RecursiveCharacterTextSplitter
import torch
import shutil

logging.basicConfig(level=logging.ERROR)
logger = logging.getLogger(__name__)

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

@lru_cache(maxsize=1)
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
        
        # Format transcript segments with timestamps and speaker information
        if isinstance(transcript, list):
            # Process structured transcript with segments
            formatted_segments = []
            for segment in transcript:
                start_time = segment.get("start", "")
                end_time = segment.get("end", "")
                speaker = segment.get("speaker", "Unknown")
                text = segment.get("text", "")
                
                # Format each segment with timestamp and speaker info
                formatted_text = f"[{start_time} - {end_time}]\nSpeaker: {speaker}\nText: {text}"
                formatted_segments.append(formatted_text)
            
            # Join all formatted segments
            formatted_transcript = "\n\n".join(formatted_segments)
        else:
            # If it's not a list, use as is
            formatted_transcript = transcript
        
        # Split the formatted transcript into chunks
        chunks = text_splitter.split_text(formatted_transcript)
        if not chunks:
            return {"success": False, "error": "Failed to split document into chunks"}
        
        # Create Document objects for each chunk
        documents = []
        for i, chunk in enumerate(chunks):
            doc_id = f"{podcast_id}-chunk-{i}"
            # Create a Document object with the chunk text and metadata
            doc = Document(
                page_content=chunk,
                metadata={"podcast_id": podcast_id, "chunk_id": i}
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
        list: The relevant documents
    """
    local_path = VECTOR_STORE_DIR / f"{podcast_id}.chroma"
    embeddings = get_embeddings()
    if local_path.exists():
        vector_store = Chroma(persist_directory=str(local_path), embedding_function=embeddings)
        retriever = vector_store.as_retriever()
        return retriever
    else:
        return (f"Vector store not found for podcast: {podcast_id}")

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
            vector_store.add_texts([message])
            vector_store.persist()
            return True
        else:
            return False
    except Exception as e:
        logger.error(f"Error adding chat message to vector store: {str(e)}")
        return False
