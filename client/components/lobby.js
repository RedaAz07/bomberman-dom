import { addRoute, jsx } from "../../framework/main.js";

const mapData = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 1],
    [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    [1, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 1],
    [1, 0, 1, 2, 1, 0, 1, 0, 1, 0, 1, 2, 1, 0, 1],
    [1, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 1],
    [1, 0, 1, 0, 1, 0, 1, 2, 1, 0, 1, 0, 1, 0, 1],
    [1, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 1],
    [1, 0, 1, 0, 1, 0, 1, 2, 1, 0, 1, 0, 1, 0, 1],
    [1, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 1],
    [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    [1, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 1],
    [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    [1, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];




const tileClass = {
    0: "tile tile-braml",
    1: "tile tile-wall",
    2: "tile tile-grass"
};

export function Lobby() {
    return jsx(
        "div",
        { className: "map-container" },
        ...mapData.map((row, rowIndex) =>
            jsx(
                "div",
                { className: "map-row" },
                ...row.map((cell, colIndex) =>
                    jsx("div", {
                        className: tileClass[cell],
                        "data-row": rowIndex,
                        "data-col": colIndex,
                    })
                )
            )
        )
    );
}