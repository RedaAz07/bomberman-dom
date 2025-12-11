import { render } from "./render.js";

let states = [];
let stateIndex = 0;
let effects = [];
let effectIndex = 0;
let refs = [];
let refIndex = 0;
let isRenderScheduled = false;

export function scheduleRender() {
  // 1. If we already planned a render, don't plan another one.
  if (isRenderScheduled) return;

  // 2. Lock the scheduler
  isRenderScheduled = true;

  // 3. Queue the render in the Microtask queue
  // This runs immediately after your current function finishes,
  // but BEFORE the browser repaints.
  queueMicrotask(() => {
    stateIndex = 0;
    effectIndex = 0;
    refIndex = 0;
    render(); // Your main render function
    isRenderScheduled = false; // Unlock for next time
  });
}
/**
 * Resets all hook indices and clears pending effects
 * Called before each render to prepare for fresh hook execution
 * Ensures hooks are called in the same order every render
 *
 * @returns {void}
 */
export function clearhooks() {
  stateIndex = 0;
  effectIndex = 0;
  refIndex = 0;
}

export function clearStates() {
  states = [];
  refs = [];
  effects.forEach((hook) => {
    // If this hook has a cleanup function saved, run it!
    if (hook && hook.cleanup) {
      hook.cleanup();
    }
  });
  effects = [];
  clearhooks();
}

/**
 * React-style state hook for managing component state
 * Returns current state value and a setter function that triggers re-renders
 * Must be called in the same order on every render (don't call conditionally)
 *
 * @param {*} initialValue - Initial state value (only used on first render)
 * @returns {Array} Tuple of [currentState, setState] - state value and updater function
 *
 * @example
 * const [count, setCount] = useState(0);
 * setCount(count + 1); // Set new value
 * setCount(prev => prev + 1); // Functional update
 */
export function useState(initialValue) {
  const currentIndex = stateIndex;
  states[currentIndex] =
    states[currentIndex] !== undefined ? states[currentIndex] : initialValue;

  function setState(newValue) {
    if (typeof newValue === "function") {
      states[currentIndex] = newValue(states[currentIndex]);
    } else {
      // console.log(states, currentIndex);

      states[currentIndex] = newValue;
    }
    scheduleRender();
  }

  stateIndex++;

  return [states[currentIndex], setState];
}

/**
 * React-style effect hook for side effects (data fetching, subscriptions, DOM manipulation)
 * Runs the callback after render if dependencies have changed
 *
 * @param {Function} callback - Effect function to run (can return cleanup function)
 * @param {Array} dependencies - Array of values that trigger re-run when changed
 * @returns {void}
 *
 * @example
 * // Run once on mount
 * useEffect(() => { console.log('Mounted'); }, []);
 *
 * // Run when count changes
 * useEffect(() => { document.title = `Count: ${count}`; }, [count]);
 */
export function useEffect(callback, dependencies) {
  if (!Array.isArray(dependencies) && dependencies !== undefined) {
    console.error("useEffect second argument must be an array or undefined");
    return;
  }
  const currentIndex = effectIndex;

  const oldHook = effects[currentIndex];

  // 1. Check if dependencies changed
  // If no dependencies array is passed, it always changes.
  const hasChanged = areDepsChanged(
    oldHook ? oldHook.deps : undefined,
    dependencies
  );

  // 2. If dependencies changed, we need to run the effect
  if (hasChanged) {
    // MICROTASK QUEUE:
    // We shouldn't run effects immediately during render!
    // We queue them to run AFTER the UI is updated.
    queueMicrotask(() => {
      // A. CLEANUP PHASE:
      // If there was a previous effect, run its cleanup function first.
      if (oldHook && oldHook.cleanup) {
        oldHook.cleanup();
      }

      // B. EXECUTION PHASE:
      // Run the effect and save the "return" value as the new cleanup.
      const cleanupFunction = callback();

      // C. SAVE STATE:
      // Save the cleanup function and dependencies for the next render.
      effects[currentIndex] = {
        deps: dependencies,
        cleanup: cleanupFunction, // <--- THIS is the "return" value
      };
      console.log("qsdqs", effects, currentIndex);
    });
  }

  effectIndex++;
}

/**
 * Checks if effect dependencies have changed between renders
 * Compares old and new dependency arrays using shallow equality
 *
 * @param {Array|undefined} oldDeps - Previous dependency array
 * @param {Array} newDeps - Current dependency array
 * @returns {boolean} True if dependencies changed or it's first render, false otherwise
 */
function areDepsChanged(oldDeps, newDeps) {
  if (!oldDeps) return true;
  if (oldDeps.length !== newDeps.length) return true;

  for (let i = 0; i < newDeps.length; i++) {
    if (oldDeps[i] !== newDeps[i]) return true;
  }
  return false;
}

/**
 * Creates a global store for managing shared state across components
 * Provides a simple alternative to Context API without requiring Provider wrappers
 * Automatically triggers re-renders when state is updated
 *
 * @param {Object|*} [initialState=null] - Initial state value (typically an object)
 * @returns {Object} Store object with get and set methods
 * @property {Function} get - Returns the current state
 * @property {Function} set - Merges new state with current state and triggers re-render
 *
 * @example
 * // Create a store for user authentication
 * const userStore = Store({ name: 'Guest', loggedIn: false });
 *
 * // Read state in any component
 * const user = userStore.get();
 *
 * // Update state (merges with existing state)
 * userStore.set({ name: 'John', loggedIn: true });
 *
 * @example
 * // Create multiple stores for different concerns
 * const themeStore = Store({ mode: 'light', fontSize: 14 });
 * const cartStore = Store({ items: [], total: 0 });
 *
 * // Partial updates
 * themeStore.set({ mode: 'dark' }); // Only updates mode, fontSize remains 14
 */
export function Store(initialState) {
  let state = initialState === undefined ? null : initialState;

  const get = () => state;

  const set = (newState) => {
    state = { ...state, ...newState };
    render();
  };

  return { get, set };
}

/**
 * React-style ref hook for creating mutable references
 * Returns a ref object with a .current property that persists across renders
 *
 * @param {*} initialValue - Initial value for the ref's current property
 * @returns {Object} Ref object with a mutable .current property
 *
 * @example
 * const myRef = useRef(null);
 * myRef.current = someValue;
 */
export function useRef(initialValue) {
  const currentRefIndex = refIndex;
  refs[currentRefIndex] =
    refs[currentRefIndex] !== undefined
      ? refs[currentRefIndex]
      : { current: initialValue };
  refIndex++;
  return refs[currentRefIndex];
}