"""Settings service for managing store configuration."""

from typing import Dict, List, Optional, Any

from models.store_model import StoreModel


class SettingsService:
    """
    Service layer for settings and store configuration management.

    Handles business logic for store settings, opening hours,
    and configuration management.
    """

    @staticmethod
    def create_store(user_id: int, name: str, address: Optional[str] = None) -> Dict[str, Any]:
        """
        Create a new store for a user.

        Args:
            user_id: User ID.
            name: Store name.
            address: Store address (optional).

        Returns:
            Created store dictionary.

        Raises:
            Exception: If store creation fails.
        """
        return StoreModel.create_store(user_id, name, address)

    @staticmethod
    def get_store_settings(user_id: int) -> Optional[Dict[str, Any]]:
        """
        Get store settings for a user.

        Retrieves store information and opening hours.

        Args:
            user_id: User ID.

        Returns:
            Dictionary containing store info and opening hours, or None if not found.

        Raises:
            Exception: If database operation fails.
        """
        store = StoreModel.get_store_by_user_id(user_id)

        if not store:
            return None

        store_id = store["store_id"]
        opening_hours = StoreModel.get_opening_hours(store_id)

        return {
            "store": store,
            "opening_hours": opening_hours,
        }

    @staticmethod
    def update_store_settings(
        user_id: int,
        name: Optional[str] = None,
        address: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Update store settings for a user.

        Args:
            user_id: User ID.
            name: Updated store name (optional).
            address: Updated store address (optional).

        Returns:
            Updated settings dictionary, or None if store not found.

        Raises:
            Exception: If database operation fails.
        """
        store = StoreModel.get_store_by_user_id(user_id)

        if not store:
            return None

        store_id = store["store_id"]
        updated_store = StoreModel.update_store(store_id, name, address)

        opening_hours = StoreModel.get_opening_hours(store_id)

        return {
            "store": updated_store,
            "opening_hours": opening_hours,
        }

    @staticmethod
    def set_operating_hours(
        user_id: int,
        opening_hours: Dict[str, Dict[str, Any]],
    ) -> Optional[Dict[str, Any]]:
        """
        Set operating hours for all days of the week.

        Args:
            user_id: User ID.
            opening_hours: Dictionary mapping day names to hour data
                          Format: {"Monday": {"open": "09:00", "close": "18:00", "closed": false}}

        Returns:
            Updated settings with new opening hours, or None if store not found.

        Raises:
            Exception: If database operation fails.
        """
        store = StoreModel.get_store_by_user_id(user_id)

        if not store:
            return None

        store_id = store["store_id"]

        for day, hours_data in opening_hours.items():
            is_closed = hours_data.get("closed", False)
            open_time = hours_data.get("open", "00:00")
            close_time = hours_data.get("close", "00:00")

            StoreModel.set_opening_hours(
                store_id,
                day,
                open_time,
                close_time,
                is_closed,
            )

        updated_hours = StoreModel.get_opening_hours(store_id)

        return {
            "store": store,
            "opening_hours": updated_hours,
        }

    @staticmethod
    def save_all_settings(
        user_id: int,
        name: Optional[str] = None,
        address: Optional[str] = None,
        opening_hours: Optional[Dict[str, Dict[str, Any]]] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Save all settings at once (store info and opening hours).

        Args:
            user_id: User ID.
            name: Store name (optional).
            address: Store address (optional).
            opening_hours: Opening hours dictionary (optional).

        Returns:
            Complete updated settings dictionary, or None if store not found.

        Raises:
            Exception: If database operation fails.
        """
        # Update store info
        store = StoreModel.get_store_by_user_id(user_id)

        if not store:
            return None

        store_id = store["store_id"]

        if name is not None or address is not None:
            store = StoreModel.update_store(store_id, name, address)

        # Update opening hours
        if opening_hours:
            for day, hours_data in opening_hours.items():
                is_closed = hours_data.get("closed", False)
                open_time = hours_data.get("open", "00:00")
                close_time = hours_data.get("close", "00:00")

                StoreModel.set_opening_hours(
                    store_id,
                    day,
                    open_time,
                    close_time,
                    is_closed,
                )

        current_hours = StoreModel.get_opening_hours(store_id)

        return {
            "store": store,
            "opening_hours": current_hours,
        }
