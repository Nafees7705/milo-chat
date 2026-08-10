"use client";

import { useSyncExternalStore } from "react";
import { MoonIcon, SunIcon } from "./Icons";

const themeListeners = new Set<() => void>();

function notifyThemeChange() {
  for (const listener of themeListeners) listener();
}

function getThemeSnapshot(): "dark" | "light" {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function subscribeTheme(listener: () => void) {
  themeListeners.add(listener);
  return () => {
    themeListeners.delete(listener);
  };
}

function applyTheme(value: "dark" | "light") {
  document.documentElement.setAttribute("data-theme", value);
  try {
    localStorage.setItem("milo-theme", value);
  } catch {}
  notifyThemeChange();
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribeTheme, getThemeSnapshot, () => "light") === "dark";

  const toggle = () => {
    applyTheme(dark ? "light" : "dark");
  };

  return (
    <button
      className="icon-btn"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title="Theme"
    >
      {dark ? <SunIcon width={16} height={16} /> : <MoonIcon width={16} height={16} />}
    </button>
  );
}