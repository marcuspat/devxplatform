"""
User service for business logic
"""
from typing import List, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.api.v1.auth import get_password_hash


class UserService:
    """Service for user-related business logic"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)
    
    async def create_user(self, user_data: UserCreate) -> UserResponse:
        """Create a new user"""
        # Hash the password
        hashed_password = get_password_hash(user_data.password)
        
        # Create user in database
        user = await self.user_repo.create(
            email=user_data.email,
            username=user_data.username,
            full_name=user_data.full_name,
            hashed_password=hashed_password,
            is_active=user_data.is_active
        )
        
        return UserResponse.model_validate(user)
    
    async def get_user(self, user_id: UUID) -> Optional[UserResponse]:
        """Get user by ID"""
        user = await self.user_repo.get(user_id)
        return UserResponse.model_validate(user) if user else None
    
    async def get_user_by_email(self, email: str) -> Optional[UserResponse]:
        """Get user by email"""
        user = await self.user_repo.get_by_email(email)
        return UserResponse.model_validate(user) if user else None
    
    async def list_users(
        self, 
        skip: int = 0, 
        limit: int = 100,
        search: Optional[str] = None
    ) -> List[UserResponse]:
        """List users with pagination and search"""
        users = await self.user_repo.list_all(skip=skip, limit=limit, search=search)
        return [UserResponse.model_validate(user) for user in users]
    
    async def update_user(
        self, 
        user_id: UUID, 
        user_data: UserUpdate
    ) -> Optional[UserResponse]:
        """Update user"""
        update_data = user_data.model_dump(exclude_unset=True)
        
        # Hash password if provided
        if "password" in update_data:
            update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
        
        user = await self.user_repo.update(user_id, **update_data)
        return UserResponse.model_validate(user) if user else None
    
    async def delete_user(self, user_id: UUID) -> bool:
        """Delete user"""
        return await self.user_repo.delete(user_id)