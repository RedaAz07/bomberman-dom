import { createElement } from "./dom.js";

/**
 * Key-based reconciliation for efficient diffing
 * @param {HTMLElement} parent - Parent DOM node
 * @param {Array} newChildren - New virtual children
 * @param {Array} oldChildren - Old virtual children
 */
function reconcileChildren(parent, newChildren, oldChildren) {
  if (!parent || parent.nodeType !== Node.ELEMENT_NODE) {
    console.error("reconcileChildren: invalid parent", parent);
    return;
  }
  // Build maps of keyed elements
  const oldKeyed = new Map();
  const newKeyed = new Map();

  // Track old nodes by key
  oldChildren.forEach((child, i) => {
    if (child && typeof child === "object" && child.props?.key != null) {
      oldKeyed.set(child.props.key, { node: child, index: i });
    }
  });

  // Track new nodes by key
  newChildren.forEach((child, i) => {
    if (child && typeof child === "object" && child.props?.key != null) {
      newKeyed.set(child.props.key, { node: child, index: i });
    }
  });

  // Track which DOM nodes we've processed
  const processedIndices = new Set();
  const domNodes = Array.from(parent.childNodes);

  // First pass: Update or move keyed elements
  newChildren.forEach((newChild, newIndex) => {
    if (!newChild) return;

    const key = typeof newChild === "object" ? newChild.props?.key : null;

    const { node: oldChild, index: oldIndex } = oldKeyed.get(key) || {};
    const domNode = domNodes[oldIndex];
    if (key != null && oldKeyed.has(key) && domNode) {
      // Move DOM node if needed
      const currentDomIndex = Array.from(parent.childNodes).indexOf(domNode);

      if (currentDomIndex !== newIndex) {
        const referenceNode = parent.childNodes[newIndex];

        if (referenceNode) {
          parent.insertBefore(domNode, referenceNode);
        } else {
          parent.appendChild(domNode);
        }
      }

      // Update the element in place
      updateElementProps(domNode, newChild, oldChild);

      // Recursively diff children
      if (newChild.children && oldChild.children) {
        reconcileChildren(domNode, newChild.children, oldChild.children);
      }

      processedIndices.add(oldIndex);
    } else if (key != null) {
      // New keyed element - insert it
      const newDomNode = createElement(newChild);
      const referenceNode = parent.childNodes[newIndex];
      if (referenceNode) {
        parent.insertBefore(newDomNode, referenceNode);
      } else {
        parent.appendChild(newDomNode);
      }
    } else {
      // Non-keyed element - use index-based diffing
      const oldChild = oldChildren[newIndex];
      updateElement(parent, newChild, oldChild, newIndex);
    }
  });

  // Second pass: Remove old keyed elements that are no longer present
  oldKeyed.forEach(({ index }, key) => {
    if (!newKeyed.has(key) && !processedIndices.has(index)) {
      const domNode = domNodes[index];
      if (domNode && domNode.parentNode === parent) {
        if (
          "ref" in oldChildren[index].props &&
          typeof oldChildren[index].props.ref === "object" &&
          oldChildren[index].props.ref !== null
        ) {
          oldChildren[index].props.ref.current = null;
        }
        parent.removeChild(domNode);
      }
    }
  });

  // Handle non-keyed removals
  if (newChildren.length < oldChildren.length) {
    for (let i = oldChildren.length - 1; i >= newChildren.length; i--) {
      const oldChild = oldChildren[i];
      const hasKey =
        oldChild && typeof oldChild === "object" && oldChild.props?.key != null;

      if (!hasKey && parent.childNodes[i]) {
        if (
          "ref" in oldChild.props &&
          typeof oldChild.props.ref === "object" &&
          oldChild.props.ref !== null
        ) {
          oldChild.props.ref.current = null;
        }
        parent.removeChild(parent.childNodes[i]);
      }
    }
  }
}

/**
 * Update props/attributes of a DOM element
 * @param {HTMLElement} el - DOM element to update
 * @param {Object} newNode - New virtual node
 * @param {Object} oldNode - Old virtual node
 */
function updateElementProps(el, newNode, oldNode) {
  if (!el || typeof newNode !== "object" || typeof oldNode !== "object") return;

  // Remove old attributes not in newNode
  for (const key in oldNode.props) {
    if (key === "key") continue; // Skip key prop

    if (!(key in newNode.props)) {
      if (key.startsWith("on")) {
        el.removeEventListener(key.slice(2).toLowerCase(), oldNode.props[key]);
      } else if (key === "className") {
        el.className = "";
      } else if (key === "id") {
        el.removeAttribute("id");
      } else if (key === "checked") {
        el.checked = false;
        el.removeAttribute(key);
      } else {
        el.removeAttribute(key);
      }
    }
  }

  // Set new/changed attributes
  for (const key in newNode.props) {
    if (key === "key") continue; // Skip key prop

    const value = newNode.props[key];
    const oldValue = oldNode.props[key];

    if (value === oldValue) continue;
    if (key.startsWith("on")) {
      // Remove old event listener
      if (oldValue) {
        el.removeEventListener(key.slice(2).toLowerCase(), oldValue);
      }
      // Add new event listener
      if (value) {
        el.addEventListener(key.slice(2).toLowerCase(), value);
      }
    } else if (key === "className") {
      el.className = value;
    } else if (key === "id") {
      el.id = value;
    } else if (key === "autoFocus" && value === true) {
      setTimeout(() => {
        el.focus();
        const len = el.value?.length || 0;
        el.setSelectionRange(len, len);
      }, 0);
    } else if (key === "style" && typeof value === "object") {
      Object.assign(el.style, value);
    } else if (key === "checked") {
      el.checked = value;
    } else {
      el.setAttribute(key, value);
    }
  }
}

/**
 * Main diffing function - updates DOM based on virtual DOM changes
 * @param {HTMLElement} parent - Parent DOM node
 * @param {*} newNode - New virtual node
 * @param {*} oldNode - Old virtual node
 * @param {number} index - Index of the node in parent
 */
export function updateElement(parent, newNode, oldNode, index = 0) {
  // Handle Fragment
  if (newNode && newNode.type === "FRAGMENT") {
    newNode.children.forEach((child, i) => {
      updateElement(
        parent,
        child,
        oldNode ? oldNode.children[i] : null,
        index + i
      );
    });
    return;
  }
  // If oldNode doesn't exist, create new DOM
  if (!oldNode) {
    parent.appendChild(createElement(newNode));
    return;
  }

  // If newNode doesn't exist, remove old DOM
  if (!newNode) {
    if (
      "ref" in oldNode.props &&
      typeof oldNode.props.ref === "object" &&
      oldNode.props.ref !== null
    ) {
      oldNode.props.ref.current = null;
    }
    parent.removeChild(parent.childNodes[index]);
    return;
  }

  // If types differ, replace
  if (newNode.type !== oldNode.type || typeof newNode !== typeof oldNode) {
    if (
      "ref" in oldNode.props &&
      typeof oldNode.props.ref === "object" &&
      oldNode.props.ref !== null
    ) {
      oldNode.props.ref.current = null;
    }
    parent.replaceChild(createElement(newNode), parent.childNodes[index]);
    return;
  }

  // If text node, update textContent
  if (typeof newNode === "string" || typeof newNode === "number") {
    if (newNode !== oldNode) {
      parent.childNodes[index].textContent = newNode;
    }
    return;
  }

  // Update attributes
  const el = parent.childNodes[index];
  updateElementProps(el, newNode, oldNode);

  // Diff children with key-based reconciliation
  if (
    newNode.children &&
    oldNode.children &&
    el &&
    el.nodeType === Node.ELEMENT_NODE
  ) {
    reconcileChildren(el, newNode.children, oldNode.children);
  }
}
