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

## Related Projects

- **consumables_pages** (`@sudobility/consumables_pages`) — UI components for the credits store and history pages. Depends on this package for hooks and data.
- **consumables_service** (`@sudobility/consumables_service`) — Backend counterpart that manages balances, purchases, and usage in the database. This client calls its API endpoints.

Dependency direction: `consumables_pages` --> `consumables_client` --> `consumables_service` (via HTTP)

## Coding Patterns

- **Singleton pattern (no React Context)**: The library uses a module-level singleton (`initializeConsumables()`) instead of React Context. All hooks read from this singleton. Never introduce a Context provider.
- **Adapter pattern for RevenueCat**: Platform-specific SDK logic lives in adapters that implement `ConsumablesAdapter`. To support a new platform, add a new adapter file -- do not modify existing adapters.
- **Event-driven balance updates**: Balance changes are broadcast via `onConsumablesBalanceChange()` listeners. Hooks subscribe to these events. When modifying balance-related logic, always emit the balance change event so subscribers stay in sync.
- **Lazy-loaded adapters**: Adapters dynamically import their underlying SDK (`@revenuecat/purchases-js` or `react-native-purchases`) to keep initial bundle size small.

## Gotchas

- **Adapters lazy-load the SDK**: The RevenueCat SDK is imported dynamically inside the adapter, not at module level. This reduces bundle size but means the adapter is not ready synchronously -- always `await` initialization.
- **Singleton must be initialized before hooks work**: Calling `useBalance()` or any hook before `initializeConsumables()` will throw or return undefined. Ensure initialization happens at app startup (e.g., in a root layout or entry file).
- **Offerings cache survives user change, but balance cache does not**: When `setConsumablesUserId()` is called, the balance is refetched for the new user, but cached offerings (credit packages) are kept because they are not user-specific. Do not clear offerings on user change.
- **Two adapters, one interface**: Web and React Native adapters have different underlying SDKs with different APIs. Always code against `ConsumablesAdapter`, never against a specific SDK directly.

## Testing

- Run tests: `bun test` (uses vitest)
- Tests use **mocked adapters** -- they do not call real RevenueCat or backend APIs.
- When adding new functionality, write tests using the mock adapter pattern found in existing test files.
- Test hooks by verifying they respond correctly to singleton events (balance changes, purchase completions).

## Publishing

- Package: `@sudobility/consumables_client` (public on npm)
- Build before publish: `bun run build` produces ESM output in `dist/`
- Bump version in `package.json`, then `npm publish --access public`
- Consumers (e.g., `consumables_pages`) should be tested against the new version before publishing downstream
