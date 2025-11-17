import re
from shared.providers.base import Provider
from shared.errors.errors import BadLLMResponseError
from shared.helpers.retry_decorator import retry_on_llm_failure
from shared.helpers.strip_thinking_block import strip_thinking_block
from shared.helpers.strip_code_blocks import strip_html_code_blocks
from shared.helpers.logger import get_logger

from features.Portfolio_builder.src.models import Portfolio, PortfolioRequest
from features.Portfolio_builder.src.prompts.prompts import PortfolioPrompts
from features.Portfolio_builder.helpers.wireframe_loader import WireframeLoader

logger = get_logger(__name__)


class HTMLValidator:
    """Helper class for HTML validation."""
    
    @staticmethod
    def validate_html(html_content: str) -> tuple[bool, str]:
        """
        Perform basic validation on HTML content.
        
        Args:
            html_content: HTML content to validate
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        if not html_content or not html_content.strip():
            return False, "Empty HTML content"
        
        # Check for basic HTML structure
        if "<!DOCTYPE html>" not in html_content and "<html" not in html_content:
            return False, "Missing DOCTYPE or <html> tag"
        
        if "<head>" not in html_content:
            return False, "Missing <head> section"
        
        if "<body>" not in html_content:
            return False, "Missing <body> section"
        
        # Check for balanced tags (basic check)
        html_open = html_content.count("<html")
        html_close = html_content.count("</html>")
        if html_open != html_close:
            return False, f"Unbalanced <html> tags: {html_open} open, {html_close} close"
        
        body_open = html_content.count("<body")
        body_close = html_content.count("</body>")
        if body_open != body_close:
            return False, f"Unbalanced <body> tags: {body_open} open, {body_close} close"
        
        return True, ""


class PortfolioBuilder:
    """
    LLM-powered portfolio builder - generates complete HTML portfolios.
    Takes wireframe, theme, and CV content to create a fully styled portfolio page.
    """
    
    def __init__(self, provider: Provider):
        """
        Initialize the portfolio builder.
        
        Args:
            provider: LLM provider for generating portfolios
        """
        self.provider = provider
    
    @retry_on_llm_failure(max_retries=3)
    async def build(
        self,
        wireframe: str,
        theme: str,
        cv_content: str,
        personal_info: str = None,
        photo_url: str = None
    ) -> Portfolio:
        """
        Build a portfolio from wireframe, theme, and CV content.
        
        Args:
            wireframe: Wireframe name (e.g., 'classic', 'sidepanel', 'blogpost')
            theme: Theme name (predefined) or custom description
            cv_content: User's CV content in markdown format
            personal_info: Optional JSON string with personal information
            photo_url: Optional URL to profile photo
            
        Returns:
            Portfolio object with generated HTML
            
        Raises:
            FileNotFoundError: If wireframe not found
            BadLLMResponseError: If LLM output is invalid after retries
        """
        logger.info(f"Building portfolio with wireframe='{wireframe}', theme='{theme}'")
        
        # Load wireframe HTML
        try:
            wireframe_html = WireframeLoader.load_wireframe(wireframe)
            logger.debug(f"Loaded wireframe '{wireframe}' ({len(wireframe_html)} chars)")
        except FileNotFoundError as e:
            logger.error(f"Wireframe not found: {e}")
            raise
        
        # Build prompt
        prompt = PortfolioPrompts.build_prompt(
            wireframe_html=wireframe_html,
            theme=theme,
            cv_content=cv_content,
            personal_info=personal_info,
            photo_url=photo_url
        )
        
        logger.debug(f"Prompt built ({len(prompt)} chars), calling LLM...")
        
        # Call LLM with system prompt
        response = await self.provider(
            prompt,
            system=PortfolioPrompts.PORTFOLIO_BUILDER_SYSTEM
        )
        
        logger.debug(f"LLM response received ({len(response)} chars)")
        
        # Process response
        html_content = self._extract_html(response)
        
        # Validate HTML
        is_valid, error_msg = HTMLValidator.validate_html(html_content)
        if not is_valid:
            logger.error(f"Invalid HTML generated: {error_msg}")
            raise BadLLMResponseError(f"Invalid HTML output: {error_msg}")
        
        logger.info(f"Portfolio generated successfully ({len(html_content)} chars)")
        
        return Portfolio(
            html_content=html_content,
            wireframe_used=wireframe,
            theme_applied=theme
        )
    
    def _extract_html(self, response: str) -> str:
        """
        Extract clean HTML from LLM response.
        Removes thinking blocks, markdown code blocks, and extra text.
        
        Args:
            response: Raw LLM response
            
        Returns:
            Clean HTML content
            
        Raises:
            BadLLMResponseError: If HTML cannot be extracted
        """
        # Strip thinking blocks
        response = strip_thinking_block(response)
        
        # Strip markdown code blocks (```html, ```, etc.)
        response = strip_html_code_blocks(response)
        
        response = response.strip()
        
        # Find HTML document start
        html_start = -1
        if "<!DOCTYPE html>" in response:
            html_start = response.find("<!DOCTYPE html>")
        elif "<html" in response:
            html_start = response.find("<html")
        
        if html_start == -1:
            raise BadLLMResponseError("No HTML document found in response")
        
        # Extract from HTML start to end
        html_content = response[html_start:]
        
        # Find closing </html> tag
        html_end = html_content.rfind("</html>")
        if html_end != -1:
            html_content = html_content[:html_end + 7]  # Include </html>
        
        if len(html_content.strip()) < 100:
            raise BadLLMResponseError("Extracted HTML too short")
        
        return html_content.strip()
