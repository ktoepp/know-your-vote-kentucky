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
  props?: { method?: "email"; needs_verification?: boolean; email_verified?: boolean },
): void => {
  capture("user_registered", { method: "email", ...props });
};

export const trackUserLoggedIn = (
  props?: { method?: "email"; email_verified?: boolean },
): void => {
  capture("user_logged_in", { method: "email", ...props });
};

export const trackBillFollowed = (billId: string): void => {
  capture("bill_followed", { bill_id: billId });
};

export const trackBillUnfollowed = (billId: string): void => {
  capture("bill_unfollowed", { bill_id: billId });
};

export const trackCommitteeFollowed = (committeeId: string): void => {
  capture("committee_followed", { committee_id: committeeId });
};

export const trackCommitteeUnfollowed = (committeeId: string): void => {
  capture("committee_unfollowed", { committee_id: committeeId });
};

export const trackTopicFilterUsed = (
  topic: string,
  props?: { source?: "bills_browse" | "home" | "search" },
): void => {
  capture("topic_filter_used", { topic, source: props?.source ?? "bills_browse" });
};

/**
 * ZIP → district lookup on `/members/map`. Districts kept for cohort analysis
 * (which districts are most-searched), zip kept coarse (5-digit) — do NOT log
 * PII beyond that.
 */
export const trackDistrictMapLookup = (props: {
  zip: string;
  houseDistrict?: number | null;
  senateDistrict?: number | null;
}): void => {
  capture("district_map_lookup", {
    zip: props.zip,
    house_district: props.houseDistrict ?? null,
    senate_district: props.senateDistrict ?? null,
  });
};

/**
 * Fired when a user picks a result from the global search box, /search page,
 * or (future) ⌘K command palette. `rank` is 0-indexed position within its list;
 * `source` tells dashboards which surface produced the click.
 */
export const trackSearchResultClicked = (props: {
  query: string;
  resultType: "bill" | "member" | "committee" | "meeting";
  resultId: string;
  rank: number;
  source: "nav_bar" | "search_page" | "command_palette";
}): void => {
  capture("search_result_clicked", {
    search_term: props.query,
    result_type: props.resultType,
    result_id: props.resultId,
    rank: props.rank,
    source: props.source,
  });
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

type PostHogUserLike = {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, unknown>;
};

function postHogPersonTraits(user: PostHogUserLike): Record<string, unknown> {
  const traits: Record<string, unknown> = {
    account_type: "registered",
    email_verified: Boolean(user.email_confirmed_at),
  };
  if (user.email) traits.email = user.email;
  const name = user.user_metadata?.full_name;
  if (typeof name === "string" && name) traits.name = name;
  return traits;
}

/** Tag the current anonymous visitor so People can be filtered from registered users. */
export const markAnonymousPerson = (): void => {
  if (typeof window === "undefined" || !posthog.__loaded) return;
  posthog.setPersonProperties({ account_type: "anonymous", email_verified: false });
};

/**
 * Keep PostHog person profiles in sync with the Supabase session.
 * Pass signedOut: true only on SIGNED_OUT so we rotate to a fresh anonymous profile.
 */
export const syncPostHogUser = (
  user: PostHogUserLike | null | undefined,
  options?: { signedOut?: boolean },
): void => {
  if (!user?.id) {
    if (options?.signedOut) {
      resetIdentity();
    } else {
      markAnonymousPerson();
    }
    return;
  }
  identifyUser(user.id, postHogPersonTraits(user));
};

/** Clear identity on sign-out so subsequent events go to an anonymous profile. */
export const resetIdentity = (): void => {
  if (typeof window === "undefined" || !posthog.__loaded) return;
  posthog.reset();
  markAnonymousPerson();
};
