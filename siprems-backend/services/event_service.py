from models.event_model import EventModel

class EventService:
    """Business logic layer for event operations"""
    
    @staticmethod
    def get_all_events():
        """Get all events"""
        events = EventModel.get_all_events()
        return EventService._format_events(events)
    
    @staticmethod
    def get_event_by_id(event_id):
        """Get a specific event"""
        event = EventModel.get_event_by_id(event_id)
        if not event:
            raise ValueError(f"Event {event_id} not found")
        return EventService._format_event(event)
    
    @staticmethod
    def create_event(data):
        """Create a new event with validation"""
        # Validation
        required_fields = ['name', 'date']
        for field in required_fields:
            if field not in data:
                raise ValueError(f"Missing required field: {field}")
        
        # Create event
        event = EventModel.create_event(
            event_name=data['name'],
            event_date=data['date'],
            description=data.get('description'),
            include_in_prediction=data.get('includeInPrediction', True)
        )
        
        return EventService._format_event(event)
    
    @staticmethod
    def delete_event(event_id):
        """Delete a custom event"""
        event = EventModel.get_event_by_id(event_id)
        if not event:
            raise ValueError(f"Event {event_id} not found")
        
        if event['type'] != 'custom':
            raise ValueError("Cannot delete holiday events")
        
        return EventModel.delete_event(event_id)
    
    @staticmethod
    def get_holidays_for_prediction():
        """Get events to include in ML prediction"""
        holidays = EventModel.get_holidays_for_prediction()
        if not holidays:
            return None
        
        formatted = []
        for h in holidays:
            formatted.append({
                'holiday': h['holiday'],
                'ds': h['ds'].isoformat() if hasattr(h['ds'], 'isoformat') else str(h['ds']),
                'lower_window': -2,
                'upper_window': 1
            })
        
        return formatted if formatted else None
    
    @staticmethod
    def _format_event(event):
        """Format event for API response"""
        if not event:
            return None
        
        formatted = dict(event)
        # Convert date to ISO format if present
        if 'event_date' in formatted and formatted['event_date']:
            formatted['event_date'] = formatted['event_date'].isoformat()
        
        return formatted
    
    @staticmethod
    def _format_events(events):
        """Format multiple events"""
        return [EventService._format_event(e) for e in events]
