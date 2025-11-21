from models.event_model import EventModel  # Pastikan import ini benar

class EventService:
    """Business logic layer for event operations"""
    
    @staticmethod
    def get_all_events():
        """Get all events"""
        # Data dari Model sudah berupa dict dengan format string, tidak perlu diformat ulang
        return EventModel.get_all_events()
    
    @staticmethod
    def get_event_by_id(event_id):
        """Get a specific event"""
        event = EventModel.get_event_by_id(event_id)
        if not event:
            raise ValueError(f"Event {event_id} not found")
        return event  # Langsung return, tidak perlu _format_event
    
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
        
        return event # Langsung return
    
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
            # Handle typing secara aman
            ds_val = h['ds']
            formatted_ds = ds_val
            
            # Cek jika ds_val adalah objek datetime/date, baru format. Jika string, biarkan.
            if hasattr(ds_val, 'isoformat'):
                formatted_ds = ds_val.isoformat()
            else:
                formatted_ds = str(ds_val)

            formatted.append({
                'holiday': h['holiday'],
                'ds': formatted_ds,
                'lower_window': -2,
                'upper_window': 1
            })
        
        return formatted if formatted else None

   