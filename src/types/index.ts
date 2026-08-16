/**
 * @fileoverview Client-only type definitions for the consumables credit system.
 * Defines CreditPackage, CreditOffering, and CreditBalance interfaces used
 * by hooks and the ConsumablesService.
 */

export * from "./adapter";

// === Client-only types ===

/** Typed metadata from RevenueCat product. */
export interface ProductMetadata {
  credits?: number;
  [key: string]: unknown;
}

/** A purchasable credit package from RevenueCat. */
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
