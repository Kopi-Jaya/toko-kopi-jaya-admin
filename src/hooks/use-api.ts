"use client";

import { useState, useEffect, useCallback } from "react";
import { api, type ApiResponse } from "@/lib/api";

interface UseApiListOptions {
  page?: number;
  limit?: number;
  params?: Record<string, string | number | undefined>;
}

export function useApiList<T>(endpoint: string, options: UseApiListOptions = {}) {
  const { page = 1, limit = 20, params = {} } = options;
  const [data, setData] = useState<T[]>([]);
  const [meta, setMeta] = useState<ApiResponse<T>["meta"]>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryString = buildQuery({ page, limit, ...params });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<T[]>(`${endpoint}?${queryString}`);
      setData(res.data);
      setMeta(res.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, [endpoint, queryString]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, meta, loading, error, refetch: fetchData };
}

export function useApiGet<T>(endpoint: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!endpoint) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<T>(endpoint);
      setData(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== ""
  );
  return new URLSearchParams(
    entries.map(([k, v]) => [k, String(v)])
  ).toString();
}
