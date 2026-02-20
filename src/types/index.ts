export * from "./adapter";

// Shared types from @sudobility/types (re-exported for convenience)
export type {
  ConsumableSource,
  ConsumableBalanceResponse,
  ConsumablePurchaseRequest,
  ConsumableUseRequest,
  ConsumableUseResponse,
  ConsumablePurchaseRecord,
  ConsumableUsageRecord,
} from "@sudobility/types";

// Backward-compat aliases used throughout the client and consumers
export type {
  ConsumablePurchaseRecord as CreditPurchaseRecord,
  ConsumableUsageRecord as CreditUsageRecord,
} from "@sudobility/types";

// === Client-only types ===

/** A purchasable credit package from RevenueCat */
export interface CreditPackage {
  packageId: string;
  productId: string;
  title: string;
  description: string | null;
  credits: number;
  price: number;
  priceString: string;
  currencyCode: string;
}

/** An offering containing credit packages */
export interface CreditOffering {
  offeringId: string;
  packages: CreditPackage[];
}

/** Balance info from API (client-side camelCase mapping) */
export interface CreditBalance {
  balance: number;
  initialCredits: number;
}
