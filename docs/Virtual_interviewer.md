# Virtual Interviewer

## Overview

The Virtual Interviewer is a real-time, LLM-driven interviewing system that simulates human interviewers using configurable personas and voice profiles. It supports text and voice sessions via WebSocket, performs automatic transcription (STT), invokes an LLM-driven agent to conduct interviews, produces a structured interview analysis, and optionally persists a PDF report and session metadata to storage. The module is privacy- and safety-aware and enforces strict content rules for interview conduct.

The end-to-end process includes persona selection, real-time audio transcription and text exchange, LLM-driven dialog management, automated performance analysis, PDF generation, and storage. The design emphasizes deterministic analysis, safety-first behavior, and robust error handling for production use.

## High Level Pipeline

1. Choose interviewer persona and connect to the interviewer agent via WebSocket.
2. For voice sessions: receive user audio, convert to WAV, perform STT using Groq Whisper, and forward transcription to the agent.
3. Conduct the interview with an LLM agent that follows a system prompt enforcing persona, brevity, structure, and safety constraints.
4. Capture the full conversational transcript and run `InterviewAnalyzer` to generate performance metrics, narrative analysis, and recommendations.
5. Optionally produce a PDF report of the interview and persist it and the metadata to Supabase storage and the `interviews` table.

## Technical Approach and Distinguishing Characteristics

- Persona-driven interviewing. The agent uses structured persona metadata to configure the LLM system prompt. Personas control interview style, difficulty, and tone and are applied consistently to maintain a stable assessment context.

- Real-time voice and text support. Two transport flows are supported: text WebSocket and voice WebSocket. Voice uses robust audio preprocessing and Groq Whisper for transcription, and ElevenLabs for text-to-speech to provide a natural voice for the persona.

- Safety-first behavior. The system enforces immediate termination of sessions that contain abusive, violent, or hateful content. System prompts instruct the interviewer to avoid generating or repeating disallowed content, and the analysis step includes safety verification.

- Deterministic scoring and recommendations. The `InterviewAnalyzer` combines LLM analysis with deterministic heuristics to compute metrics for technical competency, communication, problem solving, cultural fit, and estimate an acceptance probability. Recommendations and next steps are generated using rule-based thresholds and optionally supplemented by constrained LLM analysis.

- Auditability and persistence. The conversational transcript and structured metrics are captured and can be persisted to Supabase. Reports are generated as PDFs using a local PDF builder with character sanitization to avoid formatting issues.

## The Pipeline in Detail

### 1. Persona Selection and System Prompt

- Component: `features.Virtual_interviewer.agent.Agent`
- Purpose: Select persona, generate the system prompt from `prompts.SYSTEM_PROMPT_TEMPLATE`, and enforce interview structure.
- Note: Personas are pre-configured in the module; they influence voice mapping, difficulty, and expected domain-specific validations.

### 2. WebSocket Transport

- Components:
  - `features.Virtual_interviewer.main.handle_websocket_connection` (text)
  - `features.Virtual_interviewer.main.handle_voice_websocket_connection` (voice)
- Purpose: Provide robust two-way transport between the client and the interviewer agent. This includes ping/pong health checks, message forwarding, and clean handling of disconnects.
- Behavior: For elected persona and user_id query parameters, the API includes persona and user context in downstream agent connections.

### 3. Audio Preprocessing and STT

- Component: `features.Virtual_interviewer.STT_TTS` (transcribe_audio, convert_to_wav, ensure_wav_bytes)
- Purpose: Convert incoming audio to a compatible WAV format using `soundfile` and an FFmpeg fallback, then send audio to Groq Whisper for transcription.
- Reliability: Fallbacks for different audio formats and explicit error handling improve resiliency for various client audio encodings.

### 4. LLM-driven Interview Orchestration

- Component: `features.Virtual_interviewer.agent.Agent` and Groq LLM client
- Purpose: Drive the conversation with a chat model using message history and system-level constraints. The agent detects ending conditions and applies persona-specific question selection.
- Safety: The system prompt contains non-negotiable safety constraints that the model must follow. The agent monitors conversation history and may terminate or transition to closing.

### 5. Analysis and Metrics

- Component: `features.Virtual_interviewer.interview_analyzer.InterviewAnalyzer`
- Purpose: Generate a structured report that includes performance scores and a narrative analysis. Analysis uses a combination of LLM-driven reasoning and deterministic heuristics.
- Main metrics: `technical_competency`, `communication_skills`, `problem_solving`, `cultural_fit`, `overall_score`, and a derived `acceptance_probability`.
- Behavior: The analyzer post-processes the conversation, calls the LLM with `ANALYSIS_PROMPT_TEMPLATE`, and computes taxonomy-based scores using keyword and heuristic-based scoring.

### 6. Persistence and Reporting

- Component: `Agent.save_interview_to_database`, `InterviewAnalyzer.generate_pdf_bytes`
- Purpose: Persist the PDF and structured metadata to Supabase storage and the `interviews` table. The PDF generator uses sanitized content to avoid non-ASCII characters that break PDF output.
- Data policy: Sessions are saved only when interviews complete according to explicit criteria (configured max messages). The system writes only structured fields relevant to assessment; personal identifiers are included only when a user_id is present and expected for storage.

## Privacy and Reliability Considerations

- Minimal PII exposure. The module does not solicit non-job-related personal data and explicitly prohibits requesting or storing unrelated contact details during an interview. The system prompt and persona instructions constrain the agent to ask only role-relevant questions.

- Safety and termination rules. The prompt includes immediate termination behavior for violent, hateful, harassing, or otherwise disallowed content. If such behavior occurs, the interviewer issues a short corrective statement and then terminates the session.

- Deterministic scoring and fail-safe behavior. Analysis combines deterministic heuristics with LLM outputs to avoid purely opaque scoring. The pipeline produces consistent metrics and human-readable artifacts that can be inspected for fairness and remediation.

- Retry and robust transport. The WebSocket layer and audio pipeline include timeouts, reconnect capabilities, and detailed error logging. STT uses a model with a time-limited HTTP client; TTS calls are run in a synchronous executor to prevent event loop blocking.

## Technical Details and Providers

- LLM Provider: Groq is used both for the agent chat completions and for Whisper STT (`groq.Client` with `GROQ_MODEL` and `GROQ_WHISPER_MODEL`). The Groq client performs transcript analysis and interview analysis.

- STT: Groq Whisper model, invoked via HTTP in `STT_TTS.transcribe_audio`.

- TTS: ElevenLabs is used to synthesize interviewer's speech. Voice mapping per persona is defined in `agent.PERSONA_VOICES`.

- Audio libraries: `soundfile` for format conversions, with an FFmpeg fallback for obscure encodings.

- Storage: Supabase is used to store generated PDFs and interview metadata in the `interviews` table and `interview-pdfs` storage bucket.

- PDF generation: `fpdf` is used to construct a sanitized report with textual content, avoiding Unicode characters that commonly break PDF layouts.

## Where to Look in Code

- Agent orchestration: `features.Virtual_interviewer.agent.Agent`
- WebSocket handling: `features.Virtual_interviewer.main` (text and voice connectors)
- Audio preprocessing and TTS: `features.Virtual_interviewer.STT_TTS`
- Interview analysis, scoring, and PDF generation: `features.Virtual_interviewer.interview_analyzer`
- Persona and prompt definitions: `features.Virtual_interviewer.prompts`
- Frontend integration and UI flow: `frontend/(features)/services/virtual-interviewer` and the corresponding client page that interacts with the WebSocket endpoints

## Implementation Notes and Best Practices

- Provide a user identifier to the WebSocket connection as a `user_id` query parameter when persistence or PDF storage is required. If not present, the system falls back to a placeholder test user.

- Avoid storing personally identifiable information in the transcript outside of expected context. This system was designed to operate on anonymized or job-centric conversation content.

- Validate audio codecs on the client side and prefer WAV or uncompressed audio to minimize server-side conversion and the likelihood of STT errors.

- Handle `INTERVIEW_SAVE_FAILED` and `REPORT_GENERATION_FAILED` gracefully in client-side UX; these failures are visible in logs and optionally retriable.

- For strict privacy controls, consider adding a pre-interview consent step and storing only derived metrics rather than unredacted transcripts.

## Summary

The Virtual Interviewer delivers structured, persona-driven interview sessions with real-time STT/TTS and robust LLM orchestration. It balances real-time interaction with deterministic analysis, enforces safety-first rules, and supports persistence of reports with controlled PII exposure. The module is suitable for mock interviews, candidate screening, and generating consistent evaluation artifacts for hiring teams.