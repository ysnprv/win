import numpy as np
import re
from typing import List, Dict
from shared.providers.base import EmbeddingProvider


class SimilarityCalculator:
    """similarity calculation with multiple scoring dimensions"""

    @staticmethod
    def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        v1 = np.array(vec1)
        v2 = np.array(vec2)

        if len(v1) == 0 or len(v2) == 0:
            return 0.0

        dot_product = np.dot(v1, v2)
        norm1 = np.linalg.norm(v1)
        norm2 = np.linalg.norm(v2)

        if norm1 == 0 or norm2 == 0:
            return 0.0

        return float(dot_product / (norm1 * norm2))
