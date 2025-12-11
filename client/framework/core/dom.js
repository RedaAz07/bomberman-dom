/**
 * Converts a virtual DOM node into a real DOM element
 * Recursively creates DOM elements with their attributes, event listeners, and children
 *
 * @param {Object|string|number} node - Virtual DOM node to convert
 * @param {string} node.type - HTML tag name (e.g., 'div', 'span', 'button')
 * @param {Object} node.props - Element properties (className, id, event handlers, etc.)
 * @param {Array} node.children - Array of child virtual nodes
 * @returns {HTMLElement|Text} Real DOM element or text node
 *
 * @example
 * const vNode = { type: 'div', props: { className: 'box' }, children: ['Hello'] };
 * const domElement = createElement(vNode);
 * // Returns: <div class="box">Hello</div>
 */
export function createElement(node) {
  if (typeof node === "string" || typeof node === "number") {
    return document.createTextNode(String(node));
  }

  const el = document.createElement(node.type);

  for (const [key, value] of Object.entries(node.props)) {
    if (key === "ref") {
      if (typeof value === "object" && value !== null) {
        value.current = el;
      }else if (typeof value === "function") {
        value(el);
      }
    } else if (key.startsWith("on") && typeof value === "function") {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === "className") {
      el.className = value;
    } else if (key === "id") {
      el.id = value;
    } else if (key === "autoFocus" && value === true) {
      // Delay focus until node is mounted
      setTimeout(() => {
        el.focus();
        if (el.DOCUMENT_TYPE_NODE === "input") {

          const len = el.value?.length || 0;
          el.setSelectionRange(len, len);
        }
      }, 0);
    } else if (key === "checked") {
      el.checked = value;
    } else if (key === "style" && typeof value === "object") {
      Object.assign(el.style, value);
    } else {
      el.setAttribute(key, value);
    }
  }

  node.children.forEach((child) => {
    el.appendChild(createElement(child));
  });

  return el;
}