import { players } from "./data/data.js";
import { broadcastPlayerPosition } from "./networking.js";
import { checkCollision } from "./collision.js";
export function startGameLoop() {
  let lastTime = Date.now();
  setInterval(() => {
    for (const id in players) {
      const player = players[id];
      if (player.current === "STOP") continue;
      const now = Date.now();
      const deltaTime = now - lastTime;
      lastTime = now;

      const moveDist = (player.speed * deltaTime) / 1000;
      let posX = player.posX;
      let posY = player.posY;
      if (player.current === "RIGHT") {
        
        const { hasCollision, collisions } = checkCollision(
          posX + moveDist,
          posY
        );

        if (!hasCollision) {
          posX += moveDist;
        } else {
          if (collisions.tr && !collisions.br) {
            if (!checkCollision(posX, posY + moveDist).hasCollision)
              posY += moveDist;
          } else if (collisions.br && !collisions.tr) {
            if (!checkCollision(posX, posY - moveDist).hasCollision)
              posY -= moveDist;
          }
        }
      } else if (player.current === "LEFT") {
        const { hasCollision, collisions } = checkCollision(
          posX - moveDist,
          posY
        );

        if (!hasCollision) {
          posX -= moveDist;
        } else {
          if (collisions.tl && !collisions.bl) {
            if (!checkCollision(posX, posY + moveDist).hasCollision)
              posY += moveDist;
          } else if (collisions.bl && !collisions.tl) {
            if (!checkCollision(posX, posY - moveDist).hasCollision)
              posY -= moveDist;
          }
        }
      } else if (player.current === "UP") {
        const { hasCollision, collisions } = checkCollision(
          posX,
          posY - moveDist
        );

        if (!hasCollision) {
          posY -= moveDist;
        } else {
          if (collisions.tl && !collisions.tr) {
            if (!checkCollision(posX + moveDist, posY).hasCollision)
              posX += moveDist;
          } else if (collisions.tr && !collisions.tl) {
            if (!checkCollision(posX - moveDist, posY).hasCollision)
              posX -= moveDist;
          }
        }
      } else if (player.current === "DOWN") {
        const { hasCollision, collisions } = checkCollision(
          posX,
          posY + moveDist
        );

        if (!hasCollision) {
          posY += moveDist;
        } else {
          if (collisions.bl && !collisions.br) {
            if (!checkCollision(posX + moveDist, posY).hasCollision)
              posX += moveDist;
          } else if (collisions.br && !collisions.bl) {
            if (!checkCollision(posX - moveDist, posY).hasCollision)
              posX -= moveDist;
          }
        }
      }
      player.posX = posX;
      player.posY = posY;
      broadcastPlayerPosition(player);
    }
  }, 1000 / 30);
}
