"""
OpenSearch Vector Database Service for PodNotes

This module provides functions to interact with Amazon OpenSearch Service
for vector search capabilities. It handles the creation, indexing, and querying
of vector embeddings for podcast transcripts.
"""

import boto3
import json
import logging
import os
import requests
from requests.auth import HTTPBasicAuth
from requests_aws4auth import AWS4Auth
from langchain_community.vectorstores import OpenSearchVectorSearch
from langchain.docstore.document import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
from services.chromadb_service import get_embeddings
from pathlib import Path
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
REGION = 'us-east-1'  # Change to your region
OPENSEARCH_DOMAIN_ENDPOINT = os.environ.get('OPENSEARCH_DOMAIN_ENDPOINT', '')
IS_LOCAL = os.environ.get('IS_LOCAL', 'true').lower() == 'true'

# Authentication method: 'iam' or 'master_user'
AUTH_METHOD = os.environ.get('OPENSEARCH_AUTH_METHOD', 'iam')
MASTER_USERNAME = os.environ.get('OPENSEARCH_MASTER_USERNAME', '')
MASTER_PASSWORD = os.environ.get('OPENSEARCH_MASTER_PASSWORD', '')

# Directory for local fallback
LOCAL_VECTOR_STORE_DIR = Path(os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "vector_stores"))
os.makedirs(LOCAL_VECTOR_STORE_DIR, exist_ok=True)

def get_aws_auth():
    """
    Get AWS authentication for OpenSearch requests.
    
    Returns:
        tuple or requests_aws4auth.AWS4Auth: Authentication object for OpenSearch
    """
    if IS_LOCAL:
        logger.info("Local mode: No authentication needed")
        return None
    
    # Check the authentication method
    if AUTH_METHOD == 'master_user':
        # For direct requests with the requests library, we'll convert to HTTPBasicAuth
        # For the OpenSearch Python client, we'll return the tuple directly
        logger.info(f"Using master user authentication with username: {MASTER_USERNAME}")
        return (MASTER_USERNAME, MASTER_PASSWORD)
    
    elif AUTH_METHOD == 'iam':
        # Use IAM authentication
        logger.info("Using IAM authentication")
        credentials = boto3.Session().get_credentials()
        awsauth = AWS4Auth(
            credentials.access_key,
            credentials.secret_key,
            REGION,
            'es',
            session_token=credentials.token
        )
        return awsauth
    
    else:
        raise ValueError(f"Unsupported authentication method: {AUTH_METHOD}")

def test_opensearch_connection():
    """
    Test connection to OpenSearch.
    
    Returns:
        bool: True if connection successful, False otherwise
    """
    if IS_LOCAL:
        logger.info("Local mode: Skipping OpenSearch connection test")
        return True
    
    try:
        auth = get_aws_auth()
        
        # Use the requests library for a direct connection test
        url = f"{OPENSEARCH_DOMAIN_ENDPOINT}/_cluster/health"
        logger.info(f"Testing connection to {OPENSEARCH_DOMAIN_ENDPOINT}")
        
        if AUTH_METHOD == 'master_user':
            # Convert tuple to HTTPBasicAuth for requests
            auth_for_requests = HTTPBasicAuth(*auth)
            response = requests.get(url, auth=auth_for_requests, verify=True)
        else:
            # Use AWS4Auth directly
            response = requests.get(url, auth=auth, verify=True)
        
        if response.status_code == 200:
            logger.info(f"Successfully connected to OpenSearch. Cluster status: {response.json().get('status')}")
            return True
        else:
            logger.error(f"Failed to connect to OpenSearch. Status code: {response.status_code}")
            logger.error(f"Response: {response.text}")
            return False
    except Exception as e:
        logger.error(f"Error connecting to OpenSearch: {str(e)}")
        return False

def create_opensearch_index(index_name, dimension=384):
    """
    Create an OpenSearch index with vector search capabilities.
    
    Args:
        index_name (str): Name of the index to create
        dimension (int): Dimension of the vector embeddings (default: 384 for all-MiniLM-L6-v2)
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Skip if in local mode
        if IS_LOCAL:
            logger.info(f"Local mode: Skipping OpenSearch index creation for {index_name}")
            return True
            
        # Define index mapping with k-NN settings
        index_mapping = {
            "settings": {
                "index.knn": True,
                "number_of_shards": 2,
                "number_of_replicas": 1
            },
            "mappings": {
                "properties": {
                    "vector_field": {
                        "type": "knn_vector",
                        "dimension": dimension,
                        "method": {
                            "name": "hnsw",
                            "space_type": "cosinesimil",
                            "engine": "nmslib",
                            "parameters": {
                                "ef_construction": 512,
                                "m": 16
                            }
                        }
                    },
                    "text": {"type": "text"},
                    "metadata": {"type": "object"}
                }
            }
        }
        
        # Create the index
        auth = get_aws_auth()
        if not auth:
            logger.error("Failed to get authentication")
            return False
            
        headers = {"Content-Type": "application/json"}
        
        # Check if index exists
        try:
            response = requests.head(
                f"{OPENSEARCH_DOMAIN_ENDPOINT}/{index_name}",
                auth=auth,
                headers=headers,
                verify=True,
                timeout=10
            )
            
            # If index doesn't exist (404), create it
            if response.status_code == 404:
                response = requests.put(
                    f"{OPENSEARCH_DOMAIN_ENDPOINT}/{index_name}",
                    auth=auth,
                    json=index_mapping,
                    headers=headers,
                    verify=True,
                    timeout=10
                )
                
                if response.status_code >= 200 and response.status_code < 300:
                    logger.info(f"Successfully created OpenSearch index: {index_name}")
                    return True
                else:
                    logger.error(f"Failed to create OpenSearch index: {response.text}")
                    return False
            elif response.status_code >= 200 and response.status_code < 300:
                logger.info(f"OpenSearch index already exists: {index_name}")
                return True
            else:
                logger.error(f"Error checking OpenSearch index: {response.status_code}")
                logger.error(response.text)
                return False
        except Exception as e:
            logger.error(f"Error creating/checking index: {str(e)}")
            return False
            
    except Exception as e:
        logger.error(f"Error in create_opensearch_index: {str(e)}")
        return False

def setup_opensearch_vector_store(transcript, object_name=None):
    """
    Set up an OpenSearch vector store from a transcript.
    
    Args:
        transcript (str or dict): The transcript text or dictionary
        object_name (str): The object name (e.g., podcast ID)
        
    Returns:
        OpenSearchVectorSearch: The vector store object or None if failed
    """
    try:
        # Extract text content if transcript is a dictionary
        text_content = ""
        if isinstance(transcript, dict):
            # Try to get the text content from different possible fields
            if "text" in transcript:
                text_content = transcript["text"]
            elif "timestamped_text" in transcript:
                text_content = transcript["timestamped_text"]
            elif "segments" in transcript and transcript["segments"]:
                # Concatenate text from segments
                text_content = " ".join([segment.get("text", "") for segment in transcript["segments"]])
            else:
                # If no recognizable format, convert to string
                text_content = str(transcript)
        else:
            # If transcript is already a string, use it directly
            text_content = transcript
            
        # If in local mode, fall back to ChromaDB
        if IS_LOCAL:
            from services.chromadb_service import setup_ChromaVS
            logger.info(f"Local mode: Using ChromaDB fallback for {object_name}")
            return setup_ChromaVS(text_content, object_name)
        
        # Test connection first
        if not test_opensearch_connection():
            logger.error("Failed to connect to OpenSearch, falling back to ChromaDB")
            from services.chromadb_service import setup_ChromaVS
            return setup_ChromaVS(text_content, object_name)
        
        # Create index name from object name
        index_name = f"podcast_vectors_{object_name}".lower().replace(" ", "_")
        
        # Create the index if it doesn't exist
        if not create_opensearch_index(index_name):
            logger.error(f"Failed to create OpenSearch index for {object_name}, falling back to ChromaDB")
            from services.chromadb_service import setup_ChromaVS
            return setup_ChromaVS(text_content, object_name)
            
        # Get embeddings model
        embeddings = get_embeddings()
        
        # Split transcript into chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
        )
        
        transcript_chunks = text_splitter.split_text(text_content)
        if not transcript_chunks:
            logger.error("Failed to split transcript into chunks")
            return None
            
        # Create documents from chunks
        docs = [Document(page_content=chunk) for chunk in transcript_chunks]
        
        # Create OpenSearch vector store
        auth = get_aws_auth()
        vector_store = OpenSearchVectorSearch(
            index_name=index_name,
            embedding_function=embeddings,
            opensearch_url=OPENSEARCH_DOMAIN_ENDPOINT,
            http_auth=auth,
            use_ssl=True,
            verify_certs=True,
            ssl_assert_hostname=False,
            timeout=60,
            bulk_size=100  # Reduced for better reliability
        )
        
        # Add documents to vector store with retry logic
        max_retries = 3
        for attempt in range(max_retries):
            try:
                vector_store.add_documents(docs)
                logger.info(f"Successfully added {len(docs)} documents to OpenSearch index {index_name}")
                break
            except Exception as e:
                logger.error(f"Error adding documents to OpenSearch (attempt {attempt+1}/{max_retries}): {str(e)}")
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)  # Exponential backoff
                else:
                    logger.error("Failed all attempts to add documents to OpenSearch")
                    return None
        
        logger.info(f"Successfully set up OpenSearch vector store for {object_name}")
        return vector_store
        
    except Exception as e:
        logger.error(f"Error setting up OpenSearch vector store: {str(e)}")
        # Fall back to ChromaDB
        try:
            from services.chromadb_service import setup_ChromaVS
            logger.info(f"Falling back to ChromaDB for {object_name} due to error: {str(e)}")
            return setup_ChromaVS(text_content, object_name)
        except Exception as fallback_error:
            logger.error(f"Fallback to ChromaDB also failed: {str(fallback_error)}")
            return None

def retrieve_from_opensearch(object_name, query):
    """
    Retrieve relevant documents from an OpenSearch vector store.
    
    Args:
        object_name (str): The object name (e.g., podcast ID)
        query (str): The query to search for
        
    Returns:
        list: The relevant documents or retriever object
    """
    try:
        # If in local mode, fall back to ChromaDB
        if IS_LOCAL:
            from services.chromadb_service import retrieve_from_ChromaVS
            logger.info(f"Local mode: Using ChromaDB fallback for {object_name}")
            return retrieve_from_ChromaVS(object_name, query)
            
        # Test connection first
        if not test_opensearch_connection():
            logger.error("Failed to connect to OpenSearch, falling back to ChromaDB")
            from services.chromadb_service import retrieve_from_ChromaVS
            return retrieve_from_ChromaVS(object_name, query)
            
        # Create index name from object name
        index_name = f"podcast_vectors_{object_name}".lower().replace(" ", "_")
        
        # Get embeddings model
        embeddings = get_embeddings()
        
        # Create OpenSearch vector store
        auth = get_aws_auth()
        vector_store = OpenSearchVectorSearch(
            index_name=index_name,
            embedding_function=embeddings,
            opensearch_url=OPENSEARCH_DOMAIN_ENDPOINT,
            http_auth=auth,
            use_ssl=True,
            verify_certs=True,
            ssl_assert_hostname=False,
            timeout=30
        )
        
        # Create retriever
        retriever = vector_store.as_retriever(
            search_type="similarity",
            search_kwargs={"k": 5}  # Return top 5 most similar documents
        )
        
        return retriever
        
    except Exception as e:
        logger.error(f"Error retrieving from OpenSearch: {str(e)}")
        # Fall back to ChromaDB
        try:
            from services.chromadb_service import retrieve_from_ChromaVS
            logger.info(f"Falling back to ChromaDB for {object_name}")
            return retrieve_from_ChromaVS(object_name, query)
        except Exception as fallback_error:
            logger.error(f"Fallback to ChromaDB also failed: {str(fallback_error)}")
            return f"Vector store not found for object: {object_name}"

def add_message_to_opensearch(message, object_name):
    """
    Add a message to the OpenSearch vector store.
    
    Args:
        message (str): The message to add
        object_name (str): The object name (e.g., podcast ID)
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # If in local mode, fall back to ChromaDB
        if IS_LOCAL:
            from services.chromadb_service import add_chat_message_to_ChromaVS
            logger.info(f"Local mode: Using ChromaDB fallback for {object_name}")
            return add_chat_message_to_ChromaVS(message, object_name)
            
        # Test connection first
        if not test_opensearch_connection():
            logger.error("Failed to connect to OpenSearch, falling back to ChromaDB")
            from services.chromadb_service import add_chat_message_to_ChromaVS
            return add_chat_message_to_ChromaVS(message, object_name)
            
        # Create index name from object name
        index_name = f"podcast_vectors_{object_name}".lower().replace(" ", "_")
        
        # Get embeddings model
        embeddings = get_embeddings()
        
        # Create OpenSearch vector store
        auth = get_aws_auth()
        vector_store = OpenSearchVectorSearch(
            index_name=index_name,
            embedding_function=embeddings,
            opensearch_url=OPENSEARCH_DOMAIN_ENDPOINT,
            http_auth=auth,
            use_ssl=True,
            verify_certs=True,
            ssl_assert_hostname=False,
            timeout=30
        )
        
        # Add message to vector store
        vector_store.add_texts([message])
        
        logger.info(f"Successfully added message to OpenSearch for {object_name}")
        return True
        
    except Exception as e:
        logger.error(f"Error adding message to OpenSearch: {str(e)}")
        # Fall back to ChromaDB
        try:
            from services.chromadb_service import add_chat_message_to_ChromaVS
            logger.info(f"Falling back to ChromaDB for {object_name}")
            return add_chat_message_to_ChromaVS(message, object_name)
        except Exception as fallback_error:
            logger.error(f"Fallback to ChromaDB also failed: {str(fallback_error)}")
            return False
