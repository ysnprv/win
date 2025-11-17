class SetupFailedError(Exception):
    """Raised when model setup fails."""

    ...


class ScrapingFailedError(Exception):
    """Raised when file scraping/parsing fails."""

    ...


class DBAccessError(Exception):
    """Raised when database access fails."""

    ...


class DBInsertionError(Exception):
    """Raised when database insertion fails."""

    ...


class BadLLMResponseError(RuntimeError):
    """Raised when the LLM response is malformed or unexpected."""

    ...
