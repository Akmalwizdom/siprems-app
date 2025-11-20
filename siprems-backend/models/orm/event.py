"""Event ORM model for holidays and special events tracking."""

from datetime import datetime
from typing import Optional

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Index
from models.orm.base import Base


class Event(Base):
    """
    Event model for tracking holidays and special events affecting predictions.

    Attributes:
        event_id: Unique event identifier (primary key).
        event_name: Name of the event (e.g., "Christmas", "Black Friday").
        event_date: Date when the event occurs.
        type: Event type - 'holiday' or 'custom'.
        description: Detailed description of the event.
        include_in_prediction: Whether this event should be included in ML prediction models.
        created_at: Event creation timestamp.
    """

    __tablename__ = "events"

    event_id = Column(Integer, primary_key=True, index=True)
    event_name = Column(String(255), nullable=False)
    event_date = Column(DateTime, nullable=False, index=True)
    type = Column(String(20), nullable=False, index=True, default="custom")
    description = Column(Text, nullable=True)
    include_in_prediction = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("idx_type_date", "type", "event_date"),
        Index("idx_include_prediction", "include_in_prediction"),
    )

    def __repr__(self) -> str:
        """String representation of Event."""
        return (
            f"<Event(event_id={self.event_id}, event_name='{self.event_name}', "
            f"type='{self.type}')>"
        )

    def to_dict(self) -> dict:
        """
        Convert event to dictionary.

        Returns:
            Dictionary representation of event data.
        """
        return {
            "event_id": self.event_id,
            "event_name": self.event_name,
            "event_date": self.event_date.isoformat() if self.event_date else None,
            "type": self.type,
            "description": self.description,
            "include_in_prediction": self.include_in_prediction,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
