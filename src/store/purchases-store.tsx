import type { CustomerInfo } from 'react-native-purchases';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';

import { useAuth } from '@/store/auth-store';

const PRO_ENTITLEMENT = 'asepo_pro';

type PurchasesStore = {
  configured: boolean;
  isPro: boolean;
  showPaywall: () => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  showCustomerCenter: () => Promise<void>;
};

const unavailablePurchases: PurchasesStore = {
  configured: false,
  isPro: false,
  showPaywall: async () => {
    throw new Error('Purchases are not configured yet');
  },
  restorePurchases: async () => {
    throw new Error('Purchases are not configured yet');
  },
  showCustomerCenter: async () => {
    throw new Error('Purchases are not configured yet');
  },
};

const PurchasesContext = createContext<PurchasesStore>(unavailablePurchases);

const hasPro = (info: CustomerInfo) => Boolean(info.entitlements.active[PRO_ENTITLEMENT]);

export function PurchasesProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [configured, setConfigured] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const configuredRef = useRef(false);
  const revenueCatUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading || Platform.OS === 'web') return;

    const apiKey = Platform.select({
      ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
      android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
    })?.trim();

    if (!apiKey) {
      if (__DEV__) console.warn('[purchases] RevenueCat API key is not configured');
      return;
    }

    let cancelled = false;
    const update = (info: CustomerInfo) => {
      if (!cancelled) setIsPro(hasPro(info));
    };

    (async () => {
      if (!configuredRef.current) {
        if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        Purchases.configure({ apiKey, appUserID: user?.id ?? undefined });
        configuredRef.current = true;
        revenueCatUserRef.current = user?.id ?? null;
        Purchases.addCustomerInfoUpdateListener(update);
      } else if (user && revenueCatUserRef.current !== user.id) {
        const { customerInfo } = await Purchases.logIn(user.id);
        revenueCatUserRef.current = user.id;
        update(customerInfo);
      } else if (!user && revenueCatUserRef.current) {
        const customerInfo = await Purchases.logOut();
        revenueCatUserRef.current = null;
        update(customerInfo);
      }

      const customerInfo = await Purchases.getCustomerInfo();
      update(customerInfo);
      if (!cancelled) setConfigured(true);
    })().catch((error) => {
      if (__DEV__) console.warn('[purchases] RevenueCat setup failed', error);
    });

    return () => {
      cancelled = true;
      if (configuredRef.current) Purchases.removeCustomerInfoUpdateListener(update);
    };
  }, [loading, user]);

  const showPaywall = useCallback(async () => {
    if (!configuredRef.current) throw new Error('Purchases are not configured yet');
    const result = await RevenueCatUI.presentPaywall({ displayCloseButton: true });
    const purchased =
      result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED;
    if (purchased) setIsPro(hasPro(await Purchases.getCustomerInfo()));
    return purchased;
  }, []);

  const restorePurchases = useCallback(async () => {
    if (!configuredRef.current) throw new Error('Purchases are not configured yet');
    const customerInfo = await Purchases.restorePurchases();
    const active = hasPro(customerInfo);
    setIsPro(active);
    return active;
  }, []);

  const showCustomerCenter = useCallback(async () => {
    if (!configuredRef.current) throw new Error('Purchases are not configured yet');
    await RevenueCatUI.presentCustomerCenter();
    setIsPro(hasPro(await Purchases.getCustomerInfo()));
  }, []);

  const value = useMemo(
    () => ({ configured, isPro, showPaywall, restorePurchases, showCustomerCenter }),
    [configured, isPro, showPaywall, restorePurchases, showCustomerCenter]
  );

  return <PurchasesContext.Provider value={value}>{children}</PurchasesContext.Provider>;
}

export function usePurchases() {
  return useContext(PurchasesContext);
}
