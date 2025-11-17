from shared.providers.gemini_provider import GeminiProvider
from shared.providers.embedding.hf_embed import HFEmbedder
from shared.providers.ollama_provider import OllamaProvider


MODEL_NAME = "gemini-2.5-flash"
TEMPERATURE = 0

# PRIVATE_MODEL_NAME = "gpt-oss:20b"
PRIVATE_MODEL_NAME = "gemini-2.5-flash"
PRIVATE_MODEL_TEMPERATURE = 0

EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"


def get_providers():
    """
    Retrieve and initialize the required providers for the CV Rewriter pipeline.
    Returns:
        Tuple containing the main provider, private provider, and embedding provider.
    """
    main_provider = GeminiProvider(model_name=MODEL_NAME, temperature=TEMPERATURE)

    # private_provider = OllamaProvider(model_name=PRIVATE_MODEL_NAME, temperature=PRIVATE_MODEL_TEMPERATURE)
    private_provider = GeminiProvider(
        model_name=PRIVATE_MODEL_NAME, temperature=PRIVATE_MODEL_TEMPERATURE
    )
    embedding_provider = HFEmbedder(
        model_name=EMBEDDING_MODEL_NAME,
    )

    return main_provider, private_provider, embedding_provider
