# Job Matcher

## Overview

The Job Matcher is a hybrid pipeline for discovering and ranking job opportunities that best match a candidate’s anonymized CV and expressed preferences. The service combines LLM-powered profile analysis, multi-source job fetching, semantic similarity search using vector embeddings, and deterministic filtering and scoring to return high-quality matches. Output is normalized into typed `JobDocument` objects with explicit match scores to support downstream ranking and presentation.

The pipeline is designed for reliability and regional relevance. It emphasizes controlled LLM usage, explicit search and filter semantics, and a persistent ChromaDB store that retains job embeddings for fast similarity queries.

## High Level Pipeline

1. Analyze the candidate profile with an LLM to extract search filters and preferences using structured JSON prompts.
2. Fetch job postings from multiple external sources (LinkedIn, Upwork, JSearch, and internships) according to search queries produced by the profile analyzer.
3. Convert each fetched posting into a canonical `JobDocument` using `JobConverter` and compute an embedding for semantic search indexing.
4. Persist jobs to a ChromaDB-based vector store through `JobStorageClient` with an embedding provider.
5. Run hybrid searches combining semantic similarity, location and type filters, and client-side boosts to compute an enhanced match score.
6. Return the best matches, optionally filtering and re-ranking with resume-based or preference-based heuristics.

## Technical Approach and Distinguishing Characteristics

- Retrieval augmentation with embedded search: Jobs are indexed by a vector store to enable semantic matching between a candidate’s resume and job descriptions.

- LLM-driven profile analysis: A purpose-built prompt instructs the LLM to produce structured profile information and job search filters. The output is validated and normalized before use in search queries.

- Multi-source data ingestion: The pipeline gathers job postings from different APIs and scrapers. Each source has an adapter responsible for request construction, rate-limit handling, and normalization into `JobDocument` objects.

- Hybrid scoring: Matching is not purely similarity-based; it uses a weighted scoring function that accounts for semantic match, title relevance, skill overlap, experience level, and job type preferences. This yields more interpretable match scores.

- Strong deduplication and incremental storage: Fetchers insert job data into a persistent vector database with source-based deduplication and batch-level duplicate filtering.

## The Pipeline in Detail

### 1. Profile analysis

- Component: `features.Job_matcher.src.services.profile.profile_analyzer.ProfileAnalyzer`
- Purpose: Use LLM prompts to extract candidate type, skill set, target titles, location preferences, and job filters. The analyzer provides the job search queries consumed by fetchers.
- Validation: The analyzer parses LLM output as JSON and validates the structure with `ProfileValidator` before it is used.

### 2. Job fetching and adapters

- Components: `LinkedInJobFetcher`, `UpworkJobFetcher`, `JSearchFetcher`, `InternshipFetcher` under `features.Job_matcher.src.services.job`.
- Purpose: Fetch raw postings from external APIs and return them as dictionaries.
- Operational details: Each fetcher handles pagination, rate-limiting, and API-specific parameters. For example, `LinkedInJobFetcher` uses RapidAPI headers, sleeps on successive calls to avoid throttling, and annotates jobs with origin country metadata.

### 3. Conversion and normalization

- Component: `features.Job_matcher.src.utils.job_converter.JobConverter`
- Purpose: Convert raw API responses into the `JobDocument` pydantic model with canonical fields such as `title`, `company`, `location`, `skills`, `job_type`, `experience_level`, `source`, and `source_url`.

### 4. Embedding and indexing

- Component: `features.Job_matcher.src.storage.job_storage.JobStorageClient`
- Purpose: Compute embeddings using a configured `EmbeddingProvider` and store them with ChromaDB. Embeddings are computed for compact job text and a structured metadata payload.
- Persisting: The vector DB is persistent and located at `DEFAULT_PATHS['jobs_db']`, enabling cached and persistent searches.

### 5. Matching and scoring

- Component: `JobMatcher.match_jobs_to_profile` and `JobStorageClient` search utilities
- Purpose: Combine semantic search results, location and job-type filtering, and client-side boosting to compute a final match score.
- Scoring mechanics: `_calculate_enhanced_match_score` uses a base similarity factor and adds small bonuses for exact title matches, skills overlap, experience-level alignment, and job-type preference.
- De-duplication: The pipeline keeps only the highest-scoring job for each unique `job_id` before final sorting.

### 6. Resume-based and refined filters

- Component: `filter_jobs_with_resume` and `search_jobs_by_resume`
- Purpose: Improve matching accuracy by leveraging the candidate's full resume during the search stage. This reduces false positives and better aligns results to the candidate's documented experience.

## Privacy and Reliability

- Controlled LLM use: LLMs are used only within the profile analyzer and are configured with low temperature to minimize hallucinations. The LLM is never allowed to directly search external job indexes; it only produces structured filters.

- Rate-limit and error handling: Job fetchers explicitly handle API rate limits and 403/429 responses. Sleep intervals and call caps are used to keep requests within public API bounds.

- Source provenance: Each stored job retains metadata about its origin (source name, source_job_id, source_url, and fetched_from_country). This supports auditing and de-duplication.

- Deterministic storage lifecycle: Jobs are persisted to ChromaDB with deduplication checks. Old postings are pruned by `cleanup_old_jobs` to reduce stale matches.

- Validation: Pydantic models and JSON-extraction utilities are used at boundaries to guarantee typed and validated data flows.

## Technical Details, Models, and Providers

- Key classes and modules:
  - Orchestration: `features.Job_matcher.src.core.job_matcher.JobMatcher`
  - Profile analysis: `features.Job_matcher.src.services.profile.profile_analyzer.ProfileAnalyzer`
  - Data storage: `features.Job_matcher.src.storage.job_storage.JobStorageClient`
  - Job normalization: `features.Job_matcher.src.utils.job_converter.JobConverter`
  - Model types: `features.Job_matcher.src.models.job_models.JobDocument`

- Providers and integrations:
  - LLM Providers: `features.Job_matcher.src.providers.llm_factory.get_llm_provider` picks the first available provider from OpenAI, Google Gemini, or Groq. Each provider implements a standardized `LLMProvider` interface.
  - Embeddings: `features.Job_matcher.src.providers.embedding_provider` and `get_embedding_provider` provide the embedding function used for semantic search (the default in the codebase is a HuggingFace embedding provider referenced as `hf`).
  - Vector Store: ChromaDB is used for persistent vector indexing, enabling semantic search and filtered queries with field-level filters.
  - External APIs: LinkedIn (RapidAPI-backed), Upwork, JSearch, and custom internship scrapers.

- Data model details:
  - `JobDocument` requires canonical fields like `title`, `company`, `location`, `skills`, `job_type`, `experience_level`, `source`, and `posted_date`. `match_score` is an optional numeric value between 0.0 and 1.0 applied after enhanced scoring.

## Implementation Notes and Best Practices

- Prioritize LLM validation. The profile analyzer must produce valid JSON for queries. Use `shared.helpers.json_extractor.extract_json_from_response` to recover structured output and validate against `ProfileValidator`.

- Tune fetcher parameters for your deployment. The pipeline caps LinkedIn calls to avoid API rate limits; update `max_linkedin_calls` and sleep intervals as needed.

- Balance retrieval breadth and prompt size. Larger result sets improve coverage but increase workload and may adversely affect search and ranking latency.

- Monitor job freshness. Use `cleanup_old_jobs` to remove outdated posts and keep the pool of indexed jobs relevant.

## Where to Look in Code

- Orchestration and entry points: `features.Job_matcher.src.core.job_matcher.JobMatcher`
- Data fetching adapters: `features.Job_matcher.src.services.job.*` (LinkedIn, Upwork, JSearch, Internship)
- Profile analysis and prompt templates: `features.Job_matcher.src.services.profile` and `features.Job_matcher.src.prompts.profile_analyzer_prompt`
- Storage: `features.Job_matcher.src.storage.job_storage.JobStorageClient`
- Providers: `features.Job_matcher.src.providers.*`

## Summary

The Job Matcher module provides a reliable, extensible system for matching job opportunities to candidates by blending LLM-based profile analysis, multi-source job retrieval, semantic embeddings, and deterministic ranking logic. The design favors predictability, regional relevance, and auditability through type validation, source provenance, and explicit scoring heuristics.
