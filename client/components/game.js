import { jsx } from "../framework/main.js";
import { map } from "./map.js";

export function game() {
  return jsx("div", { className: "game-container" }, map());
}
