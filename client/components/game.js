import { replace, useEffect, useRef, useState } from "../framework/main.js";
import { jsx } from "../framework/main.js";
import { store } from "./lobby.js";
import { ws } from "../assets/js/ws.js";
import { getTileStyle } from "../utils/map.js";

const tileClass = {
  0: "tile tile-grass",
  1: "tile tile-wall-vertical",
  2: "tile tile-braml",
  3: "tile tile-wall-corner",
  4: "tile tile-stone",
  5: "tile tile-bomb",
  6: "tile tile-explosion",
  7: "tile tile-speed",
  8: "tile tile-bomb-up",
  9: "tile tile-power",
};

/**
 * Checks for collisions between a target position and the map/objects.
 * @param {Array} map - The game map grid.
 * @param {number} targetX - The target X coordinate.
 * @param {number} targetY - The target Y coordinate.
 * @param {number} currentX - The current X coordinate.
 * @param {number} currentY - The current Y coordinate.
 * @returns {Object} Collision data including boolean flag and specific collision points.
 */
function checkCollision(map, targetX, targetY, currentX, currentY) {
  const TILE_SIZE = 50;
  const HITBOX = { x: 12, y: 20, w: 40, h: 40 };

  const points = {
    tl: { x: targetX + HITBOX.x, y: targetY + HITBOX.y },
    tr: { x: targetX + HITBOX.x + HITBOX.w, y: targetY + HITBOX.y },
    bl: { x: targetX + HITBOX.x, y: targetY + HITBOX.y + HITBOX.h },
    br: { x: targetX + HITBOX.x + HITBOX.w, y: targetY + HITBOX.y + HITBOX.h },
  };

  const collisions = {};
  let hasCollision = false;

  for (const key in points) {
    const point = points[key];
    const tileX = Math.floor(point.x / TILE_SIZE);
    const tileY = Math.floor(point.y / TILE_SIZE);

    let isBlocked = false;

    if (tileY < 0 || tileY >= 15 || tileX < 0 || tileX >= 15) {
      isBlocked = true;
    } else {
      const cell = map[tileY][tileX];
      if ([1, 2, 3, 4].includes(cell)) {
        isBlocked = true;
      } else if (cell === 5) {
        const playerRect = {
          left: currentX + HITBOX.x,
          right: currentX + HITBOX.x + HITBOX.w,
          top: currentY + HITBOX.y,
          bottom: currentY + HITBOX.y + HITBOX.h,
        };
        const bombRect = {
          left: tileX * TILE_SIZE,
          right: (tileX + 1) * TILE_SIZE,
          top: tileY * TILE_SIZE,
          bottom: (tileY + 1) * TILE_SIZE,
        };
        const isOverlapping =
          playerRect.left < bombRect.right &&
          playerRect.right > bombRect.left &&
          playerRect.top < bombRect.bottom &&
          playerRect.bottom > bombRect.top;
        if (!isOverlapping) isBlocked = true;
      }
    }
    collisions[key] = isBlocked;
    if (isBlocked) hasCollision = true;
  }
  return { hasCollision, collisions };
}

/**
 * Linear interpolation function for smooth movement.
 * @param {number} start - Start value.
 * @param {number} end - End value.
 * @param {number} t - Interpolation factor (0-1).
 * @returns {number} Interpolated value.
 */
function lerp(start, end, t) {
  return start * (1 - t) + end * t;
}

/**
 * Main Game component.
 * Handles game state, rendering, and user interactions.
 * @returns {Object} JSX element for the game.
 */
export function game() {
  const storedData = store.get();
  if (!storedData || !storedData.map) {
    useEffect(() => {
      replace("/");
    }, []);
    return jsx("div", null, "Redirecting to Join Page...");
  }
  const [chat, setChat] = useState([]);
  const [msg, setMsg] = useState("");
  const [lives, setLives] = useState(3);
  const [speedLevel, setSpeedLevel] = useState(1);
  const [bombs, setBombs] = useState(1);
  const [bombRange, setBombRange] = useState(1);

  // OPTIMIZATION: Removed Timer state to prevent re-renders
  // const [Timer, setTimer] = useState("00:00");

  const [dead, setDead] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const time = useRef(null);
  const bombElementsRef = useRef(new Map());
  const bombTimersRef = useRef(new Map());
  const explosionElementsRef = useRef(new Map());
  const mapRef = useRef(null);
  const timerRef = useRef(null); // New Ref for Timer

  const map = store.get().map;
  const playersList = store.get().players;
  const [grid, setGrid] = useState(map);
  const latestGridRef = useRef(map);

  const playerStateRef = useRef(
    playersList.map((_, i) => {
      const T1 = 75;
      const T13 = 13 * 50 + 25; // 675
      const offX = 32;
      const offY = 40;

      const spawns = [
        { x: T1 - offX, y: T1 - offY }, // TL (43, 25)
        { x: T13 - offX, y: T1 - offY }, // TR (643, 25)
        { x: T13 - offX, y: T13 - offY }, // BR (643, 625)
        { x: T1 - offX, y: T13 - offY }, // BL (43, 625)
      ];
      const start = spawns[i];
      return {
        x: start.x,
        y: start.y,
        targetX: start.x,
        targetY: start.y,
        direction: "down",
        isMoving: false,
        frame: 0,
        animTime: 0,
      };
    })
  );

  const inputsRef = useRef({
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
  });
  const playersRef = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const [scale, setScale] = useState(1);
  const [winner, setWinner] = useState(null);

  const FRAMES = {
    ArrowRight: { row: 11, col: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
    ArrowLeft: { row: 9, col: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
    ArrowUp: { row: 8, col: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
    ArrowDown: { row: 10, col: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
  };

  /**
   * Sends a chat message to the server.
   * @param {Event} e - The event object.
   */
  const sendMsg = (e) => {
    if (!msg.trim() || msg.trim().length > 30) return;
    if (ws.readyState === 1) ws.send(JSON.stringify({ type: "message", msg }));
    setMsg("");
    e.target.value = "";
    if (e.key != "Enter") e.target.previousSibling.value = "";
  };

  /**
   * Sends a request to place a bomb.
   */
  function placeBomb() {
    if (ws.readyState === 1)
      ws.send(JSON.stringify({ type: "place-bomb", roomId: ws.roomId }));
  }

  /**
   * Handles key down events for movement and actions.
   * @param {KeyboardEvent} e - The keyboard event.
   */
  function handleKeyDown(e) {
    if (e.target.tagName === "INPUT") {
      return;
    }
    if (FRAMES[e.key]) {
      inputsRef.current[e.key] = true;
      if (ws.readyState === 1)
        ws.send(JSON.stringify({ type: "input", key: e.key, state: true }));
    }
    if (e.key === " " && !e.repeat) placeBomb();
  }

  /**
   * Handles key up events to stop movement.
   * @param {KeyboardEvent} e - The keyboard event.
   */
  function handleKeyUp(e) {
    if (e.target.tagName === "INPUT") {
      return;
    }
    if (FRAMES[e.key]) {
      inputsRef.current[e.key] = false;
      if (ws.readyState === 1)
        ws.send(JSON.stringify({ type: "input", key: e.key, state: false }));
    }
  }

  useEffect(() => {
    let obj = { min: 0, sec: 0 };
    const timerInterval = setInterval(() => {
      obj.sec++;
      if (obj.sec === 60) {
        obj.min++;
        obj.sec = 0;
      }
      // OPTIMIZATION: Direct DOM update to avoid re-render
      const timeString =
        String(obj.min).padStart(2, "0") +
        ":" +
        String(obj.sec).padStart(2, "0");
      if (timerRef.current) {
        timerRef.current.textContent = timeString;
      }
    }, 1000);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "message")
        setChat((prev) => [
          ...prev,
          { username: data.username, msg: data.msg },
        ]);
      if (data.type === "grid-update") {
        setGrid(data.map);
        latestGridRef.current = data.map;
      }
      if (data.type === "stats-update") {
        setLives(data.stats.lives);
        setBombs(data.stats.maxBombs);
        setBombRange(data.stats.range);
        setSpeedLevel(data.stats.speedLevel);
      }

      if (data.type === "players-sync") {
        data.moves.forEach((move) => {
          const index = playersList.findIndex(
            (p) => p.username === move.username
          );
          if (index === -1) return;
          if (time.current) clearTimeout(time.current);
          time.current = setTimeout(() => {
            pState.isMoving = false;
          }, 200);
          const pState = playerStateRef.current[index];
          const isMe = move.username === ws.username;

          if (isMe) {
            const dist = Math.hypot(pState.x - move.x, pState.y - move.y);
            if (dist > 15) {
              pState.x = move.x;
              pState.y = move.y;
            } else if (dist > 5) {
              pState.x = lerp(pState.x, move.x, 0.2);
              pState.y = lerp(pState.y, move.y, 0.2);
            }
          } else {
            pState.targetX = move.x;
            pState.targetY = move.y;
            pState.direction = move.direction;
            pState.isMoving = move.isMoving;
          }
        });
      }

      if (data.type == "player-dead") {
        const index = playersList.findIndex(
          (p) => p.username === data.username
        );
        if (index !== -1 && playersRef[index]?.current)
          playersRef[index].current.style.display = "none";
        if (data.username === ws.username) setDead(true);
      }
      if (data.type === "game-over") {
        setWinner(data.winner);
        if (data.winner === ws.username) {
          setGameResult({
            type: "win",
            username: data.winner,
          });
        } else if (data.winner == "draw") {
          setGameResult({
            type: "draw",
            username: ws.username,
          });
        } else {
          setGameResult({
            type: "lose",
            username: ws.username,
          });
        }
      }
      if (data.type == "player-hit") {
        const index = playersList.findIndex(
          (p) => p.username === data.username
        );
        if (index === -1) return;

        const playerEl = playersRef[index]?.current;
        if (!playerEl) return;
        playerEl.classList.add("hit");

        setTimeout(() => {
          playerEl.classList.remove("hit");
        }, 2000);
      }
    };

    const width = 1500;
    const height = 1500;
    /**
     * Resizes the game scale based on window size.
     */
    function handleResize() {
      if (window.innerHeight >= 800 && window.innerWidth >= 1000) {
        setScale(1);
        return;
      }
      setScale(
        Math.min(window.innerWidth / width, window.innerHeight / height)
      );
    }
    handleResize();
    window.addEventListener("resize", handleResize);

    let lastTime = 0;
    let animationFrameId;
    /**
     * Main game loop for animation and updates.
     * @param {number} timeStamp - Current timestamp.
     */
    function loop(timeStamp) {
      if (!dead) {
        const deltaTime = timeStamp - lastTime;
        lastTime = timeStamp;

        playersRef.forEach((ref, i) => {
          if (!ref.current) return;
          const pState = playerStateRef.current[i];
          const playerInfo = store.get().players[i];
          if (!playerInfo) return;

          const isMe = playerInfo.username === ws.username;

          if (isMe) {
            const speedVal = 6 + speedLevel * 1.5;
            const pixelPerMs = speedVal / 50;
            const moveDist = pixelPerMs * deltaTime;

            let moving = false;
            const currentMap = latestGridRef.current;

            const STEPS = Math.ceil(moveDist / 4);
            const stepDist = moveDist / STEPS;

            for (let s = 0; s < STEPS; s++) {
              if (inputsRef.current.ArrowUp) {
                const { hasCollision, collisions } = checkCollision(
                  currentMap,
                  pState.x,
                  pState.y - stepDist,
                  pState.x,
                  pState.y
                );
                if (!hasCollision) {
                  pState.y -= stepDist;
                } else {
                  if (collisions.tl && !collisions.tr) pState.x += stepDist;
                  else if (collisions.tr && !collisions.tl)
                    pState.x -= stepDist;
                }
                pState.direction = "up";
                moving = true;
              } else if (inputsRef.current.ArrowDown) {
                const { hasCollision, collisions } = checkCollision(
                  currentMap,
                  pState.x,
                  pState.y + stepDist,
                  pState.x,
                  pState.y
                );
                if (!hasCollision) {
                  pState.y += stepDist;
                } else {
                  if (collisions.bl && !collisions.br) pState.x += stepDist;
                  else if (collisions.br && !collisions.bl)
                    pState.x -= stepDist;
                }
                pState.direction = "down";
                moving = true;
              } else if (inputsRef.current.ArrowLeft) {
                const { hasCollision, collisions } = checkCollision(
                  currentMap,
                  pState.x - stepDist,
                  pState.y,
                  pState.x,
                  pState.y
                );
                if (!hasCollision) {
                  pState.x -= stepDist;
                } else {
                  if (collisions.tl && !collisions.bl) pState.y += stepDist;
                  else if (collisions.bl && !collisions.tl)
                    pState.y -= stepDist;
                }
                pState.direction = "left";
                moving = true;
              } else if (inputsRef.current.ArrowRight) {
                const { hasCollision, collisions } = checkCollision(
                  currentMap,
                  pState.x + stepDist,
                  pState.y,
                  pState.x,
                  pState.y
                );
                if (!hasCollision) {
                  pState.x += stepDist;
                } else {
                  if (collisions.tr && !collisions.br) pState.y += stepDist;
                  else if (collisions.br && !collisions.tr)
                    pState.y -= stepDist;
                }
                pState.direction = "right";
                moving = true;
              }
            }
            pState.isMoving = moving;
          } else {
            pState.x = lerp(pState.x, pState.targetX, 0.2);
            pState.y = lerp(pState.y, pState.targetY, 0.2);
          }

          ref.current.style.transform = `translate3d(${pState.x}px, ${pState.y}px, 0)`;

          if (pState.isMoving) {
            let key = "ArrowDown";
            if (pState.direction === "up") key = "ArrowUp";
            if (pState.direction === "left") key = "ArrowLeft";
            if (pState.direction === "right") key = "ArrowRight";

            const def = FRAMES[key];
            const frameX = def.col[pState.frame] * 64;
            const frameY = def.row * 64;
            ref.current.style.backgroundPosition = `-${frameX}px -${frameY}px`;

            pState.animTime += deltaTime;
            if (pState.animTime > 80) {
              pState.frame = (pState.frame + 1) % def.col.length;
              pState.animTime = 0;
            }
          }
        });

        bombElementsRef.current.forEach((el, key) => {
          if (el) {
            let startTime = bombTimersRef.current.get(key);
            if (!startTime) {
              startTime = timeStamp;
              bombTimersRef.current.set(key, startTime);
            }
            const age = timeStamp - startTime;
            const frame = Math.min(Math.floor(age / 600), 3);
            el.style.backgroundPosition = `-${frame * 50}px`;
          }
        });

        const expFrame = Math.floor(timeStamp / 100) % 5;
        explosionElementsRef.current.forEach((el) => {
          if (el) el.style.backgroundPosition = `-${expFrame * 50}px -150px`;
        });
      }
      animationFrameId = requestAnimationFrame(loop);
    }
    animationFrameId = requestAnimationFrame(loop);
    return () => {
      console.log("Cleaning up Game...");
      cancelAnimationFrame(animationFrameId);
      clearInterval(timerInterval);
      window.removeEventListener("resize", handleResize);
      ws.onmessage = null;
      ws.close();
      setTimeout(() => {
        store.set({ map: null, players: [] });
      }, 0);
    };
  }, []);

  return gameResult
    ? jsx(
        "div",
        { className: "game-result" },
        jsx(
          "div",
          { className: "result-content" },
          jsx(
            "div",
            { className: "result-icon animation" },
            gameResult.type === "win"
              ? "🎉"
              : gameResult.type === "draw"
              ? "🤝"
              : "💀"
          ),
          jsx(
            "p",
            { className: "result-message" },
            gameResult.type === "win"
              ? `Congratulations ${gameResult.username}, You Win!`
              : gameResult.type === "draw"
              ? "It's a Draw! No one wins."
              : `Sorry, You Lose. Winner is ${winner}`
          ),
          jsx(
            "button",
            {
              className: "replay-button",
              onClick: () => window.location.reload(),
            },
            "Play Again"
          )
        )
      )
    : jsx(
        "div",
        {
          className: "game-container",
          style: {
            transform: `scale(${scale})`,
            transformOrigin: "center center",
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
          jsx(
            "div",
            { className: "hud-section player-info" },
            jsx("div", { className: "hud-label" }, "PLAYER"),
            jsx(
              "div",
              { className: "hud-value player-name" },
              ws.username || "Guest"
            )
          ),
          jsx(
            "div",
            { className: "hud-bottom" },
            jsx(
              "div",
              { className: "hud-stat lives-stat" },
              jsx("div", { className: "stat-icon animation" }, "❤️"),
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
                jsx("div", { className: "stat-value" }, speedLevel)
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
              // OPTIMIZATION: Timer Ref instead of state
              jsx("div", { className: "timer-value1", ref: timerRef }, "00:00")
            )
          )
        ),
        jsx(
          "div",
          { className: "combine-chat-map" },
          jsx(
            "div",
            { className: "map-container", ref: mapRef },
            ...playersList.map((p, i) => {
              const Me = p.username == ws.username;
              return jsx(
                "div",
                {
                  className: `player player${i}`,
                  style: {
                    top: "0px",
                    left: "0px",
                    transform: "translate3d(0,0,0)",
                  },
                  key: `${p.username}`,
                  ref: playersRef[i],
                },
                jsx(
                  "div",
                  { className: "player-label" },
                  !Me &&
                    jsx("span", { className: "player-username" }, p.username)
                )
              );
            }),
            ...grid.map((row, rowIndex) =>
              jsx(
                "div",
                { className: "map-row" },
                ...row.map((cell, colIndex) =>
                  cell === 6
                    ? jsx("div", {
                        className: "tile tile-explosion",
                        style: getTileStyle(rowIndex, colIndex, cell),
                        "data-row": rowIndex,
                        "data-col": colIndex,
                        key: `${rowIndex}-${colIndex}`,
                        ref: (el) => {
                          const key = `${rowIndex}-${colIndex}`;
                          if (el) explosionElementsRef.current.set(key, el);
                          else explosionElementsRef.current.delete(key);
                        },
                      })
                    : cell === 5
                    ? jsx("div", {
                        className: "tile tile-bomb",
                        style: getTileStyle(rowIndex, colIndex, cell),
                        "data-row": rowIndex,
                        "data-col": colIndex,
                        key: `${rowIndex}-${colIndex}`,
                        ref: (el) => {
                          const key = `${rowIndex}-${colIndex}`;
                          // OPTIMIZATION: Removed console.log
                          if (el && el.classList.contains("tile-bomb")) {
                            bombElementsRef.current.set(key, el);
                          } else {
                            bombElementsRef.current.delete(key);
                            bombTimersRef.current.delete(key);
                          }
                        },
                      })
                    : cell == 2 || cell >= 7
                    ? jsx("div", {
                        className: tileClass[cell],
                        style: getTileStyle(rowIndex, colIndex, cell),
                        "data-row": rowIndex,
                        "data-col": colIndex,
                        key: `${`${rowIndex}-${colIndex}`}`,
                      })
                    : jsx("div", {
                        className: tileClass[cell],
                        style: getTileStyle(rowIndex, colIndex, cell),
                        "data-row": rowIndex,
                        "data-col": colIndex,
                        key: `${`${rowIndex}-${colIndex}`}`,
                        ref: () => {
                          const key = `${rowIndex}-${colIndex}`;

                          bombElementsRef.current.delete(key);
                          bombTimersRef.current.delete(key);
                          explosionElementsRef.current.delete(key);
                        },
                      })
                )
              )
            )
          ),
          jsx(
            "div",
            { className: "chat-section-game" },
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
                oninput: (e) => {
                  e.stopPropagation();
                  setMsg(e.target.value);
                },
                onkeypress: (e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") sendMsg(e);
                },
              }),
              jsx("button", { onclick: (e) => sendMsg(e) }, "Send")
            )
          )
        )
      );
}
