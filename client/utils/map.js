const TILE_SIZE = 50;
const ROWS = 15;
const COLS = 15;
/**
 * Calculates the CSS style for a map tile based on its type and position.
 * Handles rotation and positioning of tiles.
 * @param {number} row - The row index.
 * @param {number} col - The column index.
 * @param {number} tile - The tile type ID.
 * @param {number} [x] - The x pixel position.
 * @param {number} [y] - The y pixel position.
 * @returns {Object} CSS style object.
 */
export function getTileStyle(
  row,
  col,
  tile,
  x = col * TILE_SIZE,
  y = row * TILE_SIZE
) {
  if (row > 0 && row < ROWS - 1 && tile === 1) {
    if (col < COLS - 1) {
      return {
        backgroundSize: "contain",
        transform: `translate3d(${x}px, ${y}px, 0) rotate(270deg)`,
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
