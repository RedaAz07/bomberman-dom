import { Store, useEffect, useRef } from "../framework/main.js";
import { jsx } from "../framework/main.js";
import { store } from "./lobby.js";
import { map } from "./map.js";

export function game() {
  let frameIndex = 0;
  const sheetWidth = 832;
  const sheetHeight = 3456;
  const cols = 13;
  const rows = 54;
  const frameWidth = sheetWidth / cols;
  const frameHeight = sheetHeight / rows;
  const FRAMES = {
    ArrowRight: { row: 11, col: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
    ArrowLeft: { row: 9, col: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
    ArrowUp: { row: 8, col: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
    ArrowDown: { row: 10, col: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
  };
  const eventKey = useRef(null);
  const bomRef = useRef(null);
  const playerRef = useRef(null);

  const collisionMap = store.get().collisionMap;

  function handleKeyDown(e) {
    if (FRAMES[e.key]) {

      eventKey.current = e.key

    };

  }

  function handleKeyUp(e) {
    if (eventKey.current === e.key) {

      eventKey.current = null;
      frameIndex = 0;
    }
  }

  // SPRITE DATA


  useEffect(() => {

    
    const playerEl = playerRef.current;
    let lastTime = 0;
    let animationTimer = 0;
    let animationSpeed = 80;
    let posX = 0;
    let posY = 0;
    let speed = 0.1;
    let key = eventKey.current
    function loop(timeStamp) {
      const delta = timeStamp - lastTime;
      lastTime = timeStamp;

      if (eventKey.current) {

        const anim = FRAMES[eventKey.current];
        const col = anim.col[frameIndex];
        const row = anim.row;

        // frame position
        const frameX = col * frameWidth;
        const frameY = row * frameHeight;

        playerEl.style.backgroundPosition = `-${frameX + 5}px -${frameY + 13}px`
        // movement with deltaTime
        if (eventKey.current === "ArrowRight") posX += speed * delta;
        if (eventKey.current === "ArrowLeft") posX -= speed * delta;
        if (eventKey.current === "ArrowUp") posY -= speed * delta;
        if (eventKey.current === "ArrowDown") posY += speed * delta;
        // if (
        //   collisionMap[Math.floor(posY / TILE_SIZE)]?.[
        //   Math.floor(posX / TILE_SIZE)
        //   ] !== 1
        // ) {
        //   // valid move
        //   store.set({ bom: true });
        //   bomRef.current.style.transform = `translate3d(${posX}px, ${posY}px, 0)`;
        // }

        playerEl.style.transform = `translate3d(${posX}px, ${posY}px, 0)`;
        animationTimer += delta;
        if (animationTimer > animationSpeed) {
          animationTimer = 0;
          frameIndex++;
          if (frameIndex >= anim.col.length) frameIndex = 0;
        }
      }
      requestAnimationFrame(loop);
    }
    loop(0)
  }, []);

  return jsx(
    "div",
    {
      className: "game-container",
      onKeydown: handleKeyDown,
      onKeyup: handleKeyUp,
      autoFocus: true,
      tabIndex: 0,
    },
    map(playerRef, bomRef)
  );
}
