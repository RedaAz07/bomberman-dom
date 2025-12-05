import { jsx } from "../framework/main.js";
export default function player(playerRef) {
  return jsx("div", { className: "player", ref: playerRef });
}
