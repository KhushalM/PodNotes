from langchain.chains import RetrievalQA
from services.chromadb_service import setup_ChromaVS, retrieve_from_ChromaVS

def summarize_podcast(model_name, transcript):
    from langchain.text_splitter import RecursiveCharacterTextSplitter
    from langchain.chains.summarize import load_summarize_chain
    from langchain.docstore.document import Document
    from langchain.llms import Ollama
    
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

def ask_question(question, transcript):
    """
    Process a question against a transcript using LangChain.
    
    Args:
        question (str): The question to answer
        transcript (str): The transcript text to search for answers
        
    Returns:
        str: The answer to the question
    """
    from langchain.llms import Ollama
    
    # Setup LLM
    llm = Ollama(model="gemma3:4b")
    
    # Setup vector store
    vector_store = setup_ChromaVS([transcript])
    
    # Create retriever
    retriever = vector_store.as_retriever()
    
    # Create QA chain
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm, 
        retriever=retriever, 
        return_source_documents=True
    )
    
    # Run the question
    return qa_chain.run(question)