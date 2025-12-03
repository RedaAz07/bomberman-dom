import { jsx, useState } from "../../framework/main.js";
import { ws } from "../src/js/ws.js";
import { navigate } from "../../framework/main.js";

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
            navigate("#/lobby");
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
            onkeypress: (e) => e.key === 'Enter' && handleJoin()

        }),

        jsx("button", { onclick: handleJoin }, "Join Game"),

        error !== "" && jsx("p", { className: "error" }, error)
    );
}
