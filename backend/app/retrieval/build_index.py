import json
import os
import chromadb
from chromadb.utils import embedding_functions
from app.config import settings

def build_vector_index():
    # Setup ChromaDB persistent client
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    db_path = os.path.join(base_dir, settings.chroma_db_dir)
    chunks_path = os.path.join(base_dir, settings.chunks_json_path)
    
    print(f"Initializing ChromaDB at {db_path}...")
    client = chromadb.PersistentClient(path=db_path)
    
    # We use all-MiniLM-L6-v2 which is Chroma's default sentence-transformers embedding function
    # Or we can specify it explicitly
    sentence_transformer_ef = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")
    
    # Create or get collection
    collection = client.get_or_create_collection(
        name="symptomsense_kb",
        embedding_function=sentence_transformer_ef
    )
    
    # Load chunks
    print(f"Loading chunks from {chunks_path}...")
    if not os.path.exists(chunks_path):
        print(f"Error: {chunks_path} not found. Run ingestion first.")
        return
        
    with open(chunks_path, 'r', encoding='utf-8') as f:
        chunks = json.load(f)
        
    if not chunks:
        print("No chunks found in file.")
        return
        
    # Prepare data for Chroma
    ids = []
    documents = []
    metadatas = []
    
    for chunk in chunks:
        ids.append(chunk["chunk_id"])
        documents.append(chunk["text"])
        metadatas.append({
            "condition_name": chunk["condition_name"],
            "source_url": chunk["source_url"]
        })
        
    # Add to collection (batching if necessary, but for ~1000 chunks it's fine)
    print(f"Adding {len(documents)} documents to ChromaDB collection 'symptomsense_kb'...")
    # Chroma can handle a few thousand documents easily in one go
    # but let's batch it to be safe
    batch_size = 500
    for i in range(0, len(documents), batch_size):
        end_idx = i + batch_size
        collection.upsert(
            documents=documents[i:end_idx],
            metadatas=metadatas[i:end_idx],
            ids=ids[i:end_idx]
        )
        print(f"Processed batch {i//batch_size + 1}/{(len(documents)-1)//batch_size + 1}")
        
    print("Vector index built successfully.")

if __name__ == "__main__":
    build_vector_index()
