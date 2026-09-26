import os
import json
import uuid
import chromadb
from chromadb.utils import embedding_functions
from app.config import settings

_client = None
_cache_collection = None

def _get_cache_collection():
    global _client, _cache_collection
    if _cache_collection is None:
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        db_path = os.path.join(base_dir, settings.chroma_db_dir)
        
        # Reuse the existing ChromaDB persistent client
        _client = chromadb.PersistentClient(path=db_path)
        default_ef = embedding_functions.DefaultEmbeddingFunction()
        
        # Get or create the cache collection
        _cache_collection = _client.get_or_create_collection(
            name="semantic_cache_v2",
            embedding_function=default_ef
        )
    return _cache_collection

def check_cache(conversation_text: str, distance_threshold: float = 0.02) -> dict:
    """
    Checks the semantic cache for a highly similar conversation.
    ChromaDB uses L2 distance by default. A lower distance means higher similarity.
    """
    collection = _get_cache_collection()
    
    try:
        results = collection.query(
            query_texts=[conversation_text],
            n_results=1
        )
        
        if results['documents'] and len(results['documents'][0]) > 0:
            distance = results['distances'][0][0]
            if distance <= distance_threshold:
                print(f"SEMANTIC CACHE HIT (Distance: {distance:.3f})")
                return json.loads(results['metadatas'][0][0]['response_json'])
            else:
                print(f"SEMANTIC CACHE MISS (Closest Distance: {distance:.3f})")
                
    except Exception as e:
        print(f"Cache check failed: {e}")
        
    return None

def store_cache(conversation_text: str, response_dict: dict):
    """
    Stores the conversation text and the LLM's response in the cache.
    """
    collection = _get_cache_collection()
    
    try:
        doc_id = str(uuid.uuid4())
        collection.add(
            ids=[doc_id],
            documents=[conversation_text],
            metadatas=[{"response_json": json.dumps(response_dict)}]
        )
        print("Stored in Semantic Cache.")
    except Exception as e:
        print(f"Failed to store in cache: {e}")
