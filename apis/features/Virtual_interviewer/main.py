from fastapi import WebSocketDisconnect, APIRouter, WebSocket
from features.Virtual_interviewer.agent import handle_agent_connection
from features.Virtual_interviewer.STT_TTS import (
    transcribe_audio,
    convert_to_wav,
    ensure_wav_bytes,
    generate_tts,
)
import os
import json
import traceback
import asyncio
import websockets
from shared.helpers.logger import get_logger

# Optional router for the Virtual Interviewer feature. These routes may be
# included in the main app's router configuration if desired.
router = APIRouter(prefix="/virtual-interviewer", tags=["Virtual Interviewer"])

logger = get_logger(__name__)

# Agent WebSocket URL
AGENT_WS_URL = os.getenv("AGENT_WS_URL", "ws://localhost:8000/virtual-interviewer/ws")


@router.websocket("/ws/agent")
async def agent_ws_endpoint(websocket: WebSocket):
    """Direct WebSocket route that uses the local agent handler.

    This mirrors the previous standalone agent server by allowing
    in-process connections into the Agent. It accepts the WebSocket and
    delegates handling to the feature's handler function.
    """
    await websocket.accept()
    # The handler will extract persona/user_id from query params if present
    await handle_agent_connection(websocket)


async def handle_websocket_connection(websocket, persona_key: str = "alex_chen"):
    logger.info(f"Incoming WebSocket connection with persona: {persona_key}")
    await websocket.accept()

    try:
        # Directly invoke the agent handler that expects a FastAPI WebSocket
        await handle_agent_connection(websocket, persona_key)
    except WebSocketDisconnect:
        logger.warning("Client disconnected")
    except Exception as e:
        logger.error(f"Connection error: {e}")
        await websocket.send_text(f"Connection error: {str(e)}")


async def handle_voice_websocket_connection(
    websocket, persona_key: str = "alex_chen", voice_id: str = "21m00Tcm4TlvDq8ikWAM"
):
    """
    Handle voice-based virtual interviewer websocket connection.
    Processes audio input, performs STT, interacts with agent, performs TTS, and streams back.
    """
    await websocket.accept()
    logger.info(f"Incoming voice WebSocket connection with persona: {persona_key}")
    try:
        # Connect to RAG agent with persona parameter
        # If the connecting client passed through a user id via the query
        # params, forward it to the agent so it can associate sessions.
        user_id = websocket.query_params.get("user_id")
        extra = f"&user_id={user_id}" if user_id else ""
        agent_url = f"{AGENT_WS_URL}?persona={persona_key}{extra}"
        async with websockets.connect(
            agent_url, ping_interval=20, ping_timeout=60, max_size=2**24
        ) as agent_ws:
            logger.info("Connected to agent for voice chat")

            # Receive but DON'T forward persona announcement (it's a formatted info block)
            persona_announcement = await agent_ws.recv()
            logger.info(
                f"Agent persona announcement received (not forwarding): {persona_announcement[:50]}..."
            )

            # Receive opening message but hold it - we'll send it as first response
            opening_message = await agent_ws.recv()
            logger.info(
                f"Agent opening message received, will send as first response: {opening_message[:50]}..."
            )
            first_interaction = True

            while True:
                # 1) WAIT for client to send voice message (binary)
                logger.debug("Waiting for client audio...")
                try:
                    client_audio_bytes = await websocket.receive_bytes()
                except WebSocketDisconnect:
                    logger.warning("Client disconnected")
                    break
                except Exception as e:
                    logger.error("Error receiving audio: %s", e)
                    traceback.print_exc()
                    continue  # Skip to next iteration

                logger.info("Received client audio bytes — converting to WAV for STT")
                # 2) Convert to WAV for STT (unchanged)
                try:
                    client_wav_bytes = convert_to_wav(client_audio_bytes)
                except Exception:
                    try:
                        client_wav_bytes = ensure_wav_bytes(client_audio_bytes)
                    except Exception as e:
                        logger.error("Failed to prepare client WAV for STT: %s", e)
                        await websocket.send_text(
                            json.dumps(
                                {"type": "error", "message": "Failed to decode audio"}
                            )
                        )
                        continue

                # 3) STT -> text
                try:
                    user_text = await transcribe_audio(client_wav_bytes)
                    # Log only a preview of the transcription
                    ut_preview = (
                        (str(user_text).replace("\n", " ")[:50] + "...")
                        if len(str(user_text)) > 50
                        else str(user_text)
                    )
                    logger.info("Transcription: %s", ut_preview)

                    # Send transcription back to client immediately
                    await websocket.send_text(
                        json.dumps({"type": "transcription", "text": user_text})
                    )
                except Exception as e:
                    logger.error("STT failed: %s", e)
                    await websocket.send_text(
                        json.dumps({"type": "error", "message": "STT failed"})
                    )
                    continue

                # 4) Get reply - on first interaction, use cached opening, otherwise query agent
                if first_interaction:
                    agent_reply_text = opening_message
                    first_interaction = False
                    logger.info("Using cached opening message as first response")
                else:
                    try:
                        await agent_ws.send(user_text)
                        agent_reply_text = await agent_ws.recv()
                        # Log only the first 50 chars of agent reply
                        ar_preview = (
                            (str(agent_reply_text).replace("\n", " ")[:50] + "...")
                            if len(str(agent_reply_text)) > 50
                            else str(agent_reply_text)
                        )
                        logger.info("Agent reply: %s", ar_preview)
                    except websockets.exceptions.ConnectionClosedOK as e:
                        # Agent closed the connection cleanly (1000). Treat as a normal
                        # end of conversation — do not notify the client of a fatal error.
                        logger.info("Agent connection closed cleanly: %s", e)
                        # If the agent closed normally, try to drain any remaining
                        # messages (the agent may have sent a completion report).
                        try:
                            # Wait up to 5s for the agent to send final messages
                            while True:
                                try:
                                    extra = await asyncio.wait_for(
                                        agent_ws.recv(), timeout=0.5
                                    )
                                    logger.info(
                                        "Forwarding extra agent message after close: %s",
                                        str(extra)[:80],
                                    )
                                    await websocket.send_text(extra)
                                except asyncio.TimeoutError:
                                    break
                        except Exception:
                            pass
                        break
                    except Exception as e:
                        logger.error("Agent communication failed: %s", e)
                        await websocket.send_text(
                            json.dumps({"type": "error", "message": "Agent failed"})
                        )
                        continue

                # 5) TTS: generate audio with persona-specific voice
                try:
                    tts_bytes = await generate_tts(agent_reply_text, voice_id)

                    # 6) Send response with audio and text
                    response_msg = {
                        "type": "response",
                        "text": agent_reply_text,
                        "audio": (
                            tts_bytes.hex()
                            if isinstance(tts_bytes, bytes)
                            else str(tts_bytes)
                        ),
                    }
                    await websocket.send_text(json.dumps(response_msg))
                    logger.info("Response sent successfully")
                    # After forwarding the agent response, drain any additional messages
                    # the agent might be sending (e.g., completion or report messages)
                    try:
                        while True:
                            extra = await asyncio.wait_for(
                                agent_ws.recv(), timeout=0.25
                            )
                            logger.info(
                                "Forwarding extra agent message: %s", str(extra)[:80]
                            )
                            await websocket.send_text(extra)
                    except asyncio.TimeoutError:
                        # Nothing else to forward right now
                        pass
                    # After forwarding the agent response, drain any additional messages
                    # the agent might be sending (e.g., completion or report messages)
                    try:
                        while True:
                            extra = await asyncio.wait_for(
                                agent_ws.recv(), timeout=0.25
                            )
                            logger.info(
                                "Forwarding extra agent message: %s", str(extra)[:80]
                            )
                            await websocket.send_text(extra)
                    except asyncio.TimeoutError:
                        # Nothing else to forward right now
                        pass
                except Exception as e:
                    logger.error("TTS failed: %s", e)
                    # Send response with text only (no audio) when TTS fails
                    response_msg = {
                        "type": "response",
                        "text": agent_reply_text,
                        "audio": None,  # No audio available
                    }
                    await websocket.send_text(json.dumps(response_msg))
                    logger.info(
                        "Response sent successfully (text only, TTS unavailable)"
                    )
                    try:
                        while True:
                            extra = await asyncio.wait_for(
                                agent_ws.recv(), timeout=0.25
                            )
                            logger.info(
                                "Forwarding extra agent message: %s", str(extra)[:80]
                            )
                            await websocket.send_text(extra)
                    except asyncio.TimeoutError:
                        pass

    except Exception as e:
        logger.error("Voice connection error: %s", e)
        traceback.print_exc()
        try:
            await websocket.send_text(json.dumps({"type": "error", "message": str(e)}))
        except Exception:
            pass
