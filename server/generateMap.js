/**
 * Generates a random game map with walls, obstacles, and open spaces.
 * @param {number} rows - Number of rows.
 * @param {number} cols - Number of columns.
 * @returns {Object} Object containing the map grid and collision map.
 */
export function generateMap(rows, cols) {
  const map = [];
  const collisionMap = [];
  let count = 0;
  let addStone = true;
  for (let r = 0; r < rows; r++) {
    const row = [];
    const collisionRow = [];
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
          collisionRow.push(1);
        } else {
          row.push(1); // Walls
          collisionRow.push(1);
        }
      } else {
        // Randomly place walls and bramls
        if (c > 2 && c < cols - 3 && r > 1 && r < rows - 2) {
          if (r % 2 === 0 && c % 2 !== 0) {
            addStone = true;
          }
          if (addStone) {
            row.push(4);
            collisionRow.push(1);
            addStone = false;
            continue;
          }
        }

        const rand = Math.random();
        if (
          rand < 0.4 &&
          count < 60 &&
          !(r <= 2 && c <= 3) &&
          !(r >= rows - 3 && c >= cols - 4) &&
          !(r <= 2 && c >= cols - 4) &&
          !(r >= rows - 3 && c <= 3)
        ) {
          row.push(2); // Braml
          collisionRow.push(1);
          count++;
        } else {
          row.push(0); // Grass
          collisionRow.push(0);
        }
      }
    }
    map.push(row);
    collisionMap.push(collisionRow);
  }
  return { map, collisionMap };
}
