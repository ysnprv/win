import textwrap


class PromptTemplates:
    """Prompts for CV anonymization - language-agnostic."""

    PRIVACY_EXTRACTION = textwrap.dedent(
        """\
    Extract personal information from this CV/resume (in any language) and return an anonymized version.

    CRITICAL - LANGUAGE REQUIREMENT:
    The CV is in a SPECIFIC language. You MUST preserve that EXACT language throughout.
    NEVER translate, NEVER mix languages, NEVER change the language of ANY text.
    The anonymized CV must be 100% in the SAME language as the input CV.

    IMPORTANT - DATA SOURCE:
    This CV was extracted/scraped from a PDF or similar file format.
    Scraping errors may have occurred: missing dots in emails (e.g., "john@gmailcom" instead of "john@gmail.com"),
       phone number typos, malformed URLs, broken formatting, etc.
    You should FIX obvious scraping/OCR errors where logical (e.g., add missing dots to email domains,
       fix obvious phone number formatting), but NEVER invent or change the actual information.
    Only fix clear technical errors - do NOT modify names, content, or meaning.

    CV (original language - PRESERVE THIS EXACT LANGUAGE):
    {cv_text}

    TASK:
    1. Extract ALL personal information you can identify - use logical, predictable field names
    2. Common fields: name, email, phone, location, linkedin, portfolio, github, website, etc.
    3. You can add ANY other personal fields you identify (e.g., birth_date, nationality, etc.)
    4. Use snake_case for field names (e.g., "phone_number" not "Phone Number")
    5. FIX obvious scraping errors in extracted data (missing dots in emails, phone formatting, etc.)
    6. Remove ALL personal information from the CV text
    7. CRITICAL: Do NOT use placeholders, do NOT leave gaps, do NOT add "[Name]" or similar markers
    8. Simply remove the personal information cleanly - the text should flow naturally without it
    9. Do NOT remove section headers (like "Experience", "Education", "Skills") - only remove personal data
    10. Keep all professional content (experience, skills, education, projects) in ORIGINAL LANGUAGE
    11. CRITICAL: Maintain 100% language consistency - use ONLY the CV's original language

    IMPORTANT - Use predictable, standard field names:
    - name (not full_name, candidate_name, etc.)
    - email (not email_address, contact_email, etc.)
    - phone (not phone_number, telephone, etc.)
    - location (not address, city, residence, etc.)
    - linkedin (not linkedin_url, linkedin_profile, etc.)
    - portfolio (not portfolio_url, portfolio_site, etc.)
    - github (not github_url, github_profile, etc.)
    
    FIXING SCRAPING ERRORS - Examples:
    - "john@gmail com" → "john@gmail.com" (add missing dot)
    - "user@yahoocom" → "user@yahoo.com"
    - "httpsgithubcom/user" → "https://github.com/user"
    - Malformed phone numbers: fix spacing/formatting but keep the digits
    - DO NOT change actual names, addresses, or meaningful content
    
    For fields that may have multiple values (email, phone), use a list or single string as appropriate.
    
    CRITICAL OUTPUT FORMAT:
    You MUST respond with ONLY valid JSON. No explanations, no markdown, no extra text.
    Start your response with {{ and end with }}.
    
    Example format:
    {{
        "personal_info": {{
            "name": "...",
            "email": "...",
            "phone": "..."
        }},
        "anonymized_cv": "..."
    }}

    If you cannot extract certain fields, omit them entirely (don't use null).
    The anonymized_cv field must contain the CV text in its ORIGINAL LANGUAGE with personal info removed.
    REMINDER: Output must be 100% in the CV's original language - NO translation, NO language mixing.
    Remember: Your entire response must be valid JSON starting with {{ and ending with }}.
    """
    )
