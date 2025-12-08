const player = document.getElementById("player");

// Sprite sheet info
const sheetWidth = 832;
const sheetHeight = 3456;
const cols = 13;
const rows = 54;

const frameWidth = sheetWidth / cols;
const frameHeight = sheetHeight / rows;

// Frames by direction
const FRAMES = {
    ArrowRight: { row: 11, col: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
    ArrowLeft: { row: 9, col: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
    ArrowUp: { row: 8, col: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
    ArrowDown: { row: 10, col: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
};

let frameIndex = 0;
let posX = 0;
let posY = 0;
let speed = 0.1;
let currentKey = null;

document.addEventListener("keydown", (e) => {
    if (FRAMES[e.key]) {
        currentKey = e.key;
    }
});
document.addEventListener("keyup", (e) => {
    if (currentKey === e.key) {
        // console.log('ggggggggggz');

        currentKey = null;
        frameIndex = 0;
    }
});

let lastTime = 0;
let animationTimer = 0;
let animationSpeed = 80;

function update(time) {
    const delta = time - lastTime;
    lastTime = time;

    if (currentKey) {
        const anim = FRAMES[currentKey];
        const col = anim.col[frameIndex];
        const row = anim.row;

        // frame position
        const frameX = col * frameWidth;
        const frameY = row * frameHeight;

        player.style.backgroundPosition = `-${frameX + 5}px -${frameY + 13}px`;

        // movement with deltaTime
        if (currentKey === "ArrowRight") posX += speed * delta;
        if (currentKey === "ArrowLeft") posX -= speed * delta;
        if (currentKey === "ArrowUp") posY -= speed * delta;
        if (currentKey === "ArrowDown") posY += speed * delta;

        player.style.transform = `translate3d(${posX}px, ${posY}px,0)`;

        animationTimer += delta;
        if (animationTimer > animationSpeed) {
            animationTimer = 0;
            frameIndex++;
            if (frameIndex >= anim.col.length) frameIndex = 0;
        }
    }
    requestAnimationFrame(update);
}
update(0);
