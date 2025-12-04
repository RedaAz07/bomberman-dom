import { jsx } from "../framework/main.js";

//this function will generate a random map based on rows and cols
function generateMap(rows, cols) {
  const map = [];
  let count = 0;
  let addStone = true;
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
        // Border walls
        if (
          (r === 0 && c === 0) ||
          (r === 0 && c === cols - 1) ||
          (r === rows - 1 && c === 0) ||
          (r === rows - 1 && c === cols - 1)
        ) {
          row.push(3); // Corners
        } else {
          row.push(1); // Walls
        }
      } else {
        // Randomly place walls and bramls
        if (c > 2 && c < cols - 3 && r > 1 && r < rows - 2) {
          if (r % 2 === 0 && c % 2 !== 0) {
            addStone = true;
          }
          if (addStone) {
            row.push(4);
            addStone = false;
            continue;
          }
        }

        const rand = Math.random();
        if (
          rand < 0.4 &&
          count < 50 &&
          !(r <= 2 && c <= 3) &&
          !(r >= rows - 3 && c >= cols - 4) &&
          !(r <= 2 && c >= cols - 4) &&
          !(r >= rows - 3 && c <= 3)
        ) {
          row.push(2); // Braml
          count++;
        } else {
          row.push(0); // Grass
        }
      }
    }
    map.push(row);
  }
  return map;
}

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
console.log(generateMap(ROWS, COLS));
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
  const mapData = generateMap(ROWS, COLS);
  return jsx(
    "div",
    { className: "map-container" },
    jsx("div", { className: "player" }),
    ...mapData.map((row, rowIndex) =>
      jsx(
        "div",
        { className: "map-row" },
        ...row.map((cell, colIndex) =>
          cell === 2
            ? [
                jsx("div", {
                  className: "tile tile-grass",
                  style: getTileStyle(rowIndex, colIndex, cell),
                  "data-row": rowIndex,
                  "data-col": colIndex,
                }),
                jsx("div", {
                  className: tileClass[cell],
                  style: getTileStyle(rowIndex, colIndex, cell),
                  "data-row": rowIndex,
                  "data-col": colIndex,
                }),
              ]
            : jsx("div", {
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
