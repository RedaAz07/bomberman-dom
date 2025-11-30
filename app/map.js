import {
  addRoute,
  jsx,
  useRef,
  useState,
} from "../../mini-framework/framework/main.js";
console.log(document.getElementById("root"));

// Component to display the map of the bomberman game
function BombermanMap() {
  const mapData = ["stone","water","grass"];
  return jsx(
    "div",
    { className: "bomberman-map" },
    mapData.map((cell, cellIndex) =>
        jsx(
            "div",
            { key: cellIndex, className: `map-cell ${cell}` },
            cell === "wall" ? "🧱" :
            cell === "box" ? "📦" :
            cell === "bomberman" ? "🤖" : ""
        )
    )
  );
}

addRoute("/", BombermanMap);