/**
 * @sudobility/consumables_client
 *
 * Cross-platform consumable credits client with RevenueCat adapter pattern.
 * Works with both React (web) and React Native.
 */

// Core
export {
  initializeConsumables,
  getConsumablesInstance,
  isConsumablesInitialized,
  resetConsumables,
  refreshConsumablesBalance,
  setConsumablesUserId,
  getConsumablesUserId,
  onConsumablesBalanceChange,
  onConsumablesUserIdChange,
  notifyBalanceChange,
  ConsumablesService,
  type ConsumablesConfig,
  type ConsumablesServiceConfig,
} from "./core/index.js";

// Network
export {
  ConsumablesApiClient,
  type ConsumablesApiClientConfig,
} from "./network/ConsumablesApiClient.js";

// Hooks
export {
  useBalance,
  useConsumableProducts,
  usePurchaseCredits,
  usePurchaseHistory,
  useUsageHistory,
  type UseBalanceResult,
  type UseConsumableProductsResult,
  type UsePurchaseCreditsResult,
  type UsePurchaseHistoryResult,
  type UseUsageHistoryResult,
} from "./hooks/index.js";

// Types (client-only)
export type {
  ConsumablesAdapter,
  ConsumablePurchaseResult,
  ConsumablePurchaseParams,
  CreditPackage,
  CreditOffering,
  CreditBalance,
} from "./types/index.js";

// Adapters are exported via subpath imports:
//   @sudobility/consumables_client/adapter/web
//   @sudobility/consumables_client/adapter/rn
