import { jsx, useState } from "../../framework/main.js";
import { ws } from "../src/ws.js";
import { navigate } from "../../framework/main.js";

export function Join() {
    const [name, setName] = useState("");
    const [error, setError] = useState("");
console.log("151",name);

    const handleJoin = () => {
        console.log(name);
        
        if (!name.trim()) return;

        ws.send(JSON.stringify({
            type: "join",
            username: name.trim()
        }));
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

    return jsx("div", null,
        jsx("h1", null, "Welcome to our Bomberman game!"),

        jsx("input", {
            type: "text",
            placeholder: "Enter your name",
            value: name,
            oninput: (e) => setName(e.target.value)
        }),

        jsx("button", { onclick: handleJoin, }, "Join"),

        error && jsx("p", { style: "color:red" }, error)
    );
}
