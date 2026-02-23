import type {
  ConsumablePurchaseRecord,
  ConsumableUsageRecord,
  NetworkClient,
} from "@sudobility/types";
import type { CreditBalance } from "../types";

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

  async recordUsage(
    filename?: string,
  ): Promise<{ balance: number; success: boolean }> {
    return this.post<{ balance: number; success: boolean }>("/use", {
      filename,
    });
  }

  async getPurchaseHistory(
    limit = 50,
    offset = 0,
  ): Promise<ConsumablePurchaseRecord[]> {
    return this.get<ConsumablePurchaseRecord[]>(
      `/purchases?limit=${limit}&offset=${offset}`,
    );
  }

  async getUsageHistory(
    limit = 50,
    offset = 0,
  ): Promise<ConsumableUsageRecord[]> {
    return this.get<ConsumableUsageRecord[]>(
      `/usages?limit=${limit}&offset=${offset}`,
    );
  }
}
