import { Store, useEffect, useRef, useState } from "../framework/main.js";
import { jsx } from "../framework/main.js";
import { store } from "./lobby.js";
import { map } from "./map.js";

export function game() {
  const eventKey = [];
  const bomRef = useRef(null);
  const playerRef = useRef(null);
  const collisionMap = store.get().collisionMap;
  console.log("store", store.get());

  function handleKeyDown(e) {
    console.log("event", eventKey);
    eventKey[e.key] = true;
  }
  function handleKeyUp(e) {
    
    eventKey[e.key] = false;
    console.log("event", eventKey);
  }
  useEffect(() => {
    console.log("game con ");
    
    const playerEl = playerRef.current;
    let lastTime = 0;
    let posX = 0;
    let posY = 0;
    const TILE_SIZE = 50;
    function loop(timeStamp) {
      const delta = timeStamp - lastTime;
      lastTime = timeStamp;
      let speed = 0.1 * delta;


      if (eventKey["ArrowUp"]) {
        
        console.log(
          "pos",
          posX,
          posY,
          collisionMap[Math.floor(posY / TILE_SIZE)]?.[
            Math.floor(posX / TILE_SIZE)
          ]
        );
        posY -= speed;
      }

      if (eventKey["ArrowDown"]) {
        posY += speed;
      }
      if (eventKey["ArrowLeft"]) {
        posX -= speed;
      }
      if (eventKey["ArrowRight"]) {
        posX += speed;
      }
      if (
        collisionMap[Math.floor(posY / TILE_SIZE)]?.[
          Math.floor(posX / TILE_SIZE)
        ] !== 1
      ) {
        // valid move
        store.set({ bom: true });
        bomRef.current.style.transform = `translate3d(${posX}px, ${posY}px, 0)`;
      } 
      playerEl.style.transform = `translate3d(${posX}px, ${posY}px, 0)`;
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }, []);

  return jsx(
    "div",
    {
      className: "game-container",
      onKeydown: (e) => handleKeyDown(e),
      onKeyup: (e) => handleKeyUp(e),
      tabindex: "0",
    },
    map(playerRef, bomRef)
  );
}
