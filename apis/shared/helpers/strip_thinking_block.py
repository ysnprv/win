def strip_thinking_block(text: str) -> str:
    """
    Strip thinking blocks from LLM responses.
    
    Some LLMs output thinking process in <think>...</think> tags.
    This function removes those tags and returns only the final response.
    """
    return (
        text[text.find("</think") + len("</think>") :].strip()
        if "</think" in text
        else text.strip()
    )
