import asyncio
from app.utils.auth import SupabaseAuth
import jwt

async def main():
    try:
        # Invalid token just to see if it reaches decode without crashing on fetching jwks
        await SupabaseAuth.verify_token("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.x")
    except Exception as e:
        print(f"Exception: {type(e).__name__} - {e}")

asyncio.run(main())
