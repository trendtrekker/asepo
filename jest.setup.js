// Async-storage has no real native module in the Jest environment (there's no
// device/simulator behind it) — the package ships its own mock specifically
// for this. Without it, anything that imports AsyncStorage (even indirectly,
// e.g. through theme-context.tsx) crashes the whole test suite with
// "NativeModule: AsyncStorage is null."
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
