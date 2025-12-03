import { jsx, useState, useEffect, useRef } from "../../framework/main.js";
import { ws } from "../src/ws.js";

export function Lobby() {
  const [msg, setMsg] = useState("");
  const [players, setPlayers] = useState([]);
  const [chat, setChat] = useState([]);

  const sendMsg = (e) => {
    if (!msg.trim()) return;
    ws.send(
      JSON.stringify({ username: ws.username, type: "message", msg: msg })
    );
    e.target.value = ""
    setMsg("");
  }

  useEffect(() => {
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "player-list") {
        setPlayers(data.players);
      }
      if (data.type === "message") {
        setChat((prev) => [
          ...prev,
          { username: data.username, msg: data.msg },
        ]);
      }
    };
  }, [players, msg]);


  return jsx("div", { className: "container" },
    jsx("h1", null, "Game Lobby"),

    jsx("div", { className: "lobby-container" },
      // PLAYERS SECTION
      jsx("div", { className: "players-section" },
        jsx("h3", null, "Players"),
        jsx("ul", { className: "players-list" },
          ...(Array.isArray(players) ? players.map((p) =>
            jsx("li", { className: "player-item" }, p)
          ) : [])
        ),
        jsx("div", { className: "player-count" },
          `Total: ${Array.isArray(players) ? players.length : 0} players`
        )
      ),

      // CHAT SECTION
      jsx("div", { className: "chat-section" },
        jsx("h3", null, "Game Chat"),

        jsx("div", { className: "chat-messages" },
          ...chat.map((c) =>
            jsx("div", { className: "chat-message" },
              jsx("span", { className: "username" }, c.username),
              jsx("span", null, c.msg)
            )
          )
        ),

        jsx("div", { className: "chat-input-container" },
          jsx("input", {
            type: "text",
            value: msg,
            oninput: (e) => setMsg(e.target.value),
            placeholder: "Type a message...",
            onkeypress: (e) => e.key === 'Enter' && sendMsg(e)
          }),
          jsx("button", { onclick: (e) => sendMsg(e) }, "Send")
        )
      )
    )
  );
}
