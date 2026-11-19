"use client";

import * as React from "react";

// Field types that open the on-screen keyboard.
const NO_KEYBOARD = new Set(["button", "checkbox", "color", "file", "hidden", "image", "radio", "range", "reset", "submit"]);

function opensKeyboard(el: Element | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  if (el instanceof HTMLTextAreaElement) return !el.readOnly && !el.disabled;
  if (el instanceof HTMLInputElement) return !el.readOnly && !el.disabled && !NO_KEYBOARD.has(el.type);
  return false;
}

/**
 * Publishes the visible part of the screen as CSS variables so phone layouts can
 * stay above the on-screen keyboard:
 *   --vvh  visible height, --vvo  how far iOS has panned the page, --kb  keyboard height
 * and sets <html data-keyboard="open"> while typing on a touch screen (tab bars hide).
 */
export function ViewportVars() {
  React.useEffect(() => {
    const root = document.documentElement;
    const vv = window.visualViewport;
    const coarse = window.matchMedia("(pointer: coarse)");
    let frame = 0;

    const update = () => {
      frame = 0;
      const zoomed = vv ? Math.abs(vv.scale - 1) > 0.01 : false;
      const height = vv && !zoomed ? vv.height : window.innerHeight;
      const offset = vv && !zoomed ? Math.max(0, vv.offsetTop) : 0;
      const keyboard = vv && !zoomed ? Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)) : 0;
      root.style.setProperty("--vvh", `${Math.round(height)}px`);
      root.style.setProperty("--vvo", `${Math.round(offset)}px`);
      root.style.setProperty("--kb", `${keyboard}px`);
      const typing = coarse.matches && opensKeyboard(document.activeElement);
      if (typing || keyboard > 80) root.dataset.keyboard = "open";
      else delete root.dataset.keyboard;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    // Focus moves through <body> between fields; look again once it settles.
    const onFocusOut = () => setTimeout(schedule, 60);

    update();
    vv?.addEventListener("resize", schedule);
    vv?.addEventListener("scroll", schedule);
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);
    document.addEventListener("focusin", schedule);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      cancelAnimationFrame(frame);
      vv?.removeEventListener("resize", schedule);
      vv?.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      document.removeEventListener("focusin", schedule);
      document.removeEventListener("focusout", onFocusOut);
      delete root.dataset.keyboard;
    };
  }, []);

  return null;
}
