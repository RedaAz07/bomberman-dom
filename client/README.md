# Mini Framework Documentation

A lightweight, React-like JavaScript framework with virtual DOM, hooks, and client-side routing.

## Table of Contents

1. [Features](#features)
2. [How It Works](#how-it-works)
3. [Getting Started](#getting-started)
4. [Core Concepts](#core-concepts)
5. [API Reference](#api-reference)
6. [Examples](#examples)

---

## Features

### 🎯 Core Features

- **Virtual DOM** - Efficient DOM manipulation using a virtual representation
- **`jsx()` Function** - Create elements using the `jsx()` function (no JSX transpiler needed)
- **React-like Hooks** - `useState`, `useEffect`, and `useRef` for state, side effects, and references
- **Key-based Reconciliation** - Optimized list rendering with key props (must be unique)
- **Client-side Routing** - Hash-based routing system
- **Lightweight** - Minimal bundle size with no dependencies
- **No Build Step Required** - Works directly in the browser using ES modules

---

## How It Works

### Architecture Overview

The framework follows a unidirectional data flow pattern similar to React:

```
User Interaction → State Change → Re-render → Virtual DOM Diff → DOM Patch → UI Update
```

### The Rendering Pipeline

1. **Element Creation with `jsx()` Function**

   - Developers call `jsx('div', props, ...children)` directly
   - Creates virtual DOM nodes (plain JavaScript objects)
   - No JSX transpiler or build step required

2. **Virtual DOM Creation**

   - Component functions return virtual DOM trees
   - Virtual nodes contain: `{ type, props, children }`

3. **Diffing Algorithm**

   - Compares new virtual DOM with previous virtual DOM
   - Uses **key-based reconciliation** for efficient list updates
   - Identifies minimal changes needed

4. **DOM Patching**
   - Only updates changed parts of the real DOM
   - Preserves DOM state (focus, scroll position, etc.)
   - Reuses existing DOM nodes when possible

### Why Things Work This Way

#### Virtual DOM Benefits

- **Performance**: Only necessary DOM updates are performed
- **Abstraction**: Developers think in terms of state, not manual DOM manipulation
- **Predictability**: Same state always produces same UI

#### Key-based Reconciliation

- **Element Identity**: Keys tell the framework which elements are the same across renders
- **Efficient Moves**: Moving list items doesn't destroy and recreate DOM nodes
- **State Preservation**: Input focus, scroll position, and component state are maintained

#### Hooks Pattern

- **Encapsulation**: State and effects live with components
- **Reusability**: Custom hooks can be created for shared logic
- **Order Dependency**: Hooks must be called in the same order each render (enforced by index-based storage)

#### Using `jsx()` Function Directly

- **No Build Step**: Works directly in the browser with ES modules
- **Simplicity**: No need for Babel, webpack, or other transpilers
- **Transparency**: You see exactly what's happening - just function calls
- **Learning**: Better understanding of how JSX works under the hood

---

## Getting Started

### Setup

1. Include the framework in your HTML:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>My App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="app/app.js"></script>
  </body>
</html>
```

2. Import the framework functions (no build step or JSX transpiler needed):

```javascript
import { jsx, useState, useEffect, render } from "./framework/main.js";
```

---

## Core Concepts

### 1. Creating Elements

Your framework uses the **`jsx()` function** to create virtual DOM elements. You call this function directly in your code.

#### Basic Element

```javascript
import { jsx } from "./framework/main.js";

// Creating a simple element
const element = jsx("div", null, "Hello World");

// What it creates (virtual DOM object):
// { type: 'div', props: {}, children: ['Hello World'] }
```

**Function Signature:**

```javascript
jsx(type, props, ...children);
```

- **`type`** (string): HTML tag name like 'div', 'span', 'button'
- **`props`** (object|null): Element properties (className, id, events, etc.)
- **`children`** (any): Child elements, text, or arrays of children

#### Element with Children

```javascript
import { jsx } from "./framework/main.js";

// Nested elements
const card = jsx(
  "div",
  null,
  jsx("h1", null, "Title"),
  jsx("p", null, "Description")
);

// This creates:
// <div>
//     <h1>Title</h1>
//     <p>Description</p>
// </div>
```

#### Multiple Children

```javascript
// Children can be passed as multiple arguments
const list = jsx(
  "ul",
  null,
  jsx("li", null, "Item 1"),
  jsx("li", null, "Item 2"),
  jsx("li", null, "Item 3")
);

// Or as an array with spread operator
const items = ["Apple", "Banana", "Cherry"];
const fruitList = jsx(
  "ul",
  null,
  ...items.map((fruit) => jsx("li", { key: fruit }, fruit))
);
```

**How it works:**

- **You call `jsx()` directly** - No JSX syntax or transpiler
- **`jsx()` creates virtual DOM nodes** - Plain JavaScript objects
- Each virtual node has: `{ type, props, children }`
- The framework uses these objects to efficiently update the real DOM
- Children are automatically flattened and filtered (removes null, undefined, false, true)

---

### 2. Adding Attributes

Attributes are passed as the second argument (props object) to the `jsx()` function:

```javascript
import { jsx } from "./framework/main.js";

// className attribute
const styledDiv = jsx("div", { className: "container" }, "Content");
// Creates: <div class="container">Content</div>

// id attribute
const uniqueDiv = jsx("div", { id: "main-content" }, "Content");
// Creates: <div id="main-content">Content</div>

// Multiple attributes
const multiAttr = jsx("input", {
  type: "text",
  placeholder: "Enter name",
  id: "name-input",
  className: "form-control",
});
// Creates: <input type="text" placeholder="Enter name" id="name-input" class="form-control" />

// Custom data attributes
const dataAttr = jsx(
  "div",
  {
    "data-user-id": "123",
    "data-role": "admin",
  },
  "User"
);
// Creates: <div data-user-id="123" data-role="admin">User</div>

// Style as object (supported by the framework)
const styledElement = jsx(
  "div",
  {
    style: {
      color: "red",
      fontSize: "16px",
    },
  },
  "Styled text"
);
// Creates: <div style="color: red; font-size: 16px;">Styled text</div>

// Boolean attributes
const checkbox = jsx("input", {
  type: "checkbox",
  checked: true,
  disabled: false,
});

// Null props (when element has no attributes)
const simpleDiv = jsx("div", null, "No attributes");
```

**How it works:**

- Attributes are stored in the `props` object (second parameter)
- `className` maps to DOM's `className` property
- `id` maps to DOM's `id` property
- Other attributes use `setAttribute()`
- Event handlers (starting with "on") are added as event listeners
- `style` objects are converted to inline styles
- `null` or `{}` can be used when there are no props

---

### 3. Creating Events

Event handlers are passed in the props object with "on" prefix:

```javascript
import { jsx, useState } from "./framework/main.js";

function Counter() {
  const [count, setCount] = useState(0);

  // Click event handler
  const handleClick = () => {
    setCount(count + 1);
  };

  // Event with parameter
  const handleReset = () => {
    setCount(0);
  };

  return jsx(
    "div",
    null,
    jsx("h1", null, "Count: ", count),
    jsx("button", { onClick: handleClick }, "Increment"),
    jsx("button", { onClick: handleReset }, "Reset")
  );
}
```

#### Supported Events

```javascript
import { jsx } from "./framework/main.js";

// Mouse events
jsx("button", { onClick: handleClick }, "Click");
jsx("div", { onMouseOver: handleHover }, "Hover");
jsx("div", { onMouseOut: handleOut }, "Leave");
jsx("div", { onMouseDown: handleDown }, "Press");
jsx("div", { onMouseUp: handleUp }, "Release");

// Input events
jsx("input", { onChange: handleChange });
jsx("input", { onInput: handleInput });
jsx("input", { onFocus: handleFocus });
jsx("input", { onBlur: handleBlur });

// Form events
jsx(
  "form",
  { onSubmit: handleSubmit },
  jsx("input", { type: "text" }),
  jsx("button", { type: "submit" }, "Submit")
);

// Keyboard events
jsx("input", { onKeyDown: handleKeyDown });
jsx("input", { onKeyUp: handleKeyUp });
jsx("input", { onKeyPress: handleKeyPress });

// Example with event object
const handleInputChange = (event) => {
  console.log("Input value:", event.target.value);
};

jsx("input", {
  type: "text",
  onChange: handleInputChange,
});

// Preventing default behavior
const handleFormSubmit = (event) => {
  event.preventDefault();
  console.log("Form submitted");
};

jsx(
  "form",
  { onSubmit: handleFormSubmit },
  jsx("button", { type: "submit" }, "Submit")
);
```

**How it works:**

1. Props starting with "on" are detected (e.g., `onClick`)
2. The "on" prefix is removed: `onClick` → `Click`
3. Converted to lowercase: `Click` → `click`
4. Added as event listener: `element.addEventListener('click', handler)`
5. When state changes via the handler, `render()` is called automatically
6. Event listeners are properly cleaned up during diffing

---

### 4. Nesting Elements

Elements can be deeply nested by passing `jsx()` calls as children:

```javascript
import { jsx } from "./framework/main.js";

function UserCard({ user }) {
  return jsx(
    "div",
    { className: "card" },
    jsx(
      "div",
      { className: "card-header" },
      jsx("img", { src: user.avatar, alt: user.name }),
      jsx("h2", null, user.name)
    ),
    jsx(
      "div",
      { className: "card-body" },
      jsx("p", null, user.bio),
      jsx(
        "div",
        { className: "card-footer" },
        jsx("span", null, "Followers: ", user.followers),
        jsx("span", null, "Following: ", user.following)
      )
    )
  );
}

// This creates the structure:
// <div class="card">
//     <div class="card-header">
//         <img src="..." alt="...">
//         <h2>User Name</h2>
//     </div>
//     <div class="card-body">
//         <p>Bio text...</p>
//         <div class="card-footer">
//             <span>Followers: 100</span>
//             <span>Following: 50</span>
//         </div>
//     </div>
// </div>
```

#### Dynamic Lists

Use `key` props for efficient list rendering. Pass the key in the props object:

```javascript
import { jsx, useState } from "./framework/main.js";

function TodoList() {
  const [todos, setTodos] = useState([
    { id: 1, text: "Learn framework", done: false },
    { id: 2, text: "Build project", done: false },
  ]);

  return jsx(
    "ul",
    null,
    ...todos.map((todo) =>
      jsx(
        "li",
        {
          key: todo.id,
          className: todo.done ? "done" : "",
        },
        todo.text
      )
    )
  );
}

// Each list item becomes:
// jsx('li', { key: 1, className: '' }, 'Learn framework')
// jsx('li', { key: 2, className: '' }, 'Build project')
```

**Why keys matter:**

- Without keys: Framework uses index-based diffing (slower, can cause bugs)
- With keys: Framework tracks elements by identity (faster, preserves state)
- When list reorders: DOM nodes are moved, not recreated

#### Complex Nesting Example

```javascript
import { jsx } from "./framework/main.js";

function Navigation() {
  const links = [
    { id: 1, href: "#/", text: "Home" },
    { id: 2, href: "#/about", text: "About" },
    { id: 3, href: "#/contact", text: "Contact" },
  ];

  return jsx(
    "nav",
    { className: "navbar" },
    jsx(
      "ul",
      null,
      ...links.map((link) =>
        jsx("li", { key: link.id }, jsx("a", { href: link.href }, link.text))
      )
    )
  );
}

// Creates:
// <nav class="navbar">
//     <ul>
//         <li><a href="#/">Home</a></li>
//         <li><a href="#/about">About</a></li>
//         <li><a href="#/contact">Contact</a></li>
//     </ul>
// </nav>
```

---

## API Reference

### Hooks

#### `useState(initialValue)`

Manages component state with automatic re-rendering.

```javascript
const [state, setState] = useState(initialValue);
```

**Parameters:**

- `initialValue` - Initial state value (any type)

**Returns:**

- `[state, setState]` - Current state and setter function

**Examples:**

```javascript
// Number state
const [count, setCount] = useState(0);
setCount(5); // Direct value
setCount((prev) => prev + 1); // Functional update

// Object state
const [user, setUser] = useState({ name: "", age: 0 });
setUser({ name: "John", age: 30 });

// Array state
const [items, setItems] = useState([]);
setItems([...items, newItem]); // Add item
setItems(items.filter((item) => item.id !== id)); // Remove item
```

**Rules:**

- Must be called in the same order every render
- Don't call inside loops, conditions, or nested functions
- Calling `setState` triggers a re-render

---

#### `useEffect(callback, dependencies)`

Performs side effects after render.

```javascript
useEffect(() => {
  // Effect code
  return () => {
    // Cleanup (optional)
  };
}, [dependencies]);
```

**Parameters:**

- `callback` - Function to run after render
- `dependencies` - Array of values that trigger re-run when changed

**Examples:**

```javascript
// Run once on mount
useEffect(() => {
  console.log("Component mounted");
}, []);

// Run when state changes
useEffect(() => {
  document.title = `Count: ${count}`;
}, [count]);

// Multiple dependencies
useEffect(() => {
  fetchUserData(userId, filter);
}, [userId, filter]);

// With cleanup
useEffect(() => {
  const timer = setInterval(() => {
    console.log("Tick");
  }, 1000);

  return () => {
    clearInterval(timer); // Cleanup on unmount
  };
}, []);
```

**How it works:**

- Dependencies are compared using shallow equality (`===`)
- If any dependency changed, effect runs
- Effect runs after DOM updates are applied
- Cleanup function runs before next effect and on unmount

---

#### `Store(initialState)`

Creates a global store for managing shared state across components without prop drilling.

```javascript
const store = Store(initialState);
```

**Parameters:**

- `initialState` - Initial state object (optional, defaults to `null`)

**Returns:**

- Object with `get()` and `set()` methods

**Methods:**

- `get()` - Returns the current state
- `set(newState)` - Merges `newState` with current state and triggers re-render

**Examples:**

```javascript
import { Store, jsx } from "./framework/main.js";

// Create a store
const userStore = Store({ name: "Guest", loggedIn: false });

// In any component - read state
function Header() {
  const user = userStore.get();
  return jsx("div", null, `Welcome, ${user.name}`);
}

// In any component - update state
function LoginButton() {
  const handleLogin = () => {
    userStore.set({ name: "John", loggedIn: true });
  };

  return jsx("button", { onclick: handleLogin }, "Login");
}

// Multiple stores for different concerns
const themeStore = Store({ mode: "light", fontSize: 14 });
const cartStore = Store({ items: [], total: 0 });

// Update multiple properties
themeStore.set({ mode: "dark" }); // Only updates mode, keeps fontSize
cartStore.set({ items: [...items, newItem], total: newTotal });

// Store with no initial state
const tempStore = Store(); // state is null initially
tempStore.set({ data: "value" }); // Now state is { data: 'value' }
```

**How it works:**

- Creates a closure with private state
- `set()` merges new state with existing state using spread operator
- Calling `set()` automatically triggers a re-render
- All components using the store will get updated values
- Unlike Context API, stores don't require Provider wrappers

**When to use:**

- ✅ Global app state (theme, auth, settings)
- ✅ Shared data across multiple components
- ✅ Simple state management without boilerplate
- ❌ Avoid for component-specific state (use `useState` instead)

---

### Routing

#### `addRoute(path, component)`

Registers a route with its component.

```javascript
import { addRoute } from "./framework/main.js";

addRoute("/", HomePage);
addRoute("/about", AboutPage);
addRoute("/users", UsersPage);
```

**Parameters:**

- `path` - URL path (without #)
- `component` - Function that returns jsx elements

**Navigation:**

```javascript
// In HTML
jsx("a", { href: "#/" }, "Home");
jsx("a", { href: "#/about" }, "About");

// In JavaScript
window.location.hash = "#/about";
```

**Example:**

```javascript
import { jsx, addRoute } from "./framework/main.js";

function App() {
  return jsx(
    "div",
    null,
    jsx(
      "nav",
      null,
      jsx("a", { href: "#/" }, "Home"),
      jsx("a", { href: "#/about" }, "About"),
      jsx("a", { href: "#/contact" }, "Contact")
    )
  );
}

function HomePage() {
  return jsx("h1", null, "Welcome Home");
}

function AboutPage() {
  return jsx("h1", null, "About Us");
}

function ContactPage() {
  return jsx("h1", null, "Contact Us");
}

addRoute("/", HomePage);
addRoute("/about", AboutPage);
addRoute("/contact", ContactPage);
```

**404 Not Found Page:**

The framework includes a default 404 page that displays when users navigate to unregistered routes. If you want to customize it, edit the `notFound()` function in `framework/core/notfound.js`:

```javascript
// framework/core/notfound.js
import { jsx } from "./jsx.js";

export function notFound() {
  return jsx(
    "div",
    { style: { padding: "20px", textAlign: "center" } },
    jsx("h1", null, "404 - Page Not Found"),
    jsx("p", null, "The page you are looking for does not exist."),
    jsx("a", { href: "#/" }, "Go back home")
  );
}
```

You can customize the styling, content, and add additional functionality like logging or redirects.

---

### Rendering

#### `render(component)`

Renders the root component.

```javascript
import { jsx, render } from "./framework/main.js";
import { render as renderApp } from "./framework/core/render.js";

function App() {
  return jsx("h1", null, "Hello World");
}

renderApp(App);
```

**Note:** After the initial render, `render()` is called automatically by `setState`.

---

## Examples

### Example 1: Counter with Multiple Features

```javascript
import { jsx, useState, useEffect, useRef } from "./framework/main.js";
import { render } from "./framework/core/render.js";

function Counter() {
  const [count, setCount] = useState(0);
  const [step, setStep] = useState(1);
  const [history, setHistory] = useState([]);
  const renderCount = useRef(0);

  // Track render count
  useEffect(() => {
    renderCount.current += 1;
  });

  // Update document title
  useEffect(() => {
    document.title = `Count: ${count}`;
  }, [count]);

  // Track history
  useEffect(() => {
    setHistory([...history, count]);
  }, [count]);

  const increment = () => {
    setCount(count + step);
  };

  const decrement = () => {
    setCount(count - step);
  };

  const reset = () => {
    setCount(0);
    setHistory([]);
  };

  const handleStepChange = (e) => {
    setStep(Number(e.target.value));
  };

  return jsx(
    "div",
    { className: "counter" },
    jsx("h1", null, "Count: ", count),
    jsx("p", null, "Renders: ", renderCount.current),

    jsx(
      "div",
      null,
      jsx("label", null, "Step: "),
      jsx("input", {
        type: "number",
        value: step,
        onChange: handleStepChange,
      })
    ),

    jsx(
      "div",
      { className: "buttons" },
      jsx("button", { onClick: decrement }, "-", step),
      jsx("button", { onClick: reset }, "Reset"),
      jsx("button", { onClick: increment }, "+", step)
    ),

    jsx(
      "div",
      { className: "history" },
      jsx("h3", null, "History:"),
      jsx(
        "ul",
        null,
        ...history.map((value, index) => jsx("li", { key: index }, value))
      )
    )
  );
}

render(Counter);
```

---

### Example 2: Todo List with Key-based Reconciliation

```javascript
import { jsx, useState } from "./framework/main.js";
import { render } from "./framework/core/render.js";

function TodoApp() {
  const [todos, setTodos] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [filter, setFilter] = useState("all"); // all, active, completed

  const addTodo = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      const newTodo = {
        id: Date.now(),
        text: inputValue,
        completed: false,
      };
      setTodos([...todos, newTodo]);
      setInputValue("");
    }
  };

  const toggleTodo = (id) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const deleteTodo = (id) => {
    setTodos(todos.filter((todo) => todo.id !== id));
  };

  const filteredTodos = todos.filter((todo) => {
    if (filter === "active") return !todo.completed;
    if (filter === "completed") return todo.completed;
    return true;
  });

  return jsx(
    "div",
    { className: "todo-app" },
    jsx("h1", null, "Todo List"),

    jsx(
      "form",
      { onSubmit: addTodo },
      jsx("input", {
        type: "text",
        placeholder: "What needs to be done?",
        value: inputValue,
        onChange: (e) => setInputValue(e.target.value),
      }),
      jsx("button", { type: "submit" }, "Add")
    ),

    jsx(
      "div",
      { className: "filters" },
      jsx(
        "button",
        {
          className: filter === "all" ? "active" : "",
          onClick: () => setFilter("all"),
        },
        "All (",
        todos.length,
        ")"
      ),

      jsx(
        "button",
        {
          className: filter === "active" ? "active" : "",
          onClick: () => setFilter("active"),
        },
        "Active (",
        todos.filter((t) => !t.completed).length,
        ")"
      ),

      jsx(
        "button",
        {
          className: filter === "completed" ? "active" : "",
          onClick: () => setFilter("completed"),
        },
        "Completed (",
        todos.filter((t) => t.completed).length,
        ")"
      )
    ),

    jsx(
      "ul",
      { className: "todo-list" },
      ...filteredTodos.map((todo) =>
        jsx(
          "li",
          {
            key: todo.id,
            className: todo.completed ? "completed" : "",
          },
          jsx("input", {
            type: "checkbox",
            checked: todo.completed,
            onChange: () => toggleTodo(todo.id),
          }),
          jsx("span", null, todo.text),
          jsx("button", { onClick: () => deleteTodo(todo.id) }, "Delete")
        )
      )
    ),

    todos.length === 0 &&
      jsx("p", { className: "empty" }, "No todos yet. Add one above!")
  );
}

render(TodoApp);
```

---

### Example 3: Multi-page App with Routing

```javascript
import { jsx, useState, useEffect, addRoute } from "./framework/main.js";

// Navigation Component
function Navigation() {
  return jsx(
    "nav",
    { className: "navbar" },
    jsx("a", { href: "#/" }, "Home"),
    jsx("a", { href: "#/about" }, "About"),
    jsx("a", { href: "#/users" }, "Users"),
    jsx("a", { href: "#/contact" }, "Contact")
  );
}

// Home Page
function HomePage() {
  return jsx(
    "div",
    null,
    Navigation(),
    jsx(
      "main",
      null,
      jsx("h1", null, "Welcome Home"),
      jsx("p", null, "This is the home page of our mini framework demo.")
    )
  );
}

// About Page
function AboutPage() {
  const features = [
    "Virtual DOM",
    "Hooks (useState, useEffect)",
    "Key-based reconciliation",
    "Client-side routing",
  ];

  return jsx(
    "div",
    null,
    Navigation(),
    jsx(
      "main",
      null,
      jsx("h1", null, "About Us"),
      jsx("p", null, "We built a lightweight React-like framework!"),
      jsx(
        "ul",
        null,
        ...features.map((feature) => jsx("li", { key: feature }, feature))
      )
    )
  );
}

// Users Page with Data Fetching
function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setUsers([
        { id: 1, name: "Alice", email: "alice@example.com" },
        { id: 2, name: "Bob", email: "bob@example.com" },
        { id: 3, name: "Charlie", email: "charlie@example.com" },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  return jsx(
    "div",
    null,
    Navigation(),
    jsx(
      "main",
      null,
      jsx("h1", null, "Users"),
      loading
        ? jsx("p", null, "Loading users...")
        : jsx(
            "ul",
            { className: "user-list" },
            ...users.map((user) =>
              jsx(
                "li",
                { key: user.id },
                jsx("strong", null, user.name),
                jsx("span", null, user.email)
              )
            )
          )
    )
  );
}

// Contact Page with Form
function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: "", email: "", message: "" });
    }, 3000);
  };

  return jsx(
    "div",
    null,
    Navigation(),
    jsx(
      "main",
      null,
      jsx("h1", null, "Contact Us"),
      submitted
        ? jsx(
            "p",
            { className: "success" },
            "Thank you! We'll be in touch soon."
          )
        : jsx(
            "form",
            { onSubmit: handleSubmit },
            jsx(
              "div",
              null,
              jsx("label", null, "Name:"),
              jsx("input", {
                type: "text",
                name: "name",
                value: formData.name,
                onChange: handleChange,
                required: true,
              })
            ),
            jsx(
              "div",
              null,
              jsx("label", null, "Email:"),
              jsx("input", {
                type: "email",
                name: "email",
                value: formData.email,
                onChange: handleChange,
                required: true,
              })
            ),
            jsx(
              "div",
              null,
              jsx("label", null, "Message:"),
              jsx("textarea", {
                name: "message",
                value: formData.message,
                onChange: handleChange,
                required: true,
              })
            ),
            jsx("button", { type: "submit" }, "Send Message")
          )
    )
  );
}

// Register routes
addRoute("/", HomePage);
addRoute("/about", AboutPage);
addRoute("/users", UsersPage);
addRoute("/contact", ContactPage);
```

---

### Example 4: Reusable Custom Components

```javascript
import { jsx, useState } from "./framework/main.js";
import { render } from "./framework/core/render.js";

// Button Component
function Button({ children, onClick, variant = "primary" }) {
  return jsx(
    "button",
    {
      className: `btn btn-${variant}`,
      onClick: onClick,
    },
    children
  );
}

// Card Component
function Card({ title, children }) {
  return jsx(
    "div",
    { className: "card" },
    jsx("div", { className: "card-header" }, jsx("h3", null, title)),
    jsx("div", { className: "card-body" }, children)
  );
}

// Modal Component
function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return jsx(
    "div",
    {
      className: "modal-overlay",
      onClick: onClose,
    },
    jsx(
      "div",
      {
        className: "modal-content",
        onClick: (e) => e.stopPropagation(),
      },
      jsx(
        "div",
        { className: "modal-header" },
        jsx("h2", null, title),
        jsx("button", { onClick: onClose }, "×")
      ),
      jsx("div", { className: "modal-body" }, children)
    )
  );
}

// Using the components
function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return jsx(
    "div",
    { className: "app" },
    Card({
      title: "Welcome",
      children: [
        jsx("p", { key: "p" }, "This is a reusable card component."),
        Button({
          key: "btn",
          onClick: () => setIsModalOpen(true),
          children: "Open Modal",
        }),
      ],
    }),

    Modal({
      isOpen: isModalOpen,
      onClose: () => setIsModalOpen(false),
      title: "Modal Title",
      children: [
        jsx("p", { key: "p" }, "This is modal content!"),
        Button({
          key: "btn",
          variant: "secondary",
          onClick: () => setIsModalOpen(false),
          children: "Close",
        }),
      ],
    })
  );
}

render(App);
```

---

### Example 5: Using useRef for DOM Manipulation and Timers

```javascript
import { jsx, useState, useRef, useEffect } from "./framework/main.js";
import { render } from "./framework/core/render.js";

function RefExamples() {
  const [activeTab, setActiveTab] = useState('focus');

  return jsx("div", { className: "ref-examples" },
    jsx("h1", null, "useRef Examples"),
    
    jsx("div", { className: "tabs" },
      jsx("button", { 
        onClick: () => setActiveTab('focus'),
        className: activeTab === 'focus' ? 'active' : ''
      }, "Auto Focus"),
      jsx("button", { 
        onClick: () => setActiveTab('timer'),
        className: activeTab === 'timer' ? 'active' : ''
      }, "Timer"),
      jsx("button", { 
        onClick: () => setActiveTab('previous'),
        className: activeTab === 'previous' ? 'active' : ''
      }, "Previous Value")
    ),

    activeTab === 'focus' && FocusExample(),
    activeTab === 'timer' && TimerExample(),
    activeTab === 'previous' && PreviousValueExample()
  );
}

// Example 1: Auto-focus input
function FocusExample() {
  const inputRef = useRef(null);
  const [value, setValue] = useState('');

  useEffect(() => {
    // Focus input when component mounts
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleFocus = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return jsx("div", { className: "example" },
    jsx("h2", null, "Auto Focus Input"),
    jsx("input", {
      ref: inputRef,
      type: "text",
      placeholder: "This input auto-focuses on mount",
      value: value,
      onChange: (e) => setValue(e.target.value)
    }),
    jsx("p", null, "Value: ", value),
    jsx("button", { onClick: handleFocus }, "Focus Input Again")
  );
}

// Example 2: Timer with useRef
function TimerExample() {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);

  const startTimer = () => {
    if (!intervalRef.current) {
      setIsRunning(true);
      intervalRef.current = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    }
  };

  const stopTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      setIsRunning(false);
    }
  };

  const resetTimer = () => {
    stopTimer();
    setSeconds(0);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return jsx("div", { className: "example" },
    jsx("h2", null, "Timer Example"),
    jsx("h3", null, "Time: ", seconds, " seconds"),
    jsx("div", { className: "timer-controls" },
      jsx("button", { 
        onClick: startTimer,
        disabled: isRunning
      }, "Start"),
      jsx("button", { 
        onClick: stopTimer,
        disabled: !isRunning
      }, "Stop"),
      jsx("button", { onClick: resetTimer }, "Reset")
    ),
    jsx("p", null, isRunning ? "Timer is running..." : "Timer is stopped")
  );
}

// Example 3: Previous value tracking
function PreviousValueExample() {
  const [count, setCount] = useState(0);
  const prevCountRef = useRef();
  const renderCountRef = useRef(0);

  useEffect(() => {
    prevCountRef.current = count;
    renderCountRef.current += 1;
  });

  const prevCount = prevCountRef.current;

  return jsx("div", { className: "example" },
    jsx("h2", null, "Previous Value Tracking"),
    jsx("p", null, "Current count: ", count),
    jsx("p", null, "Previous count: ", prevCount !== undefined ? prevCount : "N/A"),
    jsx("p", null, "Render count: ", renderCountRef.current),
    jsx("div", null,
      jsx("button", { 
        onClick: () => setCount(count + 1)
      }, "Increment"),
      jsx("button", { 
        onClick: () => setCount(count - 1)
      }, "Decrement"),
      jsx("button", { 
        onClick: () => setCount(0)
      }, "Reset")
    )
  );
}

render(RefExamples);
```

---

## Best Practices

### 1. Always Use Keys in Lists

```javascript
// ❌ Bad: No keys
...items.map(item => jsx('li', null, item.name))

// ✅ Good: With keys
...items.map(item => jsx('li', { key: item.id }, item.name))
```

### 2. Keep Components Small and Focused

```javascript
// ❌ Bad: One large component
function BigComponent() {
  return jsx(
    "div",
    null
    // 200 lines of nested jsx() calls...
  );
}

// ✅ Good: Split into smaller components
function Header() {
  /* ... */
}
function Content() {
  /* ... */
}
function Footer() {
  /* ... */
}
function App() {
  return jsx("div", null, Header(), Content(), Footer());
}
```

### 3. Use Functional Updates with setState

```javascript
// ❌ Bad: Direct reference (can cause stale state issues)
setCount(count + 1);

// ✅ Good: Functional update
setCount((prev) => prev + 1);
```

### 4. Optimize Effect Dependencies

```javascript
// ❌ Bad: Missing dependencies
useEffect(() => {
  console.log(count);
}, []); // count is used but not in dependencies

// ✅ Good: All dependencies listed
useEffect(() => {
  console.log(count);
}, [count]);
```

### 5. Use Null for Empty Props

```javascript
// ✅ Good: Clear intent
jsx("div", null, "Content");

// ❌ Unnecessary: Empty object
jsx("div", {}, "Content");
```

---

## Performance Tips

1. **Use keys for lists** - Enables efficient reconciliation
2. **Keep state close to where it's used** - Reduces re-render scope
3. **Define handlers outside jsx() calls** - Avoid creating new functions on every render
4. **Minimize effect dependencies** - Only include what's necessary
5. **Use spread operator efficiently** - Flatten arrays with `...` when mapping

---

## Limitations

- No JSX syntax support (must use `jsx()` function directly)
- No component lifecycle methods (use `useEffect` instead)
- No context API (use prop drilling or external state management)
- No ref support (direct DOM access not recommended)
- No server-side rendering
- No concurrent mode or suspense
- Hash-based routing only (no history API routing)

---

## Advantages of Using `jsx()` Function Directly

1. **No Build Step** - Run directly in the browser
2. **Better Understanding** - See exactly how virtual DOM is created
3. **Transparency** - No "magic" happening behind the scenes
4. **Simplicity** - No Babel, webpack, or configuration needed
5. **Learning Tool** - Understand how JSX actually works
6. **Pure JavaScript** - Standard ES modules only

---

## Contributing

This is a learning project demonstrating core concepts of modern JavaScript frameworks. Feel free to extend it with additional features!

---

## License

MIT License - Use freely for learning and projects.
