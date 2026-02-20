import { useCallback, useState } from "react";
import {
  getConsumablesInstance,
  isConsumablesInitialized,
  notifyBalanceChange,
} from "../core/singleton";

export interface UsePurchaseCreditsResult {
  purchase: (packageId: string, offeringId: string) => Promise<boolean>;
  isPurchasing: boolean;
  error: Error | null;
}

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
