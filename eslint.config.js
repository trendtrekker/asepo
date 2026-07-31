// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // Build output and Expo's generated router types — nothing here is hand
    // written, and .expo/types/router.d.ts doesn't parse under this config.
    ignores: ["dist/*", ".expo/*"],
  }
]);
