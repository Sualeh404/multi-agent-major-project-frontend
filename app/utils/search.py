from rank_bm25 import BM25Okapi
from sentence_transformers import SentenceTransformer
import numpy as np

class HybridSearch:
    def __init__(self):
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.bm25 = None
        self.documents = []
        self.embeddings = None
    
    def index_documents(self, documents: list[str]):
        self.documents = documents
        self.bm25 = BM25Okapi(documents)
        self.embeddings = self.model.encode(documents)
    
    def search(self, query: str, top_k: int = 5) -> list[tuple[int, float]]:
        # BM25 lexical search
        bm25_scores = self.bm25.get_scores(query.split())
        # Vector semantic search
        query_embedding = self.model.encode(query)
        cosine_scores = np.dot(self.embeddings, query_embedding) / (np.linalg.norm(self.embeddings, axis=1) * np.linalg.norm(query_embedding) + 1e-9)
        # Hybrid score (average)
        hybrid_scores = 0.5 * (bm25_scores / (np.max(bm25_scores) + 1e-9)) + 0.5 * cosine_scores
        top_indices = np.argsort(hybrid_scores)[::-1][:top_k]
        return [(idx, hybrid_scores[idx]) for idx in top_indices]
