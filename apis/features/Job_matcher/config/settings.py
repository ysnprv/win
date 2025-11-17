"""
Job Matcher Settings - Business Logic Constants Only
All environment variables must be loaded from /apis/.env through main.py
This module contains only default values and constants for business logic.
"""

# Target countries for job search (MENA focus)
TARGET_COUNTRIES = [
    "Tunisia",
    "Morocco",
    "Egypt",
    "Nigeria",
    "Kenya",
    "South Africa",
]

# Default job fetch limit per API call
JOB_FETCH_LIMIT = 100
