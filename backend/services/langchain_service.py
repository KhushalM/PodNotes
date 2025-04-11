from langchain_core.callbacks import CallbackManager, StreamingStdOutCallbackHandler
from services.chromadb_service import setup_ChromaVS, retrieve_from_ChromaVS, add_chat_message_to_ChromaVS
from langchain.memory import ConversationBufferMemory
from langchain_community.llms import Ollama
from services.chromadb_service import vector_stores
from langchain_community.vectorstores import Chroma
from langchain.chains import ConversationalRetrievalChain
from pathlib import Path
import logging
import os
import json
import atexit
import multiprocessing

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

# Register cleanup function to prevent semaphore leaks
def cleanup_resources():
    """Clean up any multiprocessing resources to prevent semaphore leaks."""
    try:
        # Force cleanup of any remaining multiprocessing resources
        multiprocessing.current_process()._config['semprefix'] = 'cleared'
        logger.info("Cleaned up multiprocessing resources")
    except Exception as e:
        logger.warning(f"Error during multiprocessing cleanup: {e}")

# Register the cleanup function to run at exit
atexit.register(cleanup_resources)

def get_llm():
    model_name = "gemma3:4b"
    return Ollama(model=model_name)

def summarize_podcast(transcript):
    from langchain.text_splitter import RecursiveCharacterTextSplitter
    from langchain.chains.summarize import load_summarize_chain
    from langchain.docstore.document import Document
    
    
    # Initialize the LLM
    llm = get_llm()
    
    # If the transcript is already a list of segments, split by speaker
    if isinstance(transcript, list):
        # Check if we have speaker information
        has_speakers = any(segment.get("speaker") for segment in transcript if segment)
        
        if has_speakers:
            # Group segments by speaker
            speaker_segments = {}
            for segment in transcript:
                speaker = segment.get("speaker", "Unknown")
                if speaker not in speaker_segments:
                    speaker_segments[speaker] = []
                speaker_segments[speaker].append(segment)
            
            # Create documents for each speaker's content
            docs = []
            for speaker, segments in speaker_segments.items():
                # Format the segments for this speaker
                formatted_segments = []
                for segment in segments:
                    start_time = segment.get("start", "")
                    end_time = segment.get("end", "")
                    text = segment.get("text", "")
                    formatted_text = f"[{start_time} - {end_time}] {text}"
                    formatted_segments.append(formatted_text)
                
                # Create a document for this speaker
                speaker_content = f"Speaker: {speaker}\n" + "\n".join(formatted_segments)
                docs.append(Document(page_content=speaker_content))
            
            logger.info(f"Split transcript into {len(docs)} speaker-based documents")
        else:
            # Fallback: Split by time chunks if no speaker information
            logger.info("No speaker information found, splitting by time chunks instead")
            
            # Group segments into time chunks (e.g., 5-minute chunks)
            chunk_duration = 120  # 2 minutes in seconds
            time_chunks = {}
            
            for segment in transcript:
                # Get start time in seconds
                start_time = segment.get("start", "0")
                if isinstance(start_time, str):
                    # Convert "HH:MM:SS" to seconds
                    parts = start_time.split(":")
                    if len(parts) == 3:
                        start_seconds = int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
                    else:
                        start_seconds = 0
                else:
                    start_seconds = float(start_time)
                
                # Determine which chunk this segment belongs to
                chunk_index = int(start_seconds / chunk_duration)
                if chunk_index not in time_chunks:
                    time_chunks[chunk_index] = []
                time_chunks[chunk_index].append(segment)
            
            # Create documents for each time chunk
            docs = []
            for chunk_idx, segments in sorted(time_chunks.items()):
                # Format the segments for this time chunk
                formatted_segments = []
                for segment in segments:
                    start_time = segment.get("start", "")
                    end_time = segment.get("end", "")
                    text = segment.get("text", "")
                    formatted_text = f"[{start_time} - {end_time}] {text}"
                    formatted_segments.append(formatted_text)
                
                # Calculate the time range for this chunk
                chunk_start = chunk_idx * chunk_duration
                chunk_end = (chunk_idx + 1) * chunk_duration
                chunk_start_fmt = f"{int(chunk_start/3600):02d}:{int((chunk_start%3600)/60):02d}:{int(chunk_start%60):02d}"
                chunk_end_fmt = f"{int(chunk_end/3600):02d}:{int((chunk_end%3600)/60):02d}:{int(chunk_end%60):02d}"
                
                # Create a document for this time chunk
                chunk_content = f"Time segment: {chunk_start_fmt} - {chunk_end_fmt}\n" + "\n".join(formatted_segments)
                docs.append(Document(page_content=chunk_content))
            
            logger.info(f"Split transcript into {len(docs)} time-based chunks")
    else:
        # Fall back to character-based splitting for string transcripts
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=2000, chunk_overlap=200)
        docs = text_splitter.create_documents([transcript])
    
    # Define the prompts for the refine chain
    from langchain.prompts import PromptTemplate
    
    # Initial prompt to create a summary from the first document
    initial_prompt_template = """
    You are a professional podcast summarizer creating concise, informative summaries.
    
    Write a detailed summary of the following podcast transcript segment:
    
    {text}
    
    Follow these formatting guidelines:
   - Maintain the same Markdown formatting style as the existing summary
    - Use clean, structured formatting with bullet points (•) instead of bold text or asterisks
    - For main points, use bullet points: •
    - For sub-points, use indentation with dashes: -
    - Bold important terms 
    - Do not include conversational elements like questions or personal addresses
    - Present information in a professional, third-person style
    - Include speaker names when relevant
    - Do not include things like "Here’s a summary of the provided conversation, formatted according to your guidelines"
    
    SUMMARY:
    """
    initial_prompt = PromptTemplate(template=initial_prompt_template, input_variables=["text"])
    
    # Refine prompt to iteratively improve the summary with each new document
    refine_prompt_template = """
    You are a professional podcast summarizer creating concise, informative summaries.
    
    We have provided an existing summary of a podcast transcript:
    {existing_answer}
    
    We have a new segment of the podcast transcript that needs to be incorporated:
    {text}
    
    Given this new information, refine the existing summary to create an updated, comprehensive summary of the podcast.
    If the new segment introduces new speakers, topics, or important points, be sure to include them.
    
    Follow these formatting guidelines:
    - Maintain the same Markdown formatting style as the existing summary
    - Use clean, structured formatting with bullet points (•) instead of bold text or asterisks
    - For main points, use bullet points: •
    - For sub-points, use indentation with dashes: -
    - Bold important terms 
    - Do not include conversational elements like questions or personal addresses
    - Present information in a professional, third-person style
    - Include speaker names when relevant
    - Do not include things like Here’s a summary of the provided conversation, formatted according to your guidelines:
    
    REFINED SUMMARY:
    """
    refine_prompt = PromptTemplate(template=refine_prompt_template, input_variables=["existing_answer", "text"])
    
    # Create and run the refine chain
    logger.info("Using refine chain for summarization")
    summarizer = load_summarize_chain(
        llm,
        chain_type="refine",
        question_prompt=initial_prompt,
        refine_prompt=refine_prompt,
        return_intermediate_steps=False,
        input_key="input_documents",
        output_key="output_text"
    )
    result = summarizer({"input_documents": docs}, return_only_outputs=True)
    return result["output_text"]

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
    else:
        os.makedirs(CHAT_HISTORY_DIR, exist_ok=True)
        # Create an empty JSON file
        with open(history_file, 'w') as f:
            json.dump([], f)
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

def ask_question(question, podcast_id, speaker=None, time_range=None):
    """
    Process a question against a transcript using LangChain, with chat history support.
    
    Args:
        question (str): The question to answer
        podcast_id (str): The podcast ID for maintaining chat history
        speaker (str, optional): Filter results by specific speaker
        time_range (dict, optional): Filter by time range with start and end in seconds
        
    Returns:
        str: The answer to the question
    """
    from langchain_community.llms import Ollama
    logger.info(f"Processing question for podcast: {podcast_id}")
    
    # Setup LLM
    llm = get_llm()
    local_path = VECTOR_STORE_DIR / f"{podcast_id}.chroma"

    # Get the vector store retriever with metadata filtering
    if local_path.exists():
        # Determine if we need to filter by time range

        #Check if question contains question based on time range
        
        
        start_time = None
        end_time = None
        if time_range:
            start_time = time_range.get('start')
            end_time = time_range.get('end')
        
        # Automatically classify the query type
        from services.chromadb_service import classify_query, retrieve_with_metadata_filters
        query_type = classify_query(question)
        
        # Get retriever with appropriate filters
        retriever = retrieve_with_metadata_filters(
            podcast_id=podcast_id,
            query=question,
            speaker=speaker,
            start_time=start_time,
            end_time=end_time,
            hybrid=True,
            query_type=query_type
        )
        
        logger.info(f"Query classified as '{query_type}' type")
        if speaker:
            logger.info(f"Filtering results by speaker: {speaker}")
        if time_range:
            logger.info(f"Filtering results by time range: {start_time}s to {end_time}s")
    else:
        logger.error("Attempted to get answer with no podcast loaded")
        return {"error": "Please upload a podcast first before asking questions."}

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
    
    from langchain.prompts import PromptTemplate
    # Format the prompt template with improved instructions for clean, structured responses
    prompt_template = """You are an AI assistant for answering questions about podcast transcripts.
    
    When responding with summaries or lists:
    - Use clean, structured formatting with bullet points (•) instead of bold text or asterisks
    - For main points, use bullet points: •
    - For sub-points, use indentation with dashes: -
    - Use clear section headings when appropriate (without any special formatting)
    - Separate sections with line breaks for better readability
    - Keep your response concise and easy to scan
    - Never use markdown formatting like ** or ## in your response
    
    Use ONLY the following pieces of context to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer.
    
    {context}
    
    Question: {question}
    
    Helpful Answer:"""
    
    QA_PROMPT = PromptTemplate(
        template=prompt_template, 
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
    
    # Post-process the answer to ensure proper formatting
    # Replace any remaining markdown-style formatting
    answer = answer.replace("**", "")
    answer = answer.replace("##", "")
    
    # Ensure bullet points are properly formatted
    lines = answer.split("\n")
    formatted_lines = []
    
    for line in lines:
        # Convert any asterisk bullet points to proper bullet points
        if line.strip().startswith("* "):
            line = line.replace("* ", "• ", 1)
        # Convert any dash bullet points at the beginning of lines to proper indented sub-points
        elif line.strip().startswith("- "):
            line = line.replace("- ", "  - ", 1)
        formatted_lines.append(line)
    
    answer = "\n".join(formatted_lines)
    
    # Update chat history if podcast_id is provided
    if podcast_id:
        chat_histories[podcast_id].append({"role": "human", "content": question})
        chat_histories[podcast_id].append({"role": "ai", "content": answer})
        save_chat_history(podcast_id, chat_histories[podcast_id])
        
        # Add the answer to the vector store as well
        add_chat_message_to_ChromaVS(f"AI answer: {answer}", podcast_id)
    
    return answer