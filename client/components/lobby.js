import {
  jsx,
  useState,
  useEffect,
  navigate,
  Store,
} from "../framework/main.js";
import { ws } from "../assets/js/ws.js";
export const store = Store({ map: [], collisionMap: [], bom: false, players: [] });

export function Lobby() {
  const [msg, setMsg] = useState("");
  const [players, setPlayers] = useState([]);
  const [chat, setChat] = useState([]);
  const [sec, setSec] = useState(null);
  const [roomId, setRoomId] = useState(null);
  // console.log(ws, "websoket+++++++++++++++++++++");

  if (!ws.username) navigate("/");

  useEffect(() => {
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "player-list") {
        setPlayers(data.players);
        setRoomId(data.roomId)
        ws.roomId = data.roomId
      }

      if (data.type === "message") {
        setChat((prev) => [
          ...prev,
          { username: data.username, msg: data.msg },
        ]);
      }

      if (data.type === "counter") {
        setSec(data.timeLeft);
      }

      if (data.type === "start-game") {
        console.log(data);

        store.set({ map: data.map, collisionMap: data.collisionMap, players: data.players, username: ws.username, time: data.time });
        navigate("/map");
      }
    };
  }, []);

  const sendMsg = (e) => {
    if (!msg.trim() || msg.trim().length > 30) return;
    console.log("dkhl f lobby");
    ws.send(
      JSON.stringify({
        type: "message",
        msg,
      })
    );

    setMsg("");
    e.target.value = "";
    e.target.previousSibling.value = ""
  };

  return jsx("div", { className: "container lobby-wrapper" },

    roomId !== null && jsx("div", { className: "room-id" }, "Welcome to game lobby (Room: " + roomId + ")"),
    sec !== null && jsx("div", { className: "countdown-timer" },
      jsx("span", { className: "timer-label" }, "Game Starting In"),
      jsx("span", { className: "timer-value" }, sec),
      jsx("span", { className: "timer-label" }, "seconds")
    ),

    jsx("div", { className: "lobby-container" },
      jsx("div", { className: "players-section" },
        jsx("h3", null, " Players Online"),
        jsx("ul", { className: "players-list" },
          ...players.map((p) => jsx("li", { className: "player-item" }, p))
        ),
        jsx("div", { className: "player-count" },
          `Total: ${players.length} ${players.length === 1 ? 'player' : 'players'}`
        )
      ),
      jsx("div", { className: "bottom-panel" },

        jsx("div", { className: "rules-section" },
          jsx("h3", null, "How To Play"),
          jsx("div", { className: "rules-content" },
            jsx("div", { className: "rule-item" },
              jsx("span", { className: "rule-icon" }, "⬆️⬇️⬅️➡️"),
              jsx("span", { className: "rule-text" }, "Move with Arrow Keys")
            ),
            jsx("div", { className: "rule-item" },
              jsx("span", { className: "rule-icon" }, "SPACE"),
              jsx("span", { className: "rule-text" }, "Place Bomb")
            ),
            jsx("div", { className: "rule-item" },
              jsx("span", { className: "rule-icon" }, "💥"),
              jsx("span", { className: "rule-text" }, "Destroy Walls & Enemies")
            ),
            jsx("div", { className: "rule-item" },
              jsx("span", { className: "rule-icon" }, "🏆"),
              jsx("span", { className: "rule-text" }, "Be The Last One Standing")
            )
          )
        ),
        jsx("div", { className: "chat-section" },
          jsx("h3", null, "Game Chat"),
          jsx("div", { className: "chat-messages" },
            ...chat.map((c) =>
              jsx("div", { className: "chat-message" },
                jsx("span", { className: "username" }, c.username + ": "),
                jsx("span", null, c.msg)
              )
            )
          ),

          jsx("div", { className: "chat-input-container" },
            jsx("input", {
              type: "text",
              value: msg,
              placeholder: "Type your message...",
              oninput: (e) => setMsg(e.target.value),
              onkeypress: (e) => e.key === 'Enter' && sendMsg(e),
            }),
            jsx("button", {
              onclick: (e) => { sendMsg(e) }
            }, "Send")
          )
        )
      ),
    )
  );
}
