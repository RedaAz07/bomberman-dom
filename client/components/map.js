import { jsx } from "../framework/main.js";
import { store } from "./lobby.js";
import { getTileStyle } from "../utils/map.js";

const tileClass = {
  0: "tile tile-grass",
  1: "tile tile-wall-vertical",
  2: "tile tile-braml",
  3: "tile tile-wall-corner",
  4: "tile tile-stone",
};

export function map(playerRef, bomRef) {
  const mapData = store.get().map;
  const bom = store.get().bom;
  return jsx(
    "div",
    { className: "map-container" },
    jsx("div", { className: "player", ref: playerRef }),
    bom && jsx("div", { className: "bom", ref: bomRef }),
    ...mapData.map((row, rowIndex) =>
      jsx(
        "div",
        { className: "map-row" },
        ...row.map((cell, colIndex) =>
          cell === 2
            ? [
                jsx("div", {
                  className: "tile tile-grass",
                  style: getTileStyle(rowIndex, colIndex, cell),
                  "data-row": rowIndex,
                  "data-col": colIndex,
                }),
                jsx("div", {
                  className: tileClass[cell],
                  style: getTileStyle(rowIndex, colIndex, cell),
                  "data-row": rowIndex,
                  "data-col": colIndex,
                }),
              ]
            : jsx("div", {
                className: tileClass[cell],
                style: getTileStyle(rowIndex, colIndex, cell),
                "data-row": rowIndex,
                "data-col": colIndex,
              })
        )
      )
    )
  );
}
