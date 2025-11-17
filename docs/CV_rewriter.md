# CV Rewriter

## Overview

The CV Rewriter is an LLM-driven pipeline that converts a user CV into an improved, LaTeX-formatted document optimized for specified job descriptions. The pipeline is language-preserving and focuses on three primary goals: preserve the user's original factual content, improve clarity and structure, and tailor content to the target job requirements.

The end-to-end process includes anonymization, job parsing, iterative LLM-based enhancement, similarity-based stopping, deterministic assembly of personal information, optional PDF generation, quality review, and optional background storage of results. The design emphasizes privacy, reproducibility, and reliability for production deployments.

## High Level Pipeline

1. Anonymize the input CV to remove personal identifiers and extract a structured personal data record.
2. Parse job descriptions to extract titles, skills, responsibilities, and requirements.
3. Iteratively enhance the anonymized CV using LLM prompts designed to preserve language and factual content.
4. Use semantic embeddings to calculate cosine similarity between the CV and job descriptions; continue enhancement until a similarity threshold or the maximum number of iterations is reached.
5. Deterministically re-inject personal data (name, contact info, and other fields) into the enhanced LaTeX content.
6. Optionally generate a PDF file from the LaTeX and produce a textual improvement summary.
7. Store metadata and results in a database as a background task when configured.

## Technical Approach and Distinguishing Characteristics

- Language-preserving enhancement: All LLM-based components produce output in the original language of the CV or job posting. No translation is performed.
- LaTeX output contract: The enhancement stage is required to output valid LaTeX document fragments that can be compiled into a PDF. This constraint enforces a structured, reproducible final format for CVs.
- Deterministic assembly: Personal data is never reintroduced by an LLM. The `Assembler` performs deterministic reinsertion and LaTeX escaping to ensure privacy and compile safety.
- Privacy-first flow: Personal identifiers are extracted and removed prior to enhancement. The anonymizer returns both an anonymized CV and a JSON-like personal data record which is stored and later re-inserted deterministically.
- Iterative similarity optimization: The pipeline uses semantic embeddings to compute cosine similarity between the CV and the job text to guide iterations and improve job alignment.
- Fail-fast, auditable pipeline: LLM-based stages validate outputs and raise errors when produced content is invalid. All LLM stages are wrapped with a retry decorator to increase reliability, but no fallback heuristics are used when LLM output consistently fails validation.

## Detailed Pipeline

### 1. Anonymization

- Component: `features.Anonymizer.src.anonymizer.Anonymizer`
- Purpose: Extract personal data fields and produce an anonymized CV with personal values removed.
- Key points: The anonymizer is LLM-powered and returns a structured personal data dictionary. The output is validated so that the rest of the pipeline receives safe anonymized text.

### 2. Job Parsing

- Component: `features.CV_rewriter.src.services.job_parser.JobParser`
- Purpose: Parse raw job descriptions into structured `JobDescription` objects with fields such as title, company, location, responsibilities, requirements, and keywords.
- Approach: Uses LLM prompts designed to extract JSON. The parser is resilient: it tolerates a wide variety of formats and normalizes structures into stable lists and strings.

### 3. LLM-based Enhancement

- Component: `features.CV_rewriter.src.services.enhancer.Enhancer`
- Purpose: Improve the anonymized CV content for specified jobs. Enhancement is done in the CV's original language.
- Key behaviors:
  - Removes OCR and scraping artifacts while preserving facts.
  - Improves action verbs, layout, and readability.
  - Produces output strictly in LaTeX format that can be compiled into a PDF.
  - Validates LaTeX output and rejects invalid content.
- Reliability: This stage uses `retry_on_llm_failure` with bounded retries. If LLM responses do not validate after retries, the operation fails with clear diagnostics.

### 4. Semantic Similarity and Iteration

- Component: `features.CV_rewriter.src.core.orchestration.CVRewriter`, `features.CV_rewriter.src.utils.similarity.SimilarityCalculator`
- Purpose: Compute embeddings for CV and jobs and calculate cosine similarity to determine alignment. The pipeline iterates enhancement until a configured similarity threshold or maximum iterations is reached.
- Note: Only mention that cosine similarity is used; detailed scoring transforms are handled internally but are not required to be reproduced in the documentation.

### 5. Assembly

- Component: `features.CV_rewriter.src.services.assembler.Assembler`
- Purpose: Deterministically insert personal information back into the final enhanced LaTeX document. This step performs LaTeX escaping for special characters and orders contact fields.
- Privacy: Personal data is not generated by LLMs once anonymization has occurred. The assembler only reinserts verified personal data fields extracted earlier.

### 6. PDF Generation

- Component: `features.CV_rewriter.src.services.pdf_generator.PDFGenerator`
- Purpose: Convert LaTeX content into a PDF using PyLaTeX and a local LaTeX toolchain (for example, pdflatex). The generator can optionally store or return the PDF bytes.

### 7. Review and Storage

- Component: `features.CV_rewriter.src.services.reviewer.Reviewer`
- Purpose: Generate a short, reviewer-style summary of improvements between the original anonymized CV and the enhanced anonymized CV.
- Storage: `features.CV_rewriter.src.utils.storage.UserStorageManager` manages temporary per-user storage for CVs and job descriptions. Final results and metadata can be stored in the database through a background task.

## Privacy and Reliability Considerations

- Isolation: Temporary files and intermediate data are maintained per-user in dedicated directories. The `UserStorageManager` ensures a clean workspace for each session.
- Minimal LLM data exposure: Anonymization occurs prior to enhancement to avoid exposing personal identifiers to third-party LLMs.
- Deterministic personal data handling: Personal fields are extracted and stored by the anonymizer. Reincorporation is performed deterministically with strict LaTeX escaping in the `Assembler` to avoid LLM-driven modifications to personal details.
- Validation: The pipeline validates LLM outputs at every stage. Examples: job parsing requires valid JSON; enhanced CV must be valid LaTeX; reviewer output must be a JSON object with improvement entries.
- Retry on transient errors: All LLM-based interactions use `retry_on_llm_failure` to mitigate intermittent provider errors. If the stage continues to fail after retries, the pipeline raises a clear error.

## Technical Details and Providers

- Provider abstraction: All LLM and embedding access is abstracted with `shared.providers.base.Provider` and `shared.providers.base.EmbeddingProvider` respectively. This allows swapping providers without changing pipeline logic.
- Supported providers in the repository:
  - OpenAI: `shared.providers.openai_provider.OpenAIProvider`, `OpenAIEmbeddingProvider` (LangChain wrappers for ChatOpenAI and OpenAI embeddings)
  - Google Gemini: `shared.providers.gemini_provider.GeminiProvider` (LangChain wrapper for ChatGoogleGenerativeAI)
  - Cerebras: `shared.providers.cerebras_provider.CerebrasProvider` (LangChain wrapper for Cerebras)

- Embedding strategy: Embeddings are provided by the configured `EmbeddingProvider`. The default embedding provider included in the repository is the OpenAI embedding wrapper. Similarity is measured with cosine similarity.

- Robust tooling: The implementation uses LangChain client wrappers for model calls, PyLaTeX for PDF generation, and pydantic models for strict typed data structures.

## Implementation Notes and Best Practices

- The pipeline follows a strict contract: LLMs must return valid outputs in prescribed structured formats. This design is intended to make the pipeline auditable and maintainable.
- For deployments with strict privacy constraints, consider hosting long-running providers within a private network or using providers with private instance options.
- The `MAX_ITER` and `SIMILARITY_THRESHOLD` constants support configuration of iteration limits and alignment stop conditions.

## Where to Look in Code

- Orchestration: `features.CV_rewriter.src.core.orchestration.cv_rewriter.CVRewriter`
- Enhancement: `features.CV_rewriter.src.services.enhancer.Enhancer`
- Job parsing: `features.CV_rewriter.src.services.job_parser.JobParser`
- Anonymization: `features.Anonymizer.src.anonymizer.Anonymizer`
- Assembly and LaTeX: `features.CV_rewriter.src.services.assembler.Assembler`
- PDF generation: `features.CV_rewriter.src.services.pdf_generator.PDFGenerator`
- Similarity utilities: `features.CV_rewriter.src.utils.similarity.SimilarityCalculator`
- Temporary storage manager: `features.CV_rewriter.src.utils.storage.UserStorageManager`

## Summary

The CV Rewriter module provides a reliable, privacy-oriented pipeline to enhance CV content and produce production-ready, LaTeX-formatted CVs tailored to job descriptions. The pipeline emphasizes language preservation, deterministic handling of personal data, and iterative semantic alignment guided by cosine similarity.
