/**
 * JSX factory function that creates virtual DOM nodes
 * This function is called by the JSX transpiler to convert JSX syntax into JavaScript objects
 *
 * @param {string|Function} type - The type of element (e.g., 'div', 'span') or a component function
 * @param {Object|null} props - Properties/attributes to apply to the element (className, id, event handlers, etc.)
 * @param {...*} children - Child elements (can be nested arrays, strings, numbers, or other virtual nodes)
 * @returns {Object} Virtual DOM node with structure { type, props, children }
 *
 * @example
 * // JSX: <div className="container">Hello</div>
 * // Becomes: jsx('div', { className: 'container' }, 'Hello')
 * // Returns: { type: 'div', props: { className: 'container' }, children: ['Hello'] }
 */
export function jsx(type, props, ...children) {
  const flatChildren = children
    .flat(Infinity)
    .filter(
      (child) =>
        child !== false &&
        child !== null &&
        child !== undefined &&
        child !== true
    );

  return {
    type,
    props: props || {},
    children: flatChildren,
  };
}
