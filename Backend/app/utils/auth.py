import jwt
from jwt import PyJWKClient
from fastapi import HTTPException, status
from typing import Dict, Any

from app.config import settings

class SupabaseAuth:
    _jwks_client: PyJWKClient = None

    @classmethod
    def get_jwks_client(cls) -> PyJWKClient:
        if cls._jwks_client is None:
            url = f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json"
            cls._jwks_client = PyJWKClient(url)
        return cls._jwks_client

    @classmethod
    async def verify_token(cls, token: str) -> Dict[str, Any]:
        """Verify the Supabase JWT against the fetched JWKS."""
        try:
            jwks_client = cls.get_jwks_client()
            signing_key = jwks_client.get_signing_key_from_jwt(token)

            # Decode and verify token
            # Supabase tokens have aud="authenticated"
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256", "ES256", "HS256"],
                audience="authenticated"
            )
            return payload

        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except jwt.PyJWKClientError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Unable to fetch JWKS: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except jwt.InvalidTokenError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid authentication credentials: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            )
