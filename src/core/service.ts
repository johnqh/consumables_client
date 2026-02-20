import type {
  ConsumablePurchaseParams,
  ConsumablesAdapter,
  CreditBalance,
  CreditOffering,
  CreditPurchaseRecord,
  CreditUsageRecord,
} from "../types";
import type { ConsumablesApiClient } from "../network/ConsumablesApiClient";

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
  private isLoadingBalance = false;

  constructor(config: ConsumablesServiceConfig) {
    this.adapter = config.adapter;
    this.apiClient = config.apiClient;
  }

  /** Load offerings from RevenueCat (with caching). */
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

  /** Get a specific offering by ID. */
  getOffering(offeringId: string): CreditOffering | null {
    return this.offeringsCache.get(offeringId) ?? null;
  }

  /** Get all offering IDs. */
  getOfferingIds(): string[] {
    return Array.from(this.offeringsCache.keys());
  }

  /** Load balance from API. */
  async loadBalance(): Promise<CreditBalance> {
    if (this.isLoadingBalance && this.balanceCache) {
      return this.balanceCache;
    }
    this.isLoadingBalance = true;
    try {
      this.balanceCache = await this.apiClient.getBalance();
      return this.balanceCache;
    } finally {
      this.isLoadingBalance = false;
    }
  }

  /** Get cached balance (null if not loaded). */
  getCachedBalance(): CreditBalance | null {
    return this.balanceCache;
  }

  /** Execute purchase: adapter.purchase() then apiClient.recordPurchase(). */
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

  /** Record a usage (download). */
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

  /** Get purchase history from API. */
  async getPurchaseHistory(
    limit?: number,
    offset?: number,
  ): Promise<CreditPurchaseRecord[]> {
    return this.apiClient.getPurchaseHistory(limit, offset);
  }

  /** Get usage history from API. */
  async getUsageHistory(
    limit?: number,
    offset?: number,
  ): Promise<CreditUsageRecord[]> {
    return this.apiClient.getUsageHistory(limit, offset);
  }

  /** Clear cached data (on user change). */
  clearCache(): void {
    this.balanceCache = null;
    // Preserve offerings cache — products don't change per user
  }

  hasLoadedOfferings(): boolean {
    return this.offeringsCache.size > 0;
  }

  hasLoadedBalance(): boolean {
    return this.balanceCache !== null;
  }
}
