import { jsx, useState, useEffect } from "../../framework/main.js";
import { ws } from "../src/ws.js";

export function Lobby() {
    const [players, setPlayers] = useState([]);
    const [msg, setMsg] = useState("");
    const [chat, setChat] = useState([]);

    useEffect(() => {
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log(data, "dataaaaaa");

            if (data.type === "player-list") {
                setPlayers(data.players);
            }
            if (data.type === "message") {
                setChat((prev) => [...prev, { username: data.username, msg: data.msg }]);
            }
        };
    }, []);

    function sendMsg() {
        if (msg.trim()) {
            ws.send(JSON.stringify({ username: ws.username, type: "message", msg }));
            setMsg("");
        }
    }

    return jsx("div", null,
        jsx("h1", null, "Lobby"),

        jsx("h3", null, "Players online:"),
        jsx("ul", null,
            ...players.map(p => jsx("li", null, p))
        ),

        jsx("div", null,
            jsx("input", {
                value: msg,
                oninput: (e) => setMsg(e.target.value),
                placeholder: "Say something..."
            }),
            jsx("button", { onclick: sendMsg }, "Send")
        ),

        jsx("div", { class: "chat-box" },
            ...chat.map(c =>
                jsx("p", null, c.username + ": " + c.msg)
            )
        )
    );
}
