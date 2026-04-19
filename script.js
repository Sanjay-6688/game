const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const hud = document.getElementById('hud');
const scoreElement = document.getElementById('score');
const finalScoreElement = document.getElementById('final-score');

// Game constants and state
const CANVAS_WIDTH = canvas.width;
const CANVAS_HEIGHT = canvas.height;
const CAR_WIDTH = 40;
const CAR_HEIGHT = 70;
const LANE_WIDTH = CANVAS_WIDTH / 3;

let gameState = 'START'; // START, PLAYING, GAMEOVER
let score = 0;
let speed = 5;
let baseSpeed = 5;
let animationId;
let frameCount = 0;

// Input tracking
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    a: false,
    d: false,
    A: false,
    D: false
};

window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
    
    // Start or restart game on spacebar
    if (e.code === 'Space') {
        if (gameState === 'START' || gameState === 'GAMEOVER') {
            startGame();
        }
    }
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
});

// Entities
const player = {
    x: CANVAS_WIDTH / 2 - CAR_WIDTH / 2,
    y: CANVAS_HEIGHT - CAR_HEIGHT - 20,
    width: CAR_WIDTH,
    height: CAR_HEIGHT,
    color: '#38bdf8', // Neon blue
    dx: 7
};

let obstacles = [];
let roadLines = [];

function initRoadLines() {
    roadLines = [];
    for (let i = 0; i < CANVAS_HEIGHT; i += 60) {
        roadLines.push({ y: i });
    }
}

function startGame() {
    gameState = 'PLAYING';
    score = 0;
    speed = baseSpeed;
    frameCount = 0;
    obstacles = [];
    
    player.x = CANVAS_WIDTH / 2 - CAR_WIDTH / 2;
    
    initRoadLines();
    
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    hud.classList.remove('hidden');
    
    scoreElement.innerText = score;
    
    cancelAnimationFrame(animationId);
    gameLoop();
}

function gameOver() {
    gameState = 'GAMEOVER';
    cancelAnimationFrame(animationId);
    
    hud.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
    finalScoreElement.innerText = score;
}

function spawnObstacle() {
    // Pick a random lane (0, 1, or 2)
    const lane = Math.floor(Math.random() * 3);
    const x = lane * LANE_WIDTH + (LANE_WIDTH / 2) - (CAR_WIDTH / 2);
    
    // Add variations in color
    const colors = ['#f43f5e', '#a855f7', '#fbbf24', '#10b981'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    obstacles.push({
        x: x,
        y: -CAR_HEIGHT,
        width: CAR_WIDTH,
        height: CAR_HEIGHT,
        color: color,
        passed: false
    });
}

function update() {
    // Player movement
    if (keys.ArrowLeft || keys.a || keys.A) {
        player.x -= player.dx;
    }
    if (keys.ArrowRight || keys.d || keys.D) {
        player.x += player.dx;
    }
    
    // Clamp player to screen
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > CANVAS_WIDTH) player.x = CANVAS_WIDTH - player.width;
    
    // Update road lines
    for (let i = 0; i < roadLines.length; i++) {
        roadLines[i].y += speed;
        if (roadLines[i].y > CANVAS_HEIGHT) {
            roadLines[i].y = -60;
        }
    }
    
    // Spawning obstacles
    // Difficulty increases with score: spawn rate and speed
    let spawnRate = Math.max(40, 90 - Math.floor(score / 5));
    if (frameCount % spawnRate === 0) {
        spawnObstacle();
    }
    
    // Update obstacles
    for (let i = 0; i < obstacles.length; i++) {
        let obs = obstacles[i];
        obs.y += speed;
        
        // Check collision
        if (player.x < obs.x + obs.width &&
            player.x + player.width > obs.x &&
            player.y < obs.y + obs.height &&
            player.y + player.height > obs.y) {
            // Collision detected!
            gameOver();
        }
        
        // Update score
        if (!obs.passed && obs.y > player.y + player.height) {
            obs.passed = true;
            score++;
            scoreElement.innerText = score;
            
            // Increase speed slightly every 10 points
            if (score % 10 === 0) {
                speed += 0.5;
            }
        }
    }
    
    // Remove off-screen obstacles
    obstacles = obstacles.filter(obs => obs.y < CANVAS_HEIGHT);
    
    frameCount++;
}

function drawCar(x, y, width, height, color) {
    ctx.fillStyle = color;
    
    // Main body
    ctx.beginPath();
    ctx.roundRect(x, y + 10, width, height - 20, 5);
    ctx.fill();
    
    // Roof/Cockpit
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.roundRect(x + 5, y + 25, width - 10, height - 50, 3);
    ctx.fill();
    
    // Headlights (if it's the player, or taillights if it's an obstacle going down)
    ctx.fillStyle = color === '#38bdf8' ? '#ffffff' : '#fca5a5';
    // Left light
    ctx.beginPath();
    ctx.roundRect(x + 5, color === '#38bdf8' ? y + 5 : y + height - 10, 8, 5, 2);
    ctx.fill();
    
    // Right light
    ctx.beginPath();
    ctx.roundRect(x + width - 13, color === '#38bdf8' ? y + 5 : y + height - 10, 8, 5, 2);
    ctx.fill();
}

function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw road surface
    ctx.fillStyle = '#334155'; // Slate 700
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw road borders
    ctx.fillStyle = '#cbd5e1'; // Slate 300
    ctx.fillRect(5, 0, 5, CANVAS_HEIGHT);
    ctx.fillRect(CANVAS_WIDTH - 10, 0, 5, CANVAS_HEIGHT);
    
    // Draw lane dividers
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    for (let i = 0; i < roadLines.length; i++) {
        // Left divider
        ctx.fillRect(LANE_WIDTH - 2, roadLines[i].y, 4, 30);
        // Right divider
        ctx.fillRect(LANE_WIDTH * 2 - 2, roadLines[i].y, 4, 30);
    }
    
    // Draw obstacles
    for (let i = 0; i < obstacles.length; i++) {
        let obs = obstacles[i];
        drawCar(obs.x, obs.y, obs.width, obs.height, obs.color);
    }
    
    // Draw player
    if (gameState !== 'GAMEOVER') {
        drawCar(player.x, player.y, player.width, player.height, player.color);
        
        // Exhaust effect
        if (frameCount % 4 < 2) {
            ctx.fillStyle = 'rgba(255, 165, 0, 0.6)';
            ctx.beginPath();
            ctx.arc(player.x + 10, player.y + player.height + 5, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(player.x + player.width - 10, player.y + player.height + 5, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function gameLoop() {
    if (gameState === 'PLAYING') {
        update();
        draw();
        animationId = requestAnimationFrame(gameLoop);
    } else if (gameState === 'GAMEOVER') {
        // Draw one last time to show crash state
        draw();
    }
}

// Initial draw for background before start
initRoadLines();
draw();
