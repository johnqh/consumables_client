/**
 * @fileoverview React hook for executing credit purchases via the RevenueCat adapter.
 * Handles the full purchase flow: adapter payment UI -> backend recording -> balance notification.
 */

import { useCallback, useState } from "react";
import {
  getConsumablesInstance,
  isConsumablesInitialized,
  notifyBalanceChange,
} from "../core/singleton";

/** Result object returned by the usePurchaseCredits hook. */
export interface UsePurchaseCreditsResult {
  purchase: (packageId: string, offeringId: string) => Promise<boolean>;
  isPurchasing: boolean;
  error: Error | null;
}

/**
 * Hook that provides a purchase callback for buying credit packages.
 * Opens the platform payment UI, records the purchase on the backend,
 * and notifies balance change listeners on success.
 * @returns A purchase function, purchasing state, and error state.
 */
export function usePurchaseCredits(): UsePurchaseCreditsResult {
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const purchase = useCallback(
    async (packageId: string, offeringId: string): Promise<boolean> => {
      if (!isConsumablesInitialized()) {
        setError(new Error("Consumables not initialized"));
        return false;
      }

      setIsPurchasing(true);
      setError(null);
      try {
        const instance = getConsumablesInstance();
        await instance.purchase({ packageId, offeringId });
        notifyBalanceChange();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        return false;
      } finally {
        setIsPurchasing(false);
      }
    },
    [],
  );

  return { purchase, isPurchasing, error };
}
