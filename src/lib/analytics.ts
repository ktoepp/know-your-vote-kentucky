// Analytics tracking system for Know Your Vote Kentucky navigation and user flow

type GTag = (...args: any[]) => void;

interface NavigationEvent {
  event_id: string;
  source: 'search' | 'graph' | 'discovery' | 'related' | 'table' | 'homepage';
  context?: {
    query?: string;
    filters?: Record<string, string | number | boolean>;
    nodeType?: string;
    discoveryType?: string;
    referrer?: string;
  };
  timestamp: string;
  userAgent?: string;
  sessionId?: string;
}

interface UserFlowEvent {
  action: 'page_view' | 'search' | 'filter' | 'navigation' | 'interaction';
  page: string;
  component?: string;
  data?: Record<string, unknown>;
  timestamp: string;
  sessionId?: string;
}

interface PerformanceEvent {
  metric: 'load_time' | 'interaction_time' | 'error_rate';
  value: number;
  context?: string;
  timestamp: string;
}

class AnalyticsTracker {
  private sessionId: string;
  private isEnabled: boolean;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.isEnabled = typeof window !== 'undefined' && 'gtag' in window;
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getSessionId(): string {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('kyvk_session_id');
      if (stored) {
        return stored;
      }
      sessionStorage.setItem('kyvk_session_id', this.sessionId);
    }
    return this.sessionId;
  }

  // Track event detail page views with source context
  trackEventNavigation(event: NavigationEvent): void {
    if (!this.isEnabled) return;

    const gtag = (window as unknown as { gtag: GTag }).gtag;
    gtag('event', 'event_detail_viewed', {
      event_id: event.event_id,
      source: event.source,
      context: event.context,
      timestamp: event.timestamp,
      session_id: this.getSessionId(),
      custom_map: {
        'event_id': 'event_id',
        'source': 'source',
        'context': 'context',
        'session_id': 'session_id'
      }
    });

    // Also track as custom event for detailed analysis
    gtag('event', 'custom_event_navigation', {
      event_category: 'navigation',
      event_label: event.source,
      value: 1,
      custom_parameters: {
        event_id: event.event_id,
        source: event.source,
        context: JSON.stringify(event.context),
        session_id: this.getSessionId()
      }
    });
  }

  // Track user flow patterns
  trackUserFlow(event: UserFlowEvent): void {
    if (!this.isEnabled) return;

    const gtag = (window as unknown as { gtag: GTag }).gtag;
    gtag('event', 'user_flow', {
      action: event.action,
      page: event.page,
      component: event.component,
      data: event.data,
      timestamp: event.timestamp,
      session_id: this.getSessionId(),
      custom_map: {
        'action': 'action',
        'page': 'page',
        'component': 'component',
        'session_id': 'session_id'
      }
    });
  }

  // Track performance metrics
  trackPerformance(event: PerformanceEvent): void {
    if (!this.isEnabled) return;

    const gtag = (window as unknown as { gtag: GTag }).gtag;
    gtag('event', 'performance_metric', {
      metric: event.metric,
      value: event.value,
      context: event.context,
      timestamp: event.timestamp,
      custom_map: {
        'metric': 'metric',
        'value': 'value',
        'context': 'context'
      }
    });
  }

  // Track search patterns
  trackSearch(query: string, filters: Record<string, string | number | boolean>, results: number): void {
    if (!this.isEnabled) return;

    const gtag = (window as unknown as { gtag: Function }).gtag;
    gtag('event', 'search', {
      search_term: query,
      filters: JSON.stringify(filters),
      results_count: results,
      session_id: this.getSessionId(),
      custom_map: {
        'search_term': 'search_term',
        'filters': 'filters',
        'results_count': 'results_count',
        'session_id': 'session_id'
      }
    });
  }

  // Track graph interactions
  trackGraphInteraction(action: string, nodeType: string, nodeId?: string): void {
    if (!this.isEnabled) return;

    const gtag = (window as unknown as { gtag: Function }).gtag;
    gtag('event', 'graph_interaction', {
      action: action,
      node_type: nodeType,
      node_id: nodeId,
      session_id: this.getSessionId(),
      custom_map: {
        'action': 'action',
        'node_type': 'node_type',
        'node_id': 'node_id',
        'session_id': 'session_id'
      }
    });
  }

  // Track discovery patterns
  trackDiscovery(type: string, query?: string, results?: number): void {
    if (!this.isEnabled) return;

    const gtag = (window as unknown as { gtag: Function }).gtag;
    gtag('event', 'discovery', {
      discovery_type: type,
      query: query,
      results_count: results,
      session_id: this.getSessionId(),
      custom_map: {
        'discovery_type': 'discovery_type',
        'query': 'query',
        'results_count': 'results_count',
        'session_id': 'session_id'
      }
    });
  }

  // Track bounce rate and engagement
  trackEngagement(page: string, timeSpent: number, interactions: number): void {
    if (!this.isEnabled) return;

    const gtag = (window as unknown as { gtag: Function }).gtag;
    gtag('event', 'engagement', {
      page: page,
      time_spent: timeSpent,
      interactions: interactions,
      session_id: this.getSessionId(),
      custom_map: {
        'page': 'page',
        'time_spent': 'time_spent',
        'interactions': 'interactions',
        'session_id': 'session_id'
      }
    });
  }

  // Track errors
  trackError(error: string, context?: string): void {
    if (!this.isEnabled) return;

    const gtag = (window as unknown as { gtag: Function }).gtag;
    gtag('event', 'error', {
      error_message: error,
      context: context,
      session_id: this.getSessionId(),
      custom_map: {
        'error_message': 'error_message',
        'context': 'context',
        'session_id': 'session_id'
      }
    });
  }

  // Track mobile-specific interactions
  trackMobileInteraction(action: string, deviceType: string): void {
    if (!this.isEnabled) return;

    const gtag = (window as unknown as { gtag: Function }).gtag;
    gtag('event', 'mobile_interaction', {
      action: action,
      device_type: deviceType,
      session_id: this.getSessionId(),
      custom_map: {
        'action': 'action',
        'device_type': 'device_type',
        'session_id': 'session_id'
      }
    });
  }

  // Get analytics summary for current session
  getSessionSummary(): {
    sessionId: string;
    pageViews: number;
    events: number;
    startTime: string;
  } {
    if (typeof window !== 'undefined') {
      const summary = sessionStorage.getItem('kyvk_analytics_summary');
      if (summary) {
        return JSON.parse(summary);
      }
    }
    
    return {
      sessionId: this.getSessionId(),
      pageViews: 0,
      events: 0,
      startTime: new Date().toISOString()
    };
  }

  // Update session summary
  updateSessionSummary(updates: Partial<{ pageViews: number; events: number }>): void {
    if (typeof window !== 'undefined') {
      const current = this.getSessionSummary();
      const updated = { ...current, ...updates };
      sessionStorage.setItem('kyvk_analytics_summary', JSON.stringify(updated));
    }
  }
}

// Create singleton instance
const analytics = new AnalyticsTracker();

// Export convenience functions
export const trackEventNavigation = (event: Omit<NavigationEvent, 'timestamp'>) => {
  analytics.trackEventNavigation({
    ...event,
    timestamp: new Date().toISOString()
  });
};

export const trackUserFlow = (event: Omit<UserFlowEvent, 'timestamp'>) => {
  analytics.trackUserFlow({
    ...event,
    timestamp: new Date().toISOString()
  });
};

export const trackPerformance = (event: Omit<PerformanceEvent, 'timestamp'>) => {
  analytics.trackPerformance({
    ...event,
    timestamp: new Date().toISOString()
  });
};

export const trackSearch = (query: string, filters: Record<string, string | number | boolean>, results: number) => {
  analytics.trackSearch(query, filters, results);
};

export const trackGraphInteraction = (action: string, nodeType: string, nodeId?: string) => {
  analytics.trackGraphInteraction(action, nodeType, nodeId);
};

export const trackDiscovery = (type: string, query?: string, results?: number) => {
  analytics.trackDiscovery(type, query, results);
};

export const trackEngagement = (page: string, timeSpent: number, interactions: number) => {
  analytics.trackEngagement(page, timeSpent, interactions);
};

export const trackError = (error: string, context?: string) => {
  analytics.trackError(error, context);
};

export const trackMobileInteraction = (action: string, deviceType: string) => {
  analytics.trackMobileInteraction(action, deviceType);
};

export default analytics; 