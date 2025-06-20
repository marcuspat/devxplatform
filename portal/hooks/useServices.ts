import { useState, useEffect } from 'react';
import { apiClient, Service, handleAPIError } from '@/lib/api';

export function useServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getServices();
      setServices(data);
    } catch (err) {
      setError(handleAPIError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const refreshServices = () => {
    fetchServices();
  };

  return {
    services,
    loading,
    error,
    refreshServices,
  };
}

export function useService(id: string) {
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchService = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.getService(id);
        setService(data);
      } catch (err) {
        setError(handleAPIError(err));
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchService();
    }
  }, [id]);

  return {
    service,
    loading,
    error,
  };
}