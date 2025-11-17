import os
import io
import subprocess
import tempfile
import asyncio
import httpx
import soundfile as sf
from elevenlabs import ElevenLabs

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_WHISPER_MODEL = os.getenv("GROQ_WHISPER_MODEL", "whisper-large-v3")
GROQ_TTS_MODEL = os.getenv("GROQ_TTS_MODEL", "playai-tts")
ELEVEN_LABS_API_KEY = os.getenv("ELEVEN_LABS_API_KEY")

elevenlabs_client = ElevenLabs(api_key=ELEVEN_LABS_API_KEY)


async def transcribe_audio(audio_bytes: bytes) -> str:
    """Send audio to Groq Whisper for transcription."""
    url = "https://api.groq.com/openai/v1/audio/transcriptions"
    headers = {"Authorization": f"Bearer {GROQ_API_KEY}"}
    files = {"file": ("audio.wav", audio_bytes, "audio/wav")}
    data = {"model": GROQ_WHISPER_MODEL, "language": "en"}

    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(url, headers=headers, data=data, files=files)
        response.raise_for_status()
        result = response.json()
        return result.get("text", "")


def convert_to_wav(file_bytes: bytes) -> bytes:
    """Convert any audio file bytes to WAV for Whisper compatibility."""
    data, samplerate = sf.read(io.BytesIO(file_bytes))
    wav_bytes = io.BytesIO()
    sf.write(wav_bytes, data, samplerate, format="WAV")
    wav_bytes.seek(0)
    return wav_bytes.read()


def ensure_wav_bytes(file_bytes: bytes) -> bytes:
    """
    Ensure the provided audio bytes are in WAV format. If the input is already a WAV,
    the bytes are returned as-is. Otherwise we try to read and convert using soundfile
    (libsndfile) and -- if that fails -- fallback to ffmpeg binary if available.

    This keeps the conversion robust across MP3/OGG and other input formats.
    """
    # Fast check: WAV files start with 'RIFF'
    try:
        if file_bytes[:4] == b"RIFF":
            return file_bytes
    except Exception:
        pass

    # Try converting with soundfile (supported formats via libsndfile)
    try:
        data, samplerate = sf.read(io.BytesIO(file_bytes))
        wav_buf = io.BytesIO()
        sf.write(wav_buf, data, samplerate, format="WAV")
        wav_buf.seek(0)
        return wav_buf.read()
    except Exception:
        # Fall through to ffmpeg fallback
        pass

    # Try using ffmpeg if installed: convert via subprocess
    try:
        with tempfile.NamedTemporaryFile(delete=False) as input_tmp:
            input_tmp.write(file_bytes)
            input_tmp.flush()
            input_path = input_tmp.name

        # ffmpeg will read input file and dump WAV to stdout
        args = [
            "ffmpeg",
            "-y",
            "-loglevel",
            "error",
            "-i",
            input_path,
            "-f",
            "wav",
            "-ar",
            "16000",
            "-ac",
            "1",
            "pipe:1",
        ]

        proc = subprocess.run(args, input=None, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if proc.returncode != 0:
            raise RuntimeError(f"ffmpeg conversion failed: {proc.stderr.decode('utf-8', errors='ignore')}" )
        return proc.stdout
    finally:
        try:
            os.unlink(input_path)
        except Exception:
            pass


# ----------------------------
# Text-to-Speech Functions
# ----------------------------
async def generate_tts(text: str, voice_id: str = "21m00Tcm4TlvDq8ikWAM") -> bytes:
    """Generate speech audio from text using ElevenLabs with specified voice."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = asyncio.get_event_loop()

    def sync_tts():
        audio_chunks = elevenlabs_client.text_to_speech.convert(
            voice_id=voice_id,
            text=text,
            model_id="eleven_v2_5_flash",
            output_format="mp3_22050_32",
        )
        return b"".join(chunk for chunk in audio_chunks)

    return await loop.run_in_executor(None, sync_tts)
