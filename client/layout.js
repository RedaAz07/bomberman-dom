import { addRoute } from "./framework/main.js";
import { game } from "./components/game.js";
import { Lobby } from "./components/lobby.js";
import { Join } from "./components/join.js";
addRoute("/", Join);
addRoute("/lobby", Lobby);
addRoute("/map", game);
