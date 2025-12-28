import { useState, useEffect, useRef, Store } from "./core/hooks.js";
import { jsx } from "./core/jsx.js";
import { addRoute, navigate, replace } from "./core/route.js";
import { handleRouteChange } from "./core/route.js";

export const isHashchangeListening = { value: false };

window.addEventListener("popstate", () => {
  handleRouteChange(window.location.pathname);
});

/**
 * Initializes the routing system by setting up hash change listeners
 * Should be called automatically when the first route is registered
 * Listens for URL hash changes and triggers route handling
 *
 * @returns {void}
 *
 * @example
 * // Typically called internally, but can be called manually
 * startTransition();
 */
export function startTransition() {
  if (isHashchangeListening.value) {
    handleRouteChange();
    window.addEventListener("hashchange", handleRouteChange);
  }
  handleRouteChange(window.location.pathname);
}
export {
  useState,
  useEffect,
  useRef,
  jsx,
  addRoute,
  replace,
  Store,
  navigate,
  isHashchangeListening,
};
