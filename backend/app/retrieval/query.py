import os
import chromadb
from chromadb.utils import embedding_functions
from app.config import settings

# Global client and collection for reuse across requests
_client = None
_collection = None

def _get_collection():
    global _client, _collection
    if _collection is None:
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        db_path = os.path.join(base_dir, settings.chroma_db_dir)
        
        _client = chromadb.PersistentClient(path=db_path)
        sentence_transformer_ef = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")
        
        try:
            _collection = _client.get_collection(
                name="symptomsense_kb",
                embedding_function=sentence_transformer_ef
            )
        except Exception as e:
            # Collection might not exist yet
            raise RuntimeError(f"Could not load ChromaDB collection: {e}. Ensure you have run build_index.py.")
            
    return _collection

def retrieve(query: str, k: int = 5) -> list[dict]:
    """
    Retrieves the top-k most relevant text chunks for a given query.
    """
    collection = _get_collection()
    
    results = collection.query(
        query_texts=[query],
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
