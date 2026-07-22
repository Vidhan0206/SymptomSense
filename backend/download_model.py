from chromadb.utils import embedding_functions
print("Downloading all-MiniLM-L6-v2 model...")
ef = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")
print("Model successfully downloaded and cached!")
