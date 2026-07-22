from chromadb.utils import embedding_functions
print("Downloading DefaultEmbeddingFunction (onnx) model...")
ef = embedding_functions.DefaultEmbeddingFunction()
print("Model successfully downloaded and cached!")
