import { describe, it, expect, beforeEach, vi } from "vitest";
import { ConsumablesApiClient } from "../src/network/ConsumablesApiClient";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(status >= 400 ? { error: "fail" } : { data }),
  };
}

describe("ConsumablesApiClient", () => {
  let client: ConsumablesApiClient;
  const getToken = vi.fn().mockResolvedValue("test-token");

  beforeEach(() => {
    vi.clearAllMocks();
    client = new ConsumablesApiClient({
      baseUrl: "https://api.test.com",
      getToken,
    });
  });

  describe("getBalance", () => {
    it("should fetch balance and map to camelCase", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ balance: 10, initial_credits: 3 })
      );

      const result = await client.getBalance();

      expect(result).toEqual({ balance: 10, initialCredits: 3 });
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.com/api/v1/consumables/balance",
        expect.objectContaining({
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-token",
          },
        })
      );
    });

    it("should work without auth token", async () => {
      const noAuthClient = new ConsumablesApiClient({
        baseUrl: "https://api.test.com",
      });
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ balance: 0, initial_credits: 0 })
      );

      const result = await noAuthClient.getBalance();

      expect(result).toEqual({ balance: 0, initialCredits: 0 });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: { "Content-Type": "application/json" },
        })
      );
    });
  });

  describe("recordPurchase", () => {
    it("should POST purchase and return updated balance", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ balance: 28, initial_credits: 3 })
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
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.com/api/v1/consumables/purchase",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            credits: 25,
            source: "web",
            transaction_ref_id: "txn_abc",
            product_id: "credits_25",
            price_cents: 2000,
            currency: "USD",
          }),
        })
      );
    });
  });

  describe("recordUsage", () => {
    it("should POST usage and return result", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ balance: 9, success: true })
      );

      const result = await client.recordUsage("logo.svg");

      expect(result).toEqual({ balance: 9, success: true });
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.com/api/v1/consumables/use",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ filename: "logo.svg" }),
        })
      );
    });

    it("should handle usage without filename", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ balance: 9, success: true })
      );

      await client.recordUsage();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ filename: undefined }),
        })
      );
    });
  });

  describe("getPurchaseHistory", () => {
    it("should fetch purchase history with pagination", async () => {
      const purchases = [
        { id: 1, credits: 25, source: "web", created_at: "2025-01-01" },
      ];
      mockFetch.mockResolvedValueOnce(jsonResponse(purchases));

      const result = await client.getPurchaseHistory(10, 5);

      expect(result).toEqual(purchases);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.com/api/v1/consumables/purchases?limit=10&offset=5",
        expect.any(Object)
      );
    });

    it("should use default pagination values", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse([]));

      await client.getPurchaseHistory();

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.com/api/v1/consumables/purchases?limit=50&offset=0",
        expect.any(Object)
      );
    });
  });

  describe("getUsageHistory", () => {
    it("should fetch usage history with pagination", async () => {
      const usages = [
        { id: 1, filename: "test.svg", created_at: "2025-01-01" },
      ];
      mockFetch.mockResolvedValueOnce(jsonResponse(usages));

      const result = await client.getUsageHistory(20, 10);

      expect(result).toEqual(usages);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.com/api/v1/consumables/usages?limit=20&offset=10",
        expect.any(Object)
      );
    });
  });

  describe("error handling", () => {
    it("should throw on non-OK response", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(null, 401));

      await expect(client.getBalance()).rejects.toThrow("fail");
    });

    it("should strip trailing slash from base URL", async () => {
      const c = new ConsumablesApiClient({
        baseUrl: "https://api.test.com/",
      });
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ balance: 0, initial_credits: 0 })
      );

      await c.getBalance();

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.com/api/v1/consumables/balance",
        expect.any(Object)
      );
    });
  });
});
