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
} from "./core";

// Network
export {
  ConsumablesApiClient,
  type ConsumablesApiClientConfig,
} from "./network/ConsumablesApiClient";

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
} from "./hooks";

// Types
export type {
  ConsumablesAdapter,
  ConsumablePurchaseResult,
  ConsumablePurchaseParams,
  CreditPackage,
  CreditOffering,
  CreditBalance,
  CreditPurchaseRecord,
  CreditUsageRecord,
} from "./types";

// Adapters (platform-specific)
export {
  configureConsumablesWebAdapter,
  createConsumablesWebAdapter,
  setConsumablesWebUser,
  clearConsumablesWebUser,
  hasConsumablesWebUser,
  configureConsumablesRNAdapter,
  createConsumablesRNAdapter,
  setConsumablesRNUser,
  clearConsumablesRNUser,
  hasConsumablesRNUser,
} from "./adapters";
