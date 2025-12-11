import { jsx, useEffect, useRef, useState } from "../framework/main.js";
import { store } from "./lobby.js";
import { getTileStyle } from "../utils/map.js";
import { ws } from "../assets/js/ws.js";

const tileClass = {
  0: "tile tile-grass", // ard 
  1: "tile tile-wall-vertical", //  hiit

  2: "tile tile-braml",// li kaytfjr 
  3: "tile tile-wall-corner",
  4: "tile tile-stone", //walo
};

export function map(playersRef, bomRef) {
  const mapRef = useRef(null);
  
  const [playerPosition, setPlayerPosition] = useState({
    0: { top: "0px", left: "0px" },
    1: { top: "0px", left: "0px" },
    2: { top: "0px", left: "0px" },
    3: { top: "0px", left: "0px" },
  });

  useEffect(() => {
    if (!mapRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const width = entry.contentRect.width;
      const height = entry.contentRect.height;
      if (width > 0 && height > 0) {
        setPlayerPosition({
          0: { top: "64px", left: "64px" },
          1: { top: "64px", left: `${width - 128}px` },
          2: { top: `${height - 128}px`, left: `${width - 128}px` },
          3: { top: `${height - 128}px`, left: "64px" },
        });
      }
    });
    observer.observe(mapRef.current);

  }, []); 

  const mapData = store.get().map;
  const players = store.get().players;
  // console.log("playytreé", players);

  return jsx(
    "div",
    {
      className: "map-container",
     
      ref: mapRef,
    },

    ...players.map((p, i) => {
      const Me = p.username == ws.username
      return jsx("div", {
        className: `player player${i}`,
        style: { top: playerPosition[i]?.top, left: playerPosition[i]?.left },
        key: `${p.username}`,
        ref: playersRef[i],
      }, jsx("div", { className: "player-label" },
        !Me && jsx("span", { className: "player-username" }, p.username)
      ));
    }),
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
