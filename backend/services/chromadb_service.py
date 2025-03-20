from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
import os

# Directory to store vector stores for each podcast
VECTOR_STORE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "vector_stores")
os.makedirs(VECTOR_STORE_DIR, exist_ok=True)

# Dictionary to cache vector stores in memory
vector_stores = {}

def setup_ChromaVS(transcript, podcast_id=None):
    """
    Set up a Chroma vector store from a transcript.
    
    Args:
        transcript (list): The transcript text or list of texts
        podcast_id (str, optional): The podcast ID for persisting the vector store
        
    Returns:
        Chroma: The Chroma vector store
    """
    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    
    # If podcast_id is provided, try to load existing vector store
    if podcast_id:
        # Check if it's in memory cache first
        if podcast_id in vector_stores:
            return vector_stores[podcast_id]
        
        # Try to load from disk
        vs_path = os.path.join(VECTOR_STORE_DIR, f"{podcast_id}")
        if os.path.exists(vs_path):
            try:
                chroma = Chroma(persist_directory=vs_path, embedding_function=embeddings)
                vector_stores[podcast_id] = chroma
                return chroma
            except Exception as e:
                print(f"Error loading vector store: {str(e)}")
    
    # Create new vector store
    if isinstance(transcript, list):
        chroma = Chroma.from_texts(transcript, embeddings)
    else:
        chroma = Chroma.from_texts([transcript], embeddings)
    
    # Save to cache and disk if podcast_id is provided
    if podcast_id:
        vector_stores[podcast_id] = chroma
        vs_path = os.path.join(VECTOR_STORE_DIR, f"{podcast_id}")
        try:
            chroma.persist()
        except Exception as e:
            print(f"Error saving vector store: {str(e)}")
    
    return chroma

def retrieve_from_ChromaVS(chroma, query):
    """
    Retrieve relevant documents from a Chroma vector store.
    
    Args:
        chroma (Chroma): The Chroma vector store
        query (str): The query to search for
        
    Returns:
        list: The relevant documents
    """
    retriever = chroma.as_retriever()
    return retriever.get_relevant_documents(query)

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
        embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
        
        # Get the vector store
        if podcast_id in vector_stores:
            chroma = vector_stores[podcast_id]
        else:
            vs_path = os.path.join(VECTOR_STORE_DIR, f"{podcast_id}")
            if os.path.exists(vs_path):
                chroma = Chroma(persist_directory=vs_path, embedding_function=embeddings)
                vector_stores[podcast_id] = chroma
            else:
                # If no vector store exists, create a new one with just the message
                chroma = Chroma.from_texts([message], embeddings)
                vector_stores[podcast_id] = chroma
                vs_path = os.path.join(VECTOR_STORE_DIR, f"{podcast_id}")
                chroma.persist()
                return True
        
        # Add the message to the vector store
        chroma.add_texts([message])
        
        # Persist the updated vector store
        vs_path = os.path.join(VECTOR_STORE_DIR, f"{podcast_id}")
        chroma.persist()
        
        return True
    except Exception as e:
        print(f"Error adding message to vector store: {str(e)}")
        return False
