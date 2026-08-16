/**
 * @fileoverview Module-level singleton for the consumables system.
 * Provides initialization, user management, and event subscription functions
 * without requiring a React Context provider.
 */

import type { ConsumablesAdapter } from "../types/adapter";
import type { ConsumablesApiClient } from "../network/ConsumablesApiClient";
import { ConsumablesService } from "./service";

/** Configuration for initializing the consumables singleton. */
export interface ConsumablesConfig {
  adapter: ConsumablesAdapter;
  apiClient: ConsumablesApiClient;
}

let instance: ConsumablesService | null = null;
let currentAdapter: ConsumablesAdapter | null = null;
let currentUserId: string | undefined = undefined;
const balanceChangeListeners: Array<() => void> = [];
const userIdChangeListeners: Array<() => void> = [];

/** Initialize the consumables singleton. Call once at app startup. */
export function initializeConsumables(config: ConsumablesConfig): void {
  currentAdapter = config.adapter;
  instance = new ConsumablesService({
    adapter: config.adapter,
    apiClient: config.apiClient,
  });
}

/** Get the consumables service singleton. Throws if not initialized. */
export function getConsumablesInstance(): ConsumablesService {
  if (!instance) {
    throw new Error(
      "Consumables not initialized. Call initializeConsumables() first.",
    );
  }
  return instance;
}

/** Check if consumables singleton is initialized. */
export function isConsumablesInitialized(): boolean {
  return instance !== null;
}

/** Reset the singleton (mainly for testing). */
export function resetConsumables(): void {
  instance = null;
  currentAdapter = null;
  currentUserId = undefined;
}

/** Refresh balance from server and notify listeners. */
export async function refreshConsumablesBalance(): Promise<void> {
  if (!instance) return;
  await instance.loadBalance();
  for (const listener of balanceChangeListeners) {
    listener();
  }
}

/**
 * Set the user ID for the consumables service.
 * Clears cached balance and re-initializes RevenueCat adapter.
 */
export async function setConsumablesUserId(
  userId: string | undefined,
  email?: string,
): Promise<void> {
  if (currentUserId === userId) return;

  currentUserId = userId;

  if (currentAdapter?.setUserId) {
    await currentAdapter.setUserId(userId, email);
  }

  if (instance) {
    instance.clearCache();
  }

  for (const listener of userIdChangeListeners) {
    listener();
  }
}

/** Get the current user ID. */
export function getConsumablesUserId(): string | undefined {
  return currentUserId;
}

/** Subscribe to balance changes. Returns unsubscribe function. */
export function onConsumablesBalanceChange(listener: () => void): () => void {
  balanceChangeListeners.push(listener);
  return () => {
    const index = balanceChangeListeners.indexOf(listener);
    if (index >= 0) balanceChangeListeners.splice(index, 1);
  };
}

/** Subscribe to user ID changes. Returns unsubscribe function. */
export function onConsumablesUserIdChange(listener: () => void): () => void {
  userIdChangeListeners.push(listener);
  return () => {
    const index = userIdChangeListeners.indexOf(listener);
    if (index >= 0) userIdChangeListeners.splice(index, 1);
  };
}

/** Notify balance change listeners (call after purchase/usage). */
export function notifyBalanceChange(): void {
  for (const listener of balanceChangeListeners) {
    listener();
  }
}
