from shared.providers.base import EmbeddingProvider
from shared.utils.constants import DEFAULT_PATHS
from shared.helpers.logger import get_logger
import os


logger = get_logger(__name__)


class HFEmbedder(EmbeddingProvider):
    """
    Hugging Face transformer model embedder.
    """

    def __init__(self, model_name: str):
        """
        Initialize the embedder.

        Args:
            model_name: Name of the Hugging Face model to use.
        """
        self.model_name = model_name
        self.tokenizer = None
        self.model = None

    # Mean Pooling - Take attention mask into account for correct averaging
    @staticmethod
    def _mean_pooling(model_output, attention_mask):
        """
        Apply mean pooling to model output.

        Args:
            model_output: Output from the transformer model.
            attention_mask: Attention mask tensor.

        Returns:
            Pooled embeddings tensor.
        """
        import torch

        token_embeddings = model_output[0]  # 1st element of model_output contains all token embeddings
        input_mask_expanded = (
            attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
        )
        return torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(
            input_mask_expanded.sum(1), min=1e-9
        )

    async def embed(self, sentences: str) -> list[float]:
        """
        Get embeddings for sentences using a Hugging Face model.

        Args:
            sentences: Single sentence or list of sentences to embed.

        Returns:
            List of normalized embedding vectors.
        """
        # lazy load
        from transformers import AutoTokenizer, AutoModel
        import torch.nn.functional as F
        import torch

        if self.tokenizer is None or self.model is None:
            os.makedirs(DEFAULT_PATHS["embedding_models"], exist_ok=True)
            logger.debug(f"Loading embedding model: {self.model_name}")
            self.tokenizer = AutoTokenizer.from_pretrained(
                self.model_name, cache_dir=DEFAULT_PATHS["embedding_models"]
            )
            self.model = AutoModel.from_pretrained(
                self.model_name, cache_dir=DEFAULT_PATHS["embedding_models"]
            )
            logger.debug("Embedding model loaded successfully")

        logger.debug(f"Generating embedding for text ({len(sentences)} chars)")
        
        encoded_input = self.tokenizer(
            sentences,
            padding=True,
            truncation=True,
            return_tensors="pt",
        )

        with torch.no_grad():
            model_output = self.model(**encoded_input)

        sentence_embeddings = self._mean_pooling(
            model_output, encoded_input["attention_mask"]
        )
        sentence_embeddings = F.normalize(sentence_embeddings, p=2, dim=1)

        # Return flattened 1D list (extract first row since we're embedding a single text)
        embedding = sentence_embeddings[0].tolist()
        logger.debug(f"Embedding generated (dimension: {len(embedding)})")
        return embedding
