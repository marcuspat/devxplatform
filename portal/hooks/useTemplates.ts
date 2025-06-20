import { useState, useEffect } from 'react';
import { apiClient, Template, handleAPIError } from '@/lib/api';

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.getTemplates();
        setTemplates(data);
      } catch (err) {
        setError(handleAPIError(err));
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  return {
    templates,
    loading,
    error,
  };
}

export function useTemplate(id: string) {
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.getTemplate(id);
        setTemplate(data);
      } catch (err) {
        setError(handleAPIError(err));
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchTemplate();
    }
  }, [id]);

  return {
    template,
    loading,
    error,
  };
}