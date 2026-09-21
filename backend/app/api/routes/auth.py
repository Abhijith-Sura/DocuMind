"""
Auth Routes — register, login, Google OAuth, get current user.
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, get_current_user
from app.core.config import get_settings
from app.models.user import User

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ── Request / Response Schemas ─────────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleAuthRequest(BaseModel):
    credential: str  # Google JWT ID token from Google Identity Services


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    email: str
    full_name: str
    avatar_url: Optional[str] = None
    auth_provider: str = "local"


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    is_active: bool
    is_verified: bool = False
    avatar_url: Optional[str] = None
    auth_provider: str = "local"

    class Config:
        from_attributes = True


# ── Endpoints ──────────────────────────────────────────────────────────────
@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new user and return an access token."""
    # Check if email already exists
    result = await db.execute(select(User).where(User.email == payload.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        auth_provider="local",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        auth_provider=user.auth_provider,
    )


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Login with email/password, return JWT token."""
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if not user or not user.hashed_password or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        auth_provider=user.auth_provider,
    )


@router.post("/google", response_model=TokenResponse)
async def google_auth(payload: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate or register user via Google OAuth ID token."""
    token_data = None

    # 1. Verify with Google OAuth library
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests

        client_id = settings.google_client_id if settings.google_client_id else None
        token_data = id_token.verify_oauth2_token(
            payload.credential,
            google_requests.Request(),
            client_id,
        )
    except Exception as verify_err:
        logger.warning(f"Google library token verification failed: {verify_err}. Trying tokeninfo endpoint.")

        # 2. Fallback to Google tokeninfo API endpoint
        try:
            import httpx
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(
                    f"https://oauth2.googleapis.com/tokeninfo?id_token={payload.credential}"
                )
                if res.status_code == 200:
                    token_data = res.json()
                else:
                    logger.error(f"Google tokeninfo returned status {res.status_code}: {res.text}")
        except Exception as http_err:
            logger.error(f"Google tokeninfo endpoint failed: {http_err}")

    if not token_data or not token_data.get("email"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired Google authentication token",
        )

    email = str(token_data.get("email")).lower()
    name = token_data.get("name") or email.split("@")[0].capitalize()
    google_id = str(token_data.get("sub"))
    picture = token_data.get("picture")

    # Check if user exists by email or google_id
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user:
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated",
            )
        # Update google_id and avatar_url if not already set
        if not user.google_id and google_id:
            user.google_id = google_id
        if picture and not user.avatar_url:
            user.avatar_url = picture
        user.is_verified = True
        await db.commit()
        await db.refresh(user)
        logger.info(f"User {user.email} logged in via Google")
    else:
        # Create brand new user via Google
        user = User(
            email=email,
            full_name=name,
            hashed_password=None,
            google_id=google_id,
            avatar_url=picture,
            auth_provider="google",
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        logger.info(f"New user {user.email} registered via Google")

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        auth_provider=user.auth_provider,
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get the currently authenticated user's profile."""
    return current_user
