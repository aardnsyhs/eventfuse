const guards = new Set<() => boolean>();
export function guardNavigation(allow: () => boolean) {
  guards.add(allow);
  return () => {
    guards.delete(allow);
  };
}
export function subscribeNavigation(notify: () => void) {
  let currentHash = window.location.hash;
  const changed = () => {
    if ([...guards].some((allow) => !allow())) {
      history.replaceState(null, "", currentHash || "#landing");
      return;
    }
    currentHash = window.location.hash;
    notify();
  };
  window.addEventListener("hashchange", changed);
  return () => window.removeEventListener("hashchange", changed);
}
