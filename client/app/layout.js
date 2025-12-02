import { addRoute } from "../../framework/main.js";
import { Join } from "./components/join.js";
import { Lobby } from "./components/lobby.js";


addRoute("/", Join);
addRoute("/lobby", Lobby);
