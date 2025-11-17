from pathlib import Path

DEFAULT_PATHS = {
    "embedding_models": str(Path("~/app/.cache/onboard/embedding_models").expanduser()),
    "parsing_models": str(Path("~/app/.cache/onboard/parsing_models").expanduser()),
    "database": str(Path("~/app/.cache/onboard/database").expanduser()),  # knowledge base of career guide
    "jobs_db": str(Path("~/app/.cache/onboard/jobs_db").expanduser()),  # job matcher vector database
    "logs": str(Path("~/app/.cache/onboard/logs").expanduser()),
    "temp": str(Path("~/app/.cache/onboard/temp").expanduser()),  # for CVs and job descriptions
}


IRREGULAR_FILE_EXTENSIONS = [".txt", ".md", ".html"]


CHUNK_OVERLAP = 50
CHUNK_SIZE = 500


N_RETRIES = 3  # Number of retry attempts for LLM calls that fail validation


# CV rewriting iteration configuration
MAX_ITER = 3
SIMILARITY_THRESHOLD = 0.97
