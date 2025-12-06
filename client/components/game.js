import { Store, useEffect, useRef } from "../framework/main.js";
import { jsx } from "../framework/main.js";
import { store } from "./lobby.js";
import { map } from "./map.js";

export function game() {
  const eventKey = {};
  const bomRef = useRef(null);
  const playerRef = useRef(null);

  const collisionMap = store.get().collisionMap;

  function handleKeyDown(e) {
    if (FRAMES[e.key]) eventKey[e.key] = true;
  }

  function handleKeyUp(e) {
    eventKey[e.key] = false;
  }

  // SPRITE DATA
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

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    let posX = 0;
    let posY = 0;

    let frameIndex = 0;
    let lastTime = 0;
    let animationTimer = 0;
    const animationSpeed = 80;
    const speed = 0.1;

    let currentKey = null;

    function update(time) {
      const delta = time - lastTime;
      lastTime = time;

      // detect movement key
      const keys = Object.keys(eventKey).filter(k => eventKey[k]);
      if (keys.length > 0) currentKey = keys[0];
      else {
        currentKey = null;
        frameIndex = 0;
      }

      if (currentKey && FRAMES[currentKey]) {
        const anim = FRAMES[currentKey];

        // choose frame
        const col = anim.col[frameIndex];
        const row = anim.row;

        const frameX = col * frameWidth;
        const frameY = row * frameHeight;

        player.style.backgroundPosition = `-${frameX + 5}px -${frameY + 13}px`;

        // movement
        if (currentKey === "ArrowRight") posX += speed * delta;
        if (currentKey === "ArrowLeft") posX -= speed * delta;
        if (currentKey === "ArrowUp") posY -= speed * delta;
        if (currentKey === "ArrowDown") posY += speed * delta;

        player.style.transform = `translate3d(${posX}px, ${posY}px, 0)`;

        // next frame
        animationTimer += delta;
        if (animationTimer > animationSpeed) {
          animationTimer = 0;
          frameIndex++;
          if (frameIndex >= anim.col.length) frameIndex = 0;
        }
      }

      requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
  }, []);

  return jsx(
    "div",
    {
      className: "game-container",
      onKeydown: handleKeyDown,
      onKeyup: handleKeyUp,
      autoFocus: "true",
      tabIndex: 0,
    },
    map(playerRef, bomRef)
  );
}
