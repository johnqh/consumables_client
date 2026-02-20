import { useState, useEffect, useCallback } from "react";
import {
  getConsumablesInstance,
  isConsumablesInitialized,
  onConsumablesBalanceChange,
  onConsumablesUserIdChange,
  getConsumablesUserId,
} from "../core/singleton";

export interface UseBalanceResult {
  balance: number | null;
  initialCredits: number | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useBalance(): UseBalanceResult {
  const [balance, setBalance] = useState<number | null>(null);
  const [initialCredits, setInitialCredits] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadBalance = useCallback(async () => {
    if (!isConsumablesInitialized() || !getConsumablesUserId()) {
      setBalance(null);
      setInitialCredits(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const instance = getConsumablesInstance();
      const result = await instance.loadBalance();
      setBalance(result.balance);
      setInitialCredits(result.initialCredits);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  useEffect(() => {
    const unsubBalance = onConsumablesBalanceChange(() => {
      if (isConsumablesInitialized()) {
        const cached = getConsumablesInstance().getCachedBalance();
        if (cached) {
          setBalance(cached.balance);
          setInitialCredits(cached.initialCredits);
        }
      }
    });
    const unsubUser = onConsumablesUserIdChange(() => {
      loadBalance();
    });
    return () => {
      unsubBalance();
      unsubUser();
    };
  }, [loadBalance]);

  return { balance, initialCredits, isLoading, error, refetch: loadBalance };
}
