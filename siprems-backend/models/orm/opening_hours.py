"""Opening Hours ORM model for store operating hours."""

from datetime import datetime, time
from typing import Optional

from sqlalchemy import Column, Integer, String, Boolean, Time, DateTime, ForeignKey
from models.orm.base import Base


class OpeningHours(Base):
    """
    Opening Hours model for managing store's daily operating hours.

    Attributes:
        opening_hours_id: Unique identifier (primary key).
        store_id: Associated store ID (foreign key reference).
        day_of_week: Day of week (0=Monday, 6=Sunday).
        open_time: Opening time (HH:MM format as time type).
        close_time: Closing time (HH:MM format as time type).
        is_closed: Boolean indicating if store is closed on this day.
        created_at: Record creation timestamp.
        updated_at: Last update timestamp.
    """

    __tablename__ = "opening_hours"

    opening_hours_id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.store_id"), nullable=False, index=True)
    day_of_week = Column(String(10), nullable=False)
    open_time = Column(String(5), nullable=True)
    close_time = Column(String(5), nullable=True)
    is_closed = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self) -> str:
        """String representation of OpeningHours."""
        status = "Closed" if self.is_closed else f"{self.open_time}-{self.close_time}"
        return f"<OpeningHours(store_id={self.store_id}, {self.day_of_week}: {status})>"

    def to_dict(self) -> dict:
        """
        Convert opening hours to dictionary.

        Returns:
            Dictionary representation of opening hours data.
        """
        return {
            "opening_hours_id": self.opening_hours_id,
            "store_id": self.store_id,
            "day_of_week": self.day_of_week,
            "open_time": self.open_time,
            "close_time": self.close_time,
            "is_closed": self.is_closed,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
