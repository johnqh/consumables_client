# @sudobility/consumables_client

Cross-platform consumable credits client with RevenueCat adapter pattern.

## Installation

```bash
bun add @sudobility/consumables_client
```

## Usage

```typescript
import {
  initializeConsumables,
  setConsumablesUserId,
  onConsumablesBalanceChange,
  ConsumablesService,
  createRevenueCatWebAdapter,
  createRevenueCatRNAdapter,
} from '@sudobility/consumables_client';

// Initialize at app startup
initializeConsumables({ adapter, apiClient });

// Set user on auth change
setConsumablesUserId(userId, email);

// React hooks
import {
  useBalance,
  useConsumableProducts,
  usePurchaseCredits,
  usePurchaseHistory,
  useUsageHistory,
} from '@sudobility/consumables_client';
```

## API

### Core

| Export | Description |
|--------|-------------|
| `ConsumablesService` | Core orchestration class (caching, purchase flow, usage) |
| `initializeConsumables(config)` | Module-level singleton initialization |
| `setConsumablesUserId(userId, email?)` | Set user on auth state changes |
| `onConsumablesBalanceChange(listener)` | Subscribe to balance changes (returns unsubscribe) |
| `onConsumablesUserIdChange(listener)` | Subscribe to user changes (returns unsubscribe) |

### Adapters

| Export | Description |
|--------|-------------|
| `ConsumablesAdapter` | Interface for platform-specific RevenueCat adapters |
| Web adapter | Wraps `@revenuecat/purchases-js` (lazy-loaded) |
| RN adapter | Wraps `react-native-purchases` (lazy-loaded) |

### Hooks

| Hook | Description |
|------|-------------|
| `useBalance()` | Current credit balance (subscribes to changes) |
| `useConsumableProducts(offeringId)` | Available credit packages from an offering |
| `usePurchaseCredits()` | Purchase flow with `isPurchasing` state |
| `usePurchaseHistory(limit?)` | Paginated purchase audit trail |
| `useUsageHistory(limit?)` | Paginated usage audit trail |

### Types

`CreditPackage`, `CreditOffering`, `CreditBalance`, `ConsumablePurchaseResult`, `ConsumablePurchaseParams`

## Development

```bash
bun run build        # Build ESM via tsc
bun run dev          # Watch mode
bun test             # Run tests (vitest)
bun run typecheck    # TypeScript check
bun run lint         # ESLint
bun run format       # Prettier format
```

## License

BUSL-1.1
