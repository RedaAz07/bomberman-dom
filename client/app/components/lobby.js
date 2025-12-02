import { jsx, useState, useEffect, useRef } from "../../framework/main.js";
import { ws } from "../src/ws.js";

export function Lobby() {
  const [msg, setMsg] = useState("");
  const [players, setPlayers] = useState([]);
  const [chat, setChat] = useState([]);
  const latestMsgRef = useRef("");

  console.log(msg);
  function sendMsg() {
    const trimmed = latestMsgRef.current.trim();
    if (!trimmed) return;
    ws.send(
      JSON.stringify({ username: ws.username, type: "message", msg: trimmed })
    );
    setMsg(""); // Clear input after sending
  }
  function handleMsgInput(e) {
    const value = e.target.value;
    latestMsgRef.current = value;
    setMsg(value);
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
  }, [players]);


  return jsx(
    "div",
    null,
    jsx("h1", null, "Lobby"),

    jsx("h3", null, "Players online:"),
    jsx(
      "ul",
      null,
      ...(Array.isArray(players) ? players.map((p) => jsx("li", null, p)) : [])
    ),

    jsx(
      "div",
      null,
      jsx("input", {
        value: msg,
        oninput: (e) => handleMsgInput(e),

        placeholder: "Say something...",
      }),
      jsx("button", { onclick: sendMsg }, "Send")
    ),

    jsx(
      "div",
      { class: "chat-box" },
      ...chat.map((c) => jsx("p", null, c.username + ": " + c.msg))
    )
  );
}
