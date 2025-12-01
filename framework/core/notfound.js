import { jsx } from "./jsx.js";
export function notFound() {
  return jsx(
    "div",
    { style: { padding: "20px", textAlign: "center" } },
    jsx("h1", null, "404 - Page Not Found"),
    jsx("p", null, "The page you are looking for does not exist.")
  );
}
