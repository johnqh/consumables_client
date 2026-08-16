/**
 * @fileoverview React hook for loading paginated usage history.
 * Supports initial load, load-more pagination, and automatic refresh on user change.
 */

import { useCallback, useEffect, useState } from "react";
import {
  getConsumablesInstance,
  getConsumablesUserId,
  isConsumablesInitialized,
  onConsumablesUserIdChange,
} from "../core/singleton";
import type { ConsumableUsageRecord } from "@sudobility/types";

/** Result object returned by the useUsageHistory hook. */
export interface UseUsageHistoryResult {
  usages: ConsumableUsageRecord[];
  isLoading: boolean;
  error: Error | null;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * Hook that loads paginated usage history for the current user.
 * Automatically reloads when the user ID changes.
 * @param limit - Maximum number of records per page. Defaults to 50.
 * @returns Usage records, loading/error state, loadMore and refetch functions.
 */
export function useUsageHistory(limit = 50): UseUsageHistoryResult {
  const [usages, setUsages] = useState<ConsumableUsageRecord[]>([]);
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
