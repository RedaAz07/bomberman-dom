import {
  jsx,
  useState,
  useEffect,
  navigate,
} from "../framework/main.js";
import { ws } from "../assets/js/ws.js";

export function Lobby() {
  const [sec, setSec] = useState(null);
  const [msg, setMsg] = useState("");
  const [players, setPlayers] = useState([]);
  const [chat, setChat] = useState([]);

  if (!ws.username) navigate("/");

  useEffect(() => {
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "join-success") {
        ws.roomId = data.roomId;
      }

      if (data.type === "player-list") {
        setPlayers(data.players);
      }

      if (data.type === "message") {
        setChat((c) => [...c, data]);
      }

      if (data.type === "counter") {
        setSec(data.timeLeft);
      }

      if (data.type === "start-game") {
        navigate("/map");
      }
    };
  }, []);

  function sendMsg(e) {
    if (!msg.trim()) return;

    ws.send(JSON.stringify({
      type: "message",
      msg,
      username: ws.username
    }));

    setMsg("");
    e.target.value = "";
  }

  return jsx(
    "div",
    { class: "container" },

    sec !== null &&
    jsx("h1", null, "Game starts in " + sec + "s"),

    jsx("h1", null, "Lobby — Room " + ws.roomId),

    jsx(
      "div",
      { class: "lobby-container" },

      jsx(
        "div",
        { class: "players-section" },
        jsx("h3", null, "Players"),

        jsx(
          "ul",
          null,
          ...players.map((p) => jsx("li", null, p))
        ),

        jsx("div", null, "Total: " + players.length)
      ),

      jsx(
        "div",
        { class: "chat-section" },

        jsx("h3", null, "Chat"),

        jsx(
          "div",
          { class: "chat-messages" },
          ...chat.map((c) =>
            jsx(
              "div",
              null,
              jsx("b", null, c.username + ": "),
              jsx("span", null, c.msg)
            )
          )
        ),

        jsx("input", {
          value: msg,
          placeholder: "message...",
          oninput: (e) => setMsg(e.target.value),
          onkeypress: (e) => {
            if (e.key === "Enter") sendMsg(e);
          },
        })
      )
    )
  );
}
