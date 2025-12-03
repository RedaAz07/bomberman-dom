import { pindingEffects, clearhooks } from "./hooks.js";
import { updateElement } from "./diff.js";

let root = null;
let rootElements;
let oldVDOM;

/**
 * Gets or creates the root element for rendering
 * @returns {HTMLElement} The root DOM element
 */
function getRoot() {
  if (!root) {
    root = document.getElementById("root");
    if (!root) {
      document.body.innerHTML = "";
      root = document.body;
    }
  }
}

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
  getRoot();
  if (App) rootElements = App;
  
  
  clearhooks();
  const newVDOM = rootElements(); // new virtual DOM
  
  updateElement(root, newVDOM, oldVDOM); // diff & patch
  oldVDOM = newVDOM; // save for next render
  pindingEffects.forEach((fn) => fn());
}
