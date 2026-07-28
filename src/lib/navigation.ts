import type { useRouter } from 'expo-router';

type Router = ReturnType<typeof useRouter>;

/**
 * router.back() throws "the action 'GO_BACK' was not handled" whenever
 * there's no screen to pop to — reachable any time a screen turns out to be
 * the first entry in its stack (a fresh deep link, or just an unlucky
 * navigation sequence). Every back/cancel/close button should fall back to
 * a known screen instead of assuming history exists, the same guard
 * recipe/[id].tsx and cookbooks/[id].tsx already use.
 */
export function safeBack(router: Router, fallback: Parameters<Router['replace']>[0]) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
