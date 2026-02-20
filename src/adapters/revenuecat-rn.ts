/**
 * RevenueCat React Native Adapter for Consumables
 *
 * Wraps react-native-purchases for consumable credit purchases.
 * Lazy loads the SDK with try/catch for environments where it's not installed.
 */

import type {
  ConsumablePurchaseParams,
  ConsumablePurchaseResult,
  ConsumablesAdapter,
} from "../types/adapter";
import type { CreditPackage } from "../types";

let apiKey: string | null = null;
let currentUserId: string | null = null;
let isConfigured = false;

/** Configure the RN adapter with RevenueCat API key. */
export function configureConsumablesRNAdapter(revenueCatApiKey: string): void {
  apiKey = revenueCatApiKey;
}

async function getRNPurchases() {
  try {
    return require("react-native-purchases");
  } catch {
    throw new Error("react-native-purchases is not installed");
  }
}

async function ensureConfigured(): Promise<any> {
  const Purchases = await getRNPurchases();

  if (!isConfigured && apiKey) {
    Purchases.configure({ apiKey });
    isConfigured = true;
  }

  return Purchases;
}

/** Set the current user for RevenueCat RN. */
export async function setConsumablesRNUser(
  userId: string,
  email?: string,
): Promise<void> {
  if (!apiKey) return;
  if (currentUserId === userId) return;

  const Purchases = await ensureConfigured();

  if (currentUserId) {
    await Purchases.logOut();
  }

  await Purchases.logIn(userId);
  currentUserId = userId;

  if (email) {
    try {
      await Purchases.setAttributes({ email });
    } catch {
      // Ignore attribute errors
    }
  }
}

/** Clear the current user (on logout). */
export async function clearConsumablesRNUser(): Promise<void> {
  try {
    const Purchases = await getRNPurchases();
    await Purchases.logOut();
  } catch {
    // SDK not available
  }
  currentUserId = null;
}

/** Check if a user is configured. */
export function hasConsumablesRNUser(): boolean {
  return currentUserId !== null;
}

/** Create the consumables adapter for React Native. */
export function createConsumablesRNAdapter(): ConsumablesAdapter {
  return {
    async setUserId(userId: string | undefined, email?: string): Promise<void> {
      if (userId) {
        await setConsumablesRNUser(userId, email);
      } else {
        await clearConsumablesRNUser();
      }
    },

    async getOfferings() {
      try {
        const Purchases = await ensureConfigured();
        const offerings = await Purchases.getOfferings();

        const all: Record<
          string,
          {
            identifier: string;
            metadata: Record<string, unknown> | null;
            packages: CreditPackage[];
          }
        > = {};

        for (const offering of Object.values(offerings.all) as any[]) {
          all[offering.identifier] = {
            identifier: offering.identifier,
            metadata: offering.metadata || null,
            packages: offering.availablePackages.map((pkg: any) => {
              const metadata = pkg.product?.metadata || {};
              const credits =
                typeof metadata.credits === "number" ? metadata.credits : 0;
              return {
                packageId: pkg.identifier,
                productId: pkg.product?.identifier || "",
                title: pkg.product?.title || "",
                description: pkg.product?.description || null,
                credits,
                price: pkg.product?.price || 0,
                priceString: pkg.product?.priceString || "$0",
                currencyCode: pkg.product?.currencyCode || "USD",
              } satisfies CreditPackage;
            }),
          };
        }

        return { all };
      } catch (error) {
        console.error("[consumables-rn] Failed to get offerings:", error);
        return { all: {} };
      }
    },

    async purchase(
      params: ConsumablePurchaseParams,
    ): Promise<ConsumablePurchaseResult> {
      const Purchases = await ensureConfigured();
      const offerings = await Purchases.getOfferings();

      let packageToPurchase: any;
      for (const offering of Object.values(offerings.all) as any[]) {
        packageToPurchase = offering.availablePackages.find(
          (pkg: any) => pkg.identifier === params.packageId,
        );
        if (packageToPurchase) break;
      }

      if (!packageToPurchase) {
        throw new Error(`Package not found: ${params.packageId}`);
      }

      const result = await Purchases.purchasePackage(packageToPurchase);
      const metadata = packageToPurchase.product?.metadata || {};
      const credits =
        typeof metadata.credits === "number" ? metadata.credits : 0;

      const nonSubTransactions =
        result.customerInfo?.nonSubscriptionTransactions || [];
      const latestTransaction =
        nonSubTransactions[nonSubTransactions.length - 1];
      const transactionId =
        latestTransaction?.transactionIdentifier || `rn_${Date.now()}`;

      // Determine source based on platform
      const platform =
        typeof navigator !== "undefined" &&
        (navigator as any).product === "ReactNative"
          ? "apple" // Default to apple for RN, could be refined with Platform.OS
          : "apple";

      return {
        transactionId,
        productId: packageToPurchase.product?.identifier || "",
        credits,
        priceCents: Math.round((packageToPurchase.product?.price || 0) * 100),
        currency: packageToPurchase.product?.currencyCode || "USD",
        source: platform as "apple" | "google",
      };
    },
  };
}
