import os
from pathlib import Path


class WireframeLoader:
    """Loads wireframe HTML templates."""
    
    # Path to wireframes directory
    # From helpers/ go to Portfolio_builder/ then to src/wireframes/
    WIREFRAMES_DIR = Path(__file__).parent.parent / "src" / "wireframes"
    
    @staticmethod
    def load_wireframe(wireframe_name: str) -> str:
        """
        Load a wireframe HTML template by name.
        
        Args:
            wireframe_name: Name of the wireframe (e.g., 'classic', 'sidepanel', 'blogpost')
            
        Returns:
            HTML content of the wireframe
            
        Raises:
            FileNotFoundError: If wireframe file doesn't exist
            ValueError: If wireframe name is invalid
        """
        if not wireframe_name or not wireframe_name.strip():
            raise ValueError("Wireframe name cannot be empty")
        
        # Sanitize filename
        safe_name = wireframe_name.strip().lower()
        wireframe_path = WireframeLoader.WIREFRAMES_DIR / f"{safe_name}.html"
        
        if not wireframe_path.exists():
            available = WireframeLoader.list_available_wireframes()
            raise FileNotFoundError(
                f"Wireframe '{wireframe_name}' not found. "
                f"Available wireframes: {', '.join(available)}"
            )
        
        with open(wireframe_path, "r", encoding="utf-8") as f:
            return f.read()
    
    @staticmethod
    def list_available_wireframes() -> list[str]:
        """
        List all available wireframe names.
        
        Returns:
            List of wireframe names (without .html extension)
        """
        if not WireframeLoader.WIREFRAMES_DIR.exists():
            return []
        
        wireframes = []
        for file in WireframeLoader.WIREFRAMES_DIR.glob("*.html"):
            wireframes.append(file.stem)
        
        return sorted(wireframes)
