"""Event service for business logic operations."""
from utils.models_orm import Event, EventType
from utils.database import get_session, DatabaseManager
from sqlalchemy.exc import IntegrityError


class EventService:
    """Business logic layer for event operations."""

    @staticmethod
    def get_all_events():
        """Get all events ordered by date."""
        with DatabaseManager() as session:
            events = session.query(Event).order_by(Event.event_date.desc()).all()

            return [
                {
                    "event_id": e.event_id,
                    "event_name": e.event_name,
                    "event_date": str(e.event_date),
                    "type": e.type.value,
                    "description": e.description,
                    "include_in_prediction": e.include_in_prediction,
                }
                for e in events
            ]

    @staticmethod
    def get_event_by_id(event_id):
        """Get a single event by ID."""
        with DatabaseManager() as session:
            event = session.query(Event).filter(Event.event_id == event_id).first()

            if not event:
                raise ValueError(f"Event with ID {event_id} not found")

            return {
                "event_id": event.event_id,
                "event_name": event.event_name,
                "event_date": str(event.event_date),
                "type": event.type.value,
                "description": event.description,
                "include_in_prediction": event.include_in_prediction,
            }

    @staticmethod
    def create_event(event_name, event_date, description=None, include_in_prediction=True):
        """Create a new custom event."""
        with DatabaseManager() as session:
            try:
                event = Event(
                    event_name=event_name,
                    event_date=event_date,
                    type=EventType.CUSTOM,
                    description=description,
                    include_in_prediction=include_in_prediction,
                )
                session.add(event)
                session.commit()

                return {
                    "event_id": event.event_id,
                    "event_name": event.event_name,
                    "event_date": str(event.event_date),
                    "type": event.type.value,
                    "description": event.description,
                    "include_in_prediction": event.include_in_prediction,
                }
            except IntegrityError:
                session.rollback()
                raise ValueError(f"Event {event_name} on {event_date} already exists")
            except Exception as e:
                session.rollback()
                raise e

    @staticmethod
    def delete_event(event_id):
        """Delete a custom event (only custom events can be deleted)."""
        with DatabaseManager() as session:
            event = session.query(Event).filter(Event.event_id == event_id).first()

            if not event:
                raise ValueError(f"Event with ID {event_id} not found")

            if event.type != EventType.CUSTOM:
                raise ValueError("Only custom events can be deleted")

            try:
                session.delete(event)
                session.commit()
                return {"message": f"Event {event_id} deleted successfully"}
            except Exception as e:
                session.rollback()
                raise e

    @staticmethod
    def get_holidays_for_prediction():
        """Get events that should be included in ML prediction."""
        with DatabaseManager() as session:
            events = (
                session.query(Event)
                .filter(Event.include_in_prediction == True)
                .order_by(Event.event_date.asc())
                .all()
            )

            return [
                {
                    "holiday": e.event_name,
                    "ds": str(e.event_date),
                }
                for e in events
            ]

    @staticmethod
    def get_custom_events():
        """Get only custom events."""
        with DatabaseManager() as session:
            events = (
                session.query(Event)
                .filter(Event.type == EventType.CUSTOM)
                .order_by(Event.event_date.desc())
                .all()
            )

            return [
                {
                    "event_id": e.event_id,
                    "event_name": e.event_name,
                    "event_date": str(e.event_date),
                    "type": e.type.value,
                    "description": e.description,
                    "include_in_prediction": e.include_in_prediction,
                }
                for e in events
            ]

    @staticmethod
    def get_holidays():
        """Get only holiday events."""
        with DatabaseManager() as session:
            events = (
                session.query(Event)
                .filter(Event.type == EventType.HOLIDAY)
                .order_by(Event.event_date.desc())
                .all()
            )

            return [
                {
                    "event_id": e.event_id,
                    "event_name": e.event_name,
                    "event_date": str(e.event_date),
                    "type": e.type.value,
                    "description": e.description,
                    "include_in_prediction": e.include_in_prediction,
                }
                for e in events
            ]
