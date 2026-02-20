import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  initializeConsumables,
  getConsumablesInstance,
  isConsumablesInitialized,
  resetConsumables,
  setConsumablesUserId,
  getConsumablesUserId,
  onConsumablesBalanceChange,
  onConsumablesUserIdChange,
  refreshConsumablesBalance,
  notifyBalanceChange,
} from "../src/core/singleton";
import type { ConsumablesAdapter } from "../src/types/adapter";
import type { ConsumablesApiClient } from "../src/network/ConsumablesApiClient";

function createMockAdapter(): ConsumablesAdapter {
  return {
    getOfferings: vi.fn().mockResolvedValue({ all: {} }),
    purchase: vi.fn().mockResolvedValue({
      transactionId: "txn_1",
      productId: "credits_5",
      credits: 5,
      priceCents: 500,
      currency: "USD",
      source: "web",
    }),
    setUserId: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockApiClient(): ConsumablesApiClient {
  return {
    getBalance: vi
      .fn()
      .mockResolvedValue({ balance: 10, initialCredits: 3 }),
    recordPurchase: vi.fn(),
    recordUsage: vi.fn(),
    getPurchaseHistory: vi.fn(),
    getUsageHistory: vi.fn(),
  } as unknown as ConsumablesApiClient;
}

describe("singleton", () => {
  let adapter: ConsumablesAdapter;
  let apiClient: ConsumablesApiClient;

  beforeEach(() => {
    resetConsumables();
    adapter = createMockAdapter();
    apiClient = createMockApiClient();
  });

  describe("initializeConsumables", () => {
    it("should initialize the singleton", () => {
      expect(isConsumablesInitialized()).toBe(false);

      initializeConsumables({ adapter, apiClient });

      expect(isConsumablesInitialized()).toBe(true);
    });
  });

  describe("getConsumablesInstance", () => {
    it("should throw if not initialized", () => {
      expect(() => getConsumablesInstance()).toThrow(
        "Consumables not initialized"
      );
    });

    it("should return instance after initialization", () => {
      initializeConsumables({ adapter, apiClient });

      const instance = getConsumablesInstance();

      expect(instance).toBeDefined();
    });
  });

  describe("resetConsumables", () => {
    it("should reset the singleton", () => {
      initializeConsumables({ adapter, apiClient });
      expect(isConsumablesInitialized()).toBe(true);

      resetConsumables();

      expect(isConsumablesInitialized()).toBe(false);
      expect(getConsumablesUserId()).toBeUndefined();
    });
  });

  describe("setConsumablesUserId", () => {
    it("should set and get user ID", async () => {
      initializeConsumables({ adapter, apiClient });

      await setConsumablesUserId("user123", "user@test.com");

      expect(getConsumablesUserId()).toBe("user123");
    });

    it("should call adapter.setUserId if available", async () => {
      initializeConsumables({ adapter, apiClient });

      await setConsumablesUserId("user123", "user@test.com");

      expect(adapter.setUserId).toHaveBeenCalledWith(
        "user123",
        "user@test.com"
      );
    });

    it("should skip if user ID unchanged", async () => {
      initializeConsumables({ adapter, apiClient });

      await setConsumablesUserId("user123");
      await setConsumablesUserId("user123"); // same ID

      expect(adapter.setUserId).toHaveBeenCalledTimes(1);
    });

    it("should notify user ID change listeners", async () => {
      initializeConsumables({ adapter, apiClient });
      const listener = vi.fn();
      onConsumablesUserIdChange(listener);

      await setConsumablesUserId("user123");

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should clear user ID when set to undefined", async () => {
      initializeConsumables({ adapter, apiClient });

      await setConsumablesUserId("user123");
      await setConsumablesUserId(undefined);

      expect(getConsumablesUserId()).toBeUndefined();
    });
  });

  describe("onConsumablesBalanceChange", () => {
    it("should subscribe and unsubscribe", () => {
      const listener = vi.fn();
      const unsub = onConsumablesBalanceChange(listener);

      notifyBalanceChange();
      expect(listener).toHaveBeenCalledTimes(1);

      unsub();
      notifyBalanceChange();
      expect(listener).toHaveBeenCalledTimes(1); // not called again
    });
  });

  describe("onConsumablesUserIdChange", () => {
    it("should subscribe and unsubscribe", async () => {
      initializeConsumables({ adapter, apiClient });
      const listener = vi.fn();
      const unsub = onConsumablesUserIdChange(listener);

      await setConsumablesUserId("user1");
      expect(listener).toHaveBeenCalledTimes(1);

      unsub();
      await setConsumablesUserId("user2");
      expect(listener).toHaveBeenCalledTimes(1); // not called again
    });
  });

  describe("refreshConsumablesBalance", () => {
    it("should load balance and notify listeners", async () => {
      initializeConsumables({ adapter, apiClient });
      const listener = vi.fn();
      onConsumablesBalanceChange(listener);

      await refreshConsumablesBalance();

      expect(
        (apiClient as unknown as { getBalance: () => void }).getBalance
      ).toHaveBeenCalled();
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should be a no-op if not initialized", async () => {
      // Should not throw
      await refreshConsumablesBalance();
    });
  });
});
