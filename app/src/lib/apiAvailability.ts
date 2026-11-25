let unavailable = false;
const listeners = new Set<() => void>();

function updateAvailability(nextUnavailable: boolean) {
  if (unavailable === nextUnavailable) return;
  unavailable = nextUnavailable;
  listeners.forEach((listener) => listener());
}

export function reportApiUnavailable() {
  updateAvailability(true);
}

export function reportApiAvailable() {
  updateAvailability(false);
}

export function getApiUnavailableSnapshot() {
  return unavailable;
}

export function subscribeToApiAvailability(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
