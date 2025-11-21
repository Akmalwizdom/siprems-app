import { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Plus, X, Calendar as CalendarIcon, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
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
import { apiClient } from '../utils/api';

interface CalendarEvent {
  event_id: number;
  event_name: string;
  event_date: string;
  type: 'promotion' | 'holiday' | 'store-closed';
  description: string | null;
  include_in_prediction: boolean;
}

type ViewMode = 'month' | 'week' | 'day';

const eventTypeConfig = {
  promotion: {
    color: 'bg-blue-500',
    label: 'Promotion',
    bgLight: 'bg-blue-50 dark:bg-blue-900/20',
    textColor: 'text-blue-700 dark:text-blue-300',
    borderColor: 'border-blue-200 dark:border-blue-700',
  },
  holiday: {
    color: 'bg-purple-500',
    label: 'Holiday',
    bgLight: 'bg-purple-50 dark:bg-purple-900/20',
    textColor: 'text-purple-700 dark:text-purple-300',
    borderColor: 'border-purple-200 dark:border-purple-700',
  },
  'store-closed': {
    color: 'bg-red-500',
    label: 'Store Closed',
    bgLight: 'bg-red-50 dark:bg-red-900/20',
    textColor: 'text-red-700 dark:text-red-300',
    borderColor: 'border-red-200 dark:border-red-700',
  },
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    type: 'promotion' as CalendarEvent['type'],
    description: '',
  });

  const fetchEvents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<CalendarEvent[]>('/events');
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

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getWeekDays = (date: Date) => {
    const days = [];
    const current = new Date(date);
    const dayOfWeek = current.getDay();
    const diff = current.getDate() - dayOfWeek;

    for (let i = 0; i < 7; i++) {
      const day = new Date(current);
      day.setDate(diff + i);
      days.push(day);
    }
    return days;
  };

  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  };

  const navigateWeek = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + direction * 7);
    setCurrentDate(newDate);
  };

  const navigateDay = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + direction);
    setCurrentDate(newDate);
  };

  const handleNavigate = (direction: number) => {
    if (viewMode === 'month') navigateMonth(direction);
    if (viewMode === 'week') navigateWeek(direction);
    if (viewMode === 'day') navigateDay(direction);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowModal(true);
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !formData.title) {
      toast.error('Please fill in event name and date');
      return;
    }

    try {
      const newEvent = await apiClient.post<CalendarEvent>('/events', {
        name: formData.title,
        date: selectedDate.toISOString().split('T')[0],
        type: formData.type,
        description: formData.description,
        includeInPrediction: true,
      });

      setAllEvents([...allEvents, newEvent]);
      closeModal();
      toast.success('Event added successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add event');
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    try {
      await apiClient.delete(`/events/${eventId}`);
      setAllEvents(allEvents.filter((e) => e.event_id !== eventId));
      toast.success('Event deleted successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete event');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedDate(null);
    setFormData({ title: '', type: 'promotion', description: '' });
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return allEvents.filter((e) => e.event_date === dateStr);
  };

  const formatHeader = () => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    if (viewMode === 'week') {
      const weekDays = getWeekDays(currentDate);
      return `${weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const renderMonthView = () => {
    const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);
    const days = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(
        <div
          key={`empty-${i}`}
          className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 min-h-32"
        />
      );
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateEvents = getEventsForDate(date);
      const isToday = date.toDateString() === new Date().toDateString();

      days.push(
        <div
          key={day}
          onClick={() => handleDateClick(date)}
          className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 min-h-32 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
        >
          <div
            className={`inline-flex items-center justify-center w-7 h-7 rounded-full mb-2 ${
              isToday
                ? 'bg-blue-600 text-white dark:bg-blue-500'
                : 'text-slate-900 dark:text-slate-100'
            }`}
          >
            {day}
          </div>
          <div className="space-y-1">
            {dateEvents.map((event) => (
              <div
                key={event.event_id}
                className={`${eventTypeConfig[event.type].color} text-white px-2 py-1 rounded text-xs truncate`}
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                {event.event_name}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="p-3 bg-slate-50 dark:bg-slate-900 text-center text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700 last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">{days}</div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays(currentDate);
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="grid grid-cols-8 border-b border-slate-200 dark:border-slate-700">
          <div className="p-3 bg-slate-50 dark:bg-slate-900" />
          {weekDays.map((day, idx) => {
            const isToday = day.toDateString() === new Date().toDateString();
            return (
              <div
                key={idx}
                className={`p-3 bg-slate-50 dark:bg-slate-900 text-center border-l border-slate-200 dark:border-slate-700 ${
                  isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div
                  className={`text-slate-900 dark:text-slate-100 ${
                    isToday ? 'text-blue-600 dark:text-blue-400' : ''
                  }`}
                >
                  {day.getDate()}
                </div>
              </div>
            );
          })}
        </div>
        <div className="max-h-[600px] overflow-y-auto">
          {hours.map((hour) => (
            <div key={hour} className="grid grid-cols-8 border-b border-slate-200 dark:border-slate-700">
              <div className="p-2 bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 dark:text-slate-400 text-right border-r border-slate-200 dark:border-slate-700">
                {hour.toString().padStart(2, '0')}:00
              </div>
              {weekDays.map((day, idx) => {
                const dateEvents = getEventsForDate(day);
                return (
                  <div
                    key={idx}
                    onClick={() => handleDateClick(day)}
                    className="p-2 border-l border-slate-200 dark:border-slate-700 min-h-16 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                  >
                    {hour === 9 &&
                      dateEvents.map((event) => (
                        <div
                          key={event.event_id}
                          className={`${eventTypeConfig[event.type].color} text-white px-2 py-1 rounded text-xs mb-1`}
                        >
                          {event.event_name}
                        </div>
                      ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dateEvents = getEventsForDate(currentDate);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-slate-900 dark:text-slate-100">Schedule</h3>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              {hours.map((hour) => (
                <div key={hour} className="flex border-b border-slate-200 dark:border-slate-700">
                  <div className="w-20 p-3 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-right border-r border-slate-200 dark:border-slate-700">
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                  <div
                    onClick={() => handleDateClick(currentDate)}
                    className="flex-1 p-3 min-h-16 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                  >
                    {hour === 9 &&
                      dateEvents.map((event) => (
                        <div
                          key={event.event_id}
                          className={`${eventTypeConfig[event.type].color} text-white px-3 py-2 rounded mb-2`}
                        >
                          <div>{event.event_name}</div>
                          {event.description && (
                            <div className="text-xs mt-1 opacity-90">{event.description}</div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-slate-900 dark:text-slate-100 mb-4">Events Today</h3>
            {dateEvents.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 text-center py-8">
                No events scheduled
              </p>
            ) : (
              <div className="space-y-3">
                {dateEvents.map((event) => (
                  <div
                    key={event.event_id}
                    className={`p-3 rounded-lg border ${eventTypeConfig[event.type].bgLight} ${eventTypeConfig[event.type].borderColor}`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <h4 className={`${eventTypeConfig[event.type].textColor}`}>
                        {event.event_name}
                      </h4>
                      <button
                        onClick={() => handleDeleteEvent(event.event_id)}
                        className="text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${eventTypeConfig[event.type].bgLight} ${eventTypeConfig[event.type].textColor}`}
                    >
                      {eventTypeConfig[event.type].label}
                    </span>
                    {event.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                        {event.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => handleDateClick(currentDate)}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 dark:bg-blue-500 text-white px-4 py-3 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Event
          </button>
        </div>
      </div>
    );
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
        <div className="flex items-center gap-4">
          <button
            onClick={() => handleNavigate(-1)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
          <h1 className="text-slate-900 dark:text-white text-lg font-semibold">
            {formatHeader()}
          </h1>
          <button
            onClick={() => handleNavigate(1)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'month'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'week'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'day'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Day
            </button>
          </div>

          <Dialog open={showModal} onOpenChange={setShowModal}>
            <DialogTrigger asChild>
              <Button className="rounded-xl bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600">
                <Plus className="w-4 h-4 mr-2" />
                Add Event
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-2xl dark:bg-slate-800 dark:border-slate-700">
              <DialogHeader>
                <DialogTitle className="dark:text-slate-100">Add Event</DialogTitle>
                <DialogDescription className="dark:text-slate-400">
                  Create a new store event for the calendar.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddEvent} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="event-date" className="dark:text-slate-100">
                    Event Date
                  </Label>
                  <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100">
                    {selectedDate?.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="event-type" className="dark:text-slate-100">
                    Event Type *
                  </Label>
                  <select
                    id="event-type"
                    required
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value as CalendarEvent['type'] })
                    }
                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="promotion">Promotion</option>
                    <option value="holiday">Holiday</option>
                    <option value="store-closed">Store Closed</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="event-name" className="dark:text-slate-100">
                    Event Title *
                  </Label>
                  <Input
                    id="event-name"
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                    placeholder="e.g., Black Friday Sale"
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="event-description" className="dark:text-slate-100">
                    Description
                  </Label>
                  <textarea
                    id="event-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                    placeholder="Additional details..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-3 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-100 bg-white dark:bg-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                  >
                    Add Event
                  </button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-6 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        {Object.entries(eventTypeConfig).map(([key, config]) => (
          <div key={key} className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded ${config.color}`} />
            <span className="text-slate-700 dark:text-slate-300">{config.label}</span>
          </div>
        ))}
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Fetching Data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex justify-center items-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          {/* Calendar Views */}
          {viewMode === 'month' && renderMonthView()}
          {viewMode === 'week' && renderWeekView()}
          {viewMode === 'day' && renderDayView()}
        </>
      )}
    </motion.div>
  );
}
