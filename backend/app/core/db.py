# SPDX-License-Identifier: AGPL-3.0-or-later
from fastapi import HTTPException, status
from sqlalchemy import ColumnExpressionArgument, Result, Select, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession


async def scalar_or_404[T](db: AsyncSession, query: Select[tuple[T]], detail: str) -> T:
    """Runs `query`, returning its single scalar result or raising 404 with `detail`."""
    result = await db.execute(query)
    obj = result.scalar_one_or_none()
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)
    return obj


async def paginate(
    db: AsyncSession, query: Select, order_by: ColumnExpressionArgument, skip: int, limit: int
) -> tuple[int, Result]:
    """Counts `query`'s rows, then re-runs it ordered/offset/limited - the common tail of every list endpoint.

    Callers still pick `.scalars().all()` vs `.all()` off the returned `Result`, since some list queries select a
    single entity and others select entity/column tuples (e.g. joined-in owner username).
    """
    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()

    result = await db.execute(query.order_by(order_by).offset(skip).limit(limit))
    return total, result


async def commit_or_conflict(db: AsyncSession, detail: str, status_code: int = status.HTTP_409_CONFLICT) -> None:
    """Commits `db`, translating a unique-constraint `IntegrityError` into an HTTP error with `detail` instead."""
    try:
        await db.commit()
    except IntegrityError as err:
        await db.rollback()
        raise HTTPException(status_code=status_code, detail=detail) from err
