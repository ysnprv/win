"""
Virtual Interviewer Endpoints
Handles WebSocket connections for text and voice-based virtual interviews.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel
import json
import tempfile
import os
import base64
import traceback
import asyncio

from features.Virtual_interviewer.main import (
    handle_websocket_connection,
    handle_voice_websocket_connection,
)
from features.Virtual_interviewer.agent import Agent

router = APIRouter(prefix="/virtual-interviewer", tags=["Virtual Interviewer"])


class PersonaRequest(BaseModel):
    persona_key: str


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, persona: str = "alex_chen"):
    """
    WebSocket endpoint for text-based virtual interviewer.
    Connects client to the agent and handles bidirectional communication.
    Query param: persona - The persona key to use (default: alex_chen)
    """
    await handle_websocket_connection(websocket, persona)


@router.websocket("/ws/voice/{persona}")
async def websocket_voice_endpoint(websocket: WebSocket, persona: str):
    """
    WebSocket endpoint for voice-based virtual interviewer.
    Handles audio input/output with STT/TTS and lip sync.
    Path param: persona - The persona key to use
    """
    from features.Virtual_interviewer.agent import PERSONA_VOICES
    voice_id = PERSONA_VOICES.get(persona, PERSONA_VOICES["alex_chen"])
    await handle_voice_websocket_connection(websocket, persona, voice_id)


@router.get("/personas")
async def get_personas():
    """
    Get all available interviewer personas.
    """
    agent = Agent()
    return {"personas": agent.get_available_personas()}


@router.post("/persona")
async def set_persona(request: PersonaRequest):
    """
    Set the interviewer persona for the next session.
    """
    agent = Agent()
    success = agent.set_persona(request.persona_key)
    
    if not success:
        raise HTTPException(status_code=400, detail="Invalid persona key")
    
    return {
        "success": True,
        "persona": agent.current_persona
    }
