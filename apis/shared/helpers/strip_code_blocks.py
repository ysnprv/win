import re


def strip_code_blocks(text: str, expected_language: str = None) -> str:
    """
    Strip markdown code block indicators from LLM responses.
    
    LLMs sometimes wrap their output in markdown code blocks like:
    ```html
    <content>
    ```
    
    or
    
    ```latex
    \\documentclass...
    ```
    
    This function removes those markers and returns only the raw content.
    
    Args:
        text: The text to process
        expected_language: Optional language hint (e.g., "html", "latex") for better detection
        
    Returns:
        Text with code block markers removed
    """
    text = text.strip()
    
    # Pattern 1: ```language\n content \n```
    # Matches: ```html, ```latex, ```python, etc.
    pattern_with_lang = r'^```[\w]*\n(.*?)\n```$'
    match = re.match(pattern_with_lang, text, re.DOTALL)
    if match:
        return match.group(1).strip()
    
    # Pattern 2: ``` content ```
    # Generic code blocks without language specifier
    pattern_generic = r'^```\n?(.*?)\n?```$'
    match = re.match(pattern_generic, text, re.DOTALL)
    if match:
        return match.group(1).strip()
    
    # Pattern 3: Look for code blocks anywhere in the text (not just wrapping)
    # This handles cases where LLM adds text before/after the code block
    if '```' in text:
        # Find the first code block
        parts = text.split('```')
        if len(parts) >= 3:
            # parts[0] = text before
            # parts[1] = might be language + content OR just content
            # parts[2] = text after (might be another code block)
            
            content = parts[1]
            
            # If first line looks like a language identifier, remove it
            lines = content.split('\n', 1)
            if len(lines) > 1 and lines[0].strip().isalpha() and len(lines[0].strip()) < 20:
                # First line is likely a language identifier
                content = lines[1]
            
            return content.strip()
    
    # No code blocks found, return original text
    return text


def strip_html_code_blocks(text: str) -> str:
    """
    Convenience function specifically for HTML content.
    
    Args:
        text: Text potentially wrapped in ```html markers
        
    Returns:
        Clean HTML content
    """
    return strip_code_blocks(text, expected_language="html")


def strip_latex_code_blocks(text: str) -> str:
    """
    Convenience function specifically for LaTeX content.
    
    Args:
        text: Text potentially wrapped in ```latex markers
        
    Returns:
        Clean LaTeX content
    """
    return strip_code_blocks(text, expected_language="latex")
