function startTimer(room) {
    if (room.timer !== null) return;

    room.timeLeft = 10;

    room.timer = setInterval(() => {
        room.timeLeft--;

        broadcastRoom(room, {
            type: "counter",
            timeLeft: room.timeLeft
        });

        if (room.timeLeft <= 0) {
            clearInterval(room.timer);
            room.timer = null;
            room.timeLeft = null;

            broadcastRoom(room, {
                type: "start-game"
            });
        }
    }, 1000);
}

function stopTimer(room) {
    if (room.timer) clearInterval(room.timer);
    room.timer = null;
    room.timeLeft = null;
}