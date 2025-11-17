# Portfolio Builder

## Overview

The Portfolio Builder is an LLM-driven pipeline that generates a complete, styled HTML portfolio page from a wireframe template, a theme specification, and anonymized CV content or optional personal data. The pipeline focuses on privacy-preserving content extraction, strict guarantees against fabricated data, and producing immediately renderable HTML suitable for client-side rendering or direct download.

The end-to-end process includes wireframe selection and loading, constrained prompt construction, LLM-based HTML generation, content cleaning, structural validation, and deterministic output assembly. The module emphasizes auditability, deterministic personal-data handling, and robustness through validation and retries.

## High Level Pipeline

1. Load a wireframe HTML template from a curated set of wireframes.
2. Build a constrained prompt combining the wireframe, a theme description, user CV content, optional personal information, and optional profile photo URL.
3. Invoke the configured LLM provider to transform the wireframe into complete, themed HTML using only the real data provided.
4. Clean and extract a pure HTML document from the LLM response, removing any extraneous text, code fences, or system-thinking artifacts.
5. Validate the resulting HTML for structural correctness and minimal content requirements.
6. Return a `Portfolio` object with the final HTML or raise an informative error when validation fails.

## Technical Approach and Distinguishing Characteristics

- Zero-fabrication policy. The portfolio builder enforces a "zero fake data" policy: if a field is not explicitly present in the CV or supplied personal information, the generator must not invent or populate it. Sections without real data are removed to preserve integrity and prevent privacy breaches.

- Wireframe-as-template. Wireframes are treated strictly as starting templates. The LLM must only use the documented structure where actual user content exists. Empty sections are removed rather than filled with placeholders.

- Theme-driven inline styling. Themes are applied as inline CSS in a single `<style>` tag to produce a fully self-contained, immediately renderable HTML document. Several predefined themes (professional, creative, minimal, tech, elegant, dynamic) are available; custom text may also be used to describe themes.

- Privacy-first design. The module accepts anonymized CV content and optional explicit personal information. The prompts instruct the model never to fabricate contact details, social links, or testimonials. Photo usage is restricted to user-supplied URLs only.

- Robust validation and retry. Output is validated using a strict `HTMLValidator` that verifies DOCTYPE, head and body sections, and balanced tags for common structural elements. The main build function is decorated with `retry_on_llm_failure` to mitigate transient provider faults.

- Deterministic output contracts. The `Portfolio` return model is typed with Pydantic and enforces minimal HTML size and a valid document structure before acceptance.

## The Pipeline in Detail

### 1. Wireframe Loading

- Component: `features.Portfolio_builder.helpers.wireframe_loader.WireframeLoader`
- Purpose: Locate and read the requested wireframe HTML template from the `src/wireframes` directory. Available wireframes include `classic`, `sidepanel`, `blogpost`, `hero`, and `gallery`.
- Behavior: If the chosen wireframe is not found, the loader raises a `FileNotFoundError` with a list of available wireframes.

### 2. Prompt Construction

- Component: `features.Portfolio_builder.src.prompts.prompts.PortfolioPrompts`
- Purpose: Combine the wireframe HTML, theme description, CV content, optional personal info and photo URL into a single, strict prompt.
- Constraints: The system prompt enforces the no-fabrication rule, requires inline styling, instructs the model to delete or omit sections that lack real data, and mandates a single complete HTML document as output.

### 3. LLM Generation

- Component: `features.Portfolio_builder.src.builder.PortfolioBuilder` (calls `shared.providers.base.Provider`)
- Purpose: Request the provider to transform the wireframe and inputs into final HTML.
- Reliability: LLM calls are wrapped with `retry_on_llm_failure(max_retries=3)`. The response is post-processed through `strip_thinking_block` and `strip_html_code_blocks` to remove commentary and fences.

### 4. Response Cleaning and Extraction

- Component: `PortfolioBuilder._extract_html`
- Purpose: Strip pre/post content, extract content from the first `<!DOCTYPE html>` or `<html` token through to an optional closing `</html>`, and ensure the HTML body contains substantive content.

### 5. HTML Validation

- Component: `features.Portfolio_builder.src.builder.HTMLValidator`
- Purpose: Perform syntactic checks (DOCTYPE/head/body presence and tag balance) and verify minimum length to prevent empty or malformed responses.
- Behavior: On failure, the pipeline raises `BadLLMResponseError` with guidance logged for diagnostics.

### 6. Final Assembly

- Component: `features.Portfolio_builder.src.models.Portfolio`
- Purpose: Encapsulate generated HTML with metadata about the chosen wireframe and theme. Pydantic validators enforce structural constraints and acceptable minimal length.

## Privacy, Reliability, and Data Guarantees

- Anonymized inputs. The builder is designed to operate with anonymized CV content. Only fields explicitly provided in the CV or the `personal_info` argument will be used. This prevents accidental reintroduction of identifiers.

- Zero-fake policy enforcement. If required values are absent, the pipeline removes corresponding sections. This design prevents the model from inventing contact information, project details, or testimonials.

- Predictable failure modes. LLM output is validated and either accepted or rejected with a clear error. This fail-fast design makes behavior deterministic and auditable.

- Retry on transient errors. All LLM invocations are wrapped with `retry_on_llm_failure` to handle intermittent provider outages or API throttling.

- Auditability. Prompts and wireframes are explicit and logged; validators perform deterministic checks on outputs. This enables reproducible debugging and meaningful telemetry.

## Technical Details and Providers

- Key classes and modules:
  - `features.Portfolio_builder.src.builder.PortfolioBuilder` (Main orchestration and LLM invocation)
  - `features.Portfolio_builder.src.models.PortfolioRequest` and `Portfolio` (Pydantic request/response models)
  - `features.Portfolio_builder.src.prompts.prompts.PortfolioPrompts` (Theme descriptions and system/prompt templates)
  - `features.Portfolio_builder.helpers.wireframe_loader.WireframeLoader` (Wireframe template loader)
  - `features.Portfolio_builder.src.builder.HTMLValidator` (Structural checks for HTML)

- Shared utilities used:
  - `shared.helpers.retry_decorator.retry_on_llm_failure` to mitigate transient provider errors
  - `shared.helpers.strip_thinking_block.strip_thinking_block` to remove LLM thought artifacts
  - `shared.helpers.strip_code_blocks.strip_html_code_blocks` to remove markdown fences around HTML code
  - `shared.helpers.logger.get_logger` for consistent logs

- Provider abstraction:
  - The Portfolio Builder uses the `shared.providers.base.Provider` interface so it can run against different LLM providers. Implementations exist for OpenAI and Google Gemini and others in `apis/shared/providers`.
  - Embeddings are not required for basic portfolio generation; however, the same provider abstraction is used for other modules where necessary.

- Validation:
  - Pydantic models ensure minimal HTML content and correct structural markers.
  - `HTMLValidator` performs additional pragmatic checks such as balancing of `<html>` and `<body>` tags.

## Where to Look in Code

- Orchestration and validation: `features.Portfolio_builder.src.builder.PortfolioBuilder` and `HTMLValidator`
- Models: `features.Portfolio_builder.src.models` (request and output models)
- Prompt templates: `features.Portfolio_builder.src.prompts.prompts.PortfolioPrompts`
- Wireframe assets and loader: `features.Portfolio_builder.helpers.wireframe_loader` and `features.Portfolio_builder.src.wireframes`
- Frontend integration: `frontend/(features)/services/portfolio-builder` for user flows and wiring between the UI and backend API

## Implementation Notes and Best Practices

- Always supply anonymized CV content to ensure that the LLM is not exposed to personally identifying information.
- Prefer supplying explicit personal information when available to increase the density of usable portfolio sections; the system will still not invent any missing data.
- Use the predefined themes for consistent, high-quality styling; custom themes are accepted but are less predictable across outputs and may require additional prompt context.
- Handle `BadLLMResponseError` explicitly in higher-level orchestration to provide clear feedback to end-clients and to surface debugging logs.

## Summary

The Portfolio Builder provides a deterministic, privacy-conscious flow that converts wireframes and real user content into production-ready HTML. The module enforces a strict policy against fabricated data, uses robust validation and retry behavior to increase reliability, and applies theme-driven styling to produce visually consistent outputs that can be rendered client-side or offered as downloadable artifacts.