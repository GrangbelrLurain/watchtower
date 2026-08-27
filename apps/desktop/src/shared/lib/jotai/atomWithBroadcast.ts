import { atom, type WritableAtom } from "jotai";

/**
 * Creates a Jotai atom that synchronizes its state across different windows/tabs
 * using the BroadcastChannel API.
 */
export function atomWithBroadcast<T>(
  key: string,
  initialValue: T,
  baseAtom?: WritableAtom<T, [T | ((prev: T) => T)], void>,
) {
  const innerAtom = baseAtom ?? atom(initialValue);
  const channel = new BroadcastChannel(`jotai-sync-${key}`);

  // Flag to prevent recursive broadcasting
  let isRemoteUpdate = false;

  const derivedAtom = atom(
    (get) => get(innerAtom),
    (get, set, update: T | ((prev: T) => T)) => {
      const current = get(innerAtom);
      const nextValue = typeof update === "function" ? (update as (prev: T) => T)(current) : update;

      // Basic equality check to avoid redundant updates
      if (current === nextValue) {
        return;
      }

      set(innerAtom, nextValue);

      // Only broadcast if the update originated locally (not from the listener)
      if (!isRemoteUpdate) {
        channel.postMessage(nextValue);
      }
    },
  );

  derivedAtom.onMount = (setAtom) => {
    const listener = (event: MessageEvent) => {
      isRemoteUpdate = true;
      try {
        setAtom(event.data);
      } finally {
        isRemoteUpdate = false;
      }
    };
    channel.addEventListener("message", listener);
    return () => {
      channel.removeEventListener("message", listener);
    };
  };

  return derivedAtom;
}
