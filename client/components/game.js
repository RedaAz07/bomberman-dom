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

const FRAMES = {
  ArrowRight: { row: 11, col: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
  ArrowLeft: { row: 9, col: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
  ArrowUp: { row: 8, col: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
  ArrowDown: { row: 10, col: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
};

export function game() {
  const map = store.get().map;
  const players = store.get().players;
  const [grid, setGrid] = useState(map);
  const mapRef = useRef(null);

  // REFS TO STORE DOM ELEMENTS FOR ANIMATION
  const bombElementsRef = useRef(new Map());
  const explosionElementsRef = useRef(new Map());

  const [playerPosition, setPlayerPosition] = useState({
    0: { top: "0px", left: "0px" },
    1: { top: "0px", left: "0px" },
    2: { top: "0px", left: "0px" },
    3: { top: "0px", left: "0px" },
  });

  const eventKey = useRef(null);
  const playersRef = [useRef(null), useRef(null), useRef(null), useRef(null)];
  
  const [scale, setScale] = useState(1);
  const [chat, setChat] = useState([]);
  const [msg, setMsg] = useState("");
  
  // Stats
  const [lives, setLives] = useState(3);
  const [speed, setspeed] = useState(1);
  const [bombs, setBombs] = useState(1);
  const [bombRange, setBombRange] = useState(1);
  
  const speedRef = useRef(0.1);
  const activeBombsRef = useRef(0);
  const maxBombsRef = useRef(1);
  
  const [Timer, setTimer] = useState("00:00");
  const [dead, setDead] = useState(false);
  const space = useRef(null);

  let frameIndex = 0;
  const frameWidth = 64;
  const frameHeight = 64;

  // WEBSOCKET HANDLER
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === "message") {
      setChat((prev) => [...prev, { username: data.username, msg: data.msg }]);
    }
    if (data.type === "grid-update") {
      setGrid(data.grid);
      // Clean up refs that might be gone (optional)
      bombElementsRef.current.clear();
      explosionElementsRef.current.clear();
    }
    if (data.type === "stats-update") {
      if (data.username === ws.username) {
        setLives(data.lives);
        setBombs(data.maxBombs);
        setBombRange(data.range);
        setspeed(data.speedLevel);
        speedRef.current = data.speedValue;
        maxBombsRef.current = data.maxBombs;
        if (data.lives <= 0) setDead(true);
      }
    }
    if (data.type === "player-move") {
      const { username, x, y, frameX, frameY } = data;
      if (username === ws.username) return;
      const index = store.get().players.findIndex((p) => p.username === username);
      if (index === -1) return;
      let el = playersRef[index]?.current;
      if (el) {
        el.style.backgroundPosition = `-${frameX}px -${frameY}px`;
        el.style.transform = `translate3d(${x}px, ${y - 25}px, 0)`;
      }
    }
    if (data.type == "player-dead") {
       const index = store.get().players.findIndex(p => p.username === data.username);
       if (index !== -1 && playersRef[index]?.current) {
          playersRef[index].current.style.opacity = 0.4;
       }
    }
    if (data.type === "game-over") {
      alert("Game Over! Winner: " + data.winner);
    }
  };

  // RESIZE & INIT
  useEffect(() => {
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
      setScale(Math.max(0.5, newScale)); 
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const sendMsg = (e) => { 
    if (!msg.trim() || msg.trim().length > 30) return;
    ws.send(JSON.stringify({ type: "message", msg }));
    setMsg("");
    e.target.value = "";
    if (e.target.previousSibling) e.target.previousSibling.value = "";
  };

  function placeBomb(posx, posy) {
    const x = Math.floor((posx + 32) / 50);
    const y = Math.floor((posy + 32) / 50);
    if (activeBombsRef.current < maxBombsRef.current) {
        ws.send(JSON.stringify({ type: "place-bomb", roomId: ws.roomId, username: ws.username, x, y }));
    }
  }

  function handleKeyDown(e) {
    if (FRAMES[e.key]) eventKey.current = e.key;
    if (e.key === " " && !e.repeat) space.current = e.key;
  }
  function handleKeyUp(e) {
    if (eventKey.current === e.key) { eventKey.current = null; frameIndex = 0; }
  }

  // --- MAIN GAME LOOP ---
  useEffect(() => {
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

    const id = store.get().players.findIndex((p) => p.username === ws.username);
    let playerEl = playersRef[id]?.current;
    if (!playerEl) return;

    let lastTime = 0;
    let animationTimer = 0;
    let posX = 0;
    let posY = 0;

    function checkCollision(newX, newY) {
      const baseX = playerEl.offsetLeft;
      const baseY = playerEl.offsetTop;
      const absX = baseX + newX;
      const absY = baseY + newY;
      const hitBox = { x: 10, y: 10, w: 40, h: 40 }; 
      const points = {
        tl: { x: absX + hitBox.x, y: absY + hitBox.y },
        tr: { x: absX + hitBox.x + hitBox.w, y: absY + hitBox.y },
        bl: { x: absX + hitBox.x, y: absY + hitBox.y + hitBox.h },
        br: { x: absX + hitBox.x + hitBox.w, y: absY + hitBox.y + hitBox.h },
      };
      
      let hasCollision = false;
      const collisions = { tl: false, tr: false, bl: false, br: false };
      
      // We read from the current state 'grid' (closure capture)
      // Since loop is re-bound on grid change, this is fine.
      
      for (const key in points) {
        const point = points[key];
        const tileX = Math.floor(point.x / 50);
        const tileY = Math.floor(point.y / 50);
        
        let isBlocked = false;
        if (grid[tileY] && grid[tileY][tileX] !== undefined) {
             const cell = grid[tileY][tileX];
             // Block Walls (1,3), Boxes (2), Bombs (5)
             if ([1, 2, 3, 4, 5].includes(cell)) {
                 isBlocked = true;
             }
        } else {
            isBlocked = true;
        }
        
        collisions[key] = isBlocked;
        if (isBlocked) hasCollision = true;
      }
      return { hasCollision, collisions };
    }

    function loop(timeStamp) {
      if (dead) return;
      const delta = timeStamp - lastTime;
      lastTime = timeStamp;

      // 1. ANIMATE BOMBS
      const bombFrame = Math.floor(timeStamp / 200) % 4;
      const bombPos = bombFrame * 50; 
      bombElementsRef.current.forEach(el => {
         if(el) el.style.backgroundPosition = `-${bombPos}px`;
      });

      // 2. ANIMATE EXPLOSIONS
      const expFrame = Math.floor(timeStamp / 100) % 5;
      const expPos = expFrame * 50;
      explosionElementsRef.current.forEach(el => {
         if(el) el.style.backgroundPosition = `-${expPos}px`;
      });

      // 3. MOVEMENT
      if (space.current === " ") {
        placeBomb(playerEl.offsetLeft + posX, playerEl.offsetTop + posY);
        space.current = null;
      }

      if (eventKey.current) {
        const anim = FRAMES[eventKey.current];
        const col = anim.col[frameIndex];
        const row = anim.row;
        
        playerEl.style.backgroundPosition = `-${col * 64}px -${row * 64}px`;
        const move = speedRef.current * delta;

        let dx = 0, dy = 0;
        if (eventKey.current === "ArrowLeft") dx = -move;
        if (eventKey.current === "ArrowRight") dx = move;
        if (eventKey.current === "ArrowUp") dy = -move;
        if (eventKey.current === "ArrowDown") dy = move;

        if (dx !== 0) {
            const { hasCollision } = checkCollision(posX + dx, posY);
            if (!hasCollision) posX += dx;
        }
        if (dy !== 0) {
            const { hasCollision } = checkCollision(posX, posY + dy);
            if (!hasCollision) posY += dy;
        }

        playerEl.style.transform = `translate3d(${posX}px, ${posY - 25}px, 0)`;

        ws.send(JSON.stringify({
          type: "move", roomId: ws.roomId, username: ws.username,
          x: posX, y: posY, frameX: col * 64, frameY: row * 64
        }));

        animationTimer += delta;
        if (animationTimer > 80) {
          animationTimer = 0;
          frameIndex = (frameIndex + 1) % anim.col.length;
        }
      }
      requestAnimationFrame(loop);
    }
    loop(0);
  }, []);

  return jsx("div", { 
      className: "game-container", 
      style: { transform: `scale(${scale})`, transformOrigin: "center center", imageRendering: "pixelated" }, 
      onKeydown: handleKeyDown, 
      onKeyup: handleKeyUp, 
      autoFocus: true, 
      tabIndex: 0 
    },
    // HUD
    jsx("div", {className: "game-hud-container"}, 
        dead && jsx("div", { className: "you-lose" }, `${ws.username} you lose`),
        jsx("div", {className: "hud-section player-info"}, 
            jsx("div", { className: "hud-label" }, "PLAYER"),
            jsx("div", { className: "hud-value player-name" }, ws.username)
        ),
        jsx("div", {className: "hud-bottom"}, 
            jsx("div", { className: "hud-stat" }, `❤️ ${lives}`),
            jsx("div", { className: "hud-stat" }, `💣 ${bombs}`),
            jsx("div", { className: "hud-stat" }, `💥 ${bombRange}`),
            jsx("div", { className: "hud-stat" }, `⚡ ${speed}`)
        ),
        jsx("div", {className: "hud-section1"}, 
             jsx("div", { className: "timer-display" }, Timer)
        )
    ),
    
    // MAP & CHAT WRAPPER
    jsx("div", { className: "combine-chat-map" },
      jsx("div", { className: "map-container", ref: mapRef },
        // PLAYERS
        ...players.map((p, i) => {
             const Me = p.username == ws.username;
             return jsx("div", { 
                 className: `player player${i}`, 
                 style: { top: playerPosition[i]?.top, left: playerPosition[i]?.left }, 
                 ref: playersRef[i],
                 key: p.username
             },
                !Me && jsx("span", { className: "player-username" }, p.username)
             );
        }),
        // GRID
        ...grid.map((row, rowIndex) =>
          jsx("div", { className: "map-row", key: rowIndex },
            ...row.map((cell, colIndex) => {
                const key = `${rowIndex}-${colIndex}`;
                
                // Bomb Tile
                if (cell === 5) {
                    return jsx("div", {
                        className: tileClass[cell],
                        style: getTileStyle(rowIndex, colIndex, cell),
                        key: key + "-bomb",
                        ref: (el) => { 
                             if(el) bombElementsRef.current.set(key, el); 
                             else bombElementsRef.current.delete(key); 
                        }
                    });
                }
                
                // Explosion Tile
                if (cell === 6) {
                    return jsx("div", {
                        className: tileClass[cell],
                        style: getTileStyle(rowIndex, colIndex, cell),
                        key: key + "-exp",
                        ref: (el) => { 
                            if(el) explosionElementsRef.current.set(key, el); 
                            else explosionElementsRef.current.delete(key); 
                        }
                    });
                }
                
                // Normal Tile (Grass, Walls, Items)
                return jsx("div", {
                    className: tileClass[cell],
                    style: getTileStyle(rowIndex, colIndex, cell),
                    key: key
                });
            })
          )
        )
      ),
      
      // CHAT
      jsx("div", { className: "chat-section-game" }, 
         jsx("h3", null, "Game Chat"),
         jsx("div", { className: "chat-messages" },
            ...chat.map((c, i) => 
               jsx("div", { className: "chat-message", key: i }, 
                   jsx("span", {className: "username"}, c.username + ": "), 
                   jsx("span", null, c.msg)
               )
            )
         ),
         jsx("div", { className: "chat-input-container" },
             jsx("input", { 
                 type: "text", 
                 value: msg, 
                 placeholder: "Type...", 
                 oninput: (e) => setMsg(e.target.value),
                 onkeypress: (e) => e.key === "Enter" && sendMsg(e)
             }),
             jsx("button", { onclick: sendMsg }, "Send")
         )
      )
    )
  );
}