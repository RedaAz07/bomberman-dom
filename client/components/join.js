import { jsx, useEffect, useState } from "../framework/main.js";
import { reconnect, ws } from "../assets/js/ws.js";
import { navigate } from "../framework/main.js";

/**
 * Join component for the game entry screen.
 * Allows users to enter a username and join the lobby.
 * @returns {Object} JSX element for the join screen.
 */
export function Join() {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  /**
   * Handles the join game action.
   * Sends a join request to the server.
   * @param {Event} e - The event object.
   */
  const handleJoin = (e) => {    
    if (!name.trim() || name.trim().length > 10) return;

    ws.send(
      JSON.stringify({
        type: "join",
        username: name.trim(),
      })
    );
    setName("");
    e.target.value = "";
    if (e.key != "Enter") e.target.previousSibling.value = "";
  };

  useEffect(() => {
    reconnect(); // 1. Close old socket, open new one
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "join-success") {
        ws.username = data.username;
        navigate("/lobby");
      }

      if (data.type === "join-error") {
        setError(data.msg);
      }
    };
  }, []);
  return jsx(
    "div",
    { className: "container login-container" },
    jsx("h1", null, "💣 BOMBERMAN 💣"),
    jsx("div", { className: "subtitle" }, "ARENA BATTLE"),
    jsx(
      "p",
      { className: "welcome-text" },
      "Enter the arena and become the ultimate bomber!"
    ),

    jsx("input", {
      type: "text",
      placeholder: "Enter your warrior name...",
      value: name,
      autofocus: true,
      oninput: (e) => setName(e.target.value),
      onkeypress: (e) => e.key === "Enter" && handleJoin(e),
      maxlength: "15",
    }),

    jsx(
      "button",
      {
        onclick: (e) => {
          handleJoin(e);
        },
        className: "join-button animation",
      },
      "🎮 JOIN GAME 🎮"
    ),

    error !== "" && jsx("p", { className: "error" }, error),

    jsx(
      "div",
      { className: "game-info" },
      jsx("div", { className: "info-item" }, "🔥 Place Bombs"),
      jsx("div", { className: "info-item" }, "💥 Destroy Walls"),
      jsx("div", { className: "info-item" }, "🏆 Last One Standing")
    )
  );
}
