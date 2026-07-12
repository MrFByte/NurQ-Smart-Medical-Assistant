import pytest
from app.providers.tts_provider import EdgeTTSProvider

@pytest.mark.asyncio
async def test_edge_tts_connection():
    """
    Tests that the application can successfully connect to the Edge TTS service
    and synthesize audio from text.
    """
    provider = EdgeTTSProvider()
    try:
        audio_bytes = await provider.synthesize("Hello, this is a connection test.")
        assert isinstance(audio_bytes, bytes)
        assert len(audio_bytes) > 0
    except Exception as e:
        pytest.fail(f"Edge TTS connection failed: {e}")
