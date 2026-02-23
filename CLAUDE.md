# Consumables Client

Cross-platform consumable credits client with RevenueCat adapter pattern.

**npm**: `@sudobility/consumables_client` (public)
**Version**: 0.0.6
**License**: BUSL-1.1

## Tech Stack

- **Language**: TypeScript 5.9.3 (strict mode)
- **Runtime**: Bun
- **Package Manager**: Bun (never npm/yarn/pnpm)
- **Build**: TypeScript compiler (ESM only)
- **Test**: Vitest 4.x
- **JSX**: react-jsx (React 18/19)

## Project Structure

```
src/
├── index.ts                       # Main barrel exports
├── types/
│   ├── index.ts                   # CreditPackage, CreditOffering, CreditBalance
│   └── adapter.ts                 # ConsumablesAdapter interface, ConsumablePurchaseResult, ConsumablePurchaseParams
├── core/
│   ├── index.ts                   # Re-exports from service.ts and singleton.ts
│   ├── service.ts                 # ConsumablesService class (caching, purchase flow, usage)
│   └── singleton.ts               # Module-level singleton + event listeners (init, userId, balance change)
├── network/
│   └── ConsumablesApiClient.ts    # HTTP client wrapping NetworkClient for /api/v1/consumables/* endpoints
├── adapters/
│   ├── index.ts                   # Re-exports web and RN adapters
│   ├── revenuecat-web.ts          # Web adapter (wraps @revenuecat/purchases-js, lazy-loaded)
│   └── revenuecat-rn.ts           # React Native adapter (wraps react-native-purchases, lazy-loaded)
└── hooks/
    ├── index.ts                   # Re-exports all hooks
    ├── useBalance.ts              # Current credit balance (subscribes to balance + userId changes)
    ├── useConsumableProducts.ts   # Available credit packages from a specific offering
    ├── usePurchaseCredits.ts      # Purchase flow (adapter.purchase -> api.recordPurchase -> notify)
    ├── usePurchaseHistory.ts      # Paginated purchase audit trail with loadMore
    └── useUsageHistory.ts         # Paginated usage audit trail with loadMore
tests/
├── singleton.test.ts
├── ConsumablesService.test.ts
└── ConsumablesApiClient.test.ts
```

## Commands

```bash
bun run build        # Build ESM via tsc
bun run clean        # Remove dist/
bun run dev          # Watch mode (tsc --watch)
bun test             # Run tests (vitest run)
bun run test:watch   # Watch tests
bun run typecheck    # TypeScript check (bunx tsc --noEmit)
bun run lint         # ESLint
bun run lint:fix     # ESLint with auto-fix
bun run format       # Prettier format
```

## Dependencies

### Peer Dependencies
- `@sudobility/types` ^1.9.53 -- shared type definitions (ConsumablePurchaseRecord, ConsumableUsageRecord, NetworkClient)
- `react` ^18.0.0 || ^19.0.0 -- hooks use React useState/useEffect/useCallback
- `@revenuecat/purchases-js` ^1.0.0 (optional) -- only needed for web adapter
- `react-native-purchases` >=7.0.0 (optional) -- only needed for RN adapter

### Dev Dependencies
- TypeScript ~5.9.3, Vitest ^4.0.4, ESLint ^9.x, Prettier ^3.x

## Key Concepts

### Adapter Pattern
- Web adapter wraps `@revenuecat/purchases-js`
- RN adapter wraps `react-native-purchases`
- Both implement the `ConsumablesAdapter` interface (getOfferings, purchase, setUserId)
- Adapters lazy-load their SDK via dynamic `import()` (web) or `require()` (RN)

### ConsumablesService
- Core orchestration class constructed with `{ adapter, apiClient }`
- Manages two caches: `balanceCache` (per-user) and `offeringsCache` (global)
- Purchase flow: adapter.purchase() -> apiClient.recordPurchase() -> update cache
- Usage flow: apiClient.recordUsage() -> update cache

### Singleton + Event Listeners
- No React Context needed -- module-level singleton pattern
- `initializeConsumables(config)` at app startup
- `setConsumablesUserId(userId, email?)` on auth state changes
- `onConsumablesBalanceChange(listener)` returns unsubscribe function
- `onConsumablesUserIdChange(listener)` returns unsubscribe function
- `notifyBalanceChange()` manually triggers balance listeners

### Hooks
- `useBalance()` -- current credit balance, subscribes to balance and userId changes
- `useConsumableProducts(offeringId)` -- available packages from a specific RevenueCat offering
- `usePurchaseCredits()` -- returns `purchase(packageId, offeringId)` callback + isPurchasing state
- `usePurchaseHistory(limit?)` -- paginated purchase records with loadMore
- `useUsageHistory(limit?)` -- paginated usage records with loadMore

### ConsumablesApiClient
- HTTP wrapper using `NetworkClient` from `@sudobility/types`
- Base URL pattern: `{baseUrl}/api/v1/consumables/{endpoint}`
- Endpoints: `/balance` (GET), `/purchase` (POST), `/use` (POST), `/purchases` (GET), `/usages` (GET)
- Maps snake_case API responses to camelCase client types

## Related Projects

- **consumables_pages** (`@sudobility/consumables_pages`) -- UI components for the credits store and history pages. Depends on this package for types (not runtime hooks).
- **consumables_service** (`@sudobility/consumables_service`) -- Backend counterpart that manages balances, purchases, and usage in the database. This client calls its API endpoints via HTTP.

Dependency direction: `consumables_pages` --> `consumables_client` --> `consumables_service` (via HTTP)

## Coding Patterns

- **Singleton pattern (no React Context)**: The library uses a module-level singleton (`initializeConsumables()`) instead of React Context. All hooks read from this singleton. Never introduce a Context provider.
- **Adapter pattern for RevenueCat**: Platform-specific SDK logic lives in adapters that implement `ConsumablesAdapter`. To support a new platform, add a new adapter file -- do not modify existing adapters.
- **Event-driven balance updates**: Balance changes are broadcast via `onConsumablesBalanceChange()` listeners. Hooks subscribe to these events. When modifying balance-related logic, always emit the balance change event so subscribers stay in sync.
- **Lazy-loaded adapters**: Adapters dynamically import their underlying SDK (`@revenuecat/purchases-js` or `react-native-purchases`) to keep initial bundle size small.
- **snake_case API <-> camelCase client**: The API client maps between backend snake_case (e.g., `initial_credits`) and client camelCase (e.g., `initialCredits`).

## Gotchas

- **Adapters lazy-load the SDK**: The RevenueCat SDK is imported dynamically inside the adapter, not at module level. This reduces bundle size but means the adapter is not ready synchronously -- always `await` initialization.
- **Singleton must be initialized before hooks work**: Calling `useBalance()` or any hook before `initializeConsumables()` will throw or return undefined. Ensure initialization happens at app startup (e.g., in a root layout or entry file).
- **Offerings cache survives user change, but balance cache does not**: When `setConsumablesUserId()` is called, the balance is refetched for the new user, but cached offerings (credit packages) are kept because they are not user-specific. Do not clear offerings on user change.
- **Two adapters, one interface**: Web and React Native adapters have different underlying SDKs with different APIs. Always code against `ConsumablesAdapter`, never against a specific SDK directly.
- **Web adapter uses `Purchases.close()` on user switch**: The web SDK requires closing and reconfiguring when switching users. The RN adapter uses `logOut()` + `logIn()` instead.
- **RN adapter defaults source to "apple"**: The React Native adapter currently always returns `"apple"` as the purchase source. Platform detection for Android ("google") is not implemented.
- **`removeComments: true` in tsconfig**: JSDoc comments are stripped from the build output. This is intentional for bundle size but means consumers cannot see inline docs from `dist/`.

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
