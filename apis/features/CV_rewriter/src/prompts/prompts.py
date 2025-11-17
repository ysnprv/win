import textwrap


class PromptTemplates:
    """Language-agnostic prompts - work with any input language."""

    CV_ENHANCEMENT = textwrap.dedent(
        """\
    You are enhancing a CV that was scraped from a PDF or similar file format.
    
    CRITICAL OUTPUT FORMAT REQUIREMENT:
    You MUST output the CV in VALID LaTeX format that can be compiled to PDF
    Use proper LaTeX document structure, commands, and environments
    Ensure the LaTeX is syntactically correct and compilable
    Use standard LaTeX packages (no exotic or unavailable packages)

    ABSOLUTE LANGUAGE REQUIREMENT - READ CAREFULLY:
    STEP 1: Identify the language of the CV below
    STEP 2: Write your ENTIRE response ONLY in that EXACT language
    NEVER translate ANY part of the CV
    NEVER mix languages in your output
    NEVER use a different language than the CV's original language
    This is MANDATORY - language consistency is CRITICAL

    IMPORTANT - DATA SOURCE:
    This CV was extracted/scraped from a PDF or similar file.
    The text may contain scraping/OCR errors: broken formatting, missing punctuation,
       weird spacing, typos from misread characters, etc.
    You should FIX obvious formatting/scraping errors where it improves readability,
       but NEVER change the factual content or meaning.
    Examples: fix broken bullet points, improve spacing, correct obvious OCR typos.
    DO NOT invent new information or change dates, company names, or factual details.

    CV CONTENT TO ENHANCE (MUST preserve this EXACT language):
    {anonymized_cv}

    Job target info (reference only - may be in different language, IGNORE their language):
    Roles: {job_titles}
    Skills: {key_skills}
    Responsibilities: {responsibilities}
    Requirements: {requirements}

    User Profile Information (if available - use this to enrich CV content):
    {profile_data}

    Additional context from user (if provided):
    {qa_context}

    CRITICAL - YOUR ROLE:
    You are ONLY enhancing the CONTENT SECTIONS provided above (Experience, Skills, Education, Projects, etc.)
    Do NOT add personal information (name, contact details, etc.) - that is handled separately
    Do NOT add a CV header or title section - that is handled separately

    Enhancement rules:
    1. FIX formatting issues from scraping (spacing, bullets, line breaks)
    2. FIX obvious OCR/scraping typos that break readability
    3. Use stronger action verbs in the CV's ORIGINAL language
    4. Emphasize relevant skills from job info (in CV's language)
    5. If user provided additional context above, incorporate relevant details naturally
    6. Keep all facts 100% truthful - only improve wording and formatting
    7. CRITICAL: Write 100% in the CV's original language - NO exceptions
    8. CRITICAL: Output VALID LaTeX code ONLY - NO plain text
    9. CRITICAL: Do NOT add any personal info sections (contact details, name, title) - only enhance content sections

    LaTeX FORMATTING REQUIREMENTS:
    - Use \\section{{}} for main sections (Experience, Education, Skills, etc.)
    - Use \\subsection{{}} for sub-sections (job titles, degrees)
    - Use \\textbf{{}} for bold text (company names, job titles)
    - Use \\textit{{}} for italic text (dates, locations)
    - Use \\begin{{itemize}} ... \\end{{itemize}} for bullet lists
    - Use \\item for list items
    - Escape special LaTeX characters: & % $ # _ {{ }} ~ ^ \\
    - Use proper spacing and line breaks (\\\\, \\vspace)
    - Keep it clean, professional, and compilable

    - DO NOT Translate or change the language
    - DO NOT Invent experiences, skills, or dates
    - DO NOT Change company names, job titles, or factual information
    - DO NOT Mix languages
    - DO NOT Output plain text (MUST be LaTeX)
    - DO NOT Include \\documentclass, \\begin{{document}}, or \\end{{document}} (content ONLY)
    - DO NOT Add personal information sections (name, contact details, address, etc.)
    - DO NOT Create a CV header or title section with personal info
    - DO NOT Add placeholder text like "[Your Name]" or "[Contact Information]"

    DO:
    - Fix scraping artifacts (broken formatting, spacing issues)
    - Correct obvious OCR errors (e.g., "managcr" → "manager" in the CV's language)
    - Improve action verbs and phrasing (in the CV's language)
    - Incorporate user-provided context naturally where relevant
    - Make the CV more readable and professional (in the CV's language)
    - Use proper LaTeX commands and environments
    - Ensure all LaTeX syntax is correct and compilable

    Output ONLY the enhanced CV content in VALID LaTeX format, 100% in the CV's original language.
    DO NOT include document preamble (\\documentclass, \\begin{{document}}, etc.) - content ONLY.
    FINAL REMINDER: Your output must be VALID LATEX in the SAME language as the input CV - absolutely NO translation.
    """
    )

    JOB_PARSING = textwrap.dedent(
        """\
    Parse this job description into structured JSON format.

    CRITICAL - LANGUAGE REQUIREMENT:
    The job description is in a SPECIFIC language.
    Extract ALL information in its ORIGINAL language - NEVER translate.
    Keep field values 100% in the source language.

    IMPORTANT - DATA SOURCE:
    This job description may have been scraped from a website/PDF.
    Scraping errors may exist: broken formatting, missing punctuation, OCR typos, etc.
    FIX obvious scraping errors for readability (spacing, obvious typos) but keep the meaning.
    DO NOT invent information - only extract what's actually present.

    JOB POSTING (original language - PRESERVE THIS LANGUAGE):
    {job_text}

    TASK: Extract whatever information is available. If certain fields are not present, 
    omit them (don't use null or empty arrays unless the field truly exists but is empty).
    Be flexible - job postings come in many formats.

    Standard fields to extract (if available):
    - title: Job title (in original language)
    - company: Company name
    - location: Job location (string or list)
    - description: Overview/summary (in original language)
    - responsibilities: List of main duties (in original language)
    - requirements: Required qualifications (in original language)
    - preferred_qualifications: Nice-to-have qualifications (in original language)
    - keywords: Important technical terms, skills, tools (in original language)
    
    Additional fields you can extract (use snake_case names):
    - salary, salary_range, compensation
    - benefits, perks
    - team_size, department
    - work_arrangement (remote, hybrid, on-site)
    - experience_level (entry, mid, senior)
    - employment_type (full-time, part-time, contract)
    - application_deadline
    - Any other relevant information with logical field names

    FIXING SCRAPING ERRORS:
    - Fix broken bullet points and formatting
    - Correct obvious OCR typos (e.g., "managcr" → "manager")
    - Improve spacing and readability
    - DO NOT change company names, job titles, or requirements' meaning
    - Keep all content in the ORIGINAL language

    CRITICAL OUTPUT FORMAT:
    You MUST respond with ONLY valid JSON. No explanations, no markdown, no extra text.
    Start your response with {{ and end with }}.
    
    Example format:
    {{
        "title": "...",
        "company": "...",
        "responsibilities": ["...", "..."],
        "requirements": ["...", "..."]
    }}

    Keep all extracted text in the ORIGINAL LANGUAGE - absolutely NO translation.
    Use predictable, standard field names in snake_case.
    Only include fields you can actually extract - omit missing ones entirely.
    Fix formatting/OCR errors but preserve factual content and original language.
    
    Remember: Your entire response must be valid JSON starting with {{ and ending with }}.
    """
    )

    QUERY_GENERATION = textwrap.dedent(
        """\
    You are helping improve a CV by asking clarifying questions to gather missing or incomplete information.

    CRITICAL - LANGUAGE REQUIREMENT:
    The CV is in a SPECIFIC language. You MUST ask questions in that EXACT language.
    NEVER translate, NEVER use a different language than the CV's original language.

    CV CONTENT:
    {cv_text}

    TASK:
    Analyze the CV and generate 4-10 relevant questions that would help improve it.
    Focus on areas where more context would be valuable:
    - Details about recent work experiences and projects
    - Specific technologies, tools, and methodologies used
    - Quantifiable achievements and impacts
    - Skills that are mentioned but not elaborated
    - Important missing information that should be in a strong CV
    - Certifications, training, or notable accomplishments

    CRITICAL - PRIVACY PROTECTION:
    NEVER ask for personal or private information including:
    - Full name, address, phone number, email, or contact details
    - Date of birth, age, gender, marital status, or nationality
    - Social security numbers, ID numbers, or government identifiers
    - Financial information (salary expectations, bank details, etc.)
    - Religious beliefs, political affiliations, or personal life details
    - Health information, disabilities, or medical conditions
    - Photos, social media profiles, or personal websites
    - References' contact information or personal details
    ONLY ask about professional skills, experiences, achievements, and technical competencies.

    REQUIREMENTS:
    1. Generate between 4 and 10 questions (not less, not more)
    2. Ask questions in the SAME language as the CV
    3. Questions should be specific and actionable
    4. Focus on information that would strengthen the CV
    5. NEVER request personal, private, or sensitive information
    - Avoid questions about information already clearly stated in the CV
    - Questions should help fill gaps and add depth

    CRITICAL OUTPUT FORMAT:
    You MUST respond with ONLY valid JSON. No explanations, no markdown, no extra text.
    Start your response with {{ and end with }}.
    
    Example format:
    {{
        "q1": "First question in CV's language",
        "q2": "Second question in CV's language",
        "q3": "Third question in CV's language"
    }}

    Use keys q1, q2, q3, etc. for each question.
    All questions must be in the CV's original language.
    Generate 4-10 questions that would meaningfully improve the CV.
    Remember: Your entire response must be valid JSON starting with {{ and ending with }}.
    """
    )

    CV_REVIEW = textwrap.dedent(
        """\
    You are comparing two versions of a CV to create a concise "What's Improved?" summary.

    CRITICAL - LANGUAGE REQUIREMENT:
    Both CVs are in a SPECIFIC language. You MUST write your summary in that EXACT language.
    NEVER translate, NEVER use English if the CVs are in another language.
    Your entire response must be in the SAME language as the CVs.

    ORIGINAL CV (anonymized):
    {old_cv}

    ENHANCED CV (anonymized):
    {new_cv}

    TASK:
    Analyze the changes between the original and enhanced CV and create a short summary highlighting the key improvements.
    Focus on meaningful changes that strengthen the CV:
    - New skills, technologies, or methodologies added
    - Better descriptions of experience and achievements
    - Improved structure and organization
    - Added quantifiable results or metrics
    - Enhanced clarity and professional presentation
    - Removed weak or redundant content
    - Better alignment with modern CV best practices

    REQUIREMENTS:
    1. Write 4-8 bullet points maximum (keep it concise and impactful)
    2. Focus on the MOST significant improvements only
    3. Use active, positive language ("Added...", "Enhanced...", "Improved...")
    4. Be specific about what changed (mention actual skills, sections, or content areas)
    5. Avoid generic statements - be concrete and actionable
    6. Write in the SAME language as the CVs
    - Keep each bullet point short (1-2 lines maximum)

    CRITICAL OUTPUT FORMAT:
    You MUST respond with ONLY valid JSON. No explanations, no markdown, no extra text.
    Start your response with {{ and end with }}.
    
    Example format (adjust language to match CVs):
    {{
        "improvements": [
            "Added specific metrics to project descriptions, quantifying impact with percentages and numbers",
            "Enhanced technical skills section with modern frameworks and tools relevant to target roles",
            "Improved work experience descriptions with action-oriented language and measurable achievements",
            "Restructured education section for better clarity and added relevant certifications"
        ]
    }}

    The "improvements" array should contain 4-8 concise bullet points in the CV's original language.
    Focus on real, meaningful changes that make the CV stronger.
    Remember: Your entire response must be valid JSON starting with {{ and ending with }}.
    """
    )

    JOBS_SUMMARY = textwrap.dedent(
        """\
    Analyze the following job description(s) and generate both a job title and summary.

    Job Description(s):
    {jobs_text}

    TASK:
    1. Generate a JOB TITLE (maximum 3 words) - this should be the actual job position name
       Examples of CORRECT job titles:
       - "Senior Software Engineer"
       - "Product Manager"
       - "Data Scientist"
       - "Marketing Director"
       - "Full Stack Developer"
       
       DO NOT use descriptive phrases like:
       - "Tech Leadership Role"
       - "Digital Marketing Focus"
       - "Engineering Position Available"
       
       The title MUST be a real job position name that would appear on a business card or LinkedIn profile.
       
    2. Create a brief summary (maximum 3 lines) that captures:
       - The main role/position being sought
       - Key requirements and qualifications
       - Primary responsibilities or focus areas

    LANGUAGE REQUIREMENT:
    Write both the title and summary in the SAME language as the job description(s).
    If multiple languages are present, use the predominant language.

    OUTPUT FORMAT:
    You MUST respond with valid JSON in this exact format:
    {{
        "title": "Actual Job Position Name",
        "summary": "A concise 3-line paragraph summary..."
    }}

    CRITICAL RULES:
    - The title MUST be 3 words or less
    - The title MUST be an actual job position/role name (e.g., "Software Engineer", "Marketing Manager")
    - DO NOT use descriptive phrases or generic terms - use the actual job title
    - If multiple roles are mentioned, pick the most prominent one or generalize appropriately
    - The summary should be a clean 3-line paragraph
    - Your entire response must be valid JSON starting with {{ and ending with }}
    - Do not include any text outside the JSON structure
    """
    )
