import appJson from '../../app.json';
import easJson from '../../eas.json';

/**
 * Cleartext HTTP on Android, which has to be on for development and off for
 * anything that reaches the Play Store.
 *
 * Development genuinely needs it: EXPO_PUBLIC_API_URL is a LAN address over
 * plain http, and Android has blocked cleartext by default since API 28, so a
 * dev build cannot reach the backend without it. Shipping it is another
 * matter — it disables transport security for the whole app.
 *
 * Two separate things have to hold, and they fail differently: app.config.js
 * has to react to the flag, and eas.json has to actually set it. The second is
 * the one that would be silent — a perfectly correct config file that nothing
 * ever tells to turn anything off.
 */

type Plugin = string | [string, Record<string, { usesCleartextTraffic?: boolean }>];
type ConfigFn = (arg: { config: unknown }) => { plugins: Plugin[] };

/**
 * app.config.js reads the environment once at module load, so each case needs
 * a fresh module registry rather than just a reassignment.
 */
const resolvePlugins = (allowCleartext?: string): Plugin[] => {
  jest.resetModules();
  if (allowCleartext === undefined) delete process.env.ALLOW_CLEARTEXT_HTTP;
  else process.env.ALLOW_CLEARTEXT_HTTP = allowCleartext;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const configFn = require('../../app.config.js') as ConfigFn;
  return configFn({ config: appJson.expo }).plugins;
};

const cleartextSetting = (plugins: Plugin[]): boolean | undefined => {
  const entry = plugins.find(
    (p): p is [string, Record<string, { usesCleartextTraffic?: boolean }>] =>
      Array.isArray(p) && p[0] === 'expo-build-properties'
  );
  return entry?.[1].android?.usesCleartextTraffic;
};

const originalEnv = process.env.ALLOW_CLEARTEXT_HTTP;
afterAll(() => {
  if (originalEnv === undefined) delete process.env.ALLOW_CLEARTEXT_HTTP;
  else process.env.ALLOW_CLEARTEXT_HTTP = originalEnv;
});

describe('app.config.js', () => {
  it('turns cleartext off when the build asks it to', () => {
    expect(cleartextSetting(resolvePlugins('false'))).toBe(false);
  });

  it('leaves it on for a build that asks for it', () => {
    expect(cleartextSetting(resolvePlugins('true'))).toBe(true);
  });

  it('leaves it on when nothing has been said, which is the local case', () => {
    // `expo start`, a dev client, a test run — none of these set the flag, and
    // all of them need to reach a LAN backend over http.
    expect(cleartextSetting(resolvePlugins(undefined))).toBe(true);
  });

  it('leaves every other plugin exactly as it was', () => {
    // The setting is applied by rewriting one entry in the plugin array, so
    // the obvious way to break this is to mangle the rest of it.
    const before = appJson.expo.plugins;
    const after = resolvePlugins('false');

    expect(after).toHaveLength(before.length);
    const names = (list: unknown[]) => list.map((p) => (Array.isArray(p) ? p[0] : p));
    expect(names(after)).toEqual(names(before));
  });
});

describe('eas.json', () => {
  it('tells the production build to turn cleartext off', () => {
    // Without this the config file above is correct and inert, and the
    // release ships with transport security disabled anyway.
    //
    // The name has to match what app.config.js reads, which is why this is a
    // test and not a comment. It cannot be EAS_BUILD_PROFILE: EAS's built-in
    // variables are not available while the dynamic app config is evaluated,
    // so keying off one reads undefined and leaves cleartext on in exactly
    // the build that must not have it. Switching to that would fail the
    // 'turns cleartext off when the build asks it to' case above.
    expect(easJson.build.production.env.ALLOW_CLEARTEXT_HTTP).toBe('false');
  });
});
