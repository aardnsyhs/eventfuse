const guards = new Set<() => boolean | Promise<boolean>>();
export function guardNavigation(allow: () => boolean | Promise<boolean>) {
  guards.add(allow);
  return () => {
    guards.delete(allow);
  };
}
export function subscribeNavigation(notify: () => void) {
  let currentHash = window.location.hash;
  let pending = false;
  let active = true;
  const changed = async () => {
    const target = window.location.hash;
    if (target === currentHash) return;
    if (pending) {
      history.replaceState(null, "", currentHash || "#landing");
      return;
    }
    if (guards.size) {
      history.replaceState(null, "", currentHash || "#landing");
      pending = true;
      try {
        for (const allow of [...guards]) if (!(await allow())) return;
        if (!active) return;
        history.replaceState(null, "", target);
      } finally {
        pending = false;
      }
    }
    if (active) {
      currentHash = target;
      notify();
    }
  };
  window.addEventListener("hashchange", changed);
  return () => {
    active = false;
    window.removeEventListener("hashchange", changed);
  };
}
