"""Store data access layer using SQLAlchemy ORM."""

from typing import List, Optional, Dict, Any
from datetime import datetime

from sqlalchemy.orm import Session

from models.orm.store import Store
from models.orm.opening_hours import OpeningHours
from utils.db_session import get_db_session


class StoreModel:
    """
    Data access layer for store operations.

    Handles all database operations related to stores including
    CRUD operations and opening hours management.
    """

    @staticmethod
    def create_store(user_id: int, name: str, address: Optional[str] = None) -> Dict[str, Any]:
        """
        Create a new store.

        Args:
            user_id: Associated user ID.
            name: Store name.
            address: Store address (optional).

        Returns:
            Created store dictionary.

        Raises:
            Exception: Database operation errors.
        """
        with get_db_session() as session:
            store = Store(
                user_id=user_id,
                name=name,
                address=address,
            )
            session.add(store)
            session.flush()
            result = store.to_dict()
            return result

    @staticmethod
    def get_store_by_id(store_id: int) -> Optional[Dict[str, Any]]:
        """
        Retrieve a store by ID.

        Args:
            store_id: Unique store identifier.

        Returns:
            Store dictionary or None if not found.

        Raises:
            Exception: Database operation errors.
        """
        with get_db_session() as session:
            store = session.query(Store).filter(Store.store_id == store_id).first()
            return store.to_dict() if store else None

    @staticmethod
    def get_store_by_user_id(user_id: int) -> Optional[Dict[str, Any]]:
        """
        Retrieve a store by user ID.

        Args:
            user_id: User ID associated with the store.

        Returns:
            Store dictionary or None if not found.

        Raises:
            Exception: Database operation errors.
        """
        with get_db_session() as session:
            store = session.query(Store).filter(Store.user_id == user_id).first()
            return store.to_dict() if store else None

    @staticmethod
    def update_store(store_id: int, name: Optional[str] = None, address: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Update an existing store.

        Args:
            store_id: Unique store identifier.
            name: Updated store name (optional).
            address: Updated store address (optional).

        Returns:
            Updated store dictionary or None if not found.

        Raises:
            Exception: Database operation errors.
        """
        with get_db_session() as session:
            store = session.query(Store).filter(Store.store_id == store_id).first()

            if not store:
                return None

            if name is not None:
                store.name = name
            if address is not None:
                store.address = address
            
            store.updated_at = datetime.utcnow()
            session.flush()
            result = store.to_dict()
            return result

    @staticmethod
    def delete_store(store_id: int) -> bool:
        """
        Delete a store.

        Args:
            store_id: Unique store identifier.

        Returns:
            True if deleted, False if not found.

        Raises:
            Exception: Database operation errors.
        """
        with get_db_session() as session:
            store = session.query(Store).filter(Store.store_id == store_id).first()

            if not store:
                return False

            session.delete(store)
            return True

    @staticmethod
    def set_opening_hours(store_id: int, day: str, open_time: str, close_time: str, is_closed: bool = False) -> Dict[str, Any]:
        """
        Set or update opening hours for a specific day.

        Args:
            store_id: Store ID.
            day: Day of week (Monday-Sunday).
            open_time: Opening time in HH:MM format.
            close_time: Closing time in HH:MM format.
            is_closed: Whether the store is closed on this day.

        Returns:
            Created or updated opening hours dictionary.

        Raises:
            Exception: Database operation errors.
        """
        with get_db_session() as session:
            existing = session.query(OpeningHours).filter(
                OpeningHours.store_id == store_id,
                OpeningHours.day_of_week == day
            ).first()

            if existing:
                existing.open_time = open_time if not is_closed else None
                existing.close_time = close_time if not is_closed else None
                existing.is_closed = is_closed
                existing.updated_at = datetime.utcnow()
                session.flush()
                result = existing.to_dict()
            else:
                hours = OpeningHours(
                    store_id=store_id,
                    day_of_week=day,
                    open_time=open_time if not is_closed else None,
                    close_time=close_time if not is_closed else None,
                    is_closed=is_closed,
                )
                session.add(hours)
                session.flush()
                result = hours.to_dict()

            return result

    @staticmethod
    def get_opening_hours(store_id: int) -> Dict[str, Dict[str, Any]]:
        """
        Get all opening hours for a store.

        Args:
            store_id: Store ID.

        Returns:
            Dictionary mapping days to opening hours data.

        Raises:
            Exception: Database operation errors.
        """
        with get_db_session() as session:
            hours = session.query(OpeningHours).filter(
                OpeningHours.store_id == store_id
            ).all()

            result = {}
            for hour in hours:
                result[hour.day_of_week] = {
                    "open": hour.open_time,
                    "close": hour.close_time,
                    "closed": hour.is_closed,
                }

            return result

    @staticmethod
    def get_opening_hours_by_day(store_id: int, day: str) -> Optional[Dict[str, Any]]:
        """
        Get opening hours for a specific day.

        Args:
            store_id: Store ID.
            day: Day of week.

        Returns:
            Opening hours dictionary or None if not found.

        Raises:
            Exception: Database operation errors.
        """
        with get_db_session() as session:
            hour = session.query(OpeningHours).filter(
                OpeningHours.store_id == store_id,
                OpeningHours.day_of_week == day
            ).first()

            return hour.to_dict() if hour else None
