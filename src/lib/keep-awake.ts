import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect } from 'react';

/**
 * Keeps the screen on, safely.
 *
 * expo-keep-awake's own `useKeepAwake` releases the lock on unmount without
 * checking whether activation finished. Its web implementation throws
 * ERR_KEEP_AWAKE_TAG_INVALID ("the wake lock with tag … has not activated yet")
 * when the tag isn't in its map, so unmounting during activation — or a browser
 * refusing the lock because the tab is hidden — surfaces as an uncaught error.
 *
 * This version only releases a lock it actually acquired, and treats failure to
 * acquire as non-fatal: the screen may sleep, but cooking still works.
 */
export function useKeepScreenAwake(tag = 'asepo-cook-mode') {
  useEffect(() => {
    let activated = false;
    let cancelled = false;

    function release() {
      if (!activated) return;
      activated = false;
      deactivateKeepAwake(tag).catch(() => {});
    }

    activateKeepAwakeAsync(tag)
      .then(() => {
        activated = true;
        // Unmounted while the request was in flight — release immediately.
        if (cancelled) release();
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      release();
    };
  }, [tag]);
}
