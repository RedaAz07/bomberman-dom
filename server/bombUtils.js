import { collisionMap } from "./data/data.js";
import { performance } from "node:perf_hooks";
import { map } from "./data/data.js";
export function placeBomb() {
  if (this.bombsCount <= 0) return;
  const posx = this.left + this.posX;
  const posy = this.top + this.posY;
  const colIndex = Math.round(posx / 50);
  const rowIndex = Math.round(posy / 50);
  const bombId = `bomb-${Date.now()}`;
  for (let index = 0; index < this.bombs.length; index++) {
    if (this.bombs[index].x === colIndex && this.bombs[index].y === rowIndex) {
      return true;
    }
  }
  if (map[rowIndex] && map[rowIndex][colIndex] === 0) {
    map[rowIndex][colIndex] = 5;
    this.bombs.push({
      id: bombId,
      x: colIndex,
      y: rowIndex,
      creationTime: performance.now(),
    });
    collisionMap[rowIndex][colIndex] = 1;
    this.bombsCount -= 1;
    return true;
  }

  return false;
}
export function explodeBomb(bomb) {
  const index = this.bombs.findIndex((b) => b.id === bomb.id);
  if (index !== -1) {
    this.bombs.splice(index, 1);
    this.bombsCount += 1;
    let hasChanges = false;

    const range = this.power || 1;

    const createExplosion = (tx, ty) => {
      if (!map[ty] || map[ty][tx] === undefined) return false; // Stop

      const cell = map[ty][tx];

      if (cell === 1 || cell === 3 || cell === 4) return false;

      if (cell === 2) {
        map[ty][tx] = 6;
        mapData[ty][tx] = 0;
        hasChanges = true;
        explosionsRef.current.push({
          x: tx,
          y: ty,
          creationTime: timeStamp,
        });
        return false;
      }

      map[ty][tx] = 6;
      mapData[ty][tx] = 0;

      hasChanges = true;
      explosionsRef.current.push({
        x: tx,
        y: ty,
        creationTime: timeStamp,
      });
      return true;
    };

    createExplosion(bomb.x, bomb.y);

    const directions = [
      { dx: 0, dy: -1 }, // Up
      { dx: 0, dy: 1 }, // Down
      { dx: -1, dy: 0 }, // Left
      { dx: 1, dy: 0 }, // Right
    ];

    directions.forEach((dir) => {
      for (let i = 1; i <= range; i++) {
        const currentX = bomb.x + dir.dx * i;
        const currentY = bomb.y + dir.dy * i;

        const shouldContinue = createExplosion(currentX, currentY);
        if (!shouldContinue) break;
      }
    });
  }
}
