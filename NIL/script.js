const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const healthUI = document.getElementById("health");
const ammoUI = document.getElementById("ammo");
const killsUI = document.getElementById("kills");

const overlay = document.getElementById("overlay");
const startBtn = document.getElementById("startBtn");

let player, zombies, bullets, keys;
let health, ammo, kills, running;
let spawnTimer, lastTime;
let mouse = { x: 400, y: 250 };
let firing = false;
let shootCooldown = 0;

function resetGame() {
    player = { x: 400, y: 250, size: 18, speed: 210 };
    zombies = [];
    bullets = [];
    keys = {};
    health = 100;
    ammo = 20;
    kills = 0;
    spawnTimer = 0;
    shootCooldown = 0;
    running = true;
    lastTime = 0;
    updateHUD();
    overlay.style.display = "none";
    requestAnimationFrame(loop);
}

function updateHUD() {
    healthUI.textContent = Math.max(0, Math.ceil(health));
    ammoUI.textContent = ammo;
    killsUI.textContent = kills;
}

function spawnZombie() {
    const side = Math.floor(Math.random() * 4);
    let x, y;

    if (side === 0) { x = 0; y = Math.random() * 500; }
    else if (side === 1) { x = 800; y = Math.random() * 500; }
    else if (side === 2) { x = Math.random() * 800; y = 0; }
    else { x = Math.random() * 800; y = 500; }

    zombies.push({
        x, y, size: 17,
        speed: 45 + Math.random() * 25
    });
}

function shoot() {
    if (!running || ammo <= 0 || shootCooldown > 0) return;

    const angle = Math.atan2(
        mouse.y - player.y,
        mouse.x - player.x
    );

    bullets.push({
        x: player.x,
        y: player.y,
        vx: Math.cos(angle) * 520,
        vy: Math.sin(angle) * 520,
        life: 1
    });

    ammo--;
    shootCooldown = 0.22;
    updateHUD();
}

function reload() {
    if (running) {
        ammo = 20;
        updateHUD();
    }
}

function drawPlayer() {
    ctx.fillStyle = "#45a5ff";
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
    ctx.fill();

    const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);

    ctx.strokeStyle = "white";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(
        player.x + Math.cos(angle) * 29,
        player.y + Math.sin(angle) * 29
    );
    ctx.stroke();
}

function drawZombie(z) {
    ctx.fillStyle = "#8cce55";
    ctx.beginPath();
    ctx.arc(z.x, z.y, z.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#291d16";
    ctx.fillRect(z.x - 8, z.y - 5, 5, 5);
    ctx.fillRect(z.x + 4, z.y - 5, 5, 5);
}

function drawWorld() {
    ctx.fillStyle = "#17251b";
    ctx.fillRect(0, 0, 800, 500);

    ctx.strokeStyle = "#26382a";
    ctx.lineWidth = 1;

    for (let x = 0; x < 800; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 500);
        ctx.stroke();
    }

    for (let y = 0; y < 500; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(800, y);
        ctx.stroke();
    }
}

function endGame() {
    running = false;
    overlay.style.display = "flex";
    document.getElementById("overlayTitle").textContent = "GAME OVER";
    document.getElementById("overlayText").textContent =
        "You killed " + kills + " zombies!";
    startBtn.textContent = "PLAY AGAIN";
}

function loop(timestamp) {
    if (!running) return;

    const dt = Math.min((timestamp - (lastTime || timestamp)) / 1000, 0.04);
    lastTime = timestamp;

    ctx.clearRect(0, 0, 800, 500);
    drawWorld();

    let dx = 0, dy = 0;

    if (keys.w) dy--;
    if (keys.s) dy++;
    if (keys.a) dx--;
    if (keys.d) dx++;

    const length = Math.hypot(dx, dy) || 1;

    player.x += dx / length * player.speed * dt;
    player.y += dy / length * player.speed * dt;

    player.x = Math.max(18, Math.min(782, player.x));
    player.y = Math.max(18, Math.min(482, player.y));

    shootCooldown = Math.max(0, shootCooldown - dt);
    if (firing) shoot();

    spawnTimer += dt;
    if (spawnTimer > Math.max(0.45, 1.5 - kills * 0.015)) {
        spawnZombie();
        spawnTimer = 0;
    }

    for (const z of zombies) {
        const angle = Math.atan2(player.y - z.y, player.x - z.x);
        z.x += Math.cos(angle) * z.speed * dt;
        z.y += Math.sin(angle) * z.speed * dt;

        if (Math.hypot(player.x - z.x, player.y - z.y) < 32) {
            health -= 24 * dt;
        }

        drawZombie(z);
    }

    for (const b of bullets) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;

        ctx.fillStyle = "#ffe45c";
        ctx.beginPath();
        ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
        ctx.fill();

        for (const z of zombies) {
            if (z.dead) continue;

            if (Math.hypot(b.x - z.x, b.y - z.y) < z.size + 6) {
                z.dead = true;
                b.life = 0;
                kills++;
                break;
            }
        }
    }

    zombies = zombies.filter(z => !z.dead);
    bullets = bullets.filter(b =>
        b.life > 0 && b.x >= 0 && b.x <= 800 && b.y >= 0 && b.y <= 500
    );

    drawPlayer();
    updateHUD();

    if (health <= 0) {
        health = 0;
        updateHUD();
        endGame();
        return;
    }

    requestAnimationFrame(loop);
}

window.addEventListener("keydown", e => {
    const key = e.key.toLowerCase();
    if (["w", "a", "s", "d"].includes(key)) {
        keys[key] = true;
        e.preventDefault();
    }
    if (key === " " && running) shoot();
});

window.addEventListener("keyup", e => {
    keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener("pointermove", e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - rect.left) * 800 / rect.width;
    mouse.y = (e.clientY - rect.top) * 500 / rect.height;
});

canvas.addEventListener("pointerdown", e => {
    if (e.pointerType === "mouse") {
        const rect = canvas.getBoundingClientRect();
        mouse.x = (e.clientX - rect.left) * 800 / rect.width;
        mouse.y = (e.clientY - rect.top) * 500 / rect.height;
        shoot();
    }
});

document.querySelectorAll("[data-key]").forEach(button => {
    const key = button.dataset.key;

    button.addEventListener("pointerdown", e => {
        e.preventDefault();
        keys[key] = true;
    });

    ["pointerup", "pointerleave", "pointercancel"].forEach(event => {
        button.addEventListener(event, () => keys[key] = false);
    });
});

document.getElementById("shootBtn").addEventListener("pointerdown", e => {
    e.preventDefault();
    firing = true;
});

["pointerup", "pointerleave", "pointercancel"].forEach(event => {
    document.getElementById("shootBtn").addEventListener(event, () => {
        firing = false;
    });
});

document.getElementById("reloadBtn").addEventListener("click", reload);

startBtn.addEventListener("click", resetGame);