// Async-storage has no real native module in the Jest environment (there's no
// device/simulator behind it) — the package ships its own mock specifically
// for this. Without it, anything that imports AsyncStorage (even indirectly,
// e.g. through theme-context.tsx) crashes the whole test suite with
// "NativeModule: AsyncStorage is null."
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockCustomerInfo = { entitlements: { active: {} } };

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    addCustomerInfoUpdateListener: jest.fn(),
    configure: jest.fn(),
    getCustomerInfo: jest.fn(async () => mockCustomerInfo),
    logIn: jest.fn(async () => ({ customerInfo: mockCustomerInfo })),
    logOut: jest.fn(async () => mockCustomerInfo),
    removeCustomerInfoUpdateListener: jest.fn(),
    restorePurchases: jest.fn(async () => mockCustomerInfo),
    setLogLevel: jest.fn(),
  },
  LOG_LEVEL: { DEBUG: 'DEBUG' },
}));

jest.mock('react-native-purchases-ui', () => ({
  __esModule: true,
  default: {
    presentCustomerCenter: jest.fn(async () => undefined),
    presentPaywall: jest.fn(async () => 'CANCELLED'),
  },
  PAYWALL_RESULT: {
    PURCHASED: 'PURCHASED',
    RESTORED: 'RESTORED',
  },
}));
