"use client";

// Two small rules shared by the players on / and /loop, and by the other
// places where a control disappears while a keyboard user is on it.

import { useCallback, useEffect, useRef, type SyntheticEvent } from "react";

// The step keys are listened for on window, so they must leave alone any key
// aimed at a control — Space on a <summary> opens it, Space on a button presses
// it, arrows on a tab move between tabs — and any key with a modifier, which
// belongs to the browser (Alt+← is Back).
const CONTROL =
  "a[href], button, input, select, textarea, summary, [role='tab'], [role='button'], [contenteditable='true']";

export function isForAControl(e: KeyboardEvent): boolean {
  if (e.altKey || e.ctrlKey || e.metaKey) return true;
  const target = e.target as Element | null;
  return !!target?.closest?.(CONTROL);
}

/**
 * Keep focus on a control that changes element under the reader.
 *
 * On the last step the primary button becomes a link to the next stop; React
 * replaces the node, and whoever pressed it with the keyboard is left on
 * <body>. Pass `ref` to every element that can hold the role and call
 * `pressed(e)` from its onClick: when `step` changes and focus has fallen to
 * <body>, it moves to whatever element holds the ref now.
 */
export function useFocusFollows(step: unknown) {
  const node = useRef<HTMLElement | null>(null);
  const held = useRef(false);
  useEffect(() => {
    if (!held.current) return;
    held.current = false;
    const now = document.activeElement;
    if (!now || now === document.body) node.current?.focus();
  }, [step]);
  const ref = useCallback((el: HTMLElement | null) => {
    node.current = el;
  }, []);
  const pressed = useCallback((e: SyntheticEvent) => {
    held.current = document.activeElement === e.currentTarget;
  }, []);
  return { ref, pressed };
}

/** Focus `el` if focus has fallen to <body> — after the control it was on went away. */
export function refocusIfLost(el: HTMLElement | null | undefined) {
  const now = document.activeElement;
  if (el && (!now || now === document.body)) el.focus();
}
