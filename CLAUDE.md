# Consumables Client

Cross-platform consumable credits client with RevenueCat adapter pattern.

**npm**: `@sudobility/consumables_client` (public)

## Tech Stack

- **Language**: TypeScript (strict mode)
- **Runtime**: Bun
- **Package Manager**: Bun
- **Build**: TypeScript compiler (ESM)
- **Test**: vitest

## Project Structure

```
src/
├── index.ts                       # Main exports
├── types/
│   ├── index.ts                   # CreditPackage, CreditBalance, etc.
│   └── adapter.ts                 # ConsumablesAdapter interface
├── core/
│   ├── index.ts
│   ├── service.ts                 # ConsumablesService class
│   └── singleton.ts               # Global singleton + event listeners
├── network/
│   └── ConsumablesApiClient.ts    # HTTP wrapper for API calls
├── adapters/
│   ├── index.ts
│   ├── revenuecat-web.ts          # Web adapter
│   └── revenuecat-rn.ts           # React Native adapter
└── hooks/
    ├── index.ts
    ├── useBalance.ts
    ├── useConsumableProducts.ts
    ├── usePurchaseCredits.ts
    ├── usePurchaseHistory.ts
    └── useUsageHistory.ts
```

## Commands

```bash
bun run build        # Build ESM
bun run clean        # Remove dist/
bun run dev          # Watch mode
bun test             # Run tests
bun run typecheck    # TypeScript check
```

## Key Concepts

### Adapter Pattern
- Web adapter wraps @revenuecat/purchases-js
- RN adapter wraps react-native-purchases
- Both implement ConsumablesAdapter interface

### Singleton + Event Listeners
- No React Context needed
- initializeConsumables() at app startup
- setConsumablesUserId() on auth change
- onConsumablesBalanceChange() for reactivity

### Hooks
- useBalance() — current credit balance
- useConsumableProducts(offeringId) — available packages
- usePurchaseCredits() — purchase flow
- usePurchaseHistory() / useUsageHistory() — audit trails
