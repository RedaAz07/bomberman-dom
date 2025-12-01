import { addRoute } from "../framework/main.js";
import { Lobby } from "./components/lobby.js";

addRoute("/", Lobby);
