import logging
import edge_tts

from app.config import settings
from app.providers.protocols import TTSProvider

logger = logging.getLogger(__name__)

class EdgeTTSProvider(TTSProvider):
    async def synthesize(self, text: str) -> bytes:
        try:
            communicate = edge_tts.Communicate(text, settings.tts_voice)
            audio_bytes = bytearray()
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_bytes.extend(chunk["data"])
            return bytes(audio_bytes)
        except Exception as e:
            logger.error(f"TTS synthesis failed: {e}")
            return b""
