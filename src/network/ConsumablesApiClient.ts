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
  /** Entity currently selected in the host app. */
  getEntityId?: () => string | null | undefined;
  /** APIs may identify the entity in a query parameter or an auth header. */
  entityQueryParam?: string;
  /** Optional auth provider for app compositions whose NetworkClient is otherwise unauthenticated. */
  getAuthToken?: () => Promise<string | null>;
  /** Optional entity header for APIs that identify the selected entity in a header. */
  entityHeaderName?: string;
  /** Public catalog path differs between API deployments. */
  creditProductsPath?: string;
  /** Optional endpoint to pin the current user purchase to the selected entity. */
  purchaseTargetPath?: string;
}

export interface CreditCouponHistoryItem {
  entityId?: string | null;
  userId?: string | null;
  credits: number;
  redeemedAt: string;
}

export interface CreditCoupon {
  id?: string;
  code: string;
  credits: number;
  expiresAt: string;
  email?: string | null;
  createdAt: string;
  history: CreditCouponHistoryItem[];
}

interface ApiResponse<T> {
  data: T;
  error?: string;
}

export class ConsumablesApiClient {
  private readonly baseUrl: string;
  private readonly networkClient: NetworkClient;
  private readonly getEntityId: (() => string | null | undefined) | undefined;
  private readonly entityQueryParam: string | undefined;
  private readonly getAuthToken: (() => Promise<string | null>) | undefined;
  private readonly entityHeaderName: string | undefined;
  private readonly creditProductsPath: string;
  private readonly purchaseTargetPath: string | undefined;

  constructor(config: ConsumablesApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.networkClient = config.networkClient;
    this.getEntityId = config.getEntityId;
    this.entityQueryParam = config.entityQueryParam;
    this.getAuthToken = config.getAuthToken;
    this.entityHeaderName = config.entityHeaderName;
    this.creditProductsPath =
      config.creditProductsPath ?? "/api/v1/public/consumables/offerings";
    this.purchaseTargetPath = config.purchaseTargetPath;
  }

  private async requestOptions() {
    const token = await this.getAuthToken?.();
    const entityId = this.getEntityId?.();
    return {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(entityId && this.entityHeaderName
          ? { [this.entityHeaderName]: entityId }
          : {}),
      },
    };
  }

  private buildUrl(path: string): string {
    const entityId = this.getEntityId?.();
    const url = new URL(`${this.baseUrl}/api/v1/consumables${path}`);
    if (entityId && this.entityQueryParam)
      url.searchParams.set(this.entityQueryParam, entityId);
    return url.toString();
  }

  /** The current entity scope used by balance caching and purchase targeting. */
  getSelectedEntityId(): string | null {
    return this.getEntityId?.() ?? null;
  }

  private async get<T>(path: string): Promise<T> {
    const response = await this.networkClient.get<ApiResponse<T>>(
      this.buildUrl(path),
      await this.requestOptions(),
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
      await this.requestOptions(),
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
      initial_credits?: number;
      initialCredits?: number;
    }>("/balance");
    return {
      balance: data.balance,
      initialCredits: data.initialCredits ?? data.initial_credits ?? 0,
    };
  }

  /** Fetches the server-approved RevenueCat product/credit mapping. */
  async getCreditProducts(): Promise<
    Array<{ productId: string; credits: number }>
  > {
    const response = await this.networkClient.get<
      ApiResponse<{
        products: Array<{ productId: string; credits: number }>;
      }>
    >(`${this.baseUrl}${this.creditProductsPath}`, await this.requestOptions());
    if (!response.ok || !response.data) {
      throw new Error(
        response.data?.error || `Request failed: ${response.status}`,
      );
    }
    const catalog = response.data.data as
      | { products?: Array<{ productId: string; credits: number }> }
      | Array<{ productId: string; credits: number }>;
    return Array.isArray(catalog) ? catalog : (catalog.products ?? []);
  }

  async redeemCreditCoupon(
    code: string,
    entityId?: string,
  ): Promise<{ credits: number; balance: number }> {
    return this.post("/redeem-coupon", {
      code: code.trim().toUpperCase(),
      ...(entityId && this.entityQueryParam
        ? { [this.entityQueryParam]: entityId }
        : {}),
    });
  }

  async createCreditCoupon(input: {
    credits: number;
    expires_at: string;
    email?: string | null;
  }): Promise<Pick<CreditCoupon, "code"> & Partial<CreditCoupon>> {
    return this.post<CreditCoupon>("/coupons", input);
  }

  async listCreditCoupons(): Promise<CreditCoupon[]> {
    const rows =
      await this.get<Array<Record<string, unknown>>>("/coupons/history");
    const coupons = new Map<string, CreditCoupon>();
    for (const row of rows) {
      const code = String(row.code ?? "");
      let coupon = coupons.get(code);
      if (!coupon) {
        coupon = {
          ...(typeof row.id === "string" ? { id: row.id } : {}),
          code,
          credits: Number(row.credits ?? 0),
          expiresAt: String(row.expiresAt ?? row.expires_at ?? ""),
          email: (row.email ?? row.target_email ?? null) as string | null,
          createdAt: String(row.createdAt ?? row.created_at ?? ""),
          history: Array.isArray(row.history)
            ? ([...row.history] as CreditCouponHistoryItem[])
            : [],
        };
        coupons.set(code, coupon);
      }
      if (row.entityId || row.redeemedAt || row.redeemed_at) {
        const redeemedAt = row.redeemedAt ?? row.redeemed_at;
        if (redeemedAt)
          coupon.history.push({
            entityId: (row.entityId ?? row.entity_id ?? null) as string | null,
            userId: (row.userId ??
              row.redeemedByUserId ??
              row.user_id ??
              row.redeemed_by_user_id ??
              null) as string | null,
            credits: Number(row.credits ?? coupon.credits),
            redeemedAt: String(redeemedAt),
          });
      }
    }
    return [...coupons.values()].sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );
  }

  async setCreditPurchaseTarget(entityId: string): Promise<void> {
    await this.post(this.purchaseTargetPath ?? "/purchase-target", {
      entityId,
    });
  }

  /** Send the optional entity target before opening the store purchase sheet. */
  async prepareCreditPurchase(): Promise<void> {
    const entityId = this.getEntityId?.();
    if (this.purchaseTargetPath && entityId)
      await this.setCreditPurchaseTarget(entityId);
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
    const rows = await this.get<Array<Record<string, unknown>>>(
      `/purchases?limit=${limit}&offset=${offset}`,
    );
    return rows.map((row) => ({
      id: Number(row.id ?? 0),
      credits: Number(row.credits ?? 0),
      source: String(row.source ?? "free"),
      transaction_ref_id: (row.transaction_ref_id ??
        row.transactionRefId ??
        null) as string | null,
      product_id: (row.product_id ?? row.productId ?? null) as string | null,
      price_cents: (row.price_cents ?? row.priceCents ?? null) as number | null,
      currency: (row.currency ?? null) as string | null,
      created_at: String(row.created_at ?? row.createdAt ?? ""),
    }));
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
    const rows = await this.get<Array<Record<string, unknown>>>(
      `/usages?limit=${limit}&offset=${offset}`,
    );
    return rows.map((row) => ({
      id: Number(row.id ?? 0),
      credits: Number(row.credits ?? 1),
      reference: (row.reference ?? null) as string | null,
      filename: (row.filename ?? null) as string | null,
      created_at: String(row.created_at ?? row.createdAt ?? ""),
    }));
  }
}
