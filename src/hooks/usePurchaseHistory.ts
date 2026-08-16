/**
 * @fileoverview React hook for loading paginated purchase history.
 * Supports initial load, load-more pagination, and automatic refresh on user change.
 */

import { useCallback, useEffect, useState } from "react";
import {
  getConsumablesInstance,
  getConsumablesUserId,
  isConsumablesInitialized,
  onConsumablesUserIdChange,
} from "../core/singleton";
import type { ConsumablePurchaseRecord } from "@sudobility/types";

/** Result object returned by the usePurchaseHistory hook. */
export interface UsePurchaseHistoryResult {
  purchases: ConsumablePurchaseRecord[];
  isLoading: boolean;
  error: Error | null;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * Hook that loads paginated purchase history for the current user.
 * Automatically reloads when the user ID changes.
 * @param limit - Maximum number of records per page. Defaults to 50.
 * @returns Purchase records, loading/error state, loadMore and refetch functions.
 */
export function usePurchaseHistory(limit = 50): UsePurchaseHistoryResult {
  const [purchases, setPurchases] = useState<ConsumablePurchaseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!isConsumablesInitialized() || !getConsumablesUserId()) {
      setPurchases([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const instance = getConsumablesInstance();
      const result = await instance.getPurchaseHistory(limit, 0);
      setPurchases(result);
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
      const result = await instance.getPurchaseHistory(limit, purchases.length);
      setPurchases((prev) => [...prev, ...result]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [limit, purchases.length]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const unsub = onConsumablesUserIdChange(() => load());
    return unsub;
  }, [load]);

  return { purchases, isLoading, error, loadMore, refetch: load };
}
