/**
 * @fileoverview Core ConsumablesService class that orchestrates adapter and API client
 * interactions. Manages caching of offerings (global) and balance (per-user).
 */

import type {
  ConsumablePurchaseRecord,
  ConsumableUsageRecord,
} from "@sudobility/types";
import type {
  ConsumablePurchaseParams,
  ConsumablesAdapter,
  CreditBalance,
  CreditOffering,
} from "../types";
import type { ConsumablesApiClient } from "../network/ConsumablesApiClient";

/** Configuration for constructing a ConsumablesService instance. */
export interface ConsumablesServiceConfig {
  adapter: ConsumablesAdapter;
  apiClient: ConsumablesApiClient;
}

export class ConsumablesService {
  private adapter: ConsumablesAdapter;
  private apiClient: ConsumablesApiClient;
  private balanceCache: CreditBalance | null = null;
  private offeringsCache: Map<string, CreditOffering> = new Map();
  private loadOfferingsPromise: Promise<void> | null = null;
  private loadBalancePromise: Promise<CreditBalance> | null = null;

  constructor(config: ConsumablesServiceConfig) {
    this.adapter = config.adapter;
    this.apiClient = config.apiClient;
  }

  /**
   * Loads offerings from RevenueCat via the adapter.
   * Caches results globally; subsequent calls are no-ops if cache is populated.
   * Deduplicates concurrent calls via a shared promise.
   */
  async loadOfferings(): Promise<void> {
    if (this.offeringsCache.size > 0) return;
    if (this.loadOfferingsPromise) return this.loadOfferingsPromise;

    this.loadOfferingsPromise = (async () => {
      try {
        const result = await this.adapter.getOfferings();
        for (const [key, offering] of Object.entries(result.all)) {
          this.offeringsCache.set(key, {
            offeringId: offering.identifier,
            packages: offering.packages,
          });
        }
      } finally {
        this.loadOfferingsPromise = null;
      }
    })();

    return this.loadOfferingsPromise;
  }

  /**
   * Retrieves a cached offering by its identifier.
   * @param offeringId - The RevenueCat offering identifier.
   * @returns The offering with its packages, or null if not found in cache.
   */
  getOffering(offeringId: string): CreditOffering | null {
    return this.offeringsCache.get(offeringId) ?? null;
  }

  /**
   * Returns all cached offering identifiers.
   * @returns Array of offering ID strings.
   */
  getOfferingIds(): string[] {
    return Array.from(this.offeringsCache.keys());
  }

  /**
   * Loads the current user's balance from the backend API.
   * Caches the result; returns cached value if a load is already in progress.
   * @returns The user's credit balance.
   */
  async loadBalance(): Promise<CreditBalance> {
    if (this.balanceCache) return this.balanceCache;
    if (this.loadBalancePromise) return this.loadBalancePromise;

    this.loadBalancePromise = (async () => {
      try {
        this.balanceCache = await this.apiClient.getBalance();
        return this.balanceCache;
      } finally {
        this.loadBalancePromise = null;
      }
    })();

    return this.loadBalancePromise;
  }

  /**
   * Returns the cached balance without making an API call.
   * @returns The cached credit balance, or null if not yet loaded.
   */
  getCachedBalance(): CreditBalance | null {
    return this.balanceCache;
  }

  /**
   * Executes a full purchase flow: opens RevenueCat payment UI via adapter,
   * records the purchase on the backend, and updates the local balance cache.
   * @param params - The package and offering IDs to purchase.
   * @returns The updated credit balance after the purchase.
   */
  async purchase(params: ConsumablePurchaseParams): Promise<CreditBalance> {
    // 1. Call adapter.purchase() — opens RevenueCat payment UI
    const purchaseResult = await this.adapter.purchase(params);

    // 2. Record on backend
    const balance = await this.apiClient.recordPurchase({
      credits: purchaseResult.credits,
      source: purchaseResult.source,
      transaction_ref_id: purchaseResult.transactionId,
      product_id: purchaseResult.productId,
      price_cents: purchaseResult.priceCents,
      currency: purchaseResult.currency,
    });

    // 3. Update cache
    this.balanceCache = balance;

    return balance;
  }

  /**
   * Records a credit usage (e.g., file download) on the backend.
   * Updates the local balance cache with the new balance.
   * @param filename - Optional filename associated with this usage.
   * @returns The updated balance and whether the usage was successful.
   */
  async recordUsage(
    filename?: string,
  ): Promise<{ balance: number; success: boolean }> {
    const result = await this.apiClient.recordUsage(filename);

    // Update cache
    if (this.balanceCache) {
      this.balanceCache = {
        ...this.balanceCache,
        balance: result.balance,
      };
    }

    return result;
  }

  /**
   * Fetches paginated purchase history from the API.
   * @param limit - Maximum number of records to return.
   * @param offset - Number of records to skip.
   * @returns Array of purchase records.
   */
  async getPurchaseHistory(
    limit?: number,
    offset?: number,
  ): Promise<ConsumablePurchaseRecord[]> {
    return this.apiClient.getPurchaseHistory(limit, offset);
  }

  /**
   * Fetches paginated usage history from the API.
   * @param limit - Maximum number of records to return.
   * @param offset - Number of records to skip.
   * @returns Array of usage records.
   */
  async getUsageHistory(
    limit?: number,
    offset?: number,
  ): Promise<ConsumableUsageRecord[]> {
    return this.apiClient.getUsageHistory(limit, offset);
  }

  /**
   * Clears the balance cache. Called on user change.
   * Preserves the offerings cache since products are not user-specific.
   */
  clearCache(): void {
    this.balanceCache = null;
    // Preserve offerings cache — products don't change per user
  }

  /** @returns Whether offerings have been loaded and cached. */
  hasLoadedOfferings(): boolean {
    return this.offeringsCache.size > 0;
  }

  /** @returns Whether the balance has been loaded and cached. */
  hasLoadedBalance(): boolean {
    return this.balanceCache !== null;
  }
}
