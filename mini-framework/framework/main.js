import { useState, useEffect, useRef, Store } from "./core/hooks.js";
import { jsx } from "./core/jsx.js";
import { addRoute } from "./core/route.js";
import { handleRouteChange } from "./core/route.js";

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
  handleRouteChange();
  window.addEventListener("hashchange", handleRouteChange);
}
export { useState, useEffect, useRef, jsx, addRoute, Store };
