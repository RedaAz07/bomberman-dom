import { Store, useEffect, useRef, useState } from "../framework/main.js";
import { jsx } from "../framework/main.js";
import { store } from "./lobby.js";
import { map } from "./map.js";
import { ws } from "../assets/js/ws.js";
console.log(ws, "websoket");

export function game() {
  const [scale, setScale] = useState(1);

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
      setScale(newScale);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
  }, []);
  const [chat, setChat] = useState([]);
  const [msg, setMsg] = useState("");
  const [lives, setLives] = useState(3);
  const [bombs, setBombs] = useState(3);
  const [bombRange, setBombRange] = useState(4);
  const [Timer, setTimer] = useState("00:00");
  const eventKey = useRef(null);
  const bomRef = useRef(null);
  const playersRef = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const mapData = store.get().collisionMap;
  const playersAlive = store.get().players.length;
  let frameIndex = 0;
  const frameWidth = 64;
  const frameHeight = 64;
  const FRAMES = {
    ArrowRight: { row: 11, col: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
    ArrowLeft: { row: 9, col: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
    ArrowUp: { row: 8, col: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
    ArrowDown: { row: 10, col: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
  };

  const sendMsg = (e) => {
    if (!msg.trim() || msg.trim().length > 30) return;
    console.log("dkhl");
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

  function handleKeyDown(e) {
    if (FRAMES[e.key]) {
      eventKey.current = e.key;
    }
  }

  function handleKeyUp(e) {
    if (eventKey.current === e.key) {
      eventKey.current = null;
      frameIndex = 0;
    }
  }

  useEffect(() => {
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
  }, []);
  // SPRITE DATA

  useEffect(() => {
    const id = store.get().players.findIndex((p) => p.username === ws.username);
    const playerEl = playersRef[id].current;
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

      // Full square fit (62x62) to eliminate both horizontal and vertical sliding
      const hitBox = {
        x: 1,
        y: 1,
        w: 48,
        h: 48,
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
      return { hasCollision, collisions };
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "player-move") {
        const { username, x, y, frameX, frameY } = data;

        if (username === ws.username) return;

        const players = store.get().players;
        const index = players.findIndex((p) => p.username === username);
        if (index === -1) return;

        const el = playersRef[index]?.current;
        if (!el) return;

        el.style.backgroundPosition = `-${frameX}px -${frameY}px`;
        el.style.transform = `translate3d(${x}px, ${y - 25}px, 0)`;
      }
      if (data.type === "message") {
        setChat((prev) => [
          ...prev,
          { username: data.username, msg: data.msg },
        ]);
      }
    };

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

        playerEl.style.backgroundPosition = `-${frameX}px -${frameY}px`;

        // movement with deltaTime
        const moveDist = speed * delta;

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

  console.log(playersAlive);

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

      jsx(
        "div",
        { className: "hud-section player-info" },
        jsx("div", { className: "hud-label" }, "PLAYER"),
        jsx("div", { className: "hud-value player-name" }, ws.username)
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
                ...Array.from({ length: lives || 3 }, (_, i) =>
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
            jsx("div", { className: "stat-value bombs-count" }, bombs || 1)
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
            jsx("div", { className: "stat-value" }, bombRange || 1)
          )
        ),

        jsx(
          "div",
          { className: "hud-stat players-stat" },
          jsx("div", { className: "stat-icon" }, "👥"),
          jsx(
            "div",
            { className: "stat-info" },
            jsx("div", { className: "stat-label" }, "ALIVE"),
            jsx("div", { className: "stat-value" }, playersAlive || 1)
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
      map(playersRef, bomRef),
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
