import { jsx, useEffect, useState } from "../framework/main.js";
import { ws } from "../assets/js/ws.js";
import { navigate } from "../framework/main.js";

export function Join() {
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    useEffect(() => {
        const interval = setInterval(() => { }, 16);
        return () => clearInterval(interval);
    }, []);
    const handleJoin = (e) => {
        if (!name.trim() || name.trim() >= 10) return;
        ws.username = name.trim()

        ws.send(JSON.stringify({
            type: "join",
            username: name.trim()
        }));
        setName("")
        e.target.value = ""
        if (e.key != "Enter") e.target.previousSibling.value = "";
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "join-success") {
            navigate("/lobby");
        }

        if (data.type === "join-error") {
            setError(data.msg);
        }
    };

    return jsx("div", { className: "container login-container" },
        jsx("h1", null, "💣 BOMBERMAN 💣"),
        jsx("div", { className: "subtitle" }, "ARENA BATTLE"),
        jsx("p", { className: "welcome-text" }, "Enter the arena and become the ultimate bomber!"),

        jsx("input", {
            type: "text",
            placeholder: "Enter your warrior name...",
            value: name,
            autofocus: true,
            oninput: (e) => setName(e.target.value),
            onkeypress: (e) => e.key === 'Enter' && handleJoin(e),
            maxlength: "15"
        }),

        jsx("button", {
            onclick: (e) => { handleJoin(e) },
            className: "join-button"
        }, "🎮 JOIN GAME 🎮"),

        error !== "" && jsx("p", { className: "error" }, error),

        jsx("div", { className: "game-info" },
            jsx("div", { className: "info-item" }, "🔥 Place Bombs"),
            jsx("div", { className: "info-item" }, "💥 Destroy Walls"),
            jsx("div", { className: "info-item" }, "🏆 Last One Standing")
        )
    );
}
