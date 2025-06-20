import { useState, useEffect } from 'react';
import { apiClient, PlatformHealth, handleAPIError } from '@/lib/api';

export function useHealth() {
  const [health, setHealth] = useState<PlatformHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getPlatformHealth();
      setHealth(data);
    } catch (err) {
      setError(handleAPIError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    
    // Set up periodic refresh for health data
    const interval = setInterval(fetchHealth, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const refreshHealth = () => {
    fetchHealth();
  };

  return {
    health,
    loading,
    error,
    refreshHealth,
  };
}