import { jsx, useEffect, useRef, useState } from "../framework/main.js";
import { store } from "./lobby.js";
import { getTileStyle } from "../utils/map.js";

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
          0: { top: "37px", left: "50px" },
          1: { top: "37px", left: `${width - 100}px` },
          2: { top: `${height - 114}px`, left: `${width - 100}px` },
          3: { top: `${height - 114}px`, left: "50px" },
        });
      }
    });
    observer.observe(mapRef.current);

  }, []); 

  const mapData = store.get().map;
  const players = store.get().players;
  // console.log("playytreé", players);

  return 
}
