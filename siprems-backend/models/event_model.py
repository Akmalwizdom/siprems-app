"""Event data access layer using SQLAlchemy ORM."""

from typing import List, Optional, Dict, Any

from sqlalchemy import and_
from sqlalchemy.orm import Session

from models.orm.event import Event
from utils.db_session import get_db_session


class EventModel:
    """
    Data access layer for event operations.

    Handles all database operations related to events (holidays and custom events)
    that may impact predictions and inventory planning.
    """

    @staticmethod
    def get_all_events() -> List[Dict[str, Any]]:
        """
        Retrieve all events ordered by date in descending order.

        Returns:
            List of event dictionaries.

        Raises:
            Exception: Database operation errors.
        """
        with get_db_session() as session:
            events = session.query(Event).order_by(Event.event_date.desc()).all()
            return [event.to_dict() for event in events]

    @staticmethod
    def get_event_by_id(event_id: int) -> Optional[Dict[str, Any]]:
        """
        Retrieve a single event by ID.

        Args:
            event_id: Unique event identifier.

        Returns:
            Event dictionary or None if not found.

        Raises:
            Exception: Database operation errors.
        """
        with get_db_session() as session:
            event = session.query(Event).filter(Event.event_id == event_id).first()
            return event.to_dict() if event else None

    @staticmethod
    def create_event(
        event_name: str,
        event_date: str,
        description: Optional[str] = None,
        include_in_prediction: bool = True,
    ) -> Dict[str, Any]:
        """
        Create a new custom event.

        Args:
            event_name: Name of the event (e.g., "Black Friday").
            event_date: Date when the event occurs (ISO format string or datetime).
            description: Optional description of the event.
            include_in_prediction: Whether to include in ML predictions. Defaults to True.

        Returns:
            Created event dictionary.

        Raises:
            Exception: Database operation errors.
        """
        with get_db_session() as session:
            from datetime import datetime

            if isinstance(event_date, str):
                event_date = datetime.fromisoformat(event_date)

            event = Event(
                event_name=event_name,
                event_date=event_date,
                type="custom",
                description=description,
                include_in_prediction=include_in_prediction,
            )
            session.add(event)
            session.flush()
            return event.to_dict()

    @staticmethod
    def delete_event(event_id: int) -> Optional[Dict[str, Any]]:
        """
        Delete a custom event.

        Only custom events can be deleted. Holiday events are read-only.

        Args:
            event_id: Unique event identifier to delete.

        Returns:
            Deleted event dictionary or None if not found or not custom type.

        Raises:
            Exception: Database operation errors.
        """
        with get_db_session() as session:
            event = (
                session.query(Event)
                .filter(and_(Event.event_id == event_id, Event.type == "custom"))
                .first()
            )

            if not event:
                return None

            result = event.to_dict()
            session.delete(event)
            return result

    @staticmethod
    def get_holidays_for_prediction() -> List[Dict[str, Any]]:
        """
        Get events that should be included in ML prediction models.

        Returns events with include_in_prediction=True, formatted for Prophet.

        Returns:
            List of dictionaries with 'holiday' and 'ds' keys for Prophet integration.

        Raises:
            Exception: Database operation errors.
        """
        with get_db_session() as session:
            events = (
                session.query(
                    Event.event_name.label("holiday"),
                    Event.event_date.label("ds"),
                )
                .filter(Event.include_in_prediction == True)
                .order_by(Event.event_date.asc())
                .all()
            )

            return [
                {
                    "holiday": event[0],
                    "ds": event[1].isoformat() if event[1] else None,
                }
                for event in events
            ]

    @staticmethod
    def get_custom_events() -> List[Dict[str, Any]]:
        """
        Retrieve only custom user-created events.

        Returns:
            List of custom event dictionaries ordered by date.

        Raises:
            Exception: Database operation errors.
        """
        with get_db_session() as session:
            events = (
                session.query(Event)
                .filter(Event.type == "custom")
                .order_by(Event.event_date.desc())
                .all()
            )
            return [event.to_dict() for event in events]

    @staticmethod
    def get_holidays() -> List[Dict[str, Any]]:
        """
        Retrieve only holiday events.

        Returns:
            List of holiday event dictionaries ordered by date.

        Raises:
            Exception: Database operation errors.
        """
        with get_db_session() as session:
            events = (
                session.query(Event)
                .filter(Event.type == "holiday")
                .order_by(Event.event_date.desc())
                .all()
            )
            return [event.to_dict() for event in events]
