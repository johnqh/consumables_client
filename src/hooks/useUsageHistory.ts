import { useState, useEffect, useCallback } from "react";
import {
  getConsumablesInstance,
  isConsumablesInitialized,
  getConsumablesUserId,
  onConsumablesUserIdChange,
} from "../core/singleton";
import type { CreditUsageRecord } from "../types";

export interface UseUsageHistoryResult {
  usages: CreditUsageRecord[];
  isLoading: boolean;
  error: Error | null;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useUsageHistory(limit = 50): UseUsageHistoryResult {
  const [usages, setUsages] = useState<CreditUsageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!isConsumablesInitialized() || !getConsumablesUserId()) {
      setUsages([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const instance = getConsumablesInstance();
      const result = await instance.getUsageHistory(limit, 0);
      setUsages(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  const loadMore = useCallback(async () => {
    if (!isConsumablesInitialized()) return;
    try {
      const instance = getConsumablesInstance();
      const result = await instance.getUsageHistory(limit, usages.length);
      setUsages((prev) => [...prev, ...result]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [limit, usages.length]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const unsub = onConsumablesUserIdChange(() => load());
    return unsub;
  }, [load]);

  return { usages, isLoading, error, loadMore, refetch: load };
}
