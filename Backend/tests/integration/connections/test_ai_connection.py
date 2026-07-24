import pytest
from app.providers.groq_provider import GroqProvider

@pytest.mark.asyncio
async def test_groq_llm_connection():
    """
    Tests that the application can successfully connect to the Groq API
    and generate a valid response.
    """
    provider = GroqProvider()
    try:
        # A simple generation request to verify API keys and network connectivity
        question = await provider.generate_question(
            group_label="connection test",
            known_context="test context",
            conversation=[]
        )
        assert isinstance(question, str)
        assert len(question) > 0
    except Exception as e:
        pytest.fail(f"Groq API connection failed: {e}")
