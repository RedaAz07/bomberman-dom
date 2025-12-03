import { addRoute } from "./framework/main.js";
import { map } from "./components/map.js";
import { Lobby } from "./components/lobby.js";
import { Join } from "./components/join.js";
addRoute("/", Join);
addRoute("/map", map);
addRoute("/lobby", Lobby);
