import { useState, useEffect, useCallback } from "react";
import {
  getConsumablesInstance,
  isConsumablesInitialized,
} from "../core/singleton";
import type { CreditPackage } from "../types";

export interface UseConsumableProductsResult {
  packages: CreditPackage[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useConsumableProducts(
  offeringId: string,
): UseConsumableProductsResult {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadProducts = useCallback(async () => {
    if (!isConsumablesInitialized()) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const instance = getConsumablesInstance();
      await instance.loadOfferings();
      const offering = instance.getOffering(offeringId);
      setPackages(offering?.packages ?? []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [offeringId]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  return { packages, isLoading, error, refetch: loadProducts };
}
