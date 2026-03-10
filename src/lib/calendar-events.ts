export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  duration?: string;
  type: 'hearing' | 'vote' | 'markup' | 'introduction' | 'deadline' | 'other';
  chamber: 'house' | 'senate' | 'both' | 'other';
  committee?: string;
  location?: string;
  description?: string;
  bills?: string[];
  priority: number;
  source: string;
  url?: string;
  isLiveEvent?: boolean;
  metadata?: {
    speakers?: string[];
    topics?: string[];
    expectedOutcomes?: string[];
    mediaCoverage?: {
      cspan?: string;
      youtube?: string;
      transcript?: string;
    };
  };
}

export interface CalendarDay {
  date: string;
  events: CalendarEvent[];
  hasEvents: boolean;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
}

export interface CalendarWeek {
  weekStart: string;
  weekEnd: string;
  days: CalendarDay[];
}

export interface CalendarMonth {
  year: number;
  month: number;
  weeks: CalendarWeek[];
  totalEvents: number;
}

class CalendarEventsManager {
  private events: Map<string, CalendarEvent> = new Map();

  // Add or update an event
  addEvent(event: CalendarEvent) {
    this.events.set(event.id, event);
  }

  // Add multiple events
  addEvents(events: CalendarEvent[]) {
    events.forEach(event => this.addEvent(event));
  }

  // Get events for a specific date
  getEventsForDate(date: string): CalendarEvent[] {
    return Array.from(this.events.values())
      .filter(event => event.date === date)
      .sort((a, b) => {
        // Sort by time if available, then by priority
        if (a.time && b.time) {
          return a.time.localeCompare(b.time);
        }
        return b.priority - a.priority;
      });
  }

  // Get events for a date range
  getEventsForDateRange(startDate: string, endDate: string): CalendarEvent[] {
    return Array.from(this.events.values())
      .filter(event => event.date >= startDate && event.date <= endDate)
      .sort((a, b) => {
        // Sort by date first, then by time, then by priority
        if (a.date !== b.date) {
          return a.date.localeCompare(b.date);
        }
        if (a.time && b.time) {
          return a.time.localeCompare(b.time);
        }
        return b.priority - a.priority;
      });
  }

  // Get events for a specific week
  getEventsForWeek(weekStart: string): CalendarEvent[] {
    const weekEnd = this.addDays(weekStart, 6);
    return this.getEventsForDateRange(weekStart, weekEnd);
  }

  // Get events for a specific month
  getEventsForMonth(year: number, month: number): CalendarEvent[] {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;
    return this.getEventsForDateRange(startDate, endDate);
  }

  // Create calendar structure for a month
  createCalendarMonth(year: number, month: number): CalendarMonth {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const startOfWeek = new Date(firstDay);
    startOfWeek.setDate(firstDay.getDate() - firstDay.getDay());

    const weeks: CalendarWeek[] = [];
    let currentDate = new Date(startOfWeek);

    while (currentDate <= lastDay || currentDate.getDay() !== 0) {
      const weekStart = this.formatDate(currentDate);
      const weekEnd = this.formatDate(new Date(currentDate.getTime() + 6 * 24 * 60 * 60 * 1000));
      
      const days: CalendarDay[] = [];
      for (let i = 0; i < 7; i++) {
        const dayDate = new Date(currentDate.getTime() + i * 24 * 60 * 60 * 1000);
        const dateStr = this.formatDate(dayDate);
        const events = this.getEventsForDate(dateStr);
        const today = this.formatDate(new Date());
        
        days.push({
          date: dateStr,
          events,
          hasEvents: events.length > 0,
          isToday: dateStr === today,
          isPast: dateStr < today,
          isFuture: dateStr > today
        });
      }
      
      weeks.push({
        weekStart,
        weekEnd,
        days
      });
      
      currentDate.setDate(currentDate.getDate() + 7);
    }

    const totalEvents = this.getEventsForMonth(year, month).length;

    return {
      year,
      month,
      weeks,
      totalEvents
    };
  }

  // Get upcoming events (next 7 days)
  getUpcomingEvents(days: number = 7): CalendarEvent[] {
    const today = this.formatDate(new Date());
    const endDate = this.addDays(today, days);
    return this.getEventsForDateRange(today, endDate);
  }

  // Get today's events
  getTodayEvents(): CalendarEvent[] {
    const today = this.formatDate(new Date());
    return this.getEventsForDate(today);
  }

  // Get events by type
  getEventsByType(type: CalendarEvent['type']): CalendarEvent[] {
    return Array.from(this.events.values())
      .filter(event => event.type === type)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // Get events by chamber
  getEventsByChamber(chamber: CalendarEvent['chamber']): CalendarEvent[] {
    return Array.from(this.events.values())
      .filter(event => event.chamber === chamber)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // Get high priority events
  getHighPriorityEvents(threshold: number = 7): CalendarEvent[] {
    return Array.from(this.events.values())
      .filter(event => event.priority >= threshold)
      .sort((a, b) => b.priority - a.priority);
  }

  // Clear all events
  clear() {
    this.events.clear();
  }

  // Get stats
  getStats() {
    const events = Array.from(this.events.values());
    return {
      totalEvents: events.length,
      eventsByType: events.reduce((acc, event) => {
        acc[event.type] = (acc[event.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      eventsByChamber: events.reduce((acc, event) => {
        acc[event.chamber] = (acc[event.chamber] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      upcomingEvents: this.getUpcomingEvents().length,
      todayEvents: this.getTodayEvents().length
    };
  }

  // Helper methods
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private addDays(dateStr: string, days: number): string {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return this.formatDate(date);
  }
}

// Export singleton instance
export const calendarEventsManager = new CalendarEventsManager();

// Helper function to convert LiveEvent to CalendarEvent
export const convertToCalendarEvent = (liveEvent: any): CalendarEvent => {
  return {
    id: liveEvent.id,
    title: liveEvent.title,
    date: liveEvent.date,
    time: liveEvent.metadata?.startTime,
    duration: liveEvent.metadata?.duration,
    type: liveEvent.type as CalendarEvent['type'],
    chamber: liveEvent.chamber as CalendarEvent['chamber'],
    committee: liveEvent.committee,
    location: liveEvent.location,
    description: liveEvent.description,
    bills: liveEvent.bills,
    priority: liveEvent.priority || 5,
    source: liveEvent.source,
    url: liveEvent.url,
    isLiveEvent: liveEvent.isLiveEvent,
    metadata: liveEvent.metadata
  };
}; 