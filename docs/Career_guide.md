# Career Guide

## Overview

The Career Guide is an LLM-driven service that synthesizes a user's anonymized CV, optional profile data, and domain-specific job descriptions to produce tailored, actionable career guidance. It is designed to support professional development by identifying strengths, measuring readiness for target roles, recommending achievable upskilling steps, and producing a five-step career roadmap.

The service emphasizes privacy, reproducibility, and practical outputs. The output contract requires strictly formatted JSON that conforms to a typed model. The module combines retrieval from a domain-specific knowledge base, semantic embedding similarity search, and a constrained LLM prompt that guides responses into a deterministic JSON structure.

## High Level Pipeline

1. Accept anonymized CV text and optional profile and target job inputs. Build a `CareerGuideInput` model to normalize the input.
2. Query a ChromaDB knowledge base for domain-specific job descriptions using a combined similarity and metadata approach.
3. Format returned job descriptions into a concise context block for the LLM prompt.
4. Generate a constrained LLM prompt using `PromptTemplates.CAREER_GUIDANCE` and send it to the configured provider to obtain career guidance in strict JSON format.
5. Strip out any LLM "thinking" artifacts and parse the JSON response into `CareerGuideOutput` using Pydantic.
6. Validate the output and return or raise a deterministic error on failure.

## Technical Approach and Distinguishing Characteristics

- Strict JSON contract. The LLM is instructed to return only valid JSON in a predefined flat structure. This design reduces ambiguity and introduces deterministic parsing and validation.

- Retrieval-augmented guidance. Career suggestions are grounded in real job descriptions from a curated data repository. The module uses semantic embeddings and metadata matching to combine relevant job descriptions with user data. This ensures suggestions are both personalized and market-aware.

- Privacy-preserving inputs. The pipeline is intended to operate on anonymized CV content so personal identifiers are not exposed to model providers. The module expects anonymized text as input and does not manage re-identification.

- Strong validation and retry mechanisms. Interactions with LLMs are wrapped by `retry_on_llm_failure` to reduce transient failures and the module employs strict Pydantic validation through `CareerGuideOutput` to ensure the output matches expected structure and bounds.

## The Pipeline in Detail

### 1. Input normalization

- Component: `features.Career_guide.src.models.models.CareerGuideInput`
- Purpose: Consolidate CV, profile data, current job, and optional target job into a single string used for embedding and retrieval.
- Implementation detail: `get_combined_user_data()` returns a single block of text combining all inputs. Collecting profile data and job titles into the search input improves retrieval relevance.

### 2. Knowledge base retrieval

- Component: `features.Career_guide.src.database.knowledge_base.KnowledgeBase`
- Purpose: Provide relevant job descriptions for the selected domain.
- Approach: The knowledge base is a singleton ChromaDB client that is lazily initialized. On first use it clones a public job descriptions repository, populates per-domain collections, generates embeddings with the configured `EmbeddingProvider`, and then cleans up the cloned repository data.
- Results selection: Two strategies are used to gather up to five job descriptions:
  - Similarity search using embeddings to select results most semantically aligned with user data.
  - Metadata/regex matching to prioritize exact or fuzzy job name matches (current or target job title).

### 3. Prompt composition

- Component: `features.Career_guide.src.prompts.prompts.PromptTemplates`
- Purpose: Compose a constrained and opinionated LLM prompt that drives the model to produce an encouraging, practical, and actionable career plan.
- Notable constraints: Prompt enforces array lengths and fields, a precise readiness score calculation, and exact JSON-only output to simplify validation.

### 4. LLM generation

- Component: `shared.providers.base.Provider` implementations
- Purpose: Invoke LLMs to generate the JSON career guide.
- Reliability: LLM calls are retried with `retry_on_llm_failure(max_retries=3)`. Responses are post-processed with `strip_thinking_block` to remove extraneous text.

### 5. Parsing and validation

- Component: `CareerGuide._parse_response` and `features.Career_guide.src.models.models.CareerGuideOutput`
- Purpose: Extract strict JSON from the LLM response and validate it with Pydantic. If the LLM returns non-JSON output, the module attempts to locate a JSON object in the text; otherwise it raises `BadLLMResponseError`.
- Why this matters: The strict JSON contract enables deterministic downstream processing, auditability, and simple unit testing.

## Privacy and Reliability: How the Pipeline Protects Data and Maintains Correctness

- Privacy-first inputs. The module accepts anonymized CV text. This design places the responsibility of removing personal identifiers on the caller while ensuring the module does not expose personal data to LLM providers.

- Local, ephemeral retrieval data. The knowledge base clones a public repository only during initialization. Cloned repository data is removed after ChromaDB collections are populated so long-lived holdings of the raw data are avoided.

- Deterministic validation. The use of Pydantic models and JSON-only outputs makes the pipeline auditable and reduces runtime surprises.

- Retry and failure transparency. Model interactions use a retry decorator and provide clear logs for each LLM invocation. When persistent failures occur, the orchestrator raises precise exceptions with diagnostics so callers can handle errors appropriately.

- Combined retrieval strategy. Employing both semantic similarity and metadata matching reduces false positives and improves contextual alignment with the user, which makes recommendations more actionable and relevant.

## Technical Details, Models, and Providers

- Key classes and modules:
  - `features.Career_guide.src.guide.CareerGuide`: Orchestrator for the end-to-end pipeline.
  - `features.Career_guide.src.database.knowledge_base.KnowledgeBase`: ChromaDB-backed job repository manager.
  - `features.Career_guide.src.models.models.CareerGuideInput` and `CareerGuideOutput`: Pydantic models for robust input normalization and output validation.
  - `features.Career_guide.src.prompts.prompts.PromptTemplates`: Prompt templates that require constrained JSON output from the LLM.

- Providers and integrations:
  - LLM Provider: Any implementation of `shared.providers.base.Provider` may be used. The repository contains wrappers for OpenAI, Google Gemini, and Cerebras. Calls are made via `await self.provider(prompt)`.
  - Embeddings: `shared.providers.base.EmbeddingProvider` is required by `KnowledgeBase` to compute embeddings used in similarity searches. The default embeddings provider available in the codebase is the OpenAI embedding wrapper.
  - Vector Database: ChromaDB is used as the in-memory vector store for job descriptions. Collections are partitioned per domain and are populated using embeddings for each job description.

- Models and validation:
  - `CareerGuideOutput` expects arrays of 3-5 items for most fields and a five-step `career_roadmap`. `readiness_score` is an integer between 0 and 100.
  - Responses are parsed from JSON and validated by the Pydantic model. Failures result in a `BadLLMResponseError`.

- Operational notes:
  - Knowledge base initialization requires `git` on the host to clone the public dataset. The repository will be cleaned up after initialization to avoid storing the raw text permanently.
  - ChromaDB runs in-memory by default; running at scale may require a persistent store or a managed vector database.

## Implementation Notes and Best Practices

- Ensure CV input is anonymized before calling `CareerGuide.generate_guide` to avoid leaking personal information to external providers.

- Choose an `EmbeddingProvider` consistent with the model provider. Using the same vendor for both LLM and embeddings can improve semantic search alignment.

- Evaluate `n_similarity` and `n_regex` parameters to balance retrieval relevance with context size in LLM prompts. More retrieved content increases prompt length and may affect billing and model latency.

- For production deployments with strict privacy requirements, consider deploying model providers in a private or self-hosted environment with data residency guarantees.

## Where to Look in Code

- Orchestration: `features.Career_guide.src.guide.CareerGuide`.
- Knowledge base: `features.Career_guide.src.database.knowledge_base.KnowledgeBase`.
- Prompt templates: `features.Career_guide.src.prompts.prompts.PromptTemplates`.
- Input and output models: `features.Career_guide.src.models.models`.
- Shared provider abstractions: `shared.providers.base` and the provider implementations under `shared.providers`.

## Summary

The Career Guide module combines retrieval-augmented LLM guidance with strict JSON contracts and domain-aware retrieval to offer private, reproducible, and actionable career advice. By using a hybrid similarity and metadata search on a curated job dataset, the service aligns its recommendations with current market descriptions while enforcing privacy, validation, and retry patterns to maintain reliability.
