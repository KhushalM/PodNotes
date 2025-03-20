from langchain.chains import RetrievalQA
from services.chromadb_service import setup_ChromaVS, retrieve_from_ChromaVS, add_chat_message_to_ChromaVS
from langchain.memory import ConversationBufferMemory
from langchain.chains import ConversationalRetrievalChain
import os
import json

# Dictionary to store chat histories for each podcast
# Format: {podcast_id: [{"role": "human", "content": "..."}, {"role": "ai", "content": "..."}]}
chat_histories = {}

# Path to store chat histories
CHAT_HISTORY_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "chat_histories")
os.makedirs(CHAT_HISTORY_DIR, exist_ok=True)

def summarize_podcast(model_name, transcript):
    from langchain.text_splitter import RecursiveCharacterTextSplitter
    from langchain.chains.summarize import load_summarize_chain
    from langchain.docstore.document import Document
    from langchain_community.llms import Ollama
    
    # Initialize the LLM
    llm = Ollama(model=model_name)
    
    # Check if transcript is short enough for direct summarization
    if len(transcript) < 10000:  # Approximate character count for context window
        summarizer = load_summarize_chain(llm, chain_type="stuff")
        return summarizer.run([Document(page_content=transcript)])
    
    # For longer transcripts, use map-reduce
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=2000, chunk_overlap=200)
    docs = text_splitter.create_documents([transcript])
    
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

def ask_question(question, transcript, podcast_id=None):
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
    
    # Setup LLM
    llm = Ollama(model="gemma3:4b")
    
    # Load chat history if podcast_id is provided
    chat_history = []
    if podcast_id:
        # Load from disk or initialize if not exists
        if podcast_id not in chat_histories:
            chat_histories[podcast_id] = load_chat_history(podcast_id)
        
        # Add the current question to the vector store
        add_chat_message_to_ChromaVS(f"User question: {question}", podcast_id)
        
        # Convert the chat history to the format expected by LangChain
        for message in chat_histories[podcast_id]:
            if message["role"] == "human":
                chat_history.append((message["content"], ""))
            elif message["role"] == "ai" and chat_history:
                # Update the last tuple with the AI response
                last_human, _ = chat_history[-1]
                chat_history[-1] = (last_human, message["content"])
    
    # Setup vector store with podcast_id for persistence
    vector_store = setup_ChromaVS([transcript], podcast_id)
    
    # Create retriever
    retriever = vector_store.as_retriever()
    
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
    
    # Create conversational QA chain
    qa_chain = ConversationalRetrievalChain.from_llm(
        llm=llm,
        retriever=retriever,
        memory=memory
    )
    
    # Get response
    response = qa_chain({"question": question})
    answer = response["answer"]
    
    # Update chat history if podcast_id is provided
    if podcast_id:
        chat_histories[podcast_id].append({"role": "human", "content": question})
        chat_histories[podcast_id].append({"role": "ai", "content": answer})
        save_chat_history(podcast_id, chat_histories[podcast_id])
        
        # Add the answer to the vector store as well
        add_chat_message_to_ChromaVS(f"AI answer: {answer}", podcast_id)
    
    return answer