"use client";

import * as React from "react";

export function useMediaQuery(query: string, fallback = false): boolean {
  const subscribe = React.useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => fallback,
  );
}

/** True on phones and tablets, where the main input is a finger and nothing can hover. */
export function useTouchDevice(): boolean {
  return useMediaQuery("(hover: none)");
}

let leavingOverlayUntil = 0;

/**
 * Call right before navigating away from an open overlay (for example a link inside
 * it). The overlay then leaves the browser history alone while the navigation runs,
 * so closing it can never cancel that navigation.
 */
export function leavingOverlay() {
  leavingOverlayUntil = Date.now() + 2000;
}

/**
 * Makes the Back button (Android back, iOS edge swipe, browser back) close an open
 * overlay instead of leaving the page. While `open`, one history entry is added;
 * Back removes it and calls `onClose`. Closing any other way removes the entry again.
 */
export function useBackToClose(open: boolean, onClose: () => void) {
  const closeRef = React.useRef(onClose);
  closeRef.current = onClose;

  React.useEffect(() => {
    if (!open) return;
    const id = `overlay-${Math.random().toString(36).slice(2)}`;
    let pushed = false;
    // One tick late, so React Strict Mode's mount/unmount/mount in development
    // never adds the entry twice.
    const timer = window.setTimeout(() => {
      window.history.pushState({ overlay: id }, "");
      pushed = true;
    }, 0);
    const onPop = () => {
      if (!pushed) return;
      if (window.history.state?.overlay === id) return; // an overlay stacked above this one went away
      pushed = false;
      closeRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("popstate", onPop);
      if (pushed && window.history.state?.overlay === id && Date.now() > leavingOverlayUntil) {
        window.history.back();
      }
    };
  }, [open]);
}

export type SwipeDirection = "left" | "right" | "up" | "down";

/** Classifies a finger movement in pixels. Taps and diagonal drags return null. */
export function swipeDirection(dx: number, dy: number): SwipeDirection | null {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax >= 50 && ax > ay * 1.4) return dx < 0 ? "left" : "right";
  if (ay >= 70 && ay > ax * 1.4) return dy < 0 ? "up" : "down";
  return null;
}

/**
 * One-finger swipe gestures for an element: spread the result onto it. Built on touch
 * events, so a mouse on a computer never triggers it, and pinch-to-zoom keeps working.
 * Two-finger gestures, and swipes while the page is zoomed in (the finger is moving
 * around the zoomed picture), are ignored.
 */
export function useSwipe(handlers: Partial<Record<SwipeDirection, () => void>>) {
  const latest = React.useRef(handlers);
  latest.current = handlers;
  const start = React.useRef<{ x: number; y: number } | null>(null);

  return React.useMemo(
    () => ({
      onTouchStart(e: React.TouchEvent) {
        const t = e.touches[0];
        start.current = e.touches.length === 1 && t ? { x: t.clientX, y: t.clientY } : null;
      },
      onTouchEnd(e: React.TouchEvent) {
        const from = start.current;
        start.current = null;
        const t = e.changedTouches[0];
        if (!from || !t || e.touches.length > 0) return;
        if ((window.visualViewport?.scale ?? 1) > 1.01) return;
        const direction = swipeDirection(t.clientX - from.x, t.clientY - from.y);
        if (direction) latest.current[direction]?.();
      },
      onTouchCancel() {
        start.current = null;
      },
    }),
    [],
  );
}

/** Calls onVisible when the returned ref's element scrolls into view. */
export function useInView<T extends Element>(onVisible: () => void, enabled: boolean) {
  const ref = React.useRef<T | null>(null);
  const callback = React.useRef(onVisible);
  callback.current = onVisible;

  React.useEffect(() => {
    const node = ref.current;
    if (!node || !enabled) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) callback.current();
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled]);

  return ref;
}

export function useDebounced<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/** Re-renders every `ms` so relative timestamps stay fresh. */
export function useNow(ms = 60_000): number {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
