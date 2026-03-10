import { useEffect, useState, useCallback } from 'react';

export interface Bill {
  // Define the most important fields for your UI
  id?: string;
  number: string;
  title: string;
  sponsor?: any;
  cosponsors?: any[];
  committees?: string[];
  last_action?: string;
  introduced_date?: string;
  actions?: any[];
  [key: string]: any;
}

export function useBillsData() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [updated, setUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch('/api/bills')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch bill data');
        return res.json();
      })
      .then(data => {
        setBills(data.bills || []);
        setUpdated(data.updated || null);
        setError(null);
      })
      .catch(err => {
        setError(err.message || 'Unknown error');
        setBills([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { bills, updated, loading, error, refresh: fetchData };
} 