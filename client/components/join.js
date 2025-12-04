import { jsx, useState } from "../framework/main.js";
import { ws } from "../assets/js/ws.js";
import { navigate } from "../framework/main.js";

export function Join() {
    const [name, setName] = useState("");
    const [error, setError] = useState("");

    const handleJoin = (e) => {
        if (!name.trim()) return;
        ws.username = name
        ws.send(JSON.stringify({
            type: "join",
            username: name.trim()
        }));
        setName("")
        e.target.value = ""
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
        jsx("h1", null, "Welcome to our Bomberman game"),

        jsx("input", {
            type: "text",
            placeholder: "Enter your name",
            value: name,
            oninput: (e) => setName(e.target.value),
            onkeypress: (e) => e.key === 'Enter' && handleJoin(e)

        }),

        jsx("button", { onclick: (e) => { e.target.previousSibling.value = ""; handleJoin(e) } }, "Join Game"),

        error !== "" && jsx("p", { className: "error" }, error)
    );
}
