from utils.db import db_query, db_execute

class EventModel:
    """Data access layer for events"""
    
    @staticmethod
    def get_all_events():
        """Get all events ordered by date"""
        query = "SELECT * FROM events ORDER BY event_date DESC;"
        return db_query(query, fetch_all=True)
    
    @staticmethod
    def get_event_by_id(event_id):
        """Get a single event by ID"""
        query = "SELECT * FROM events WHERE event_id = %s;"
        return db_query(query, (event_id,), fetch_all=False)
    
    @staticmethod
    def create_event(event_name, event_date, description=None, include_in_prediction=True):
        """Create a new custom event"""
        query = """
            INSERT INTO events (event_name, event_date, type, description, include_in_prediction)
            VALUES (%s, %s, 'custom', %s, %s)
            RETURNING *;
        """
        params = (event_name, event_date, description, include_in_prediction)
        return db_execute(query, params)
    
    @staticmethod
    def delete_event(event_id):
        """Delete a custom event (only custom events can be deleted)"""
        query = "DELETE FROM events WHERE event_id = %s AND type = 'custom' RETURNING *;"
        return db_execute(query, (event_id,))
    
    @staticmethod
    def get_holidays_for_prediction():
        """Get events that should be included in ML prediction"""
        query = """
            SELECT event_name as holiday, event_date as ds FROM events 
            WHERE include_in_prediction = TRUE
            ORDER BY event_date ASC;
        """
        return db_query(query, fetch_all=True)
    
    @staticmethod
    def get_custom_events():
        """Get only custom events"""
        query = "SELECT * FROM events WHERE type = 'custom' ORDER BY event_date DESC;"
        return db_query(query, fetch_all=True)
    
    @staticmethod
    def get_holidays():
        """Get only holiday events"""
        query = "SELECT * FROM events WHERE type = 'holiday' ORDER BY event_date DESC;"
        return db_query(query, fetch_all=True)
