import appJson from '../../../app.json';

/**
 * What actually ships, rather than what app.json says: a dynamic app.config.js
 * gets the last word, so asserting against the static file alone would pass
 * happily while the built app disagreed.
 */
type AppearanceConfig = {
  userInterfaceStyle?: string;
  ios?: { userInterfaceStyle?: string };
  android?: { userInterfaceStyle?: string };
};

const appConfig = (): AppearanceConfig => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const configFn = require('../../../app.config.js') as (a: {
    config: unknown;
  }) => AppearanceConfig;
  return configFn({ config: appJson.expo });
};

/**
 * AsepoThemeProvider's "Auto" mode reads useColorScheme(), and what that
 * returns on a device is decided by app.json, not by any code the theme owns.
 * Per the SDK 57 config reference, userInterfaceStyle: 'light' will "restrict
 * the app to support light theme only" — so with it set, useColorScheme()
 * answers 'light' forever and Auto silently never darkens.
 *
 * This is worth a test precisely because nothing else catches it. It is a
 * config value with no compile-time link to the theme, and react-native-web
 * ignores it entirely and reads the browser's media query instead — so the
 * feature keeps working in the web preview while being dead on device. That
 * is exactly how it shipped broken alongside the commit that added Auto.
 *
 * Note that the property cannot simply be dropped: the documented default is
 * 'light', so following the system has to be asked for explicitly.
 */

describe('app.json appearance configuration', () => {
  it('lets the OS decide the appearance, so Auto can follow it', () => {
    expect(appConfig().userInterfaceStyle).toBe('automatic');
  });

  it('does not re-pin the appearance per platform', () => {
    // A platform block overrides the top-level value, which would reintroduce
    // the bug on that platform alone — the harder version to notice.
    const { ios, android } = appConfig();
    expect(ios?.userInterfaceStyle ?? 'automatic').toBe('automatic');
    expect(android?.userInterfaceStyle ?? 'automatic').toBe('automatic');
  });

  it('keeps expo-system-ui, which Android needs for this to take effect', () => {
    // "Requires expo-system-ui be installed in your project to work on
    // Android" — SDK 57 config reference. Removing it as an unused dependency
    // would quietly restore light-only behaviour there.
    const { dependencies } = require('../../../package.json') as {
      dependencies: Record<string, string>;
    };
    expect(dependencies['expo-system-ui']).toBeDefined();
  });
});
