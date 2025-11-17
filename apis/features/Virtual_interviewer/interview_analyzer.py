import os
import json
from typing import List, Dict, Any, Optional
from datetime import datetime
import groq
from shared.helpers.logger import get_logger
from features.Virtual_interviewer.prompts import ANALYSIS_PROMPT_TEMPLATE

logger = get_logger(__name__)
from fpdf import FPDF


class InterviewAnalyzer:
    def __init__(self):
        self.client = groq.Client(api_key=os.getenv("GROQ_API_KEY"))

    def generate_interview_report(
        self, messages: List[Dict[str, str]], persona: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate a comprehensive interview report from conversation messages

        Args:
            messages: List of conversation messages with 'role' and 'content'
            persona: The interviewer persona dict used in the session

        Returns:
            Dictionary containing detailed interview analysis and report
        """
        # Extract conversation content (exclude system messages)
        conversation = self._extract_conversation(messages)

        # Generate analysis using LLM
        analysis = self._analyze_interview_performance(conversation, persona)

        # Calculate metrics
        metrics = self._calculate_interview_metrics(conversation, persona)

        # Generate recommendations
        recommendations = self._generate_recommendations(analysis, metrics, persona)

        # Compile final report
        report = {
            "interview_metadata": {
                "timestamp": datetime.now().isoformat(),
                "interviewer": persona.get("name", "Interviewer"),
                "interviewer_role": persona.get("role", "Technical Interviewer"),
                "interview_style": persona.get("style", "Technical"),
                "difficulty_level": persona.get("difficulty", "Intermediate"),
                "total_exchanges": len(
                    [m for m in messages if m.get("role") in ["user", "assistant"]]
                )
                // 2,
            },
            "performance_scores": {
                "overall_score": metrics["overall_score"],
                "technical_competency": metrics["technical_score"],
                "communication_skills": metrics["communication_score"],
                "problem_solving": metrics["problem_solving_score"],
                "cultural_fit": metrics["cultural_fit_score"],
                "acceptance_probability": metrics["acceptance_probability"],
            },
            "detailed_analysis": analysis,
            "key_strengths": self._extract_strengths(analysis),
            "areas_for_improvement": self._extract_improvement_areas(analysis),
            "recommendations": recommendations,
            "conversation_summary": self._generate_conversation_summary(conversation),
            "next_steps": self._generate_next_steps(
                metrics["acceptance_probability"], analysis
            ),
        }

        return report

    # ----------------------------
    # Private Helper Methods
    # ----------------------------
    def _extract_conversation(
        self, messages: List[Dict[str, str]]
    ) -> List[Dict[str, str]]:
        """Extract only user and assistant messages, excluding system prompts"""
        conversation = []
        for message in messages:
            if message.get("role") in ["user", "assistant"]:
                conversation.append(message)
        return conversation

    def _analyze_interview_performance(
        self, conversation: List[Dict[str, str]], persona: Dict[str, Any]
    ) -> str:
        """Use LLM to analyze interview performance"""
        conversation_text = self._format_conversation_for_analysis(conversation)

        interviewer_name = persona.get("name", "Unknown Interviewer")
        interviewer_role = persona.get("role", "Interviewer")
        interview_style = persona.get("style", "Standard")
        difficulty_level = persona.get("difficulty", "Intermediate")
        focus_areas = "Technical and behavioral skills"
        technical_expertise = "Software Engineering"

        analysis_prompt = ANALYSIS_PROMPT_TEMPLATE.format(
            interviewer_name=interviewer_name,
            interviewer_role=interviewer_role,
            interview_style=interview_style,
            difficulty_level=difficulty_level,
            focus_areas=focus_areas,
            technical_expertise=technical_expertise,
            conversation_text=conversation_text
        )

        try:
            response = self.client.chat.completions.create(
                model=os.getenv("GROQ_MODEL", "llama3-8b-8192"),
                messages=[{"role": "user", "content": analysis_prompt}],
                max_tokens=1500,
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"Analysis generation failed: {str(e)}"

    def _format_conversation_for_analysis(
        self, conversation: List[Dict[str, str]]
    ) -> str:
        """Format conversation for LLM analysis"""
        formatted = []
        for message in conversation:
            role = "Interviewer" if message["role"] == "assistant" else "Candidate"
            content = (
                message["content"][:500] + "..."
                if len(message["content"]) > 500
                else message["content"]
            )
            formatted.append(f"{role}: {content}")
        return "\n\n".join(formatted)

    def _calculate_interview_metrics(
        self, conversation: List[Dict[str, str]], persona: Dict[str, Any]
    ) -> Dict[str, float]:
        """Calculate quantitative interview metrics"""
        candidate_responses = [
            msg["content"] for msg in conversation if msg["role"] == "user"
        ]

        # Basic metrics calculation
        total_words = sum(len(response.split()) for response in candidate_responses)
        avg_response_length = (
            total_words / len(candidate_responses) if candidate_responses else 0
        )

        # Score calculation based on heuristics
        technical_score = self._score_technical_responses(candidate_responses, persona)
        communication_score = self._score_communication(candidate_responses)
        problem_solving_score = self._score_problem_solving(candidate_responses)
        cultural_fit_score = self._score_cultural_fit(candidate_responses, persona)

        # Overall score (weighted average)
        weights = {
            "technical": 0.3,
            "communication": 0.25,
            "problem_solving": 0.25,
            "cultural_fit": 0.2,
        }

        overall_score = (
            technical_score * weights["technical"]
            + communication_score * weights["communication"]
            + problem_solving_score * weights["problem_solving"]
            + cultural_fit_score * weights["cultural_fit"]
        )

        # Acceptance probability based on overall score and persona expectations
        acceptance_probability = self._calculate_acceptance_probability(
            overall_score, persona
        )

        return {
            "overall_score": round(overall_score, 1),
            "technical_score": round(technical_score, 1),
            "communication_score": round(communication_score, 1),
            "problem_solving_score": round(problem_solving_score, 1),
            "cultural_fit_score": round(cultural_fit_score, 1),
            "acceptance_probability": round(acceptance_probability, 1),
            "avg_response_length": round(avg_response_length, 1),
        }

    def _score_technical_responses(
        self, responses: List[str], persona: Dict[str, Any]
    ) -> float:
        """Score technical competency based on responses"""
        technical_keywords = [
            "algorithm",
            "complexity",
            "optimization",
            "design",
            "architecture",
            "database",
            "api",
            "framework",
            "testing",
            "deployment",
            "scalability",
            "code",
            "programming",
            "software",
            "system",
        ]

        keyword_score = 0
        for response in responses:
            response_lower = response.lower()
            matches = sum(
                1 for keyword in technical_keywords if keyword.lower() in response_lower
            )
            keyword_score += min(matches * 10, 30)  # Cap at 30 per response

        # Normalize to 0-100
        max_possible = len(responses) * 30
        return min(
            (keyword_score / max_possible * 100) if max_possible > 0 else 50, 100
        )

    def _score_communication(self, responses: List[str]) -> float:
        """Score communication skills"""
        total_score = 0
        for response in responses:
            score = 50  # Base score

            # Length appropriateness (not too short, not too long)
            word_count = len(response.split())
            if 20 <= word_count <= 150:
                score += 20
            elif 10 <= word_count < 20 or 150 < word_count <= 300:
                score += 10

            # Structure indicators
            if any(
                phrase in response.lower()
                for phrase in ["first", "second", "finally", "in conclusion"]
            ):
                score += 15

            # Question asking
            if "?" in response:
                score += 10

            total_score += min(score, 100)

        return total_score / len(responses) if responses else 50

    def _score_problem_solving(self, responses: List[str]) -> float:
        """Score problem-solving approach"""
        problem_solving_indicators = [
            "approach",
            "solution",
            "method",
            "strategy",
            "plan",
            "steps",
            "consider",
            "analyze",
            "evaluate",
            "alternative",
            "option",
        ]

        score = 0
        for response in responses:
            response_lower = response.lower()
            matches = sum(
                1
                for indicator in problem_solving_indicators
                if indicator in response_lower
            )
            score += min(matches * 8, 25)  # Cap per response

        max_possible = len(responses) * 25
        return min((score / max_possible * 100) if max_possible > 0 else 50, 100)

    def _score_cultural_fit(
        self, responses: List[str], persona: Dict[str, Any]
    ) -> float:
        """Score cultural fit based on persona preferences"""
        cultural_indicators = [
            "team",
            "collaborate",
            "communication",
            "leadership",
            "mentor",
            "learn",
            "growth",
            "challenge",
            "innovation",
            "feedback",
            "agile",
            "adaptable",
            "flexible",
        ]

        score = 0
        for response in responses:
            response_lower = response.lower()
            matches = sum(
                1 for indicator in cultural_indicators if indicator in response_lower
            )
            score += min(matches * 10, 30)

        max_possible = len(responses) * 30
        return min((score / max_possible * 100) if max_possible > 0 else 50, 100)

    def _calculate_acceptance_probability(
        self, overall_score: float, persona: Dict[str, Any]
    ) -> float:
        """Calculate likelihood of offer based on score and persona standards"""
        # Adjust threshold based on difficulty level
        thresholds = {"Beginner": 60, "Intermediate": 70, "Advanced": 75, "Expert": 80}

        difficulty = persona.get("difficulty", "Intermediate")
        threshold = thresholds.get(difficulty, 70)

        # Calculate probability curve
        if overall_score >= threshold + 10:
            return min(85 + (overall_score - threshold - 10) * 0.5, 95)
        elif overall_score >= threshold:
            return 70 + (overall_score - threshold) * 1.5
        elif overall_score >= threshold - 10:
            return 40 + (overall_score - (threshold - 10)) * 3
        else:
            return max(10 + overall_score * 0.3, 5)

    def _generate_recommendations(
        self, analysis: str, metrics: Dict[str, float], persona: Dict[str, Any]
    ) -> List[str]:
        """Generate personalized improvement recommendations"""
        recommendations = []

        # Technical recommendations
        if metrics["technical_score"] < 70:
            recommendations.append("Focus on strengthening core technical knowledge")
            recommendations.append(
                "Practice coding problems and system design scenarios"
            )

        # Communication recommendations
        if metrics["communication_score"] < 70:
            recommendations.append(
                "Work on articulating thoughts more clearly and concisely"
            )
            recommendations.append(
                "Practice the STAR method (Situation, Task, Action, Result) for behavioral questions"
            )

        # Problem-solving recommendations
        if metrics["problem_solving_score"] < 70:
            recommendations.append(
                "Demonstrate your thought process more explicitly when approaching problems"
            )
            recommendations.append(
                "Break down complex problems into smaller, manageable components"
            )

        # Cultural fit recommendations
        if metrics["cultural_fit_score"] < 70:
            recommendations.append(
                "Research company culture and adapt your responses accordingly"
            )
            recommendations.append(
                "Show more enthusiasm for collaboration and team-oriented work"
            )

        # Overall recommendations
        if metrics["overall_score"] < 75:
            recommendations.append(
                "Practice mock interviews with similar difficulty levels"
            )
            recommendations.append(
                "Prepare specific examples that demonstrate your skills and experience"
            )

        return recommendations[:6]  # Limit to top 6 recommendations

    def _extract_strengths(self, analysis: str) -> List[str]:
        """Extract key strengths from analysis"""
        # This could be enhanced with NLP to automatically extract strengths
        strengths = [
            "Good technical foundation",
            "Clear communication style",
            "Structured problem-solving approach",
            "Shows enthusiasm for learning",
        ]
        return strengths[:4]  # Return top 4 strengths

    def _extract_improvement_areas(self, analysis: str) -> List[str]:
        """Extract areas needing improvement from analysis"""
        # This could be enhanced with NLP to automatically extract improvement areas
        improvement_areas = [
            "Deepen technical expertise in core areas",
            "Provide more specific examples",
            "Ask more clarifying questions",
            "Show greater problem-solving confidence",
        ]
        return improvement_areas[:4]  # Return top 4 areas

    def _generate_conversation_summary(self, conversation: List[Dict[str, str]]) -> str:
        """Generate a brief summary of the conversation"""
        total_exchanges = len(conversation) // 2
        return f"Interview consisted of {total_exchanges} question-answer exchanges covering technical competency, problem-solving abilities, and cultural fit assessment."

    def _generate_next_steps(
        self, acceptance_probability: float, analysis: str
    ) -> List[str]:
        """Generate recommended next steps based on performance"""
        if acceptance_probability >= 80:
            return [
                "Strong candidate - proceed to next round",
                "Consider for team interviews",
                "Prepare offer details",
            ]
        elif acceptance_probability >= 60:
            return [
                "Borderline candidate - additional assessment recommended",
                "Consider take-home technical challenge",
                "Schedule follow-up interview focusing on weak areas",
            ]
        else:
            return [
                "Candidate needs significant improvement",
                "Provide detailed feedback for growth",
                "Consider for junior roles or internship positions",
            ]


# ----------------------------
# Utility Functions
# ----------------------------
def save_report_to_file(report: Dict[str, Any], filename: Optional[str] = None) -> str:
    """Save interview report to JSON file"""
    if not filename:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"interview_report_{timestamp}.json"

    with open(filename, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    return filename


def format_report_for_display(report: Dict[str, Any]) -> str:
    """Format report for console/web display"""
    metadata = report["interview_metadata"]
    scores = report["performance_scores"]

    formatted_report = f"""
# 📊 INTERVIEW REPORT

## Interview Details
- **Interviewer:** {metadata['interviewer']} ({metadata['interviewer_role']})
- **Date:** {metadata['timestamp'][:19].replace('T', ' ')}
- **Style:** {metadata['interview_style']}
- **Difficulty:** {metadata['difficulty_level']}
- **Duration:** {metadata['total_exchanges']} exchanges

## 🎯 Performance Scores
- **Overall Score:** {scores['overall_score']}/100
- **Technical Competency:** {scores['technical_competency']}/100
- **Communication Skills:** {scores['communication_skills']}/100  
- **Problem Solving:** {scores['problem_solving']}/100
- **Cultural Fit:** {scores['cultural_fit']}/100
- **🎈 Acceptance Probability:** {scores['acceptance_probability']}%

## 💪 Key Strengths
{chr(10).join([f"- {strength}" for strength in report['key_strengths']])}

## 🎯 Areas for Improvement  
{chr(10).join([f"- {area}" for area in report['areas_for_improvement']])}

## 📋 Recommendations
{chr(10).join([f"- {rec}" for rec in report['recommendations']])}

## 🚀 Next Steps
{chr(10).join([f"- {step}" for step in report['next_steps']])}
    """.strip()

    return formatted_report


def clean_text_for_pdf(text: str) -> str:
    """Clean text to remove Unicode characters that cause PDF issues"""
    # Replace problematic Unicode characters with ASCII equivalents
    replacements = {
        "•": "-",  # bullet point
        "–": "-",  # en dash
        "—": "-",  # em dash
        '"': '"',  # left double quotation mark
        '"': '"',  # right double quotation mark
        '"': "'",  # left single quotation mark
        '"': "'",  # right single quotation mark
        "…": "...",  # ellipsis
    }
    for unicode_char, ascii_char in replacements.items():
        text = text.replace(unicode_char, ascii_char)

    # Remove any remaining non-ASCII characters
    text = text.encode("ascii", "ignore").decode("ascii")
    return text


class InterviewPDF(FPDF):
    def header(self):
        self.set_font("Arial", "B", 12)
        self.cell(0, 10, "Interview Report", 0, 1, "C")

    def chapter_title(self, title):
        self.set_font("Arial", "B", 12)
        clean_title = clean_text_for_pdf(title)
        self.cell(0, 10, clean_title, 0, 1, "L")
        self.ln(5)

    def chapter_body(self, body):
        self.set_font("Arial", "", 12)
        clean_body = clean_text_for_pdf(body)
        self.multi_cell(0, 10, clean_body)
        self.ln()


def generate_pdf_bytes(report: Dict[str, Any]) -> bytes:
    """Generate PDF as bytes for upload to storage"""
    try:
        pdf = InterviewPDF()
        pdf.add_page()

        # Interview Details
        metadata = report["interview_metadata"]
        pdf.chapter_title("Interview Details")
        details = (
            f"Interviewer: {metadata['interviewer']} ({metadata['interviewer_role']})\n"
        )
        details += f"Date: {metadata['timestamp'][:19].replace('T', ' ')}\n"
        details += f"Style: {metadata['interview_style']}\n"
        details += f"Difficulty: {metadata['difficulty_level']}"
        pdf.chapter_body(details)

        # Performance Scores
        scores = report["performance_scores"]
        pdf.chapter_title("Performance Scores")
        scores_text = f"Overall Score: {scores['overall_score']}/100\n"
        scores_text += f"Technical Competency: {scores['technical_competency']}/100\n"
        scores_text += f"Communication Skills: {scores['communication_skills']}/100\n"
        scores_text += f"Problem Solving: {scores['problem_solving']}/100\n"
        scores_text += f"Cultural Fit: {scores['cultural_fit']}/100\n"
        scores_text += f"Acceptance Probability: {scores['acceptance_probability']}%"
        pdf.chapter_body(scores_text)

        # Key Strengths
        if "key_strengths" in report:
            pdf.chapter_title("Key Strengths")
            strengths_text = "\n".join(
                [f"- {strength}" for strength in report["key_strengths"]]
            )
            pdf.chapter_body(strengths_text)

        # Areas for Improvement
        if "areas_for_improvement" in report:
            pdf.chapter_title("Areas for Improvement")
            areas_text = "\n".join(
                [f"- {area}" for area in report["areas_for_improvement"]]
            )
            pdf.chapter_body(areas_text)

        # Recommendations
        pdf.chapter_title("Recommendations")
        recommendations_text = "\n".join(
            [f"- {rec}" for rec in report["recommendations"]]
        )
        pdf.chapter_body(recommendations_text)

        # Next Steps
        if "next_steps" in report:
            pdf.chapter_title("Next Steps")
            next_steps_text = "\n".join([f"- {step}" for step in report["next_steps"]])
            pdf.chapter_body(next_steps_text)

        # Return bytes
        return bytes(pdf.output())

    except Exception as e:
        logger.error(f"PDF generation failed: {e}")
        raise


def export_report_to_pdf(report: Dict[str, Any], filename: Optional[str] = None) -> str:
    """Export the interview report to a PDF file"""
    try:

        def clean_text_for_pdf_legacy(text: str) -> str:
            """Clean text to remove Unicode characters that cause PDF issues"""
            # Replace problematic Unicode characters with ASCII equivalents
            replacements = {
                "•": "-",  # bullet point
                "–": "-",  # en dash
                "—": "-",  # em dash
                '"': '"',  # left double quotation mark
                '"': '"',  # right double quotation mark
                '"': "'",  # left single quotation mark
                '"': "'",  # right single quotation mark
                "…": "...",  # ellipsis
            }
            for unicode_char, ascii_char in replacements.items():
                text = text.replace(unicode_char, ascii_char)

            # Remove any remaining non-ASCII characters
            text = text.encode("ascii", "ignore").decode("ascii")
            return text

        class PDF(FPDF):
            def header(self):
                self.set_font("Arial", "B", 12)
                self.cell(0, 10, "Interview Report", 0, 1, "C")

            def chapter_title(self, title):
                self.set_font("Arial", "B", 12)
                clean_title = clean_text_for_pdf(title)
                self.cell(0, 10, clean_title, 0, 1, "L")
                self.ln(5)

            def chapter_body(self, body):
                self.set_font("Arial", "", 12)
                clean_body = clean_text_for_pdf(body)
                self.multi_cell(0, 10, clean_body)
                self.ln()

        pdf = PDF()
        pdf.add_page()

        # Interview Details
        metadata = report["interview_metadata"]
        pdf.chapter_title("Interview Details")
        details = (
            f"Interviewer: {metadata['interviewer']} ({metadata['interviewer_role']})\n"
        )
        details += f"Date: {metadata['timestamp'][:19].replace('T', ' ')}\n"
        details += f"Style: {metadata['interview_style']}\n"
        details += f"Difficulty: {metadata['difficulty_level']}"
        pdf.chapter_body(details)

        # Performance Scores
        scores = report["performance_scores"]
        pdf.chapter_title("Performance Scores")
        scores_text = f"Overall Score: {scores['overall_score']}/100\n"
        scores_text += f"Technical Competency: {scores['technical_competency']}/100\n"
        scores_text += f"Communication Skills: {scores['communication_skills']}/100\n"
        scores_text += f"Problem Solving: {scores['problem_solving']}/100\n"
        scores_text += f"Cultural Fit: {scores['cultural_fit']}/100\n"
        scores_text += f"Acceptance Probability: {scores['acceptance_probability']}%"
        pdf.chapter_body(scores_text)

        # Key Strengths
        if "key_strengths" in report:
            pdf.chapter_title("Key Strengths")
            strengths_text = "\n".join(
                [f"- {strength}" for strength in report["key_strengths"]]
            )
            pdf.chapter_body(strengths_text)

        # Areas for Improvement
        if "areas_for_improvement" in report:
            pdf.chapter_title("Areas for Improvement")
            areas_text = "\n".join(
                [f"- {area}" for area in report["areas_for_improvement"]]
            )
            pdf.chapter_body(areas_text)

        # Recommendations
        pdf.chapter_title("Recommendations")
        recommendations_text = "\n".join(
            [f"- {rec}" for rec in report["recommendations"]]
        )
        pdf.chapter_body(recommendations_text)

        # Next Steps
        if "next_steps" in report:
            pdf.chapter_title("Next Steps")
            next_steps_text = "\n".join([f"- {step}" for step in report["next_steps"]])
            pdf.chapter_body(next_steps_text)

        # Save PDF
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"interview_report_{timestamp}.pdf"

        pdf.output(filename)
        return filename

    except Exception as e:
        logger.error(f"PDF export failed: {e}")
        return f"PDF export failed: {str(e)}"
