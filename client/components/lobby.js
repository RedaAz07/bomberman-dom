import { jsx, useState, useEffect, navigate, Store } from "../framework/main.js";
import { ws } from "../assets/js/ws.js";
export const store = Store({ map: [] });

export function Lobby() {
  const [sec, setSec] = useState(null);
  const [msg, setMsg] = useState("");
  const [players, setPlayers] = useState([]);
  const [chat, setChat] = useState([]);

  if (!ws.username) {
    navigate("/");
  }

  useEffect(() => {
    console.log("------------------------");

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "player-list") {
        setPlayers(data.players);
      }

      if (data.type === "message") {
        setChat((prev) => [...prev, { username: data.username, msg: data.msg }]);
      }

      if (data.type === "counter") {
        setSec(data.timeLeft);
      }

      if (data.type === "start-game") {
        store.set({ map: data.map });
        navigate("/map");
      }
    };
  }, []);

  const sendMsg = (e) => {
    if (!msg.trim()) return;

    ws.send(JSON.stringify({
      type: "message",
      msg,
    }));

    setMsg("");
    e.target.value = "";
  };

  return jsx(
    "div",
    { className: "container" },

    sec !== null && jsx("h1", null, `Game starts in ${sec} seconds`),

    jsx("h1", null, "Game Lobby"),

    jsx(
      "div",
      { className: "lobby-container" },

      jsx(
        "div",
        { className: "players-section" },
        jsx("h3", null, "Players"),
        jsx(
          "ul",
          { className: "players-list" },
          ...players.map((p) =>
            jsx("li", { className: "player-item" }, p)
          )
        ),
        jsx("div", { className: "player-count" }, `Total: ${players.length} players`)
      ),

      jsx(
        "div",
        { className: "chat-section" },
        jsx("h3", null, "Game Chat"),

        jsx(
          "div",
          { className: "chat-messages" },
          ...chat.map((c) =>
            jsx(
              "div",
              { className: "chat-message" },
              jsx("span", { className: "username" }, c.username + " :"),
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
            placeholder: "Type a message...",
            oninput: (e) => setMsg(e.target.value),
            onkeypress: (e) => {
              if (e.key === "Enter") sendMsg(e);
            },
          }),
          jsx("button", { onclick: (e) => { e.target.previousSibling.value = ""; sendMsg(e) } }, "Send")
        )
      )
    )
  );
}
