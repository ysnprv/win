import asyncio
import websockets
import groq
import os
import nest_asyncio
import sys
import json
from typing import List, Dict, Any
from datetime import datetime
from supabase import create_client, Client
from features.Virtual_interviewer.interview_analyzer import (
    InterviewAnalyzer,
    format_report_for_display,
)
from features.Virtual_interviewer.prompts import (
    SYSTEM_PROMPT_TEMPLATE,
    ENDING_PROMPT,
    PERSONA_ANNOUNCEMENT_TEMPLATE,
    OPENING_MESSAGE_TEMPLATE,
    INTERVIEW_ENDED_BY_CANDIDATE,
    INTERVIEW_SAVE_FAILED,
    REPORT_GENERATION_FAILED,
)
from shared.helpers.logger import get_logger

logger = get_logger(__name__)

# Supabase connection
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

# Available interviewer personas
PERSONAS = {
    "alex_chen": {
        "name": "Alex Chen",
        "role": "Senior Technical Interviewer",
        "company": "Tech Startup",
        "years_experience": 8,
        "style": "Technical",
        "difficulty": "Intermediate",
        "tone": "Professional and Encouraging",
    },
    "sarah_williams": {
        "name": "Sarah Williams",
        "role": "Lead Software Architect",
        "company": "Fortune 500 Company",
        "years_experience": 12,
        "style": "System Design & Architecture",
        "difficulty": "Advanced",
        "tone": "Direct and Analytical",
    },
    "marcus_johnson": {
        "name": "Ali Mahmoud",
        "role": "Engineering Manager",
        "company": "AI Research Lab",
        "years_experience": 10,
        "style": "Behavioral & Leadership",
        "difficulty": "Intermediate",
        "tone": "Warm and Conversational",
    },
    "priya_patel": {
        "name": "Aisha Obeid",
        "role": "Principal Data Scientist",
        "company": "Machine Learning Startup",
        "years_experience": 15,
        "style": "Data Science & ML",
        "difficulty": "Advanced",
        "tone": "Academic and Precise",
    },
    "jordan_lee": {
        "name": "Jordan Lee",
        "role": "Junior Developer Advocate",
        "company": "Open Source Foundation",
        "years_experience": 3,
        "style": "Frontend & UX",
        "difficulty": "Entry-Level",
        "tone": "Friendly and Supportive",
    },
}

DEFAULT_PERSONA = PERSONAS["alex_chen"]


# ElevenLabs voice IDs per persona
PERSONA_VOICES = {
    "alex_chen": "cgSgspJ2msm6clMCkdW9",  # Rachel
    "sarah_williams": "EXAVITQu4vr4xnSDxMaL",  # Clyde
    "marcus_johnson": "bIHbv24MWmeRgasZH58o",  # Drew
    "priya_patel": "FGY2WhTYpPnrIDTdsKH5",  # Dora
    "jordan_lee": "JBFqnCBsd6RMkjVDRZzb",  # Paul
}


class Agent:
    """Interview agent (one per WebSocket session)"""

    def __init__(self, persona_key: str = "alex_chen", user_id: str | None = None):
        self.client = groq.Client(api_key=os.getenv("GROQ_API_KEY"))
        self.system_prompt = None
        self.current_persona = PERSONAS.get(persona_key, DEFAULT_PERSONA)
        self.persona_key = persona_key
        self.reset_interview_state()
        self.analyzer = InterviewAnalyzer()
        # Falls back to env var CURRENT_USER_ID if not provided
        self.user_id = user_id

    def reset_interview_state(self):
        """Reset interview state for a new session"""
        self.interview_state = {
            "message_count": 0,
            "has_asked_technical": False,
            "has_covered_background": False,
            "should_end": False,
            "max_messages": 4,
            "ending_phase": False,
        }

    def set_persona(self, persona_key: str) -> bool:
        """Set the interviewer persona for the session"""
        if persona_key in PERSONAS:
            self.current_persona = PERSONAS[persona_key]
            self.persona_key = persona_key
            logger.info(f"Persona set to: {self.current_persona['name']}")
            return True
        logger.warning(f"Invalid persona key: {persona_key}")
        return False

    def get_voice_id(self) -> str:
        """Get the ElevenLabs voice ID for the current persona"""
        return PERSONA_VOICES.get(self.persona_key, PERSONA_VOICES["alex_chen"])

    def get_available_personas(self) -> Dict[str, Dict[str, Any]]:
        """Get all available personas"""
        return PERSONAS

    def should_end_interview(self, messages: list) -> bool:
        """Check if interview should end"""
        if (
            self.interview_state["message_count"]
            >= self.interview_state["max_messages"]
        ):
            return True

        recent_messages = messages[-3:] if len(messages) >= 3 else messages
        ending_keywords = [
            "thank you for your time",
            "that concludes our interview",
            "i think we've covered everything",
            "do you have any questions for me",
            "we'll be in touch",
            "that's all the questions i have",
        ]

        for message in recent_messages:
            if message.get("role") == "assistant":
                content = message.get("content", "").lower()
                if any(keyword in content for keyword in ending_keywords):
                    return True

        return False

    def get_ending_prompt(self) -> str:
        """Generate an appropriate ending for the interview"""
        return ENDING_PROMPT

    def getSystemPrompt(self) -> str:
        """Generate system prompt for the interviewer"""
        persona = self.current_persona
        self.system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
            persona_name=persona["name"],
            persona_role=persona["role"],
            persona_company=persona["company"],
            persona_years_experience=persona["years_experience"],
            persona_style=persona["style"],
            persona_difficulty=persona["difficulty"],
            persona_tone=persona["tone"],
        )
        return self.system_prompt

    def get_persona_announcement(self) -> str:
        """Create an announcement message about the interviewer"""
        persona = self.current_persona
        return PERSONA_ANNOUNCEMENT_TEMPLATE.format(
            persona_name=persona["name"],
            persona_role=persona["role"],
            persona_company=persona["company"],
            persona_years_experience=persona["years_experience"],
            persona_style=persona["style"],
            persona_difficulty=persona["difficulty"],
        ).strip()

    def generate_interview_report(
        self, messages: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        """Generate comprehensive interview report from conversation messages"""
        if not self.current_persona:
            raise ValueError("No persona selected for this interview session")

        return self.analyzer.generate_interview_report(messages, self.current_persona)

    async def save_interview_to_database(
        self, report: Dict[str, Any], messages: List[Dict[str, str]]
    ) -> str:
        """Save interview report and return interview ID"""
        try:
            from features.Virtual_interviewer.interview_analyzer import (
                generate_pdf_bytes,
            )

            # Generate PDF
            pdf_bytes = generate_pdf_bytes(report)

            # Use provided user ID or fallback to env var
            user_id = self.user_id or os.getenv("CURRENT_USER_ID")
            if not user_id:
                logger.warning("No user_id found, using default test user")
                user_id = "00000000-0000-0000-0000-000000000000"

            from datetime import timezone

            timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
            interview_id = f"{timestamp}_{user_id[:8]}"

            # Upload PDF
            pdf_filename = f"{user_id}/{timestamp}_{interview_id}.pdf"
            pdf_upload = supabase.storage.from_("interview-pdfs").upload(
                pdf_filename,
                pdf_bytes,
                file_options={"content-type": "application/pdf"},
            )

            # Get PDF URL
            pdf_url = supabase.storage.from_("interview-pdfs").get_public_url(
                pdf_filename
            )

            # Count user exchanges
            exchanges_count = len([m for m in messages if m.get("role") == "user"])

            # Extract performance scores (nested under "performance_scores")
            # Falls back to top-level keys for backward compatibility
            performance = report.get("performance_scores", {}) or {}

            interview_data = {
                "user_id": user_id,
                "interviewer_name": self.current_persona.get("name", "Unknown"),
                "interviewer_role": self.current_persona.get("role", "Interviewer"),
                "interview_style": self.current_persona.get("style", "General"),
                "difficulty_level": self.current_persona.get(
                    "difficulty", "Intermediate"
                ),
                "total_exchanges": exchanges_count,
                "overall_score": performance.get(
                    "overall_score", report.get("overall_score", 0)
                ),
                "technical_competency": performance.get(
                    "technical_competency", report.get("technical_score", 0)
                ),
                "communication_skills": performance.get(
                    "communication_skills", report.get("communication_score", 0)
                ),
                "problem_solving": performance.get(
                    "problem_solving", report.get("problem_solving_score", 0)
                ),
                "cultural_fit": performance.get(
                    "cultural_fit", report.get("cultural_fit_score", 0)
                ),
                "acceptance_probability": performance.get(
                    "acceptance_probability", report.get("acceptance_probability", 0)
                ),
                "key_strengths": report.get("key_strengths", []),
                "areas_for_improvement": report.get("areas_for_improvement", []),
                "recommendations": report.get("recommendations", []),
                "next_steps": report.get("next_steps", []),
                "pdf_url": pdf_url,
            }

            # Save to database
            result = supabase.table("interviews").insert(interview_data).execute()

            interview_id = result.data[0]["id"]
            logger.info(f"Interview saved successfully with ID: {interview_id}")
            return interview_id

        except Exception as e:
            logger.error(f"Error saving interview to database: {e}")
            raise

    def get_formatted_report(self, messages: List[Dict[str, str]]) -> str:
        """Get a formatted interview report for display"""
        report = self.generate_interview_report(messages)
        return format_report_for_display(report)

    def should_persist_report(self) -> bool:
        """Save report only if interview reached max_messages (intentional end)"""
        return self.interview_state.get("message_count", 0) >= self.interview_state.get(
            "max_messages", 0
        )

    async def handle_connection(self, websocket):
        """Handle WebSocket connection for interview session"""
        self.reset_interview_state()

        # Send persona introduction
        persona_announcement = self.get_persona_announcement()
        await websocket.send(persona_announcement)
        logger.info(f"Starting interview with persona: {self.current_persona['name']}")

        # Initialize system prompt
        system_prompt = self.getSystemPrompt()
        messages = [{"role": "system", "content": system_prompt}]

        # Start with opening message
        opening_message = OPENING_MESSAGE_TEMPLATE.format(
            persona_name=self.current_persona["name"]
        )
        await websocket.send(opening_message)
        messages.append({"role": "assistant", "content": opening_message})

        while not self.interview_state["should_end"]:
            try:
                message = await websocket.recv()
            except websockets.ConnectionClosed:
                logger.info("Connection closed by the client.")
                break

            self.interview_state["message_count"] += 1

            if message.lower().strip() in ["/end", "/quit", "/exit", "end interview"]:
                await websocket.send(INTERVIEW_ENDED_BY_CANDIDATE)
                self.interview_state["should_end"] = True
                break

            messages.append({"role": "user", "content": message})

            if self.should_end_interview(messages):
                if not self.interview_state["ending_phase"]:
                    self.interview_state["ending_phase"] = True
                    ending_prompt = self.get_ending_prompt()
                    messages.append({"role": "system", "content": ending_prompt})

            response = self.client.chat.completions.create(
                model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
                messages=messages,
            )

            llm_reply = response.choices[0].message.content
            await websocket.send(llm_reply)
            messages.append({"role": "assistant", "content": llm_reply})

            if self.should_end_interview(messages):
                self.interview_state["should_end"] = True

        # Don't send completion message to UI—let the saved interview ID drive redirects
        logger.info(
            "Interview completed (checking save criteria before generating report)"
        )

        logger.info(
            f"Interview completed after {self.interview_state['message_count']} messages"
        )

        # Only save if interview reached max_messages (intentional end)
        # Skips saving on disconnect or client refresh
        if self.should_persist_report():
            try:
                report = self.generate_interview_report(messages)
                formatted_report = format_report_for_display(report)

                # Save to database first to get the ID
                try:
                    interview_id = await self.save_interview_to_database(
                        report, messages
                    )
                except Exception as db_error:
                    logger.error(
                        f"Failed to save interview before sending report: {db_error}"
                    )
                    interview_id = None

                # Don't send full report to live chat (keep it clean)
                # Client gets a compact JSON message with the interview ID
                logger.info("Interview report generated (not sent to live client)")

                # Notify client we saved the interview
                if interview_id:
                    try:
                        await websocket.send(
                            json.dumps({"type": "interview_saved", "id": interview_id})
                        )
                    except websockets.ConnectionClosed:
                        logger.info("Report saved but client disconnected")
                    except Exception as send_err:
                        logger.error(
                            f"Failed to send interview_saved message: {send_err}"
                        )
                else:
                    # Save failed, notify client
                    try:
                        await websocket.send(INTERVIEW_SAVE_FAILED)
                    except websockets.ConnectionClosed:
                        pass
            except Exception as e:
                logger.error(f"Failed to generate interview report: {e}")
                try:
                    await websocket.send(REPORT_GENERATION_FAILED)
                except websockets.ConnectionClosed:
                    pass
        else:
            # Interview ended early (unintentional)—skip saving
            logger.info(
                "Interview ended before max_messages; skipping report generation and database save"
            )


async def handle_agent_connection(websocket):
    """Create agent instance per connection with persona from URL params"""
    try:
        from urllib.parse import urlparse, parse_qs

        # Extract path from WebSocket request
        parsed_path = websocket.request.path
        logger.debug(f"Connection path: {parsed_path}")

        # Parse URL params
        parsed = urlparse(parsed_path)
        query_params = parse_qs(parsed.query)
        persona_key = query_params.get("persona", ["alex_chen"])[0]
        user_id = query_params.get("user_id", [None])[0]

        logger.info(f"New agent connection with persona: {persona_key}")

        # Create agent for this session
        agent = Agent(persona_key=persona_key, user_id=user_id)
        await agent.handle_connection(websocket)
    except Exception as e:
        logger.error(f"Error in agent connection handler: {e}")
        try:
            await websocket.send(f"Error: {str(e)}")
        except:
            pass


async def start_agent_server():
    """Start the WebSocket server"""
    agent_ws_url = os.getenv("AGENT_WS_URL", "ws://localhost:8765")
    from urllib.parse import urlparse

    parsed = urlparse(agent_ws_url)
    host = parsed.hostname or "localhost"
    port = parsed.port or 8765  # Extract host and port from URL

    async with websockets.serve(
        handle_agent_connection,
        host,
        port,
        ping_interval=20,
        ping_timeout=60,
    ):
        logger.info(f"Agent WebSocket server started on {agent_ws_url}")
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(start_agent_server())
