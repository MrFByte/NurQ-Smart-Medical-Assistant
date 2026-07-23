import jwt
import httpx
from fastapi import HTTPException, status
from typing import Dict, Any

from app.config import settings

class SupabaseAuth:
    _jwks: Dict[str, Any] = {}

    @classmethod
    async def get_jwks(cls) -> Dict[str, Any]:
        """Fetch and cache JWKS from Supabase."""
        if not cls._jwks:
            url = f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json"
            async with httpx.AsyncClient() as client:
                response = await client.get(url)
                if response.status_code != 200:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to fetch JWKS from Supabase"
                    )
                cls._jwks = response.json()
        return cls._jwks

    @classmethod
    async def verify_token(cls, token: str) -> Dict[str, Any]:
        """Verify the Supabase JWT against the fetched JWKS."""
        try:
            # Get unverified header to extract key ID (kid)
            unverified_header = jwt.get_unverified_header(token)
            kid = unverified_header.get('kid')
            if not kid:
                raise jwt.InvalidTokenError("Token has no kid")

            # Get JWKS
            jwks = await cls.get_jwks()

            # Find the matching key
            rsa_key = {}
            for key in jwks.get("keys", []):
                if key["kid"] == kid:
                    rsa_key = {
                        "kty": key["kty"],
                        "kid": key["kid"],
                        "use": key["use"],
                        "n": key["n"],
                        "e": key["e"]
                    }
                    break

            if not rsa_key:
                raise jwt.InvalidTokenError("Unable to find appropriate key")

            # Construct the public key
            public_key = jwt.algorithms.RSAAlgorithm.from_jwk(rsa_key)

            # Decode and verify token
            # Supabase tokens have aud="authenticated"
            payload = jwt.decode(
                token,
                public_key,
                algorithms=["RS256"],
                audience="authenticated"
            )
            return payload

        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except jwt.InvalidTokenError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid authentication credentials: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            )
