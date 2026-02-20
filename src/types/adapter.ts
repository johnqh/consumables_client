import type { CreditPackage } from "./index";

/** Platform-specific purchase result */
export interface ConsumablePurchaseResult {
  transactionId: string;
  productId: string;
  credits: number;
  priceCents: number;
  currency: string;
  source: "web" | "apple" | "google";
}

/** Purchase parameters */
export interface ConsumablePurchaseParams {
  packageId: string;
  offeringId: string;
}

/**
 * Adapter interface for platform-specific purchase flows.
 */
export interface ConsumablesAdapter {
  /** Get offerings (credit packages) from RevenueCat */
  getOfferings(): Promise<{
    all: Record<
      string,
      {
        identifier: string;
        metadata: Record<string, unknown> | null;
        packages: CreditPackage[];
      }
    >;
  }>;

  /** Execute a purchase via RevenueCat (opens payment UI) */
  purchase(params: ConsumablePurchaseParams): Promise<ConsumablePurchaseResult>;

  /** Set the current user (called on auth state change) */
  setUserId?(userId: string | undefined, email?: string): Promise<void>;
}
