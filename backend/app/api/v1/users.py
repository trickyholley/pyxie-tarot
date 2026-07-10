from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user, get_password_hash
from app.database import get_db_session
from app.models.user import User
from app.schemas.user import UserCreate, UserRead

router = APIRouter(prefix="/users", tags=["users"])


@router.post("", status_code=status.HTTP_201_CREATED, response_model=UserRead)
async def create_user(
    user_in: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> User:
    hashed = get_password_hash(user_in.password)

    db_user = User(
        email=user_in.email,
        username=user_in.username,
        password=hashed,
    )
    db.add(db_user)

    try:
        await db.commit()
    except IntegrityError as err:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username or email already exists",
        ) from err

    await db.refresh(db_user)
    return db_user


@router.get("/me", response_model=UserRead)
async def get_current_user_profile(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    return current_user
