from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

def setup_ChromaVS(transcript):
    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    chroma = Chroma.from_texts(transcript, embeddings)
    return chroma

def retrieve_from_ChromaVS(chroma, query):
    retriver = chroma.as_retriever()
    return retriver.get_relevant_documents(query)
