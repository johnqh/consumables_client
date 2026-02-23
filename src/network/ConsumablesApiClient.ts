/**
 * @fileoverview HTTP client for the consumables API endpoints.
 * Wraps a NetworkClient to communicate with /api/v1/consumables/* endpoints,
 * mapping between snake_case API responses and camelCase client types.
 */

import type {
  ConsumablePurchaseRecord,
  ConsumableUsageRecord,
  NetworkClient,
} from "@sudobility/types";
import type { CreditBalance } from "../types";

/** Configuration for constructing a ConsumablesApiClient instance. */
export interface ConsumablesApiClientConfig {
  baseUrl: string;
  networkClient: NetworkClient;
}

interface ApiResponse<T> {
  data: T;
  error?: string;
}

export class ConsumablesApiClient {
  private readonly baseUrl: string;
  private readonly networkClient: NetworkClient;

  constructor(config: ConsumablesApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.networkClient = config.networkClient;
  }

  private buildUrl(path: string): string {
    return `${this.baseUrl}/api/v1/consumables${path}`;
  }

  private async get<T>(path: string): Promise<T> {
    const response = await this.networkClient.get<ApiResponse<T>>(
      this.buildUrl(path),
    );
    if (!response.ok || !response.data) {
      throw new Error(
        response.data?.error || `Request failed: ${response.status}`,
      );
    }
    return response.data.data;
  }

  private async post<T>(path: string, body?: unknown): Promise<T> {
    const response = await this.networkClient.post<ApiResponse<T>>(
      this.buildUrl(path),
      body,
    );
    if (!response.ok || !response.data) {
      throw new Error(
        response.data?.error || `Request failed: ${response.status}`,
      );
    }
    return response.data.data;
  }

  /**
   * Fetches the current user's credit balance from the API.
   * @returns The credit balance with current balance and initial credits.
   */
  async getBalance(): Promise<CreditBalance> {
    const data = await this.get<{
      balance: number;
      initial_credits: number;
    }>("/balance");
    return {
      balance: data.balance,
      initialCredits: data.initial_credits,
    };
  }

  /**
   * Records a purchase on the backend and returns the updated balance.
   * @param params - Purchase details including credits, source, and optional transaction metadata.
   * @returns The updated credit balance after the purchase.
   */
  async recordPurchase(params: {
    credits: number;
    source: string;
    transaction_ref_id?: string;
    product_id?: string;
    price_cents?: number;
    currency?: string;
  }): Promise<CreditBalance> {
    const data = await this.post<{
      balance: number;
      initial_credits: number;
    }>("/purchase", params);
    return {
      balance: data.balance,
      initialCredits: data.initial_credits,
    };
  }

  /**
   * Records a credit usage (download) on the backend.
   * @param filename - Optional filename associated with this usage.
   * @returns The updated balance and whether the usage was successful.
   */
  async recordUsage(
    filename?: string,
  ): Promise<{ balance: number; success: boolean }> {
    return this.post<{ balance: number; success: boolean }>("/use", {
      filename,
    });
  }

  /**
   * Fetches paginated purchase history for the current user.
   * @param limit - Maximum number of records to return. Defaults to 50.
   * @param offset - Number of records to skip. Defaults to 0.
   * @returns Array of purchase records ordered by most recent first.
   */
  async getPurchaseHistory(
    limit = 50,
    offset = 0,
  ): Promise<ConsumablePurchaseRecord[]> {
    return this.get<ConsumablePurchaseRecord[]>(
      `/purchases?limit=${limit}&offset=${offset}`,
    );
  }

  /**
   * Fetches paginated usage history for the current user.
   * @param limit - Maximum number of records to return. Defaults to 50.
   * @param offset - Number of records to skip. Defaults to 0.
   * @returns Array of usage records ordered by most recent first.
   */
  async getUsageHistory(
    limit = 50,
    offset = 0,
  ): Promise<ConsumableUsageRecord[]> {
    return this.get<ConsumableUsageRecord[]>(
      `/usages?limit=${limit}&offset=${offset}`,
    );
  }
}
