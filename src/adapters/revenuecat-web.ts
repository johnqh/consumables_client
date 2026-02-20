/**
 * RevenueCat Web Adapter for Consumables
 *
 * Wraps @revenuecat/purchases-js for consumable credit purchases.
 * Lazy loads the SDK to minimize bundle size.
 */

import type {
  ConsumablesAdapter,
  ConsumablePurchaseParams,
  ConsumablePurchaseResult,
} from "../types/adapter";
import type { CreditPackage } from "../types";

type Purchases = import("@revenuecat/purchases-js").Purchases;
type Package = import("@revenuecat/purchases-js").Package;

let purchasesInstance: Purchases | null = null;
let currentUserId: string | null = null;
let apiKey: string | null = null;
let pendingUserSetup: string | null = null;

const ANONYMOUS_USER_ID = "$RCAnonymousID:credits_viewer";

/** Configure the web adapter with RevenueCat API key. */
export function configureConsumablesWebAdapter(
  revenueCatApiKey: string,
): void {
  apiKey = revenueCatApiKey;
}

async function ensureInitialized(requireUser = false): Promise<Purchases> {
  if (!apiKey) throw new Error("RevenueCat not configured");
  if (requireUser && !currentUserId) {
    throw new Error("RevenueCat user not set");
  }

  if (!purchasesInstance) {
    const SDK = await import("@revenuecat/purchases-js");
    purchasesInstance = SDK.Purchases.configure({
      apiKey,
      appUserId: currentUserId || ANONYMOUS_USER_ID,
    });
  }
  return purchasesInstance;
}

/** Set the current user for RevenueCat. */
export async function setConsumablesWebUser(
  userId: string,
  email?: string,
): Promise<void> {
  if (!apiKey) return;
  if (currentUserId === userId && purchasesInstance) return;
  if (pendingUserSetup === userId) return;

  pendingUserSetup = userId;
  try {
    const SDK = await import("@revenuecat/purchases-js");
    if (purchasesInstance) purchasesInstance.close();
    purchasesInstance = SDK.Purchases.configure({
      apiKey,
      appUserId: userId,
    });
    currentUserId = userId;
    if (email) {
      try {
        await purchasesInstance.setAttributes({ email });
      } catch {
        // Ignore attribute errors
      }
    }
  } finally {
    pendingUserSetup = null;
  }
}

/** Clear the current user (on logout). */
export function clearConsumablesWebUser(): void {
  if (purchasesInstance) {
    purchasesInstance.close();
    purchasesInstance = null;
  }
  currentUserId = null;
}

/** Check if a user is configured. */
export function hasConsumablesWebUser(): boolean {
  return currentUserId !== null && purchasesInstance !== null;
}

function convertPackage(pkg: Package): CreditPackage {
  const product = pkg.rcBillingProduct;
  const metadata = (product as any).metadata || {};
  const credits = typeof metadata.credits === "number" ? metadata.credits : 0;

  return {
    packageId: pkg.identifier,
    productId: product.identifier,
    title: product.title,
    description: product.description || null,
    credits,
    price: product.currentPrice?.amountMicros
      ? product.currentPrice.amountMicros / 1_000_000
      : 0,
    priceString: product.currentPrice?.formattedPrice || "$0",
    currencyCode: product.currentPrice?.currency || "USD",
  };
}

/** Create the consumables adapter for web. */
export function createConsumablesWebAdapter(): ConsumablesAdapter {
  return {
    async setUserId(
      userId: string | undefined,
      email?: string,
    ): Promise<void> {
      if (userId) {
        await setConsumablesWebUser(userId, email);
      } else {
        clearConsumablesWebUser();
      }
    },

    async getOfferings() {
      try {
        const purchases = await ensureInitialized(false);
        const offerings = await purchases.getOfferings();

        const all: Record<
          string,
          {
            identifier: string;
            metadata: Record<string, unknown> | null;
            packages: CreditPackage[];
          }
        > = {};

        for (const [key, offering] of Object.entries(offerings.all)) {
          all[key] = {
            identifier: offering.identifier,
            metadata: (offering.metadata as Record<string, unknown>) || null,
            packages: offering.availablePackages.map(convertPackage),
          };
        }

        return { all };
      } catch (error) {
        console.error(
          "[consumables-web] Failed to get offerings:",
          error,
        );
        return { all: {} };
      }
    },

    async purchase(
      params: ConsumablePurchaseParams,
    ): Promise<ConsumablePurchaseResult> {
      const purchases = await ensureInitialized(true);
      const offerings = await purchases.getOfferings();

      let packageToPurchase: Package | undefined;
      for (const offering of Object.values(offerings.all)) {
        packageToPurchase = offering.availablePackages.find(
          (pkg) => pkg.identifier === params.packageId,
        );
        if (packageToPurchase) break;
      }

      if (!packageToPurchase) {
        throw new Error(`Package not found: ${params.packageId}`);
      }

      const result = await purchases.purchase({
        rcPackage: packageToPurchase,
      });

      const product = packageToPurchase.rcBillingProduct;
      const metadata = (product as any).metadata || {};
      const credits =
        typeof metadata.credits === "number" ? metadata.credits : 0;

      // Extract transaction ID from the result
      const nonSubTransactions =
        result.customerInfo.nonSubscriptionTransactions || [];
      const latestTransaction =
        nonSubTransactions[nonSubTransactions.length - 1];
      const transactionId =
        latestTransaction?.transactionIdentifier || `web_${Date.now()}`;

      return {
        transactionId,
        productId: product.identifier,
        credits,
        priceCents: product.currentPrice?.amountMicros
          ? Math.round(product.currentPrice.amountMicros / 10_000)
          : 0,
        currency: product.currentPrice?.currency || "USD",
        source: "web",
      };
    },
  };
}
