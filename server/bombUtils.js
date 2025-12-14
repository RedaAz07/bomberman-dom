import { collisionMap } from "./data/data.js";
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
      creationTime: Date.now(),
    });
    collisionMap[rowIndex][colIndex] = 1;
    this.bombsCount -= 1;
    return true;
  }

  return false;
}
