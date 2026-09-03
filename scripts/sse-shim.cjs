/**
 * Test-harness shim for use-sync-external-store, used ONLY by scripts/render.tsx.
 *
 * zustand passes `api.getInitialState` as the server snapshot, so a server
 * render always reflects the store's state at creation time regardless of any
 * mutation made before rendering. That is correct for hydration and wrong for a
 * smoke test. This shim reads the live snapshot instead, which is what the
 * browser does. It is never bundled into the app.
 */
function useSyncExternalStoreWithSelector(subscribe, getSnapshot, getServerSnapshot, selector, isEqual) {
  return selector ? selector(getSnapshot()) : getSnapshot();
}
module.exports = { useSyncExternalStoreWithSelector, useSyncExternalStore: (s, g) => g() };
module.exports.default = module.exports;
