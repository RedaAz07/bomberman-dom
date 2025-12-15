import { useEffect, useRef, useState } from "../framework/main.js";
import { jsx } from "../framework/main.js";
import { store } from "./lobby.js";
import { ws } from "../assets/js/ws.js";
import { getTileStyle } from "../utils/map.js";

const tileClass = {
  0: "tile tile-grass", // ard
  1: "tile tile-wall-vertical", //  hiit
  2: "tile tile-braml", // li kaytfjr
  3: "tile tile-wall-corner",
  4: "tile tile-stone", //walo
  5: "tile tile-bomb", // bomb
  6: "tile tile-explosion", // explosion
  7: "tile tile-speed",
  8: "tile tile-bomb-up",
  9: "tile tile-power",
};
const tileTypes = {
  0: "grass",
  1: "wall-vertical",
  2: "wall-corner",
  3: "stone",
  4: "braml",
  5: "bomb",
  6: "explosion",
  7: "speed",
  8: "bomb-up",
  9: "power",
};

export function game() {
  /*  const playerSpeed = useRef(0.1);
   const bombPower = useRef(2); */
  const gifts = useRef([]);
  const giftstoExplosion = useRef([]);
  const space = useRef(null);
  const divv = useRef(null);
  //! state for the map and players
  // const nbBombs = useRef(2);
  const bombElementsRef = useRef(new Map());
  const explosionElementsRef = useRef(new Map());
  const [chat, setChat] = useState([]);
  const [msg, setMsg] = useState("");
  const [lives, setLives] = useState(3);
  const [speed, setspeed] = useState(1);
  const [bombs, setBombs] = useState(1);
  const [bombRange, setBombRange] = useState(1);
  const speedRef = useRef(0.1);
  const bombRangeRef = useRef(1);
  const maxBombsRef = useRef(1);
  const activeBombsRef = useRef(0);
  const [Timer, setTimer] = useState("00:00");
  const [dead, setDead] = useState(false)
  const explosionHitRef = useRef(false);
  let frameIndex = 0;
  const frameWidth = 64;
  const frameHeight = 64;
  const FRAMES = {
    ArrowRight: { row: 11, col: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
    ArrowLeft: { row: 9, col: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
    ArrowUp: { row: 8, col: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
    ArrowDown: { row: 10, col: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
  };
  const explosionsRef = useRef([]);
  const bombsRef = useRef([]);
  const map = store.get().map;
  const players = store.get().players;
  const [grid, setGrid] = useState(map);
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
  const [scale, setScale] = useState(1);

  const sendMsg = (e) => {
    if (!msg.trim() || msg.trim().length > 30) return;
    ws.send(
      JSON.stringify({
        type: "message",
        msg,
      })
    );

    setMsg("");
    e.target.value = "";
    e.target.previousSibling.value = "";
  };
  //! BOMB PLACEMENT
  function placeBomb(posx, posy) {
    const id = store.get().players.findIndex((p) => p.username === ws.username);
    let playerEl = playersRef[id].current;
    if (!playerEl) return;
    const x = Math.round(posx / 50);
    const y = Math.round(posy / 50);
    const bombId = `bomb-${Date.now()}`;
    for (const bomb of bombsRef.current) {
      if (bomb.x === x && bomb.y === y) {
        return;
      }
    }
    setGrid((prevGrid) => {
      const newGrid = prevGrid.map((row) => row.slice());
      const colIndex = x;
      const rowIndex = y;
      if (newGrid[rowIndex] && newGrid[rowIndex][colIndex] === 0) {
        newGrid[rowIndex][colIndex] = 5; // 5 represents a bomb

        activeBombsRef.current += 1;

        ws.send(
          JSON.stringify({
            type: "place-bomb",
            roomId: ws.roomId,
            username: ws.username,
            x: colIndex,
            y: rowIndex,
          })
        );
      }
      return newGrid;
    });



    const newBomb = { id: bombId, x, y, creationTime: performance.now() };
    bombsRef.current = [...bombsRef.current, newBomb];

    // Remove bomb after 3 seconds
  }
  //! EVENT HANDLERS
  function handleKeyDown(e) {
    if (FRAMES[e.key]) {
      eventKey.current = e.key;
    }
    if (e.key === " " && !e.repeat && activeBombsRef.current < maxBombsRef.current) {
      space.current = e.key;
    }
  }

  function handleKeyUp(e) {
    if (eventKey.current === e.key) {
      eventKey.current = null;
      frameIndex = 0;
    }
  }


  useEffect(() => {
    //!timer of game
    let obj = {
      min: 0,
      sec: 0,
      text: "00:00",
    };

    setInterval(() => {
      obj.sec++;

      if (obj.sec === 60) {
        obj.min++;
        obj.sec = 0;
      }

      setTimer(
        String(obj.min).padStart(2, "0") +
        ":" +
        String(obj.sec).padStart(2, "0")
      );
    }, 1000);


    //!websocket onmessage
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "message") {
        setChat((prev) => [
          ...prev,
          { username: data.username, msg: data.msg },
        ]);
      }
      if (data.type === "player-move") {
        const { username, x, y, frameX, frameY } = data;

        if (username === ws.username) return;

        const players = store.get().players;
        const index = players.findIndex((p) => p.username === username);
        if (index === -1) return;

        let el = playersRef[index]?.current;
        if (!el) return;

        el.style.backgroundPosition = `-${frameX}px -${frameY}px`;
        el.style.transform = `translate3d(${x}px, ${y - 25}px, 0)`;
      }
      if (data.type === "player-bomb") {
        if (data.username === ws.username) return;
        console.log(data, "data client");

        const { x, y } = data;

        setGrid((prev) => {
          const newGrid = prev.map((r) => r.slice());
          if (newGrid[y] && newGrid[y][x] === 0) {
            newGrid[y][x] = 5;
          }
          return newGrid;
        });

        bombsRef.current.push({
          id: `bomb-${Date.now()}`,
          x,
          y,
          creationTime: performance.now(),
        });

        mapData[y][x] = 1;
      }
      if (data.type == "player-dead") {
        const index = players.findIndex(p => p.username === data.username);
        if (index === -1) return;

        let el = playersRef[index]?.current;
        if (!el) return;
        el.style.display = "none";
      }
      if (data.type === "gift-spawn") {
        setGrid(prev => {
          const g = prev.map(r => r.slice());
          g[data.y][data.x] = data.giftType;
          return g;
        });
      }
      if (data.type === "gift-collected") {
        const { x, y } = data;
        setGrid((prev) => {
          const newGrid = prev.map((row) => row.slice());
          newGrid[y][x] = 0;
          return newGrid;
        });
      }
    };


    //! resize window to set scale
    const width = 1500;
    const height = 1500;

    function handleResize() {
      if (window.innerHeight >= 800 && window.innerWidth >= 1000) {
        setScale(1);
        return;
      }
      const widthScale = window.innerWidth / width;
      const heightScale = window.innerHeight / height;
      const newScale = Math.min(widthScale, heightScale);
      setScale(newScale);
    }
    handleResize();
    window.addEventListener("resize", handleResize);


    //! setup the players
    if (!mapRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const width = entry.contentRect.width;
      const height = entry.contentRect.height;
      if (width > 0 && height > 0) {
        setPlayerPosition({
          0: { top: "64px", left: "64px" },
          1: { top: "64px", left: `${width - 128}px` },
          2: { top: `${height - 128}px`, left: `${width - 128}px` },
          3: { top: `${height - 128}px`, left: "64px" },
        });
      }
    });
    observer.observe(mapRef.current);
    //! WEBSOCKET SETUP
    const id = store.get().players.findIndex((p) => p.username === ws.username);
    let playerEl = playersRef[id].current;
    if (!playerEl) {
      return
    }
    //! ANIMATION LOOP
    let lastTime = 0;
    let animationTimer = 0;
    let animationSpeed = 80;
    let posX = 0;
    let posY = 0;

    //! COLLISION DETECTION
    function checkCollision(newX, newY) {
      const baseX = playerEl.offsetLeft;
      const baseY = playerEl.offsetTop;
      const absX = baseX + newX;
      const absY = baseY + newY;

      // Full square fit (62x62) to eliminate both horizontal and vertical sliding
      const hitBox = {
        x: 1,
        y: 1,
        w: 40,
        h: 40,
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

        setGrid((prevGrid) => {
          if (prevGrid[tileY][tileX] === 7
          ) {
            if (speedRef.current < 0.20) {

              speedRef.current += 0.05;
              setspeed((prev) => prev + 1);
            }

            const newGrid = prevGrid.map((row) => row.slice());
            newGrid[tileY][tileX] = 0;
            ws.send(JSON.stringify({
              type: "gift-collected",
              x: tileX,
              y: tileY,
            }));
            return newGrid;

          } else if (prevGrid[tileY][tileX] === 9) {

            if (maxBombsRef.current < 3) {
              maxBombsRef.current += 1;

              setBombs((prev) => prev + 1);
            }

            const newGrid = prevGrid.map((row) => row.slice());
            newGrid[tileY][tileX] = 0;
            ws.send(JSON.stringify({
              type: "gift-collected",
              x: tileX,
              y: tileY,

            }));
            return newGrid;

          } else if (prevGrid[tileY][tileX] === 8) {
            if (bombRangeRef.current < 3) {
              bombRangeRef.current += 1;
              setBombRange((prev) => prev + 1);
            }

            const newGrid = prevGrid.map((row) => row.slice());
            newGrid[tileY][tileX] = 0;
            ws.send(JSON.stringify({
              type: "gift-collected",
              x: tileX,
              y: tileY,
            }));
            return newGrid;

          }

          return prevGrid;
        })


        if (
          !mapData ||
          !mapData[tileY] ||
          mapData[tileY][tileX] === undefined
        ) {
          isBlocked = true;
        } else if (mapData[tileY][tileX] !== 0) {
          isBlocked = true;
        }

        collisions[key] = isBlocked;
        if (isBlocked) hasCollision = true;
      }
      let escapeTheBomb = true;
      for (let index = 0; index < bombsRef.current.length; index++) {
        const bomb = bombsRef.current[index];
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
          mapData[bomb.y][bomb.x] = 1;
        }
      }
      return { hasCollision, collisions };
    }

    //! function dyal hit by bombs
    function checkExplosionHit(playerEl, posX, posY) {
      if (!playerEl) return false;
      const baseX = playerEl.offsetLeft;
      const baseY = playerEl.offsetTop;

      // center of player
      const absX = baseX + posX + 25;
      const absY = baseY + posY + 25;

      const tileX = Math.floor(absX / 50);
      const tileY = Math.floor(absY / 50);

      for (let i = 0; i < explosionsRef.current.length; i++) {
        const exp = explosionsRef.current[i];
        if (exp.x === tileX && exp.y === tileY) {
          return true;
        }
      }

      return false;
    }

    //! loop dyalna
    function loop(timeStamp) {

      const delta = timeStamp - lastTime;
      lastTime = timeStamp;
      //! BOMB ANIMATION AND EXPLOSION HANDLING

      const bombsToDelete = bombsRef.current.filter(
        (b) => timeStamp - b.creationTime > 3000
      );

      if (bombsToDelete.length > 0) {
        bombsRef.current = bombsRef.current.filter(
          (b) => timeStamp - b.creationTime <= 3000
        );
        setGrid((prevGrid) => {
          const newGrid = prevGrid.map((row) => row.slice());
          let hasChanges = false;

          bombsToDelete.forEach((bomb) => {
            activeBombsRef.current -= 1;
            const range = bombRangeRef.current || 1;

            const createExplosion = (tx, ty) => {
              if (!newGrid[ty] || newGrid[ty][tx] === undefined) return false; // Stop

              const cell = newGrid[ty][tx];

              if (cell === 1 || cell === 3 || cell === 4) return false;
              if (cell === 5) {
                bombsRef.current.forEach((bomb) => {
                  if (bomb.x === tx && bomb.y === ty) {
                    bomb.creationTime = 0;
                  }
                });
              }

              if (cell === 2) {

                gifts.current.push({ x: tx, y: ty });
                newGrid[ty][tx] = 6;
                mapData[ty][tx] = 0;
                hasChanges = true;
                explosionsRef.current.push({
                  x: tx,
                  y: ty,
                  creationTime: timeStamp,
                });
                return false;
              }
              if (cell == 7 || cell == 8 || cell == 9) {
                giftstoExplosion.current.push({
                  x: tx,
                  y: ty,
                  cell: cell,
                });
              }
              newGrid[ty][tx] = 6;
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
          });

          return hasChanges ? newGrid : prevGrid;
        });
      }
      //! EXPLOSION ANIMATION HANDLING
      explosionsRef.current.forEach((exp) => {
        const key = `${exp.y}-${exp.x}`;
        const explosion = explosionElementsRef.current.get(key);

        if (explosion) {
          const age = timeStamp - exp.creationTime;

          const currentFrame = Math.floor(age / 100) % 5;
          const frameX = currentFrame * 50;

          explosion.style.backgroundPosition = `-${frameX}px -150px`;
        }
      });
      //! Remove explosions after 500ms
      const explosionsToDelete = explosionsRef.current.filter(
        (e) => timeStamp - e.creationTime > 500
      );

      if (explosionsToDelete.length > 0) {
        explosionsRef.current = explosionsRef.current.filter(
          (e) => timeStamp - e.creationTime <= 500
        );
        setGrid((prevGrid) => {
          const newGrid = prevGrid.map((row) => row.slice());
          let hasChanges = false;

          explosionsToDelete.forEach((exp) => {
            if (newGrid[exp.y] && newGrid[exp.y][exp.x] === 6) {
              newGrid[exp.y][exp.x] = 0;
              mapData[exp.y][exp.x] = 0;
              giftstoExplosion.current.forEach((g) => {
                if (g.x === exp.x && g.y === exp.y) {
                  newGrid[g.y][g.x] = g.cell;
                }
              });

              gifts.current.forEach((gift) => {
                if (gift.x === exp.x && gift.y === exp.y) {
                  let giftType = Math.floor(Math.random() * 5) + 7;
                  if (giftType > 9) {
                    giftType = 0;
                  }

                  newGrid[gift.y][gift.x] = giftType;
                  mapData[gift.y][gift.x] = 0;
                  ws.send(JSON.stringify({
                    type: "gift",
                    roomId: ws.roomId,
                    x: gift.x,
                    y: gift.y,
                    giftType: giftType
                  }));
                }
              });

              hasChanges = true;
            }
          });

          gifts.current = [];
          giftstoExplosion.current = [];


          return hasChanges ? newGrid : prevGrid;
        });
      }

      //! Update bomb animations
      bombsRef.current.forEach((bomb) => {
        const key = `${bomb.y}-${bomb.x}`;
        const bombEl = bombElementsRef.current.get(key);

        if (bombEl) {
          const age = timeStamp - bomb.creationTime;
          const currentFrame = Math.floor(age / 800) % 4;
          const frameX = currentFrame * 50;

          bombEl.style.backgroundPosition = `-${frameX}px`;
        }
      });

      if (!dead && playerEl && space.current === " ") {

        const baseX = playerEl.offsetLeft;
        const baseY = playerEl.offsetTop;
        const absX = baseX + posX;
        const absY = baseY + posY;
        placeBomb(absX, absY);
        space.current = null;
      }
      //! 💥 EXPLOSION COLLISION (ALWAYS CHECK)
      const hitByExplosion = checkExplosionHit(playerEl, posX, posY);

      if (hitByExplosion && !explosionHitRef.current) {
        setLives((prev) => {
          const next = prev - 1
          if (next == 0) {
            playerEl.style.display = "none";
            setDead(true);
            ws.send(JSON.stringify({
              type: "player-dead",
              roomId: ws.roomId,
              username: ws.username,
            }));
          }
          return next
        })
        explosionHitRef.current = true;
      }

      if (!hitByExplosion) {
        explosionHitRef.current = false;
      }


      if (!dead && eventKey.current) {
        const anim = FRAMES[eventKey.current];
        const col = anim.col[frameIndex];
        const row = anim.row;
        // frame position
        const frameX = col * frameWidth;
        const frameY = row * frameHeight;

        playerEl.style.backgroundPosition = `-${frameX}px -${frameY}px`;

        // movement with deltaTime
        const moveDist = speedRef.current * delta;
        if (eventKey.current === "ArrowRight") {
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
        }
        if (eventKey.current === "ArrowLeft") {
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
        }
        if (eventKey.current === "ArrowUp") {
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
        }
        if (eventKey.current === "ArrowDown") {
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
        playerEl.style.transform = `translate3d(${posX}px, ${posY - 25}px, 0)`;
        ws.send(
          JSON.stringify({
            type: "move",
            roomId: ws.roomId,
            username: ws.username,
            x: posX,
            y: posY,
            frameX: frameX,
            frameY: frameY,
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
      style: {
        // Apply the scale
        transform: `scale(${scale})`,
        // Ensure scaling happens from the center
        transformOrigin: "center center",
        // CRITICAL: Keep pixel art sharp
        imageRendering: "pixelated",
      },
      onKeydown: handleKeyDown,
      onKeyup: handleKeyUp,
      autoFocus: true,
      tabIndex: 0,
    },
    jsx(
      "div",
      { className: "game-hud-container" },
      dead && jsx("div", { className: "you-lose" }, `${ws.username} you lose`),
      jsx(
        "div",
        { className: "hud-section player-info" },
        jsx("div", { className: "hud-label" }, "PLAYER"),
        jsx("div", { className: "hud-value player-name" }, ws.username || "jdab")
      ),
      jsx(
        "div",
        { className: "hud-bottom" },

        jsx(
          "div",
          { className: "hud-stat lives-stat" },
          jsx("div", { className: "stat-icon" }, "❤️"),
          jsx(
            "div",
            { className: "stat-info" },
            jsx("div", { className: "stat-label" }, "LIVES"),
            jsx(
              "div",
              { className: "stat-value" },
              jsx(
                "div",
                { className: "hearts-container" },
                ...Array.from({ length: lives }, (_, i) =>
                  jsx("span", { className: "heart", key: i }, "❤️")
                )
              )
            )
          )
        ),

        jsx(
          "div",
          { className: "hud-stat bombs-stat" },
          jsx("div", { className: "stat-icon" }, "💣"),
          jsx(
            "div",
            { className: "stat-info" },
            jsx("div", { className: "stat-label" }, "BOMBS"),
            jsx("div", { className: "stat-value bombs-count" }, bombs)
          )
        ),

        jsx(
          "div",
          { className: "hud-stat range-stat" },
          jsx("div", { className: "stat-icon" }, "💥"),
          jsx(
            "div",
            { className: "stat-info" },
            jsx("div", { className: "stat-label" }, "RANGE"),
            jsx("div", { className: "stat-value" }, bombRange)
          )
        ),

        jsx(
          "div",
          { className: "hud-stat players-stat" },
          jsx("div", { className: "stat-icon" }, "⚡"),
          jsx(
            "div",
            { className: "stat-info" },
            jsx("div", { className: "stat-label" }, "SPEED"),
            jsx("div", { className: "stat-value" }, speed)
          )
        )
      ),
      jsx(
        "div",
        { className: "hud-section1" },
        jsx("div", { className: "timer-icon" }, "⏱️"),
        jsx(
          "div",
          { className: "timer-display" },
          jsx("div", { className: "timer-value1" }, Timer)
        )
      )
    ),
    jsx(
      "div",
      { className: "combine-chat-map" },
      jsx(
        "div",
        { className: "map-container", ref: mapRef },
        ...players.map((p, i) => {
          const Me = p.username == ws.username;
          return jsx(
            "div",
            {
              className: `player player${i}`,
              style: {
                top: playerPosition[i]?.top,
                left: playerPosition[i]?.left,
              },
              key: `${p.username}`,
              ref: playersRef[i],
            },
            jsx(
              "div",
              { className: "player-label" },
              !Me && jsx("span", { className: "player-username" }, p.username)
            )
          );
        }),
        ...grid.map((row, rowIndex) =>
          jsx(
            "div",
            { className: "map-row" },
            ...row.map((cell, colIndex) =>
              cell === 6
                ? [
                  jsx("div", {
                    className: "tile tile-grass",
                    style: getTileStyle(rowIndex, colIndex, cell),
                    "data-row": rowIndex,
                    "data-col": colIndex,
                    key: `${`grass-${rowIndex}-${colIndex}`}`,
                  }),
                  jsx("div", {
                    className: "tile tile-explosion", // Add CSS for this!
                    style: getTileStyle(rowIndex, colIndex, cell),
                    key: `exp-${rowIndex}-${colIndex}`, // Stable Key
                    ref: (el) => {
                      const key = `${rowIndex}-${colIndex}`;
                      if (el) {
                        // Element created: Add to registry
                        explosionElementsRef.current.set(key, el);
                      } else {
                        // Element removed: Delete from registry
                        explosionElementsRef.current.delete(key);
                      }
                    },
                  }),
                ]
                : cell === 5
                  ? [
                    jsx("div", {
                      className: "tile tile-bomb",
                      style: getTileStyle(rowIndex, colIndex, cell),
                      key: `${rowIndex}-${colIndex}-bomb`,
                      ref: (el) => {
                        const key = `${rowIndex}-${colIndex}`;
                        if (el) {
                          // Element created: Add to registry
                          bombElementsRef.current.set(key, el);
                        } else {
                          // Element removed: Delete from registry
                          bombElementsRef.current.delete(key);
                        }
                      },
                    }),
                    jsx("div", {
                      className: "tile tile-grass",
                      style: getTileStyle(rowIndex, colIndex, cell),
                      "data-row": rowIndex,
                      "data-col": colIndex,
                      key: `${`grass-${rowIndex}-${colIndex}`}`,
                    }),
                  ]
                  : cell === 2 || cell >= 7
                    ? [
                      jsx("div", {
                        className: "tile tile-grass",
                        style: getTileStyle(rowIndex, colIndex, cell),
                        "data-row": rowIndex,
                        "data-col": colIndex,
                        key: `${`grass-${rowIndex}-${colIndex}`}`,
                      }),
                      jsx("div", {
                        className: tileClass[cell],
                        style: getTileStyle(rowIndex, colIndex, cell),
                        "data-row": rowIndex,
                        "data-col": colIndex,
                        key: `${`${tileTypes[cell]}-${rowIndex}-${colIndex}`}`,
                      }),
                    ]
                    : jsx("div", {
                      className: tileClass[cell],
                      style: getTileStyle(rowIndex, colIndex, cell),
                      "data-row": rowIndex,
                      "data-col": colIndex,
                      ref: divv,
                      key: `${`${tileTypes[cell]}-${rowIndex}-${colIndex}`}`,
                    })
            )
          )
        )
      ),
      jsx(
        "div",
        { className: "chat-section-game" },
        jsx("h3", null, "Game Chat"),
        jsx(
          "div",
          { className: "chat-messages" },
          ...chat.map((c) =>
            jsx(
              "div",
              { className: "chat-message" },
              jsx("span", { className: "username" }, c.username + ": "),
              jsx("span", null, c.msg)
            )
          )
        ),

        jsx(
          "div",
          { className: "chat-input-container" },
          jsx("input", {
            type: "text",
            value: msg,
            placeholder: "Type your message...",
            oninput: (e) => setMsg(e.target.value),
            onkeypress: (e) => e.key === "Enter" && sendMsg(e),
          }),
          jsx(
            "button",
            {
              onclick: (e) => {
                sendMsg(e);
              },
            },
            "Send"
          )
        )
      )
    )
  );
}
