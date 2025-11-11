import { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, X, Calendar as CalendarIcon, Loader2, AlertTriangle, RefreshCw, Check } from 'lucide-react';
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

// Types
interface EventImpact {
  eventId: number;
  impactType: 'positive' | 'negative' | 'neutral';
  expectedChange: string;
  description: string;
}

interface CalendarEvent {
  event_id: number;
  event_name: string;
  event_date: string;
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

// Mock API Functions
const mockEventImpactData: Record<number, EventImpact> = {
  1: {
    eventId: 1,
    impactType: 'positive',
    expectedChange: '+35%',
    description: 'Sales typically rise +35% during New Year period due to fresh start purchases',
  },
  2: {
    eventId: 2,
    impactType: 'positive',
    expectedChange: '+28%',
    description: 'Black Friday events historically drive +28% sales increase',
  },
  3: {
    eventId: 3,
    impactType: 'negative',
    expectedChange: '-15%',
    description: 'During this period, sales typically decrease by -15%',
  },
  4: {
    eventId: 4,
    impactType: 'positive',
    expectedChange: '+42%',
    description: 'Christmas season shows the highest impact with +42% increase',
  },
  5: {
    eventId: 5,
    impactType: 'neutral',
    expectedChange: '±5%',
    description: 'Minimal impact expected on sales patterns',
  },
};

const mockFetchEventImpact = async (eventId: number): Promise<EventImpact | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockEventImpactData[eventId] || null);
    }, 300);
  });
};

const mockToggleEventInclusion = async (
  eventId: number,
  includeInPrediction: boolean
): Promise<{ eventId: number; includedInPrediction: boolean }> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ eventId, includedInPrediction: includeInPrediction });
    }, 200);
  });
};

const mockSyncEvents = async (): Promise<{ synced: boolean; newEvents: number }> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ synced: true, newEvents: Math.floor(Math.random() * 5) + 1 });
    }, 800);
  });
};

// Helper functions
const getDaysInMonth = (date: Date): number => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

const getFirstDayOfMonth = (date: Date): number => {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
};

const formatDate = (year: number, month: number, day: number): string => {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const getEventColorClass = (
  eventType: 'holiday' | 'custom',
  hasPredictedImpact: boolean
): string => {
  if (hasPredictedImpact && eventType === 'custom') {
    return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-700';
  }
  if (eventType === 'holiday') {
    return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700';
  }
  return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700';
};

const API_URL = 'http://localhost:5000';

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 10));
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [hoveredEvent, setHoveredEvent] = useState<number | null>(null);
  const [eventImpacts, setEventImpacts] = useState<Record<number, EventImpact | null>>({});
  const [loadingImpactId, setLoadingImpactId] = useState<number | null>(null);
  const [togglingEventId, setTogglingEventId] = useState<number | null>(null);

  const [formData, setFormData] = useState<EventFormData>({
    name: '',
    date: '',
    description: '',
    includeInPrediction: true,
  });

  // Initialize with mock events
  useEffect(() => {
    const initializeMockEvents = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const mockEvents: CalendarEvent[] = [
          {
            event_id: 1,
            event_name: 'New Year',
            event_date: '2025-01-01',
            type: 'holiday',
            description: 'New Year celebration',
            include_in_prediction: true,
          },
          {
            event_id: 2,
            event_name: 'Black Friday',
            event_date: '2025-11-28',
            type: 'custom',
            description: 'Annual Black Friday sale',
            include_in_prediction: true,
          },
          {
            event_id: 3,
            event_name: 'Cyber Monday',
            event_date: '2025-12-01',
            type: 'custom',
            description: 'Cyber Monday deals',
            include_in_prediction: false,
          },
          {
            event_id: 4,
            event_name: 'Christmas',
            event_date: '2025-12-25',
            type: 'holiday',
            description: 'Christmas holiday',
            include_in_prediction: true,
          },
          {
            event_id: 5,
            event_name: 'Store Anniversary',
            event_date: '2025-11-15',
            type: 'custom',
            description: 'Our store anniversary celebration',
            include_in_prediction: false,
          },
        ];
        
        setAllEvents(mockEvents);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    initializeMockEvents();
  }, []);

  // Calculate summary statistics
  const { nationalHolidays, customEvents, includedInPrediction } = useMemo(() => {
    return {
      nationalHolidays: allEvents.filter((e) => e.type === 'holiday'),
      customEvents: allEvents.filter((e) => e.type === 'custom'),
      includedInPrediction: allEvents.filter((e) => e.include_in_prediction),
    };
  }, [allEvents]);

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

  const handleAddEvent = async () => {
    if (!formData.name || !formData.date) {
      toast.error('Please fill in event name and date');
      return;
    }

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const newEvent: CalendarEvent = {
        event_id: Math.max(...allEvents.map(e => e.event_id), 0) + 1,
        event_name: formData.name,
        event_date: formData.date,
        type: 'custom',
        description: formData.description,
        include_in_prediction: formData.includeInPrediction,
      };

      setAllEvents([...allEvents, newEvent]);
      setFormData({ name: '', date: '', description: '', includeInPrediction: true });
      setIsAddOpen(false);
      toast.success('Event added successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add event');
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 200));
      
      setAllEvents(allEvents.filter(e => e.event_id !== eventId));
      toast.success('Event deleted successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete event');
    }
  };

  const handleFetchEventImpact = async (eventId: number) => {
    if (eventImpacts[eventId] !== undefined) return;
    
    setLoadingImpactId(eventId);
    try {
      const impact = await mockFetchEventImpact(eventId);
      setEventImpacts((prev) => ({ ...prev, [eventId]: impact }));
    } catch (err) {
      toast.error('Failed to fetch event impact');
    } finally {
      setLoadingImpactId(null);
    }
  };

  const handleToggleEventInclusion = async (eventId: number, currentInclusion: boolean) => {
    setTogglingEventId(eventId);
    try {
      const response = await mockToggleEventInclusion(eventId, !currentInclusion);
      
      setAllEvents(
        allEvents.map((e) =>
          e.event_id === eventId
            ? { ...e, include_in_prediction: response.includedInPrediction }
            : e
        )
      );
      
      toast.success(`Event ${response.includedInPrediction ? 'included' : 'excluded'} from prediction model`);
    } catch (err) {
      toast.error('Failed to update event');
    } finally {
      setTogglingEventId(null);
    }
  };

  const handleSyncEvents = async () => {
    setIsSyncing(true);
    try {
      const response = await mockSyncEvents();
      
      if (response.synced) {
        // Simulate adding new synced events
        const newSyncedEvents: CalendarEvent[] = Array.from(
          { length: response.newEvents },
          (_, i) => ({
            event_id: Math.max(...allEvents.map(e => e.event_id), 0) + i + 1,
            event_name: `Synced Holiday ${i + 1}`,
            event_date: new Date(2025, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
              .toISOString()
              .split('T')[0],
            type: 'holiday' as const,
            description: `Auto-synced holiday from external calendar`,
            include_in_prediction: true,
          })
        );
        
        setAllEvents([...allEvents, ...newSyncedEvents]);
        toast.success(`Events synced successfully! ${response.newEvents} new events added.`);
      }
    } catch (err) {
      toast.error('Failed to sync events');
    } finally {
      setIsSyncing(false);
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
          <p className="text-gray-600 dark:text-gray-400">Manage holidays and custom events connected to predictions</p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl bg-blue-500 hover:bg-blue-600 hover:text-cyan-100">
              <Plus className="w-4 h-4 mr-2" />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-2xl">
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

      {/* Event Sync Summary Card */}
      <Card className="rounded-2xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-gray-900 dark:text-white">Event Sync Summary</CardTitle>
            <CardDescription>Overview of all calendar events and prediction inclusion</CardDescription>
          </div>
          <Button
            onClick={handleSyncEvents}
            disabled={isSyncing}
            size="sm"
            className="rounded-xl bg-blue-500 hover:bg-blue-600 text-white"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            Sync Events
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <CalendarIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">National Holidays</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{nationalHolidays.length}</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <CalendarIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Custom Events</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{customEvents.length}</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                  <CalendarIcon className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Included in Prediction</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{includedInPrediction.length}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
                {/* Day Headers */}
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
                          {dayEvents.map((event) => {
                            const impact = eventImpacts[event.event_id];
                            const hasPredictedImpact = impact && (impact.impactType === 'positive' || impact.impactType === 'negative');

                            return (
                              <div key={event.event_id} className="relative group">
                                <div
                                  className={`text-xs px-2 py-1 rounded-md cursor-pointer truncate transition-all ${getEventColorClass(
                                    event.type,
                                    event.include_in_prediction && hasPredictedImpact
                                  )}`}
                                  onMouseEnter={() => {
                                    setHoveredEvent(event.event_id);
                                    handleFetchEventImpact(event.event_id);
                                  }}
                                  onMouseLeave={() => setHoveredEvent(null)}
                                >
                                  {event.event_name}
                                </div>

                                {/* Tooltip with Impact Info and Toggle */}
                                {hoveredEvent === event.event_id && (
                                  <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute z-50 bottom-full left-0 mb-2 w-64 p-4 bg-gray-900 dark:bg-gray-700 text-white rounded-lg shadow-lg text-xs"
                                  >
                                    <p className="font-semibold">{event.event_name}</p>
                                    {event.description && (
                                      <p className="text-gray-300 mt-1">{event.description}</p>
                                    )}
                                    <p className="text-gray-400 mt-1">{event.event_date}</p>

                                    {/* Predicted Impact Info */}
                                    {loadingImpactId === event.event_id ? (
                                      <div className="flex items-center mt-3 space-x-2">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        <span>Loading impact...</span>
                                      </div>
                                    ) : impact ? (
                                      <div className="mt-3 p-2 bg-gray-800 rounded">
                                        <p className="font-semibold text-yellow-300">Predicted Impact:</p>
                                        <p className={`text-sm mt-1 ${
                                          impact.impactType === 'positive'
                                            ? 'text-green-400'
                                            : impact.impactType === 'negative'
                                            ? 'text-red-400'
                                            : 'text-gray-300'
                                        }`}>
                                          {impact.expectedChange}
                                        </p>
                                        <p className="text-gray-400 text-xs mt-1">{impact.description}</p>
                                      </div>
                                    ) : null}

                                    {/* Include in Prediction Toggle */}
                                    <div className="mt-3 space-y-2 border-t border-gray-700 pt-3">
                                      <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={event.include_in_prediction}
                                          onChange={() => handleToggleEventInclusion(event.event_id, event.include_in_prediction)}
                                          disabled={togglingEventId === event.event_id}
                                          className="w-3 h-3 rounded accent-blue-500 cursor-pointer disabled:opacity-50"
                                        />
                                        <span className="text-xs text-gray-300">
                                          {togglingEventId === event.event_id ? 'Updating...' : 'Include in prediction model'}
                                        </span>
                                      </label>
                                    </div>

                                    {/* Delete Button for Custom Events */}
                                    {event.type === 'custom' && (
                                      <button
                                        onClick={() => handleDeleteEvent(event.event_id)}
                                        className="mt-3 text-red-400 hover:text-red-300 text-xs flex items-center space-x-1"
                                      >
                                        <X className="w-3 h-3" />
                                        <span>Delete</span>
                                      </button>
                                    )}
                                  </motion.div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-6 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-100 dark:bg-blue-900/30 rounded border border-blue-300 dark:border-blue-700" />
                  <span className="text-gray-600 dark:text-gray-400">National Holiday</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-100 dark:bg-green-900/30 rounded border border-green-300 dark:border-green-700" />
                  <span className="text-gray-600 dark:text-gray-400">Custom Event</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-100 dark:bg-orange-900/30 rounded border border-orange-300 dark:border-orange-700" />
                  <span className="text-gray-600 dark:text-gray-400">Predicted Impact Event</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
