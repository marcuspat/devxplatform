"""
User repository for database operations
"""

from typing import List, Optional
from uuid import UUID, uuid4
from datetime import datetime

from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


class UserRepository:
    """Repository for user database operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        email: str,
        username: str,
        hashed_password: str,
        full_name: Optional[str] = None,
        is_active: bool = True,
    ) -> User:
        """Create a new user"""
        user = User(
            id=uuid4(),
            email=email,
            username=username,
            hashed_password=hashed_password,
            full_name=full_name,
            is_active=is_active,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)

        return user

    async def get(self, user_id: UUID) -> Optional[User]:
        """Get user by ID"""
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_by_username(self, username: str) -> Optional[User]:
        """Get user by username"""
        result = await self.db.execute(select(User).where(User.username == username))
        return result.scalar_one_or_none()

    async def list_all(
        self, skip: int = 0, limit: int = 100, search: Optional[str] = None
    ) -> List[User]:
        """List all users with pagination and search"""
        query = select(User)

        if search:
            search_filter = or_(
                User.email.ilike(f"%{search}%"),
                User.username.ilike(f"%{search}%"),
                User.full_name.ilike(f"%{search}%"),
            )
            query = query.where(search_filter)

        query = query.offset(skip).limit(limit)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def update(self, user_id: UUID, **kwargs) -> Optional[User]:
        """Update user"""
        user = await self.get(user_id)
        if not user:
            return None

        for key, value in kwargs.items():
            setattr(user, key, value)

        setattr(user, "updated_at", datetime.utcnow())

        await self.db.commit()
        await self.db.refresh(user)

        return user

    async def delete(self, user_id: UUID) -> bool:
        """Delete user"""
        user = await self.get(user_id)
        if not user:
            return False

        await self.db.delete(user)
        await self.db.commit()

        return True
