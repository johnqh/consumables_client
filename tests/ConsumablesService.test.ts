import { describe, it, expect, beforeEach, vi } from "vitest";
import { ConsumablesService } from "../src/core/service";
import type { ConsumablesAdapter } from "../src/types/adapter";
import type { ConsumablesApiClient } from "../src/network/ConsumablesApiClient";

function createMockAdapter(): ConsumablesAdapter {
  return {
    getOfferings: vi.fn().mockResolvedValue({
      all: {
        default: {
          identifier: "default",
          metadata: null,
          packages: [
            {
              packageId: "pkg_5",
              productId: "credits_5",
              title: "5 Credits",
              description: null,
              credits: 5,
              price: 4.99,
              priceString: "$4.99",
              currencyCode: "USD",
            },
          ],
        },
      },
    }),
    purchase: vi.fn().mockResolvedValue({
      transactionId: "txn_123",
      productId: "credits_5",
      credits: 5,
      priceCents: 499,
      currency: "USD",
      source: "web" as const,
    }),
    setUserId: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockApiClient() {
  return {
    getBalance: vi
      .fn()
      .mockResolvedValue({ balance: 10, initialCredits: 3 }),
    recordPurchase: vi
      .fn()
      .mockResolvedValue({ balance: 15, initialCredits: 3 }),
    recordUsage: vi.fn().mockResolvedValue({ balance: 9, success: true }),
    getPurchaseHistory: vi.fn().mockResolvedValue([]),
    getUsageHistory: vi.fn().mockResolvedValue([]),
  } as unknown as ConsumablesApiClient;
}

describe("ConsumablesService", () => {
  let service: ConsumablesService;
  let adapter: ConsumablesAdapter;
  let apiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    adapter = createMockAdapter();
    apiClient = createMockApiClient();
    service = new ConsumablesService({
      adapter,
      apiClient: apiClient as unknown as ConsumablesApiClient,
    });
  });

  describe("loadOfferings", () => {
    it("should load and cache offerings from adapter", async () => {
      expect(service.hasLoadedOfferings()).toBe(false);

      await service.loadOfferings();

      expect(service.hasLoadedOfferings()).toBe(true);
      expect(adapter.getOfferings).toHaveBeenCalledTimes(1);
    });

    it("should return cached offerings on subsequent calls", async () => {
      await service.loadOfferings();
      await service.loadOfferings();

      expect(adapter.getOfferings).toHaveBeenCalledTimes(1);
    });

    it("should deduplicate concurrent loadOfferings calls", async () => {
      const p1 = service.loadOfferings();
      const p2 = service.loadOfferings();

      await Promise.all([p1, p2]);

      // Only 1 call despite 2 concurrent loadOfferings
      expect(adapter.getOfferings).toHaveBeenCalledTimes(1);
    });
  });

  describe("getOffering", () => {
    it("should return null before loading", () => {
      expect(service.getOffering("default")).toBeNull();
    });

    it("should return offering after loading", async () => {
      await service.loadOfferings();

      const offering = service.getOffering("default");

      expect(offering).not.toBeNull();
      expect(offering!.offeringId).toBe("default");
      expect(offering!.packages).toHaveLength(1);
      expect(offering!.packages[0].credits).toBe(5);
    });
  });

  describe("getOfferingIds", () => {
    it("should return empty array before loading", () => {
      expect(service.getOfferingIds()).toEqual([]);
    });

    it("should return offering IDs after loading", async () => {
      await service.loadOfferings();

      expect(service.getOfferingIds()).toEqual(["default"]);
    });
  });

  describe("loadBalance", () => {
    it("should fetch balance from API", async () => {
      const result = await service.loadBalance();

      expect(result).toEqual({ balance: 10, initialCredits: 3 });
      expect(
        (apiClient as unknown as { getBalance: ReturnType<typeof vi.fn> })
          .getBalance
      ).toHaveBeenCalledTimes(1);
    });

    it("should cache balance", async () => {
      await service.loadBalance();

      expect(service.getCachedBalance()).toEqual({
        balance: 10,
        initialCredits: 3,
      });
    });

    it("should return null cache before loading", () => {
      expect(service.getCachedBalance()).toBeNull();
      expect(service.hasLoadedBalance()).toBe(false);
    });
  });

  describe("purchase", () => {
    it("should call adapter.purchase then apiClient.recordPurchase", async () => {
      const result = await service.purchase({
        packageId: "pkg_5",
        offeringId: "default",
      });

      expect(adapter.purchase).toHaveBeenCalledWith({
        packageId: "pkg_5",
        offeringId: "default",
      });
      expect(
        (
          apiClient as unknown as {
            recordPurchase: ReturnType<typeof vi.fn>;
          }
        ).recordPurchase
      ).toHaveBeenCalledWith({
        credits: 5,
        source: "web",
        transaction_ref_id: "txn_123",
        product_id: "credits_5",
        price_cents: 499,
        currency: "USD",
      });
      expect(result).toEqual({ balance: 15, initialCredits: 3 });
    });

    it("should update balance cache after purchase", async () => {
      await service.purchase({
        packageId: "pkg_5",
        offeringId: "default",
      });

      expect(service.getCachedBalance()).toEqual({
        balance: 15,
        initialCredits: 3,
      });
    });
  });

  describe("recordUsage", () => {
    it("should record usage and return result", async () => {
      const result = await service.recordUsage("logo.svg");

      expect(result).toEqual({ balance: 9, success: true });
      expect(
        (apiClient as unknown as { recordUsage: ReturnType<typeof vi.fn> })
          .recordUsage
      ).toHaveBeenCalledWith("logo.svg");
    });

    it("should update balance cache after usage", async () => {
      // Pre-load balance
      await service.loadBalance();
      expect(service.getCachedBalance()!.balance).toBe(10);

      await service.recordUsage("logo.svg");

      expect(service.getCachedBalance()!.balance).toBe(9);
    });
  });

  describe("getPurchaseHistory", () => {
    it("should delegate to apiClient", async () => {
      await service.getPurchaseHistory(10, 5);

      expect(
        (
          apiClient as unknown as {
            getPurchaseHistory: ReturnType<typeof vi.fn>;
          }
        ).getPurchaseHistory
      ).toHaveBeenCalledWith(10, 5);
    });
  });

  describe("getUsageHistory", () => {
    it("should delegate to apiClient", async () => {
      await service.getUsageHistory(20, 10);

      expect(
        (
          apiClient as unknown as {
            getUsageHistory: ReturnType<typeof vi.fn>;
          }
        ).getUsageHistory
      ).toHaveBeenCalledWith(20, 10);
    });
  });

  describe("clearCache", () => {
    it("should clear balance but preserve offerings", async () => {
      await service.loadBalance();
      await service.loadOfferings();

      service.clearCache();

      expect(service.getCachedBalance()).toBeNull();
      expect(service.hasLoadedOfferings()).toBe(true);
    });
  });
});
