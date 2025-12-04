import { jsx } from "../framework/main.js";
import { ws } from "../assets/js/ws.js";


import { store } from "./lobby.js"
const tileClass = {
  0: "tile tile-grass",
  1: "tile tile-wall-vertical",
  2: "tile tile-braml",
  3: "tile tile-wall-corner",
  4: "tile tile-stone",
};

const TILE_SIZE = 50;
const ROWS = 15;
const COLS = 15;
// Example function to determine style based on position and tile type
function getTileStyle(
  row,
  col,
  tile,
  x = col * TILE_SIZE,
  y = row * TILE_SIZE
) {
  if (row > 0 && row < ROWS - 1 && tile === 1) {
    if (col < COLS - 1) {
      return {
        backgroundImage: `url("assets/images/tile5.jpg")`,
        backgroundSize: "contain",
        transform: `translate3d(${x}px, ${y}px, 0)`,
      };
    }
    return { transform: `translate3d(${x}px, ${y}px, 0) rotate(90deg)` };
  }
  if (row > 0 && row < ROWS && col < COLS - 1 && tile == 1) {
    if (row === ROWS - 1) {
      return {
        transform: `translate3d(${x}px, ${y}px, 0) rotate(180deg)`,
      };
    }

    return {
      backgroundImage: `url("assets/images/tile5.jpg")`,
      backgroundSize: "contain",
      transform: `translate3d(${x}px, ${y}px, 0)`,
    };
  }

  if (row === 0 && col === COLS - 1 && tile == 3) {
    return {
      transform: `translate3d(${x}px, ${y}px, 0) rotate(90deg)`,
    };
  }
  if (row === ROWS - 1 && col === 0 && tile == 3) {
    return {
      transform: `translate3d(${x}px, ${y}px, 0) rotate(-90deg)`,
    };
  }
  if (row === ROWS - 1 && col === COLS - 1 && tile == 3) {
    return {
      transform: `translate3d(${x}px, ${y}px, 0) rotate(180deg)`,
    };
  }
  return { transform: `translate3d(${x}px, ${y}px, 0)` };
}

export function map() {

  const mapData = store.get().map;
  return jsx(
    "div",
    { className: "map-container" },
    ...mapData.map((row, rowIndex) =>
      jsx(
        "div",
        { className: "map-row" },
        ...row.map((cell, colIndex) =>
          jsx("div", {
            className: tileClass[cell],
            style: getTileStyle(rowIndex, colIndex, cell),
            "data-row": rowIndex,
            "data-col": colIndex,
          })
        )
      )
    )
  );
}
