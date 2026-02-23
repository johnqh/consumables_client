# Consumables Client - Improvement Plans

## Priority 1: Critical / High-Impact

### 1.1 Add Platform Detection for RN Adapter Source ✅ DONE
**File**: `src/adapters/revenuecat-rn.ts`
**Issue**: The `purchase()` method always returns `"apple"` as the source, even on Android devices.
**Suggestion**: Use React Native's `Platform.OS` to correctly set `"apple"` or `"google"` as the source. This affects purchase recording accuracy.

### 1.2 Add Error Handling for Network Failures in Hooks
**Files**: `src/hooks/useBalance.ts`, `src/hooks/useConsumableProducts.ts`
**Issue**: When the network request fails, the error is caught but there is no retry mechanism. The user sees an error state with no way to recover other than calling `refetch()` manually.
**Suggestion**: Add an `autoRetry` option or integrate exponential backoff. Alternatively, provide clearer guidance to consuming apps on retry strategies.

### 1.3 Add `verify` Script ✅ DONE
**File**: `package.json`
**Issue**: Unlike `consumables_service`, there is no `verify` script that runs typecheck + lint + test + build in sequence.
**Suggestion**: Add `"verify": "bun run typecheck && bun run lint && bun run test && bun run build"` to scripts for pre-commit validation.

## Priority 2: Moderate / Quality

### 2.1 Race Condition in Balance Loading ✅ DONE
**File**: `src/core/service.ts`
**Issue**: `loadBalance()` uses an `isLoadingBalance` flag but does not deduplicate concurrent calls with a shared promise (unlike `loadOfferings()` which does). Two concurrent `loadBalance()` calls could produce two API requests.
**Suggestion**: Apply the same deduplication pattern used in `loadOfferings()` -- store and reuse a pending promise.

### 2.2 Type Safety for `credits` Metadata Parsing ✅ DONE
**Files**: `src/adapters/revenuecat-web.ts`, `src/adapters/revenuecat-rn.ts`
**Issue**: Credit count is extracted from `product.metadata.credits` with a `typeof === "number"` check, falling back to 0. The `(product as any).metadata` cast bypasses type safety.
**Suggestion**: Define a typed metadata interface and validate with a runtime check or Zod schema.

### 2.3 Add Integration Test Scaffolding
**Directory**: `tests/`
**Issue**: All tests mock the adapter and API client. There are no integration-level tests that verify the full flow (adapter -> service -> API client).
**Suggestion**: Add a test file with a mock HTTP server (e.g., MSW) to verify the complete purchase and usage flows end-to-end.

### 2.4 Expose Adapter Type Guard Functions
**File**: `src/adapters/index.ts`
**Issue**: Consumers cannot easily check which adapter is in use at runtime. This matters for platform-specific error handling.
**Suggestion**: Export a `getActiveAdapterType()` function or add a `type` property to the adapter interface.

## Priority 3: Low / Nice-to-Have

### 3.1 Consider TanStack Query for Hooks
**Files**: `src/hooks/*.ts`
**Issue**: All hooks manually implement loading state, error state, caching, and refetching. This duplicates what TanStack Query provides out of the box.
**Suggestion**: Offer optional TanStack Query-based hooks (or refactor existing hooks to use it) for apps that already use TanStack Query. The ecosystem already uses TanStack Query per project conventions.

### 3.2 Add `loadMore` Pagination to All History Hooks
**Files**: `src/hooks/usePurchaseHistory.ts`, `src/hooks/useUsageHistory.ts`
**Issue**: The `loadMore` callback in both history hooks depends on `purchases.length` / `usages.length` in the useCallback dependency array, which can cause unnecessary re-renders.
**Suggestion**: Use a `useRef` for the offset tracking instead of deriving it from array length.

### 3.3 Bundle Size Analysis
**Issue**: No bundle analysis tooling is configured.
**Suggestion**: Add a script to measure the built output size. Consider `size-limit` for CI-level bundle size enforcement.

### 3.4 Document API Contract
**Issue**: The expected API response shapes (from `consumables_service`) are only implicitly documented through the `ConsumablesApiClient` methods.
**Suggestion**: Add an explicit API contract document or shared Zod schemas between client and service to prevent contract drift.
