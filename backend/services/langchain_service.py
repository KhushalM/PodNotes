from langchain_core.callbacks import CallbackManager, StreamingStdOutCallbackHandler
from services.chromadb_service import setup_ChromaVS, retrieve_from_ChromaVS, add_chat_message_to_ChromaVS
from services.opensearch_service import setup_opensearch_vector_store, retrieve_from_opensearch, add_message_to_opensearch
from langchain.memory import ConversationBufferMemory
from langchain_community.llms import Ollama
from services.chromadb_service import vector_stores
from langchain_community.vectorstores import Chroma
from langchain.chains import ConversationalRetrievalChain
from pathlib import Path
import logging
import os
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Check if we're in local mode
IS_LOCAL = os.environ.get('IS_LOCAL', 'true').lower() == 'true'

# Dictionary to store chat histories for each podcast
# Format: {podcast_id: [{"role": "human", "content": "..."}, {"role": "ai", "content": "..."}]}
chat_histories = {}

# Path to store chat histories
CHAT_HISTORY_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "chat_histories")
os.makedirs(CHAT_HISTORY_DIR, exist_ok=True)

VECTOR_STORE_DIR = Path(os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "vector_stores"))
os.makedirs(VECTOR_STORE_DIR, exist_ok=True)

def get_llm():
    model_name = "gemma3:4b"
    return Ollama(model=model_name)

def summarize_podcast(transcript):
    from langchain.text_splitter import RecursiveCharacterTextSplitter
    from langchain.chains.summarize import load_summarize_chain
    from langchain.docstore.document import Document
    
    
    # Initialize the LLM
    llm = get_llm()
    
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
    
    # Check if transcript is short enough for direct summarization
    if len(text_content) < 10000:
        logger.info("Transcript is short enough for direct summarization")  # Approximate character count for context window
        summarizer = load_summarize_chain(llm, chain_type="stuff")
        return summarizer.run([Document(page_content=text_content)])
    
    # For longer transcripts, use map-reduce
    logger.info("Transcript is too long for direct summarization, using map-reduce")
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=2000, chunk_overlap=200)
    docs = text_splitter.create_documents([text_content])
    
    summarizer = load_summarize_chain(llm, chain_type="map_reduce")
    return summarizer.run(docs)

# Add an alias for the summarize_podcast function to match what's being imported in main.py
summarise_podcast = summarize_podcast

def load_chat_history(podcast_id):
    """
    Load chat history for a specific podcast from disk
    
    Args:
        podcast_id (str): The podcast ID
        
    Returns:
        list: The chat history for the podcast
    """
    history_file = os.path.join(CHAT_HISTORY_DIR, f"{podcast_id}.json")
    if os.path.exists(history_file):
        try:
            with open(history_file, 'r') as f:
                return json.load(f)
        except Exception:
            return []
    return []

def save_chat_history(podcast_id, history):
    """
    Save chat history for a specific podcast to disk
    
    Args:
        podcast_id (str): The podcast ID
        history (list): The chat history to save
    """
    history_file = os.path.join(CHAT_HISTORY_DIR, f"{podcast_id}.json")
    with open(history_file, 'w') as f:
        json.dump(history, f)

def ask_question(question, podcast_id):
    """
    Process a question against a transcript using LangChain, with chat history support.
    
    Args:
        question (str): The question to answer
        transcript (str): The transcript text to search for answers
        podcast_id (str, optional): The podcast ID for maintaining chat history
        
    Returns:
        str: The answer to the question
    """
    from langchain_community.llms import Ollama
    logger.info(f"Processing question for podcast: {podcast_id}")
    
    # Setup LLM
    llm = get_llm()
    local_path = VECTOR_STORE_DIR / f"{podcast_id}.chroma"

    # Get the vector store retriever
    if IS_LOCAL:
        # Use local ChromaDB
        if local_path.exists():
            retriever = retrieve_from_ChromaVS(podcast_id, question)
        else:
            logger.error("Attempted to get answer with no podcast loaded")
            return {"error": "Please upload a podcast first before asking questions."}
    else:
        # Use OpenSearch
        retriever = retrieve_from_opensearch(podcast_id, question)
        if isinstance(retriever, str):
            logger.error(f"OpenSearch retriever error: {retriever}")
            return {"error": "Please upload a podcast first before asking questions."}

    # Load chat history if podcast_id is provided
    chat_history = []
    if podcast_id:
        # Load from disk or initialize if not exists
        if podcast_id not in chat_histories:
            chat_histories[podcast_id] = load_chat_history(podcast_id)
        
        # Add the current question to the vector store
        if IS_LOCAL:
            add_chat_message_to_ChromaVS(f"User question: {question}", podcast_id)
        else:
            add_message_to_opensearch(f"User question: {question}", podcast_id)
        
        # Convert the chat history to the format expected by LangChain
        for message in chat_histories[podcast_id]:
            if message["role"] == "human":
                chat_history.append((message["content"], ""))
            elif message["role"] == "ai" and chat_history:
                # Update the last tuple with the AI response
                last_human, _ = chat_history[-1]
                chat_history[-1] = (last_human, message["content"])
    
    # Create memory object
    memory = ConversationBufferMemory(
        memory_key="chat_history",
        return_messages=True
    )
    
    # Add existing chat history to memory
    for human_msg, ai_msg in chat_history:
        if human_msg:  # Only add if there's a human message
            memory.chat_memory.add_user_message(human_msg)
            if ai_msg:  # Add AI response if available
                memory.chat_memory.add_ai_message(ai_msg)
    
    # Create a custom prompt template to prevent self-evaluation
    from langchain.prompts import PromptTemplate
    
    qa_template = """You are a helpful assistant answering questions about a podcast.
    Use the following pieces of context to answer the question at the end. You are talking to the user directly.
    If you don't know the answer, just say that you don't know, don't try to make up an answer.
    Keep your answers direct and to the point without evaluating your own response.
    Do not include phrases like "based on the context" or "according to the transcript".
    Never respond as if you're reviewing or evaluating an answer.
    Never start with phrases like "That's a fantastic explanation" or "Here's a breakdown".
    Just answer the question directly as if you are having a conversation with the user.
    
    Context: {context}
    
    Question: {question}
    
    Answer: """
    
    QA_PROMPT = PromptTemplate(
        template=qa_template, 
        input_variables=["context", "question"]
    )
    
    # Create conversational QA chain with custom prompt
    qa_chain = ConversationalRetrievalChain.from_llm(
        llm=llm,
        retriever=retriever,
        memory=memory,
        combine_docs_chain_kwargs={"prompt": QA_PROMPT},
        return_source_documents=False,
        return_generated_question=False,
        verbose=False
    )
    
    # Get response
    response = qa_chain({"question": question})
    answer = response["answer"]
    
    # Clean the answer by removing self-evaluation text
    if "Yes, that's a correct summary" in answer:
        answer = answer.split("Yes, that's a correct summary")[0].strip()
    
    # Update chat history if podcast_id is provided
    if podcast_id:
        chat_histories[podcast_id].append({"role": "human", "content": question})
        chat_histories[podcast_id].append({"role": "ai", "content": answer})
        save_chat_history(podcast_id, chat_histories[podcast_id])
        
        # Add the answer to the vector store as well
        if IS_LOCAL:
            add_chat_message_to_ChromaVS(f"AI answer: {answer}", podcast_id)
        else:
            add_message_to_opensearch(f"AI answer: {answer}", podcast_id)
    
    return answer