import { useState, useEffect } from 'react';
import { apiClient, Service, ServiceCreationJob, handleAPIError } from '@/lib/api';
import toast from 'react-hot-toast';

interface CreateServiceParams {
  name: string;
  template: string;
  environment?: string;
  resources?: {
    cpu?: number;
    memory?: number;
  };
}

export function useServiceCreation() {
  const [isCreating, setIsCreating] = useState(false);
  const [progress, setProgress] = useState<ServiceCreationJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createService = async (params: CreateServiceParams): Promise<Service | null> => {
    try {
      setIsCreating(true);
      setError(null);
      setProgress(null);

      const result = await apiClient.createService(params);
      
      // Start tracking progress
      const cleanup = apiClient.subscribeToServiceProgress(result.service.id, (job) => {
        setProgress(job);
        
        if (job.status === 'completed') {
          toast.success(`Service "${params.name}" created successfully!`);
          setIsCreating(false);
          // Don't cleanup immediately - let the component handle cleanup
        } else if (job.status === 'failed') {
          toast.error(`Failed to create service "${params.name}"`);
          setIsCreating(false);
          cleanup();
        }
      });

      return result.service;
    } catch (err) {
      const errorMessage = handleAPIError(err);
      setError(errorMessage);
      toast.error(errorMessage);
      setIsCreating(false);
      return null;
    }
  };

  const resetState = () => {
    setIsCreating(false);
    setProgress(null);
    setError(null);
  };

  return {
    createService,
    isCreating,
    progress,
    error,
    resetState,
  };
}

export function useServiceProgress(serviceId: string) {
  const [progress, setProgress] = useState<ServiceCreationJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!serviceId) return;

    const fetchProgress = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.getServiceProgress(serviceId);
        setProgress(data);
      } catch (err) {
        setError(handleAPIError(err));
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();

    // Subscribe to real-time updates
    const cleanup = apiClient.subscribeToServiceProgress(serviceId, (job) => {
      setProgress(job);
      setLoading(false);
    });

    return cleanup;
  }, [serviceId]);

  return {
    progress,
    loading,
    error,
  };
}