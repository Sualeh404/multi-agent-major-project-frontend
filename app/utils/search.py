from rank_bm25 import BM25Okapi
from fastembed import TextEmbedding
import numpy as np

class HybridSearch:
    def __init__(self):
        self.model = TextEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")
        self.bm25 = None
        self.documents = []
        self.embeddings = None

    def index_documents(self, documents: list[str]):
        self.documents = documents
        tokenized = [doc.split() for doc in documents]
        self.bm25 = BM25Okapi(tokenized)
        self.embeddings = np.array(list(self.model.embed(documents)))

    def search(self, query: str, top_k: int = 5) -> list[tuple[int, float]]:
        if not self.bm25 or self.embeddings is None:
            return []
        # BM25 lexical search
        bm25_scores = self.bm25.get_scores(query.split())
        # Vector semantic search
        query_embedding = np.array(list(self.model.embed([query])))[0]
        cosine_scores = np.dot(self.embeddings, query_embedding) / (
            np.linalg.norm(self.embeddings, axis=1) * np.linalg.norm(query_embedding) + 1e-9
        )
        # Hybrid score (normalized average)
        max_bm25 = np.max(bm25_scores) + 1e-9
        hybrid_scores = 0.5 * (bm25_scores / max_bm25) + 0.5 * cosine_scores
        top_indices = np.argsort(hybrid_scores)[::-1][:top_k]
        return [(int(idx), float(hybrid_scores[idx])) for idx in top_indices]
