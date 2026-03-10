import { useEffect, useState, useCallback } from 'react';

export interface EventBillLink {
  eventId: string;
  billNumber: string;
  relationshipType: 'mentioned' | 'action' | 'topic' | 'committee' | 'sponsor';
  confidence: number;
  evidence: string[];
  lastUpdated: string;
}

export interface EventBillLinksStats {
  totalLinks: number;
  actionLinks: number;
  mentionLinks: number;
  relationshipLinks: number;
  eventsProcessed: number;
  billsProcessed: number;
}

export function useEventBillLinks() {
  const [links, setLinks] = useState<EventBillLink[]>([]);
  const [stats, setStats] = useState<EventBillLinksStats | null>(null);
  const [updated, setUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch('/api/link-events-bills')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch event-bill links');
        return res.json();
      })
      .then(data => {
        setLinks(data.links || []);
        setStats(data.stats || null);
        setUpdated(data.updated || null);
        setError(null);
      })
      .catch(err => {
        setError(err.message || 'Unknown error');
        setLinks([]);
        setStats(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const generateLinks = useCallback(() => {
    setLoading(true);
    fetch('/api/link-events-bills', { method: 'POST' })
      .then(res => {
        if (!res.ok) throw new Error('Failed to generate event-bill links');
        return res.json();
      })
      .then(data => {
        if (data.success) {
          setLinks(data.links || []);
          setStats(data.stats || null);
          setUpdated(new Date().toISOString());
          setError(null);
        } else {
          throw new Error(data.error || 'Failed to generate links');
        }
      })
      .catch(err => {
        setError(err.message || 'Unknown error');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Helper functions
  const getLinksForEvent = useCallback((eventId: string) => {
    return links.filter(link => link.eventId === eventId);
  }, [links]);

  const getLinksForBill = useCallback((billNumber: string) => {
    return links.filter(link => link.billNumber === billNumber);
  }, [links]);

  const getHighConfidenceLinks = useCallback((minConfidence = 70) => {
    return links.filter(link => link.confidence >= minConfidence);
  }, [links]);

  const getLinksByType = useCallback((type: EventBillLink['relationshipType']) => {
    return links.filter(link => link.relationshipType === type);
  }, [links]);

  return { 
    links, 
    stats,
    updated, 
    loading, 
    error, 
    refresh: fetchData,
    generateLinks,
    getLinksForEvent,
    getLinksForBill,
    getHighConfidenceLinks,
    getLinksByType
  };
} 