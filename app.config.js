/**
 * Dynamic layer over app.json.
 *
 * Expo reads app.json first and hands the normalised result here as `config`,
 * so app.json stays the place to look for everything static and this file only
 * covers what has to differ between builds.
 *
 * Right now that is one thing: cleartext HTTP on Android.
 *
 * The dev loop needs it — EXPO_PUBLIC_API_URL points at a LAN address over
 * plain http during development, and Android blocks cleartext by default since
 * API 28, so a dev build simply cannot reach the backend without it. A release
 * on the Play Store must not have it, since it disables transport security for
 * the whole app.
 *
 * Driven by an explicit env var rather than by EAS_BUILD_PROFILE, which would
 * look like it worked and quietly not: built-in EAS variables "are not
 * available when evaluating app.config.js", so a profile check would read
 * undefined during config resolution and leave cleartext enabled in exactly
 * the build that must not have it. Variables declared in a profile's `env` in
 * eas.json are available at that point, so that is what this reads.
 *
 * Unset means allowed, because unset is the local case — `expo start`, a dev
 * client, a test run — and the production profile names it explicitly.
 */

const allowCleartext = process.env.ALLOW_CLEARTEXT_HTTP !== 'false';

/** Rewrites the expo-build-properties entry, leaving every other plugin be. */
function withCleartextSetting(plugins, allow) {
  return (plugins ?? []).map((plugin) => {
    // Plugins are either a bare name or a [name, props] pair.
    if (!Array.isArray(plugin) || plugin[0] !== 'expo-build-properties') return plugin;

    const [name, props = {}] = plugin;
    return [name, { ...props, android: { ...props.android, usesCleartextTraffic: allow } }];
  });
}

module.exports = ({ config }) => ({
  ...config,
  plugins: withCleartextSetting(config.plugins, allowCleartext),
});
