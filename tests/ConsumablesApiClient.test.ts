import { describe, it, expect, beforeEach, vi } from "vitest";
import type { NetworkClient, NetworkResponse } from "@sudobility/types";
import { ConsumablesApiClient } from "../src/network/ConsumablesApiClient";

function createMockNetworkClient(): NetworkClient & {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  request: ReturnType<typeof vi.fn>;
} {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
  };
}

function okResponse<T>(data: T): NetworkResponse<{ data: T }> {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    headers: {},
    success: true,
    data: { data },
  };
}

function errorResponse(
  status: number,
  error: string,
): NetworkResponse<{ data: null; error: string }> {
  return {
    ok: false,
    status,
    statusText: "Error",
    headers: {},
    success: false,
    data: { data: null, error },
  };
}

describe("ConsumablesApiClient", () => {
  let client: ConsumablesApiClient;
  let mockNetwork: ReturnType<typeof createMockNetworkClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNetwork = createMockNetworkClient();
    client = new ConsumablesApiClient({
      baseUrl: "https://api.test.com",
      networkClient: mockNetwork,
    });
  });

  describe("getBalance", () => {
    it("should fetch balance and map to camelCase", async () => {
      mockNetwork.get.mockResolvedValueOnce(
        okResponse({ balance: 10, initial_credits: 3 }),
      );

      const result = await client.getBalance();

      expect(result).toEqual({ balance: 10, initialCredits: 3 });
      expect(mockNetwork.get).toHaveBeenCalledWith(
        "https://api.test.com/api/v1/consumables/balance",
      );
    });
  });

  describe("recordPurchase", () => {
    it("should POST purchase and return updated balance", async () => {
      mockNetwork.post.mockResolvedValueOnce(
        okResponse({ balance: 28, initial_credits: 3 }),
      );

      const result = await client.recordPurchase({
        credits: 25,
        source: "web",
        transaction_ref_id: "txn_abc",
        product_id: "credits_25",
        price_cents: 2000,
        currency: "USD",
      });

      expect(result).toEqual({ balance: 28, initialCredits: 3 });
      expect(mockNetwork.post).toHaveBeenCalledWith(
        "https://api.test.com/api/v1/consumables/purchase",
        {
          credits: 25,
          source: "web",
          transaction_ref_id: "txn_abc",
          product_id: "credits_25",
          price_cents: 2000,
          currency: "USD",
        },
      );
    });
  });

  describe("recordUsage", () => {
    it("should POST usage and return result", async () => {
      mockNetwork.post.mockResolvedValueOnce(
        okResponse({ balance: 9, success: true }),
      );

      const result = await client.recordUsage("logo.svg");

      expect(result).toEqual({ balance: 9, success: true });
      expect(mockNetwork.post).toHaveBeenCalledWith(
        "https://api.test.com/api/v1/consumables/use",
        { filename: "logo.svg" },
      );
    });

    it("should handle usage without filename", async () => {
      mockNetwork.post.mockResolvedValueOnce(
        okResponse({ balance: 9, success: true }),
      );

      await client.recordUsage();

      expect(mockNetwork.post).toHaveBeenCalledWith(
        "https://api.test.com/api/v1/consumables/use",
        { filename: undefined },
      );
    });
  });

  describe("getPurchaseHistory", () => {
    it("should fetch purchase history with pagination", async () => {
      const purchases = [
        { id: 1, credits: 25, source: "web", created_at: "2025-01-01" },
      ];
      mockNetwork.get.mockResolvedValueOnce(okResponse(purchases));

      const result = await client.getPurchaseHistory(10, 5);

      expect(result).toEqual(purchases);
      expect(mockNetwork.get).toHaveBeenCalledWith(
        "https://api.test.com/api/v1/consumables/purchases?limit=10&offset=5",
      );
    });

    it("should use default pagination values", async () => {
      mockNetwork.get.mockResolvedValueOnce(okResponse([]));

      await client.getPurchaseHistory();

      expect(mockNetwork.get).toHaveBeenCalledWith(
        "https://api.test.com/api/v1/consumables/purchases?limit=50&offset=0",
      );
    });
  });

  describe("getUsageHistory", () => {
    it("should fetch usage history with pagination", async () => {
      const usages = [
        { id: 1, filename: "test.svg", created_at: "2025-01-01" },
      ];
      mockNetwork.get.mockResolvedValueOnce(okResponse(usages));

      const result = await client.getUsageHistory(20, 10);

      expect(result).toEqual(usages);
      expect(mockNetwork.get).toHaveBeenCalledWith(
        "https://api.test.com/api/v1/consumables/usages?limit=20&offset=10",
      );
    });
  });

  describe("error handling", () => {
    it("should throw on non-OK response", async () => {
      mockNetwork.get.mockResolvedValueOnce(errorResponse(401, "fail"));

      await expect(client.getBalance()).rejects.toThrow("fail");
    });

    it("should strip trailing slash from base URL", async () => {
      const c = new ConsumablesApiClient({
        baseUrl: "https://api.test.com/",
        networkClient: mockNetwork,
      });
      mockNetwork.get.mockResolvedValueOnce(
        okResponse({ balance: 0, initial_credits: 0 }),
      );

      await c.getBalance();

      expect(mockNetwork.get).toHaveBeenCalledWith(
        "https://api.test.com/api/v1/consumables/balance",
      );
    });
  });
});
