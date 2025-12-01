import { pindingEffects, clearhooks } from "./hooks.js";
import { updateElement } from "./diff.js";
document.body.innerHTML = ""; // wipe everything
const root = document.body;
let rootElements;
let oldVDOM;

/**
 * Main render function that updates the DOM based on virtual DOM changes
 * Executes pending effects, generates new virtual DOM, and patches the real DOM
 * Uses efficient diffing algorithm to minimize DOM operations
 *
 * @param {Function} [App] - Root component function to render (optional after first call)
 * @returns {void}
 *
 * @example
 * // Initial render
 * render(() => <App />);
 *
 * // Re-render (called automatically by setState)
 * render();
 */
export function render(App) {
  if (App) rootElements = App;
  pindingEffects.forEach((fn) => fn());

  clearhooks();
  const newVDOM = rootElements(); // new virtual DOM

  updateElement(root, newVDOM, oldVDOM); // diff & patch
  oldVDOM = newVDOM; // save for next render
}
