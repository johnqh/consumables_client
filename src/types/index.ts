export * from "./adapter";

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

/** Balance info from API */
export interface CreditBalance {
  balance: number;
  initialCredits: number;
}

/** Purchase record from API */
export interface CreditPurchaseRecord {
  id: number;
  credits: number;
  source: string;
  transaction_ref_id: string | null;
  product_id: string | null;
  price_cents: number | null;
  currency: string | null;
  created_at: string;
}

/** Usage record from API */
export interface CreditUsageRecord {
  id: number;
  filename: string | null;
  created_at: string;
}
