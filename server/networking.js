export function broadcastPlayerPosition(player) {
  const room = player.room;
  room.players.forEach((p) => {
    p.ws.send(
      JSON.stringify({
        type: "player-position",
        username: player.username,
        x: player.posX,
        y: player.posY,
      })
    );
  });
}

export function broadcastRoom(room, obj) {
  const msg = JSON.stringify(obj);

  for (const p of room.players) {
    if (p.socket.readyState === 1) {
      p.socket.send(msg);
    }
  }
}
