"""
Users API endpoints
"""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.exceptions import NotFoundException, ConflictException
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.services.user_service import UserService
from app.api.v1.auth import get_current_user, TokenData

router = APIRouter()


@router.get("/", response_model=List[UserResponse])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """List users with pagination and search"""
    user_service = UserService(db)
    users = await user_service.list_users(skip=skip, limit=limit, search=search)
    return users


@router.post("/", response_model=UserResponse, status_code=201)
async def create_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """Create a new user"""
    user_service = UserService(db)

    # Check if user already exists
    existing_user = await user_service.get_user_by_email(user_data.email)
    if existing_user:
        raise ConflictException(
            message=f"User with email {user_data.email} already exists",
            details={"email": user_data.email},
        )

    user = await user_service.create_user(user_data)
    return user


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """Get user by ID"""
    user_service = UserService(db)
    user = await user_service.get_user(user_id)

    if not user:
        raise NotFoundException("User", user_id)

    return user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    user_data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """Update user"""
    user_service = UserService(db)
    user = await user_service.update_user(user_id, user_data)

    if not user:
        raise NotFoundException("User", user_id)

    return user


@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """Delete user"""
    user_service = UserService(db)
    deleted = await user_service.delete_user(user_id)

    if not deleted:
        raise NotFoundException("User", user_id)

    return None
