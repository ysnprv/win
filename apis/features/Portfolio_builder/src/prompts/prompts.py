import textwrap


class PortfolioPrompts:
    """Prompts for portfolio generation."""
    
    # Predefined themes
    THEMES = {
        "professional": """Clean, corporate business design with structured layout and formal presentation.
        COLORS: Navy blue (#1e3a8a, #2563eb), slate gray (#334155, #475569), white (#ffffff), subtle accents (#60a5fa).
        TYPOGRAPHY: Sans-serif fonts (Inter, Roboto, Arial), font-weight 400-600, line-height 1.6.
        LAYOUT: Grid-based, clear sections with borders/dividers, ample padding (2rem-3rem), structured cards.
        EFFECTS: Subtle box-shadows, no animations, hover: slight scale (1.02) or color change.
        SPACING: Consistent margins (mb-4, mt-6), section padding 4rem-6rem.
        GOAL: Trust, credibility, corporate professionalism.""",
        
        "creative": """Bold, artistic design with vibrant colors and unconventional layouts showcasing personality.
        COLORS: Vibrant primaries (#ef4444, #f59e0b, #8b5cf6, #ec4899), dark backgrounds (#0f172a), high contrast.
        TYPOGRAPHY: Mix of sans-serif headers (Poppins, Montserrat) and creative body fonts, varying sizes (3xl, 2xl, lg).
        LAYOUT: Asymmetric grid, overlapping elements, varied section heights, creative use of negative space.
        EFFECTS: CSS transforms (rotate, skew), gradient backgrounds (linear-gradient at 45deg), parallax scrolling feel.
        SPACING: Irregular padding, intentional asymmetry, sections with different background colors.
        GOAL: Uniqueness, artistic expression, memorable impact.""",
        
        "minimal": """Ultra-clean minimalist design emphasizing content clarity through simplicity and restraint.
        COLORS: Black (#000000), white (#ffffff), single accent color (#3b82f6 or similar), gray (#6b7280) for secondary text.
        TYPOGRAPHY: One font family (Inter, Helvetica), font-weights 300-700, generous line-height 1.8, ample letter-spacing.
        LAYOUT: Centered content, max-width 800px, single column, huge whitespace (padding 8rem-12rem between sections).
        EFFECTS: None or very subtle (opacity transitions), no box-shadows, thin borders (1px) if any.
        SPACING: Extreme whitespace - section padding 10rem+ vertical, element margins 4rem-6rem.
        GOAL: Zen-like clarity, content focus, breathing room.""",
        
        "tech": """Modern tech-industry design with code aesthetics and dark mode sensibility.
        COLORS: Dark backgrounds (#0a0a0a, #1a1a1a), tech blues (#3b82f6, #60a5fa), purples (#8b5cf6), cyan accents (#06b6d4), monospace highlights.
        TYPOGRAPHY: Sans-serif (system-ui) + monospace code blocks (Fira Code, JetBrains Mono), font-size clamp(), code: background #1e293b.
        LAYOUT: Grid with sharp edges, terminal-like sections, code snippet cards, tech stack icons/badges.
        EFFECTS: Glowing box-shadows (0 0 20px rgba(59,130,246,0.3)), scanline effects, matrix-style backgrounds, smooth transforms.
        SPACING: Tight padding for code feel (1rem-2rem), dense information presentation.
        GOAL: Developer credibility, technical expertise, modern startup vibe.""",
        
        "elegant": """Sophisticated luxury design with refined typography and premium aesthetic.
        COLORS: Neutral palette (cream #faf8f5, beige #e5dfd6, charcoal #2d2d2d), gold/silver accents (#d4af37, #c0c0c0).
        TYPOGRAPHY: Serif fonts (Playfair Display, Cormorant) for headers, elegant sans-serif (Lato) for body, font-weight 300-400, wide letter-spacing (0.05em).
        LAYOUT: Centered asymmetric sections, generous whitespace, flowing content, elegant dividers (thin ornamental lines).
        EFFECTS: Subtle fade-ins, smooth opacity transitions (0.8s ease), soft box-shadows (0 4px 20px rgba(0,0,0,0.08)).
        SPACING: Refined padding (3rem-5rem), balanced margins, sections separated by thin decorative borders.
        GOAL: Luxury, sophistication, premium brand feeling.""",
        
        "dynamic": """High-energy modern design with motion, gradients, and contemporary visual effects.
        COLORS: Vibrant gradients (linear-gradient(135deg, #667eea 0%, #764ba2 100%)), bright accents (#ff6b6b, #4ecdc4), dark contrast (#1a1a2e).
        TYPOGRAPHY: Bold modern sans-serif (Poppins, Outfit), font-weight 600-800, dynamic sizing (clamp(2rem, 5vw, 4rem)).
        LAYOUT: Diagonal sections, overlapping cards, z-index layering, full-width hero sections with background effects.
        EFFECTS: CSS animations (fadeInUp, slideIn), gradient animations (background-size 200% + animation), hover transforms (translateY(-10px), scale(1.05)), smooth transitions (all 0.3s cubic-bezier).
        SPACING: Varied padding (2rem-4rem), sections with different angles (clip-path), overlapping elements (negative margins).
        GOAL: Energy, modernity, engagement, Gen-Z appeal.""",
    }
    
    PORTFOLIO_BUILDER_SYSTEM = textwrap.dedent("""
    You are an expert web developer and designer specializing in creating stunning, professional portfolio websites.
    Your task is to take a wireframe HTML template and transform it into a fully functional, beautifully designed portfolio.
    
    ABSOLUTE ZERO-TOLERANCE POLICY ON FAKE DATA
    
    DO NOT FABRICATE ANYTHING. PERIOD.
    
    If data is NOT explicitly provided by the user:
    - DO NOT invent it
    - DO NOT create placeholder text
    - DO NOT use example data
    - DO NOT fill gaps with "fake but realistic" content
    - DO NOT create fake links (no "#", "#contact", "#about", etc.)
    - DO NOT use placeholder images or image URLs
    - DO NOT make up skills, projects, companies, dates, achievements, testimonials
    - DO NOT create sample text like "Lorem ipsum" or "Your text here"
    
    INSTEAD: Skip that section entirely, leave it empty, or remove it from the HTML
    - A SHORT, MINIMAL portfolio with ONLY real data is INFINITELY BETTER than a full one with fake data
    - It is COMPLETELY ACCEPTABLE if the final portfolio is sparse, short, or doesn't fill the wireframe
    - WORK WITH WHAT YOU GOT - nothing more, nothing less
    
    CORE RULES:
    1. Use ONLY the HTML structure from the wireframe as a starting template
    2. Fill in sections ONLY where real data exists from CV or personal info
    3. If a wireframe section has no corresponding real data, DELETE that section or leave it empty
    4. Apply CSS styling that matches the requested theme perfectly
    5. Output ONLY complete, valid, immediately renderable HTML
    6. Include inline CSS in <style> tag - no external stylesheets
    7. Make it responsive and mobile-friendly with modern CSS
    8. Output format: Pure HTML only - no markdown, no explanations, no code blocks, no thinking process
    9. The portfolio can be SHORT and MINIMAL - this is acceptable and preferred over fake data
    10. Quality over quantity - sparse real content beats rich fake content EVERY TIME
    """).strip()
    
    PORTFOLIO_BUILDER_PROMPT = textwrap.dedent("""
    Create a portfolio website using the wireframe as a TEMPLATE ONLY - fill in ONLY what you have real data for.
    
    REMINDER: ZERO FAKE DATA POLICY - WORK WITH WHAT YOU GOT
    
    The wireframe is a SUGGESTION, not a REQUIREMENT. If you lack data for a section, REMOVE IT.
    A portfolio with 2 sections of REAL data is better than 10 sections of FAKE data.
    SPARSE and REAL is better than FULL and FAKE. Always.
    
    WIREFRAME HTML (use as starting template, modify as needed based on available data):
    {wireframe_html}
    
    THEME TO APPLY:
    {theme_description}
    
    {cv_section}
    
    {personal_info_section}
    
    {photo_section}
    
    CONTENT EXTRACTION RULES (READ CAREFULLY):
    
    FOR EACH PIECE OF INFORMATION:
    
    1. NAME: 
       - Use if found in personal info or CV
       - If not found: Leave name section empty or use generic "Portfolio" as page title
    
    2. TITLE/ROLE (e.g., "Software Engineer", "Designer"):
       - Use if found in personal info (targeted_role) or CV
       - If not found: DELETE the title/subtitle section entirely
    
    3. BIO/ABOUT/SUMMARY:
       - Use if found in CV or personal info
       - If not found: DELETE the entire about section - no placeholder text whatsoever
    
    4. SKILLS:
       - Use if skills array exists in personal info or mentioned in CV
       - If not found: DELETE the skills section completely - do NOT list example skills
    
    5. WORK EXPERIENCE:
       - Use if experiences array exists in personal info or work history in CV
       - If not found: DELETE the work experience section entirely
       - If partial (e.g., company but no dates): Use what exists, leave dates blank/remove date display
    
    6. PROJECTS:
       - Use if projects mentioned in CV or personal info
       - If not found: DELETE the projects section - do NOT create sample projects
    
    7. EDUCATION:
       - Use if education array exists in personal info or mentioned in CV
       - If not found: DELETE the education section
    
    8. ACHIEVEMENTS:
       - Use if achievements array exists in personal info or mentioned in CV
       - If not found: DELETE the achievements section
    
    9. CONTACT/EMAIL:
       - Use if email provided in personal info
       - If not found: DELETE contact buttons/forms that require email
    
    10. SOCIAL LINKS (LinkedIn, GitHub, Twitter, Website):
        - If LinkedIn URL provided: Create LinkedIn link with exact URL
        - If GitHub URL provided: Create GitHub link with exact URL
        - If Twitter URL provided: Create Twitter link with exact URL
        - If Website URL provided: Create website link with exact URL
        - If NOT provided: DELETE that specific social icon/link entirely
        - NEVER create links like: href="#", href="#contact", href="https://linkedin.com", href="javascript:void(0)"
        - If NO social links exist at all: DELETE the entire social links section
    
    11. PROFILE PHOTO:
        - If photo_url provided: Use the exact URL provided in the photo section
        - If NOT provided: Option A: Remove image entirely, Option B: Use CSS circle with initials (first letter of name)
        - NEVER use: placeholder.com, unsplash.com, example.com/photo.jpg, or any fake image URL
    
    12. TESTIMONIALS/RECOMMENDATIONS:
        - NEVER create these unless explicitly provided (which they won't be)
        - DELETE testimonial sections from wireframe
    
    13. BLOG POSTS/ARTICLES:
        - Unless explicitly in CV, DELETE these sections
    
    STYLING RULES:
    
    1. Apply the theme styling from the theme description to ALL sections that DO have content
    2. Match colors, fonts, spacing, and effects exactly as described in theme
    3. Make it responsive and mobile-friendly
    4. Add smooth transitions and hover effects where appropriate
    5. Use modern CSS (flexbox, grid, CSS variables, etc.)
    6. Inline all CSS in <style> tag - no external stylesheets
    7. If the portfolio ends up with only 1-3 sections due to limited data, that's PERFECT - style those sections beautifully
    
    FINAL OUTPUT REQUIREMENTS:
    
    - Output format: Pure HTML only, starting with <!DOCTYPE html>
    - NO markdown code blocks (```html), NO explanations, NO comments outside HTML
    - The HTML must be complete, valid, and immediately renderable
    - Even if the result is a simple one-page portfolio with just name, role, and 2 skills - that's ACCEPTABLE
    - Do NOT try to "fill out" the wireframe if data doesn't exist
    - MINIMAL and REAL beats COMPREHENSIVE and FAKE every single time
    
    Generate the complete HTML portfolio now using ONLY the real data provided above:
    """).strip()
    
    @staticmethod
    def get_theme_description(theme: str) -> str:
        """
        Get theme description. If theme matches a predefined theme, use it.
        Otherwise, treat as custom theme description.
        
        Args:
            theme: Theme name (predefined) or custom description
            
        Returns:
            Theme description string
        """
        theme_lower = theme.lower().strip()
        if theme_lower in PortfolioPrompts.THEMES:
            return PortfolioPrompts.THEMES[theme_lower]
        return theme  # Custom theme description
    
    @staticmethod
    def build_prompt(
        wireframe_html: str,
        theme: str,
        cv_content: str,
        personal_info: str = None,
        photo_url: str = None
    ) -> str:
        """
        Build the complete prompt for portfolio generation.
        
        Args:
            wireframe_html: The wireframe HTML template
            theme: Theme name or custom description
            cv_content: User's CV content in markdown
            personal_info: Optional JSON string with personal information
            photo_url: Optional URL to profile photo
            
        Returns:
            Complete formatted prompt
        """
        theme_description = PortfolioPrompts.get_theme_description(theme)
        
        # Build CV section
        if cv_content and cv_content.strip():
            cv_section = f"USER'S CV CONTENT (extract ONLY information explicitly stated here):\n{cv_content}\n\nNOTE: Only use what's written above. If something isn't mentioned, it DOESN'T EXIST."
        else:
            cv_section = "USER'S CV CONTENT: NOT PROVIDED\n\nNOTE: No CV data available. Work with personal info only. If personal info is also empty, create a MINIMAL placeholder structure with just the theme styling."
        
        # Build personal info section
        if personal_info:
            personal_info_section = f"PERSONAL INFORMATION (prioritize this data over CV data):\n{personal_info}\n\nNOTE: Only use the fields that have actual values above. Empty/null fields = DELETE that section."
        else:
            personal_info_section = "PERSONAL INFORMATION: NOT PROVIDED\n\nNOTE: No personal info available. Work with CV data only. If CV is also empty, create a MINIMAL themed structure."
        
        # Build photo section
        if photo_url:
            photo_section = f"PROFILE PHOTO URL (use this EXACT URL, do not modify):\n{photo_url}\n\nUse in: <img src=\"{photo_url}\" alt=\"Profile photo\">"
        else:
            photo_section = "PROFILE PHOTO: NOT PROVIDED\n\nNOTE: Do NOT use any image URL. Do NOT use placeholder services. Options: (1) Remove image sections entirely, (2) Use CSS-only initials circle."
        
        return PortfolioPrompts.PORTFOLIO_BUILDER_PROMPT.format(
            wireframe_html=wireframe_html,
            theme_description=theme_description,
            cv_section=cv_section,
            personal_info_section=personal_info_section,
            photo_section=photo_section
        )
