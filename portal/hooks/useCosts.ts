import { useState, useEffect } from 'react';
import { apiClient, CostData, handleAPIError } from '@/lib/api';

export function useCosts() {
  const [costs, setCosts] = useState<CostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCosts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getCosts();
      setCosts(data);
    } catch (err) {
      setError(handleAPIError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCosts();
  }, []);

  const refreshCosts = () => {
    fetchCosts();
  };

  return {
    costs,
    loading,
    error,
    refreshCosts,
  };
}