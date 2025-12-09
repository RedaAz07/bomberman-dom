import { Store, useEffect, useRef, useState } from "../framework/main.js";
import { jsx } from "../framework/main.js";
import { store } from "./lobby.js";

import { getTileStyle } from "../utils/map.js";

const tileClass = {
  0: "tile tile-grass",
  1: "tile tile-wall-vertical",
  2: "tile tile-braml",
  3: "tile tile-wall-corner",
  4: "tile tile-stone",
};

export function game() {
  const Map = store.get().map;
  const bom = store.get().bom;
  const players = store.get().players;
  const [grid, setGrid] = useState(Map);

  let frameIndex = 0;
  const FRAMES = {
    ArrowRight: { row: 11, col: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
    ArrowLeft: { row: 9, col: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
    ArrowUp: { row: 8, col: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
    ArrowDown: { row: 10, col: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
  };
  const [bombs, setBombs] = useState([])
  const eventKey = useRef(null);
  const bombRef = useRef(null);
  const playersRef = [useRef(null), useRef(null), useRef(null), useRef(null)];

  const mapData = store.get().collisionMap;

  console.log("ferfmlkrmfmrefmrekfmlkermfkl", bombs);
  function handleKeyDown(e) {
    console.log(e.key);

    if (FRAMES[e.key]) {
      eventKey.current = e.key;
    }
    if (e.key === " ") {
      dropBomb();
    }
  }

  function handleKeyUp(e) {
    if (eventKey.current === e.key) {
      eventKey.current = null;
      frameIndex = 0;
    }
  }

  // SPRITE DATA

  useEffect(() => {

    // bomb 
    let bomb = false;
    let bombe = null;
    let colb = 0;
    const colsbomb = 5;
    const rowsbomb = 1;
    let bombFrameIndex = 0;
    let animationTimerbomb = 0;
    let animationSpeedbomb = 300
    const frameWidthbomb = 50;
    const frameHeightbomb = 50;
    const bombFrames = { bomb: { row: 0, col: [0, 1, 2, 3, 4] } }
    // player
    const frameWidth = 64;
    const frameHeight = 64;
    const playerEl = playersRef[0].current;
    let lastTime = 0;
    let animationTimer = 0;
    let animationSpeed = 80;
    let posX = 0;
    let posY = 0;
    let speed = 0.1;
    function checkCollision(newX, newY) {
      const baseX = playerEl.offsetLeft;
      const baseY = playerEl.offsetTop;
      const absX = baseX + newX;
      const absY = baseY + newY;

      const hitBox = {
        x: 0,
        y: 14,
        w: 48,
        h: 48
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
        if (!mapData || !mapData[tileY] || mapData[tileY][tileX] === undefined) {
          isBlocked = true;
        } else if (mapData[tileY][tileX] !== 0) {
          isBlocked = true;
        }

        collisions[key] = isBlocked;
        if (isBlocked) hasCollision = true;
      }
      return { hasCollision, collisions };
    }

    function loop(timeStamp) {
      const delta = timeStamp - lastTime;
      lastTime = timeStamp;

      if (bombRef.current) {
        const maxFrames = bombFrames.bomb.col.length; // = 5
        if (bombFrameIndex >= maxFrames) {
          bombFrameIndex = 0;
          bombRef.current.remove();
          bombRef.current = null;
          bomb = false;
        } else {

          const col = bombFrameIndex;


          const frameX = col * frameWidthbomb;

          bombRef.current.style.backgroundPosition = `-${frameX}px`;
        }
        animationTimerbomb += delta;
        if (animationTimerbomb > animationSpeedbomb) {
          animationTimerbomb = 0;
          bombFrameIndex++

        }
      }





      if (eventKey.current) {
        const anim = FRAMES[eventKey.current];
        const col = anim.col[frameIndex];
        const row = anim.row;

        // frame position
        const frameX = col * frameWidth;
        const frameY = row * frameHeight;

        playerEl.style.backgroundPosition = `-${frameX + 5}px -${frameY + 13
          }px`;

        // movement with deltaTime
        const moveDist = speed * delta;

        if (eventKey.current === "ArrowRight") {
          const { hasCollision, collisions } = checkCollision(posX + moveDist, posY);
          if (!hasCollision) {
            posX += moveDist;
          } else {
            if (collisions.tr && !collisions.br) {
              if (!checkCollision(posX, posY + moveDist).hasCollision) posY += moveDist;
            } else if (collisions.br && !collisions.tr) {
              if (!checkCollision(posX, posY - moveDist).hasCollision) posY -= moveDist;
            }
          }
        }
        if (eventKey.current === "ArrowLeft") {
          const { hasCollision, collisions } = checkCollision(posX - moveDist, posY);
          if (!hasCollision) {
            posX -= moveDist;
          } else {
            if (collisions.tl && !collisions.bl) {
              if (!checkCollision(posX, posY + moveDist).hasCollision) posY += moveDist;
            } else if (collisions.bl && !collisions.tl) {
              if (!checkCollision(posX, posY - moveDist).hasCollision) posY -= moveDist;
            }
          }
        }
        if (eventKey.current === "ArrowUp") {
          const { hasCollision, collisions } = checkCollision(posX, posY - moveDist);
          if (!hasCollision) {
            posY -= moveDist;
          } else {
            if (collisions.tl && !collisions.tr) {
              if (!checkCollision(posX + moveDist, posY).hasCollision) posX += moveDist;
            } else if (collisions.tr && !collisions.tl) {
              if (!checkCollision(posX - moveDist, posY).hasCollision) posX -= moveDist;
            }
          }
        }
        if (eventKey.current === "ArrowDown") {
          const { hasCollision, collisions } = checkCollision(posX, posY + moveDist);
          if (!hasCollision) {
            posY += moveDist;
          } else {
            if (collisions.bl && !collisions.br) {
              if (!checkCollision(posX + moveDist, posY).hasCollision) posX += moveDist;
            } else if (collisions.br && !collisions.bl) {
              if (!checkCollision(posX - moveDist, posY).hasCollision) posX -= moveDist;
            }
          }
        }
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
    loop(0);
  }, []);


  // ! map 
  const mapRef = useRef(null);
  const [playerPosition, setPlayerPosition] = useState({
    0: { top: "0px", left: "0px" },
    1: { top: "0px", left: "0px" },
    2: { top: "0px", left: "0px" },
    3: { top: "0px", left: "0px" },
  });

  useEffect(() => {
    // 1. Safety check: If ref is null, wait for next render
    if (!mapRef.current) return;

    // 2. Create an observer that triggers whenever the Map changes size
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      // Get accurate dimensions from the observer entry
      const width = entry.contentRect.width;
      const height = entry.contentRect.height;

      // Only update if we actually have dimensions (prevents 0px glitch)
      if (width > 0 && height > 0) {
        // console.log("Map dimensions found:", width, height);

        setPlayerPosition({
          0: { top: "37px", left: "50px" },
          1: { top: "37px", left: `${width - 100}px` },
          2: { top: `${height - 114}px`, left: `${width - 100}px` },
          3: { top: `${height - 114}px`, left: "50px" },
        });
      }
    });

    // 3. Start observing the map
    observer.observe(mapRef.current);

  }, []); // Run once to attach the observer


  // console.log("playytreé", players);

  // ! end map 
  return jsx(
    "div",
    {
      className: "game-container",
      onKeydown: handleKeyDown,
      onKeyup: handleKeyUp,
      autoFocus: true,
      tabIndex: 0,
    },
    //!map
    jsx(
      "div",
      { className: "map-container", ref: mapRef },
      ...players.map((p, i) => {
        return jsx("div", {
          className: `player player${i}`,
          style: { top: playerPosition[i]?.top, left: playerPosition[i]?.left },
          key: `${p.username}`,
          ref: playersRef[i],
        });
      }),
      bom && jsx("div", { className: "bom", ref: bomRef }),
      ...Map.map((row, rowIndex) =>
        jsx(
          "div",
          { className: "map-row" },
          ...row.map((cell, colIndex) =>
            cell === 2
              ? [
                jsx("div", {
                  className: "tile tile-grass",
                  style: getTileStyle(rowIndex, colIndex, cell),
                  "data-row": rowIndex,
                  "data-col": colIndex,
                }),
                jsx("div", {
                  className: tileClass[cell],
                  style: getTileStyle(rowIndex, colIndex, cell),
                  "data-row": rowIndex,
                  "data-col": colIndex,
                }),
              ]
              : jsx("div", {
                className: tileClass[cell],
                style: getTileStyle(rowIndex, colIndex, cell),
                "data-row": rowIndex,
                "data-col": colIndex,
              })
          )
        )
      )
    )

    //!endmap
    , ...bombs.map((b) => jsx("div", { className: "bomb", style: { top: `${b.top}px`, left: `${b.left}px` }, ref: bombRef }))
  );
}
