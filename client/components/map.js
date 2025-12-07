import { jsx, useEffect, useRef, useState } from "../framework/main.js";
import { store } from "./lobby.js";
import { getTileStyle } from "../utils/map.js";

const tileClass = {
  0: "tile tile-grass",
  1: "tile tile-wall-vertical",
  2: "tile tile-braml",
  3: "tile tile-wall-corner",
  4: "tile tile-stone",
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
    // 1. Safety check: If ref is null, wait for next render
    if (!mapRef.current) return;

    // 2. Create an observer that triggers whenever the Map changes size
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      // Get accurate dimensions from the observer entry
      const width = entry.contentRect.width;
      const height = entry.contentRect.height;

      // Only update if we actually have dimensions (prevents 0px glitch)
      if (width > 0 && height > 0) {
        console.log("Map dimensions found:", width, height);

        setPlayerPosition({
          0: { top: "37px", left: "50px" },
          1: { top: "37px", left: `${width - 100}px` },
          2: { top: `${height - 114}px`, left: `${width - 100}px` },
          3: { top: `${height - 114}px`, left: "50px" },
        });
      }
    });

    // 3. Start observing the map
    observer.observe(mapRef.current);

    // NOTE: Your custom useEffect does not support cleanup functions yet!
    // In React, you would return () => observer.disconnect();
    // You should implement cleanup in your framework later to avoid memory leaks.
  }, []); // Run once to attach the observer

  const mapData = store.get().map;
  const bom = store.get().bom;
  const players = store.get().players;
  console.log("playytreé", players);

  return jsx(
    "div",
    { className: "map-container", ref: mapRef },
    ...players.map((p, i) => {
      return jsx("div", {
        className: `player player${i}`,
        style: { top: playerPosition[i]?.top, left: playerPosition[i]?.left },
        key: `${p.username}`,
        ref: playersRef[i],
      });
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
