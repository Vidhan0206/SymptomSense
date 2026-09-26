import os
import chromadb
from chromadb.utils import embedding_functions
from app.config import settings
from app.llm.client import llm_client, get_llm_model

# Global client and collection for reuse across requests
_client = None
_collection = None

def _get_collection():
    global _client, _collection
    if _collection is None:
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        db_path = os.path.join(base_dir, settings.chroma_db_dir)
        
        _client = chromadb.PersistentClient(path=db_path)
        default_ef = embedding_functions.DefaultEmbeddingFunction()
        
        try:
            _collection = _client.get_collection(
                name="symptomsense_kb",
                embedding_function=default_ef
            )
        except Exception as e:
            # Collection might not exist yet
            raise RuntimeError(f"Could not load ChromaDB collection: {e}. Ensure you have run build_index.py.")
            
    return _collection

def expand_query(user_text: str) -> str:
    """
    Uses the LLM to rewrite the raw conversational user text into an optimized clinical search query.
    """
    system_prompt = """You are a medical search query generator.
    Translate the user's conversational symptom descriptions into a concise list of medical keywords and clinical terms in standard English.
    If the user speaks in a different language or uses a transliterated language like Hinglish (e.g., Hindi written in English script), you MUST translate their symptoms into standard English medical keywords.
    Return ONLY the English keywords separated by commas, nothing else.
    Example Input 1: "my head hurts really bad and I feel like throwing up"
    Example Output 1: "Severe headache, nausea, migraine symptoms"
    Example Input 2: "mera pet dard kar raha hai"
    Example Output 2: "Abdominal pain, stomach ache"
    """
    try:
        response = llm_client.chat.completions.create(
            model=get_llm_model(),
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_text}
            ],
            temperature=0.1,
            max_tokens=50
        )
        expanded = response.choices[0].message.content.strip()
        print(f"Original Query: {user_text}")
        print(f"Expanded Query: {expanded}")
        return expanded
    except Exception as e:
        print(f"Query expansion failed: {e}")
        return user_text  # Fallback to original

def retrieve(query: str, k: int = 5) -> list[dict]:
    """
    Retrieves the top-k most relevant text chunks for a given query.
    """
    collection = _get_collection()
    
    # 1. Expand the query
    optimized_query = expand_query(query)
    
    # 2. Search using the optimized query
    results = collection.query(
        query_texts=[optimized_query],
        n_results=k
    )
    
    # Format results
    retrieved_chunks = []
    if results['documents'] and results['documents'][0]:
        for i in range(len(results['documents'][0])):
            retrieved_chunks.append({
                "chunk_id": results['ids'][0][i],
                "text": results['documents'][0][i],
                "metadata": results['metadatas'][0][i],
                "distance": results['distances'][0][i] if 'distances' in results and results['distances'] else None
            })
            
    return retrieved_chunks
