import { playersMetaData, collisionMap, bombs } from "../data/data.js";

export function checkCollision(id, newX, newY) {
  const baseX = playersMetaData[id].top;
  const baseY = playersMetaData[id].left;
  const absX = baseX + newX;
  const absY = baseY + newY;

  // Full square fit (62x62) to eliminate both horizontal and vertical sliding
  const hitBox = {
    x: 1,
    y: 1,
    w: 48,
    h: 48,
  };

  const points = {
    tl: { x: absX + hitBox.x, y: absY + hitBox.y },
    tr: { x: absX + hitBox.x + hitBox.w, y: absY + hitBox.y },
    bl: { x: absX + hitBox.x, y: absY + hitBox.y + hitBox.h },
    br: { x: absX + hitBox.x + hitBox.w, y: absY + hitBox.y + hitBox.h },
  };

  const collisions = {};
  let hasCollision = false;

  for (const key in points) {
    const point = points[key];
    const tileX = Math.floor(point.x / 50);
    const tileY = Math.floor(point.y / 50);

    let isBlocked = false;
    if (
      !collisionMap ||
      !collisionMap[tileY] ||
      collisionMap[tileY][tileX] === undefined
    ) {
      isBlocked = true;
    } else if (collisionMap[tileY][tileX] !== 0) {
      isBlocked = true;
    }

    collisions[key] = isBlocked;
    if (isBlocked) hasCollision = true;
  }
  let escapeTheBomb = true;
  for (let index = 0; index < bombs.length; index++) {
    const bomb = bombs[index];
    for (const key in points) {
      const point = points[key];
      const tileX = Math.floor(point.x / 50);
      const tileY = Math.floor(point.y / 50);

      if (bomb.x === tileX && bomb.y === tileY) {
        escapeTheBomb = false;
        break;
      }
    }
    if (escapeTheBomb) {
      collisionMap[bomb.y][bomb.x] = 1;
    }
  }
  return { hasCollision, collisions };
}
