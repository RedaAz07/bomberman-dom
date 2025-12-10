import { useEffect, useRef, useState } from "../framework/main.js";
import { jsx } from "../framework/main.js";
import { store } from "./lobby.js";
import { ws } from "../assets/js/ws.js";
import { getTileStyle } from "../utils/map.js";

const tileClass = {
  0: "tile tile-grass", // ard 
  1: "tile tile-wall-vertical", //  hiit
  2: "tile tile-braml",// li kaytfjr 
  3: "tile tile-wall-corner",
  4: "tile tile-stone", //walo
  // 5: "tile tile-bomb", // bomb
};

export function game() {
  //! state for the map and players
  const bombsRef = useRef([]);
  const [bombs, setBombs] = useState([]);
  const Map = store.get().map;
  const players = store.get().players;
  const [grid, setGrid] = useState(Map);
  const mapRef = useRef(null);
  const [playerPosition, setPlayerPosition] = useState({
    0: { top: "0px", left: "0px" },
    1: { top: "0px", left: "0px" },
    2: { top: "0px", left: "0px" },
    3: { top: "0px", left: "0px" },
  });
  //! STATE AND REFS
  const eventKey = useRef(null);
  const playersRef = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const mapData = store.get().collisionMap;
  //! ANIMATION VARIABLES
  let frameIndex = 0;
  const frameWidth = 64;
  const frameHeight = 64;
  const FRAMES = {
    ArrowRight: { row: 11, col: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
    ArrowLeft: { row: 9, col: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
    ArrowUp: { row: 8, col: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
    ArrowDown: { row: 10, col: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
  };

  //! BOMB PLACEMENT
  function placeBomb() {
    const id = store.get().players.findIndex((p) => p.username === ws.username)
    const playerEl = playersRef[id].current;
    if (!playerEl) return;

    const x = Math.floor((playerEl.offsetLeft + 24) / 50) * 50;
    const y = Math.floor((playerEl.offsetTop + 24) / 50) * 50;
    const bombId = `bomb-${Date.now()}`;


    setGrid((prevGrid) => {
      const newGrid = prevGrid.map((row) => row.slice());
      const colIndex = x / 50;
      const rowIndex = y / 50;
      if (newGrid[rowIndex] && newGrid[rowIndex][colIndex] === 0) {
        newGrid[rowIndex][colIndex] = 5; // 5 represents a bomb
      }
      return newGrid;
    });



    // Avoid placing multiple bombs in the same position
    for (const bomb of bombsRef.current) {
      if (bomb.x === x && bomb.y === y) {
        return;
      }
    }

    const newBomb = { id: bombId, x, y };
    bombsRef.current = [...bombsRef.current, newBomb];
    setBombs(bombsRef.current);

    // Send bomb placement to server
    ws.send(
      JSON.stringify({
        type: "place-bomb",
        roomId: ws.roomId,
        username: ws.username,
        bomb: newBomb
      })
    );

    // Remove bomb after 3 seconds
    setTimeout(() => {
      bombsRef.current = bombsRef.current.filter(b => b.id !== bombId);
      setBombs(bombsRef.current);
      

    }, 3000);
  }
  //! EVENT HANDLERS
  function handleKeyDown(e) {
    if (FRAMES[e.key]) {
      eventKey.current = e.key;
    }
    if (e.key === " ") {
      placeBomb();
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
    //! setup the players 
    if (!mapRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const width = entry.contentRect.width;
      const height = entry.contentRect.height;
      if (width > 0 && height > 0) {
        setPlayerPosition({
          0: { top: "37px", left: "50px" },
          1: { top: "37px", left: `${width - 100}px` },
          2: { top: `${height - 114}px`, left: `${width - 100}px` },
          3: { top: `${height - 114}px`, left: "50px" },
        });
      }
    });
    observer.observe(mapRef.current);
    //! WEBSOCKET SETUP
    const id = store.get().players.findIndex((p) => p.username === ws.username)
    const playerEl = playersRef[id].current;
    //! ANIMATION LOOP
    let lastTime = 0;
    let animationTimer = 0;
    let animationSpeed = 80;
    let posX = 0;
    let posY = 0;
    let speed = 0.1;
    //! COLLISION DETECTION
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



    //! WEBSOCKET MESSAGE HANDLER for  moving players
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "player-move") {
        const { username, x, y, frameX, frameY } = data;

        if (username === ws.username) return;

        const players = store.get().players;
        const index = players.findIndex(p => p.username === username);
        if (index === -1) return;

        const el = playersRef[index]?.current;
        if (!el) return;

        el.style.backgroundPosition = `-${frameX + 5}px -${frameY + 13}px`;
        el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }
    };


    //! ANIMATION LOOP FUNCTION
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

        playerEl.style.backgroundPosition = `-${frameX + 5}px -${frameY + 13}px`;

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
        ws.send(
          JSON.stringify({
            type: "move",
            roomId: ws.roomId,
            username: ws.username,
            x: posX,
            y: posY,
            frameX: frameX,
            frameY: frameY
          })
        );

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

  return jsx(
    "div",
    {
      className: "game-container",
      onKeydown: handleKeyDown,
      onKeyup: handleKeyUp,
      autoFocus: true,
      tabIndex: 0,
    },
    jsx("div", null, jsx(
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
      ...grid.map((row, rowIndex) =>
        jsx(
          "div",
          { className: "map-row" },
          ...row.map((cell, colIndex) =>

            //! error 
            cell === 5
              ? jsx("div", {
                className: "tile tile-bomb",
                style: getTileStyle(rowIndex, colIndex, cell),
                key: `${rowIndex}-${colIndex}`,
              })
              :
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
    )),
    jsx("h1", null, ws.username)
  );
}