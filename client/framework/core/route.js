import { startTransition } from "../main.js";
import { notFound } from "./notfound.js";
import { render } from "./render.js";

const routes = {};
let timedout;
/**
 * Registers a route with its corresponding component callback
 * Routes are matched against the URL hash (e.g., #/about, #/contact)
 * Automatically initializes routing system on first route registration
 *
 * @param {string} path - URL path to match (e.g., '/', '/about', '/contact')
 * @param {Function} callback - Component function to render when route matches
 * @returns {void}
 *
 * @example
 * addRoute('/', () => <HomePage />);
 * addRoute('/about', () => <AboutPage />);
 */
export function addRoute(path, callback) {
  if (routes[path]) return;

  routes[path] = callback;
  if (timedout) clearTimeout(timedout);
  timedout = setTimeout(() => {
    startTransition(false);
  }, 0);
}

/**
 * Handles route changes by reading the URL hash and rendering the matching component
 * Called automatically when the hash changes or when routes are registered
 * Defaults to '/' if no hash is present in the URL
 *
 * @returns {void}
 *
 * @example
 * // Automatically called when user navigates
 * // window.location.hash = '#/about' -> renders About component
 */

export function handleRouteChange(path) {
  const route = path || window.location.hash.slice(1) || "/";
  if (routes[route]) {
    render(routes[route]);
  } else {
    render(notFound);
  }
}

export const navigate = (path) => {
  history.pushState(null, null, `${path}`);

  if (routes[path]) {
    render(routes[path]);
  } else {
    render(notFound);
  }
};
// --- NEW FUNCTION ---
// Replaces the current history entry instead of adding a new one.
// This prevents the "Back" button from going to the previous page (Lobby).
export const replace = (path) => {
  history.replaceState(null, null, `${path}`);
  
  if (routes[path]) {
    render(routes[path]);
  } else {
    render(notFound);
  }
};