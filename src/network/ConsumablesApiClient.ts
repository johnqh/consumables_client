import type {
  ConsumablePurchaseRecord,
  ConsumableUsageRecord,
} from "@sudobility/types";
import type { CreditBalance } from "../types";

export interface ConsumablesApiClientConfig {
  baseUrl: string;
  getToken?: () => Promise<string | null>;
}

export class ConsumablesApiClient {
  private baseUrl: string;
  private getToken: (() => Promise<string | null>) | undefined;

  constructor(config: ConsumablesApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.getToken = config.getToken;
  }

  private async headers(): Promise<Record<string, string>> {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (this.getToken) {
      const token = await this.getToken();
      if (token) h["Authorization"] = `Bearer ${token}`;
    }
    return h;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}/api/v1/consumables${path}`;
    const headers = await this.headers();
    const res = await fetch(url, { ...options, headers });
    const json = (await res.json()) as any;
    if (!res.ok) {
      throw new Error(json.error || `Request failed: ${res.status}`);
    }
    return json.data as T;
  }

  async getBalance(): Promise<CreditBalance> {
    const data = await this.request<{
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
    const data = await this.request<{
      balance: number;
      initial_credits: number;
    }>("/purchase", {
      method: "POST",
      body: JSON.stringify(params),
    });
    return {
      balance: data.balance,
      initialCredits: data.initial_credits,
    };
  }

  async recordUsage(
    filename?: string,
  ): Promise<{ balance: number; success: boolean }> {
    return this.request<{ balance: number; success: boolean }>("/use", {
      method: "POST",
      body: JSON.stringify({ filename }),
    });
  }

  async getPurchaseHistory(
    limit = 50,
    offset = 0,
  ): Promise<ConsumablePurchaseRecord[]> {
    return this.request<ConsumablePurchaseRecord[]>(
      `/purchases?limit=${limit}&offset=${offset}`,
    );
  }

  async getUsageHistory(
    limit = 50,
    offset = 0,
  ): Promise<ConsumableUsageRecord[]> {
    return this.request<ConsumableUsageRecord[]>(
      `/usages?limit=${limit}&offset=${offset}`,
    );
  }
}
