import { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, X, Calendar as CalendarIcon, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner@2.0.3';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

// Tipe data dari database
interface CalendarEvent {
  event_id: number;
  event_name: string;
  event_date: string; // ISO date string (YYYY-MM-DD)
  type: 'holiday' | 'custom';
  description: string | null;
  include_in_prediction: boolean;
}

interface EventFormData {
  name: string;
  date: string;
  description: string;
  includeInPrediction: boolean;
}

const API_URL = 'http://localhost:5000';

// Helper Kalender
const getDaysInMonth = (date: Date): number => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};
const getFirstDayOfMonth = (date: Date): number => {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
};
const formatDate = (year: number, month: number, day: number): string => {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 10)); // November 2025
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [hoveredEvent, setHoveredEvent] = useState<number | null>(null);
  const [formData, setFormData] = useState<EventFormData>({
    name: '',
    date: '',
    description: '',
    includeInPrediction: true,
  });

  // --- Fetch Events ---
  const fetchEvents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/events`);
      if (!response.ok) throw new Error('Failed to fetch events');
      const data: CalendarEvent[] = await response.json();
      setAllEvents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Pisahkan event 'holiday' dan 'custom' menggunakan useMemo
  const { nationalHolidays, customEvents } = useMemo(() => {
    return {
      nationalHolidays: allEvents.filter((e) => e.type === 'holiday'),
      customEvents: allEvents.filter((e) => e.type === 'custom'),
    };
  }, [allEvents]);

  // Logika rendering kalender (tidak berubah)
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const getEventsForDate = (day: number): CalendarEvent[] => {
    const dateStr = formatDate(currentDate.getFullYear(), currentDate.getMonth(), day);
    return allEvents.filter((event) => event.event_date === dateStr);
  };

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  // --- Fungsi CRUD ---
  const handleAddEvent = async () => {
    if (!formData.name || !formData.date) {
      toast.error('Please fill in event name and date');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to add event');
      }
      const newEvent: CalendarEvent = await response.json();

      setAllEvents([...allEvents, newEvent]); // Optimistic update
      setFormData({ name: '', date: '', description: '', includeInPrediction: true });
      setIsAddOpen(false);
      toast.success('Event added successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add event');
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    try {
      const response = await fetch(`${API_URL}/events/${eventId}`, {
        method: 'DELETE',
      });
      
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Failed to delete event');
      
      setAllEvents(allEvents.filter((e) => e.event_id !== eventId)); // Optimistic update
      toast.success('Event deleted successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete event');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 dark:text-white mb-2">Calendar</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage holidays and custom events</p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl bg-blue-500 hover:bg-blue-600 hover:text-cyan-100">
              <Plus className="w-4 h-4 mr-2" />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-2xl">
            {/* Dialog Content (tidak berubah) */}
            <DialogHeader>
              <DialogTitle>Add Custom Event</DialogTitle>
              <DialogDescription>
                Create a new store event. These can be used in inventory predictions.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="event-name">Event Name *</Label>
                <Input
                  id="event-name"
                  placeholder="e.g., Black Friday Sale"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="rounded-xl"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="event-date">Date *</Label>
                <Input
                  id="event-date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="event-description">Description</Label>
                <textarea
                  id="event-description"
                  placeholder="Event details and notes..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="flex min-h-24 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  id="event-prediction"
                  type="checkbox"
                  checked={formData.includeInPrediction}
                  onChange={(e) => setFormData({ ...formData, includeInPrediction: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                />
                <Label htmlFor="event-prediction" className="cursor-pointer">
                  Include in inventory prediction
                </Label>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddOpen(false);
                  setFormData({ name: '', date: '', description: '', includeInPrediction: false });
                }}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddEvent}
                className="rounded-xl bg-blue-500 hover:bg-blue-600 hover:text-cyan-100"
              >
                Add Event
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Events Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">National Holidays</CardTitle>
            <CalendarIcon className="w-5 h-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <div className="text-3xl text-gray-900 dark:text-white">{nationalHolidays.length}</div>}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Custom Events</CardTitle>
            <CalendarIcon className="w-5 h-5 text-green-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <div className="text-3xl text-gray-900 dark:text-white">{customEvents.length}</div>}
          </CardContent>
        </Card>
      </div>

      {/* Calendar Grid */}
      <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-gray-900 dark:text-white">{monthName}</CardTitle>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousMonth}
                className="rounded-lg"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextMonth}
                className="rounded-lg"
              >
                Next
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error Fetching Data</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-6">
              {/* Calendar Grid */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden w-full">
                {/* Day Headers (tidak berubah) */}
                <div className="grid gap-0 bg-gray-50 dark:bg-gray-800" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="p-3 text-center font-semibold text-gray-900 dark:text-white border-r border-b border-gray-200 dark:border-gray-700 last:border-r-0">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className="gap-0 w-full" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                  {Array.from({ length: firstDay }).map((_, i) => (
                    <div key={`empty-${i}`} className="min-h-24 p-2 border-r border-b border-gray-200 dark:border-gray-700 last:border-r-0 bg-gray-50 dark:bg-gray-700/30" />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dayEvents = getEventsForDate(day);

                    return (
                      <div
                        key={day}
                        className="min-h-24 p-2 border-r border-b border-gray-200 dark:border-gray-700 last:border-r-0 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
                      >
                        <div className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{day}</div>
                        <div className="space-y-1">
                          {dayEvents.map((event) => (
                            <div key={event.event_id} className="relative group">
                              <div
                                className={`text-xs px-2 py-1 rounded-md cursor-pointer truncate ${
                                  event.type === 'holiday'
                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                    : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                }`}
                                onMouseEnter={() => setHoveredEvent(event.event_id)}
                                onMouseLeave={() => setHoveredEvent(null)}
                              >
                                {event.event_name}
                              </div>

                              {/* Tooltip */}
                              {hoveredEvent === event.event_id && (
                                <motion.div
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  className="absolute z-50 bottom-full left-0 mb-2 w-48 p-3 bg-gray-900 dark:bg-gray-700 text-white rounded-lg shadow-lg text-xs"
                                >
                                  <p className="font-semibold">{event.event_name}</p>
                                  {event.description && <p className="text-gray-300 mt-1">{event.description}</p>}
                                  <p className="text-gray-400 mt-1">{event.event_date}</p>
                                  {event.type === 'custom' && (
                                    <button
                                      onClick={() => handleDeleteEvent(event.event_id)}
                                      className="mt-2 text-red-400 hover:text-red-300 text-xs flex items-center space-x-1"
                                    >
                                      <X className="w-3 h-3" />
                                      <span>Delete</span>
                                    </button>
                                  )}
                                </motion.div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Legend (tidak berubah) */}
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-100 dark:bg-blue-900/30 rounded border border-blue-300 dark:border-blue-700" />
                  <span className="text-gray-600 dark:text-gray-400">National Holiday</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-100 dark:bg-green-900/30 rounded border border-green-300 dark:border-green-700" />
                  <span className="text-gray-600 dark:text-gray-400">Custom Event</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}