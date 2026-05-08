import { useState, useEffect, useCallback } from 'react';
import { getContacts, getMessages, getSettings, getTemplates } from '../api/customerApi';

function useApi<T>(fetcher: () => Promise<T>, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetcher();
      setData(res);
    } catch (e) {
      console.error('Customer API error', e);
    }
    setLoading(false);
  }, deps);

  useEffect(() => { refresh(); }, [refresh]);
  return { data, loading, refresh };
}

export const useCustomers = () => useApi(() => getContacts());
export const useMessages = (params?: { status?: string; msg_type?: string; from_date?: string; to_date?: string }) =>
  useApi(() => getMessages(params || {}), [JSON.stringify(params)]);
export const useSettings = () => useApi(() => getSettings());
export const useTemplates = () => useApi(() => getTemplates());

