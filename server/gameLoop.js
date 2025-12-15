import { players } from "./data/data.js";
import { broadcastPlayerPosition } from "./networking.js";
import { checkCollision } from "./collision.js";
import { performance } from "node:perf_hooks";

export function startGameLoop() {
  let lastTime = 0;
  setInterval(() => {
    for (const id in players) {
      const now = performance.now();
      const deltaTime = now - lastTime;
      lastTime = now;
      const player = players[id];
      player.bombs.forEach((bomb) => {
        const elapsed = performance.now() - bomb.creationTime;
        if (elapsed >= 3000) {
          player.explodeBomb(bomb);
        }
      });
      if (player.current === "STOP") continue;

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
      if (player.current === "SPACE") {
        player.placeBomb();
      }
      broadcastPlayerPosition(player);
    }
  }, 1000 / 30);
}
