// Analytics tracking — thin wrapper around PostHog. Each helper maps to a
// stable event name so dashboards and funnels survive refactors of call sites.

import posthog from "posthog-js";

interface NavigationEvent {
  event_id: string;
  source: "search" | "graph" | "discovery" | "related" | "table" | "homepage";
  context?: {
    query?: string;
    filters?: Record<string, string | number | boolean>;
    nodeType?: string;
    discoveryType?: string;
    referrer?: string;
  };
}

interface UserFlowEvent {
  action: "page_view" | "search" | "filter" | "navigation" | "interaction";
  page: string;
  component?: string;
  data?: Record<string, unknown>;
}

interface PerformanceEvent {
  metric: "load_time" | "interaction_time" | "error_rate";
  value: number;
  context?: string;
}

function capture(name: string, props: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  if (!posthog.__loaded) return;
  posthog.capture(name, props);
}

export const trackEventNavigation = (event: NavigationEvent): void => {
  capture("event_detail_viewed", {
    event_id: event.event_id,
    source: event.source,
    ...event.context,
  });
};

export const trackUserFlow = (event: UserFlowEvent): void => {
  capture("user_flow", {
    action: event.action,
    page: event.page,
    component: event.component,
    ...event.data,
  });
};

export const trackPerformance = (event: PerformanceEvent): void => {
  capture("performance_metric", {
    metric: event.metric,
    value: event.value,
    context: event.context,
  });
};

export const trackSearch = (
  query: string,
  filters: Record<string, string | number | boolean>,
  results: number,
): void => {
  capture("search", {
    search_term: query,
    filters,
    results_count: results,
  });
};

export const trackGraphInteraction = (
  action: string,
  nodeType: string,
  nodeId?: string,
): void => {
  capture("graph_interaction", {
    action,
    node_type: nodeType,
    node_id: nodeId,
  });
};

export const trackDiscovery = (
  type: string,
  query?: string,
  results?: number,
): void => {
  capture("discovery", {
    discovery_type: type,
    query,
    results_count: results,
  });
};

export const trackEngagement = (
  page: string,
  timeSpent: number,
  interactions: number,
): void => {
  capture("engagement", {
    page,
    time_spent: timeSpent,
    interactions,
  });
};

export const trackError = (error: string, context?: string): void => {
  capture("client_error", { error_message: error, context });
};

export const trackMobileInteraction = (
  action: string,
  deviceType: string,
): void => {
  capture("mobile_interaction", { action, device_type: deviceType });
};

// Named user-action events. Stable names so PostHog Action subscriptions
// (e.g. Slack notifications) keep working across UI refactors.

export const trackUserRegistered = (
  props?: { method?: "email"; needs_verification?: boolean },
): void => {
  capture("user_registered", { method: "email", ...props });
};

export const trackBillFollowed = (billId: string): void => {
  capture("bill_followed", { bill_id: billId });
};

export const trackBillUnfollowed = (billId: string): void => {
  capture("bill_unfollowed", { bill_id: billId });
};

export const trackPreferencesSaved = (
  props?: Record<string, unknown>,
): void => {
  capture("preferences_saved", props ?? {});
};

export const trackAccountDeleted = (): void => {
  capture("account_deleted", {});
};

/**
 * Identify a signed-in user so events stitch into a single PostHog person profile.
 * Call from the auth flow once a session is established. Distinct ID should be
 * stable per user (e.g. Supabase user id), not the email.
 */
export const identifyUser = (
  distinctId: string,
  traits?: Record<string, unknown>,
): void => {
  if (typeof window === "undefined" || !posthog.__loaded) return;
  posthog.identify(distinctId, traits);
};

/** Clear identity on sign-out so subsequent events go to an anonymous profile. */
export const resetIdentity = (): void => {
  if (typeof window === "undefined" || !posthog.__loaded) return;
  posthog.reset();
};
