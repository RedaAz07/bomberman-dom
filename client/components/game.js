import { useEffect, useRef, useState } from "../framework/main.js";
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
  const [chat, setChat] = useState([]);
  const [msg, setMsg] = useState("");
  const [lives, setLives] = useState(3);
  const [speed, setspeed] = useState(1);
  const [bombs, setBombs] = useState(1);
  const [bombRange, setBombRange] = useState(1);
  const [Timer, setTimer] = useState("00:00");
  const [dead, setDead] = useState(false);
  const [gameResult, setGameResult] = useState(null);

  const bombElementsRef = useRef(new Map());
  const bombTimersRef = useRef(new Map()); // <--- ADD THIS
  const explosionElementsRef = useRef(new Map());

  const map = store.get().map;
  const players = store.get().players;
  const [grid, setGrid] = useState(map);
  const mapRef = useRef(null);

  // FIXED: Set initial CSS positions to 0,0.
  // We rely completely on translate3d from the server coordinates.
  const [playerPosition, setPlayerPosition] = useState({
    0: { top: "50px", left: "50px" },
    1: { top: "50px", left: "650px" },
    2: { top: "650px", left: "50px" },
    3: { top: "650px", left: "650px" },
  });

  const playersRef = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const [scale, setScale] = useState(1);

  const FRAMES = {
    ArrowRight: { row: 11, col: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
    ArrowLeft: { row: 9, col: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
    ArrowUp: { row: 8, col: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
    ArrowDown: { row: 10, col: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
  };
  const movingState = useRef({});

  const sendMsg = (e) => {
    if (!msg.trim() || msg.trim().length > 30) return;
    ws.send(JSON.stringify({ type: "message", msg }));
    setMsg("");
    e.target.value = "";
    if (e.key != "Enter") e.target.previousSibling.value = "";
  };

  function placeBomb() {
    ws.send(JSON.stringify({ type: "place-bomb", roomId: ws.roomId }));
  }

  function handleKeyDown(e) {
    if (FRAMES[e.key] && !e.repeat)
      ws.send(JSON.stringify({ type: "input", key: e.key, state: true }));
    if (e.key === " " && !e.repeat) placeBomb();
  }

  function handleKeyUp(e) {
    if (FRAMES[e.key])
      ws.send(JSON.stringify({ type: "input", key: e.key, state: false }));
  }

  useEffect(() => {
    let obj = { min: 0, sec: 0 };
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

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "message")
        setChat((prev) => [
          ...prev,
          { username: data.username, msg: data.msg },
        ]);
      if (data.type === "grid-update") {
        
        setGrid(data.map)};
      if (data.type === "stats-update") {
        setLives(data.stats.lives);
        setBombs(data.stats.maxBombs);
        setBombRange(data.stats.range);
        setspeed(data.stats.speedLevel);
      }
      if (data.type === "players-sync") {
        data.moves.forEach((move) => {
          const index = store
            .get()
            .players.findIndex((p) => p.username === move.username);
          if (index === -1) return;
          const el = playersRef[index]?.current;

          if (!movingState.current[move.username])
            movingState.current[move.username] = { frame: 0, time: 0 };
          const anim = movingState.current[move.username];

          if (el) {
            // FIXED: Removed -25px offset. We trust server coordinates directly.
            el.style.transform = `translate3d(${move.x}px, ${move.y}px, 0)`;

            if (move.isMoving) {
              let key = "ArrowDown";
              if (move.direction === "up") key = "ArrowUp";
              if (move.direction === "left") key = "ArrowLeft";
              if (move.direction === "right") key = "ArrowRight";

              const def = FRAMES[key];
              const frameX = def.col[anim.frame] * 64;
              const frameY = def.row * 64;
              el.style.backgroundPosition = `-${frameX}px -${frameY}px`;

              anim.time += 50;
              if (anim.time > 80) {
                anim.frame = (anim.frame + 1) % def.col.length;
                anim.time = 0;
              }
            }
          }
        });
      }
      if (data.type == "player-dead") {
        const index = store
          .get()
          .players.findIndex((p) => p.username === data.username);
        if (index !== -1 && playersRef[index]?.current)
          playersRef[index].current.style.display = "none";
        if (data.username === ws.username) setDead(true);
      }
      if (data.type == "you-win" || data.type == "you-lose") {
        setGameResult({
          type: data.type === "you-win" ? "win" : "lose",
          username: data.username,
        });
      }
    };

    const width = 1500;
    const height = 1500;
    function handleResize() {
      if (window.innerHeight >= 800 && window.innerWidth >= 1000) {
        setScale(1);
        return;
      }
      const newScale = Math.min(
        window.innerWidth / width,
        window.innerHeight / height
      );
      setScale(newScale);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    let lastTimeStamp = 0;
    let frame = {};
    // ANIMATION LOOP
    function loop(timeStamp) {
      if (dead) return;
      const delta = timeStamp - lastTimeStamp;
      lastTimeStamp = timeStamp;
      if (bombElementsRef.current.length === 0) {
        frame = {};
      }
      // --- BOMBS ---
      bombElementsRef.current.forEach((el, key) => {
        if (el) {
          let startTime = bombTimersRef.current.get(key);

          if (!startTime) {
            
            startTime = 0;
            bombTimersRef.current.set(key, startTime);
          }
          if (!frame[key]) {
            frame[key] = 0;
          }
          bombTimersRef.current.set(key, startTime + delta);


          // CHANGE: Use 600ms.
          // 600ms * 4 frames = 2400ms total.
          // This ensures the animation finishes before the server (3000ms) explodes it.

          if (frame[key] == 0 || startTime + delta >= 750) {
            bombTimersRef.current.set(key, 0);

            el.style.backgroundPosition = `-${frame[key] * 50}px`;

            frame[key] += 1;
          }
        }
      });

      // --- EXPLOSIONS ---
      const expFrame = Math.floor(timeStamp / 100) % 5;
      explosionElementsRef.current.forEach((el) => {
        if (el) el.style.backgroundPosition = `-${expFrame * 50}px -150px`;
      });

      requestAnimationFrame(loop);
    }
    loop(0);
  }, []);

  return gameResult
    ? jsx(
        "div",
        { className: "winner-announcement" },
        gameResult.type === "win"
          ? jsx(
              "div",
              null,
              `🎉 Congratulations ${gameResult.username}, You Win! 🎉`
            )
          : jsx("div", null, `💀 Sorry ${gameResult.username}, You Lose! 💀`)
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
              ws.username || "jdab"
            )
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
                    transform: `translate3d(${playerPosition[i]?.top}px, ${playerPosition[i]?.left}px, 0)`,
                    top: "0px",
                    left: "0px",
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
                    ? [
                        jsx("div", {
                          className: "tile tile-grass",
                          style: getTileStyle(rowIndex, colIndex, cell),
                          "data-row": rowIndex,
                          "data-col": colIndex,
                          key: `${`grass-${rowIndex}-${colIndex}`}`,
                        }),
                        jsx("div", {
                          className: "tile tile-explosion",
                          style: getTileStyle(rowIndex, colIndex, cell),
                          key: `exp-${rowIndex}-${colIndex}`,
                          ref: (el) => {
                            const key = `${rowIndex}-${colIndex}`;
                            if (el) explosionElementsRef.current.set(key, el);
                            else explosionElementsRef.current.delete(key);
                          },
                        }),
                      ]
                    : cell === 5
                    ? [
                        jsx("div", {
                          className: "tile tile-grass",
                          style: getTileStyle(rowIndex, colIndex, cell),
                          "data-row": rowIndex,
                          "data-col": colIndex,
                          key: `${`grass-${rowIndex}-${colIndex}`}`,
                        }),
                        jsx("div", {
                          className: "tile tile-bomb",
                          style: getTileStyle(rowIndex, colIndex, cell),
                          key: `${rowIndex}-${colIndex}-bomb`,
                          ref: (el) => {
                            const key = `${rowIndex}-${colIndex}`;
                            if (el) {
                              // 1. Store the DOM element
                              bombElementsRef.current.set(key, el);
                              // 2. Store the creation time ONLY if we haven't seen this bomb yet
                              if (!bombTimersRef.current.has(key)) {
                                
                                bombTimersRef.current.set(key, 0);
                              }
                            } else {
                              // Bomb removed (exploded): Clean up both
                              
                              bombElementsRef.current.delete(key);
                              bombTimersRef.current.delete(key);
                            }
                          },
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
              jsx("button", { onclick: (e) => sendMsg(e) }, "Send")
            )
          )
        )
      );
}
