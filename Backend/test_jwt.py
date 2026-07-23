import asyncio
import jwt
from jwt import PyJWKClient

url = "https://qtacqhobjklcjfjppcsp.supabase.co/auth/v1/.well-known/jwks.json"
jwks_client = PyJWKClient(url)

print(dir(jwks_client))
