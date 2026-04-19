import * as THREE from 'three';

// UI Elements
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const hud = document.getElementById('hud');
const scoreElement = document.getElementById('score');
const finalScoreElement = document.getElementById('final-score');

// Game State
let gameState = 'START';
let score = 0;
let speed = 1.0; // Units per frame
let baseSpeed = 1.0;
let frameCount = 0;
let animationId;

// Input
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
    if (e.code === 'Space') {
        if (gameState === 'START' || gameState === 'GAMEOVER') {
            startGame();
        }
    }
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
});

// Three.js Setup
const container = document.getElementById('game-container');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.015); // Black fog for neon aesthetic

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
// Position camera slightly behind and above the car
const cameraOffset = new THREE.Vector3(0, 4, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

// Handle resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(20, 50, 20);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 1024;
dirLight.shadow.mapSize.height = 1024;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 150;
dirLight.shadow.camera.left = -30;
dirLight.shadow.camera.right = 30;
dirLight.shadow.camera.top = 30;
dirLight.shadow.camera.bottom = -30;
scene.add(dirLight);

// Helper function to create a car model
function createCarModel(colorHex, isPlayer = false) {
    const car = new THREE.Group();
    
    // Chassis
    const chassisGeo = new THREE.BoxGeometry(2, 1, 4.5);
    const chassisMat = new THREE.MeshPhongMaterial({ 
        color: colorHex, 
        shininess: 100 
    });
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    chassis.position.y = 0.8;
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    car.add(chassis);
    
    // Cabin
    const cabinGeo = new THREE.BoxGeometry(1.6, 0.8, 2.2);
    const cabinMat = new THREE.MeshPhongMaterial({ 
        color: 0x111111, // Dark windows
        shininess: 150 
    });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.y = 1.7;
    cabin.position.z = -0.5;
    cabin.castShadow = true;
    car.add(cabin);
    
    // Headlights/Taillights glow
    if (!isPlayer) {
        // Red glow for obstacles facing player
        const lightGeo = new THREE.BoxGeometry(1.8, 0.3, 0.1);
        const lightMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const light = new THREE.Mesh(lightGeo, lightMat);
        light.position.set(0, 0.8, 2.26); // Back of the car
        car.add(light);
    } else {
        // Cyan glow for player engine/thruster
        const thrustGeo = new THREE.BoxGeometry(1.2, 0.3, 0.1);
        const thrustMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        const thruster = new THREE.Mesh(thrustGeo, thrustMat);
        thruster.position.set(0, 0.6, 2.26);
        car.add(thruster);
        
        const pointLight = new THREE.PointLight(0x00ffff, 2, 10);
        pointLight.position.set(0, 0.6, 2.5);
        car.add(pointLight);
    }
    
    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshPhongMaterial({ color: 0x222222 });
    
    const wheelPositions = [
        [-1.1, 0.5, 1.4],
        [1.1, 0.5, 1.4],
        [-1.1, 0.5, -1.4],
        [1.1, 0.5, -1.4]
    ];
    
    wheelPositions.forEach(p => {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.position.set(p[0], p[1], p[2]);
        wheel.castShadow = true;
        car.add(wheel);
    });

    return car;
}

// Player Setup
const player = createCarModel(0x38bdf8, true); // Neon Blue
scene.add(player);

// Collision Boxes
const playerBox = new THREE.Box3();
const obsBox = new THREE.Box3();

// Environment / Road
const roadGroup = new THREE.Group();
scene.add(roadGroup);

const roadGeo = new THREE.PlaneGeometry(30, 1000);
const roadMat = new THREE.MeshPhongMaterial({ 
    color: 0x1e293b, 
    side: THREE.DoubleSide 
});
const roadPlane = new THREE.Mesh(roadGeo, roadMat);
roadPlane.rotation.x = -Math.PI / 2;
roadPlane.receiveShadow = true;
roadGroup.add(roadPlane);

// Neon Grid lines to simulate speed
const gridHelper = new THREE.GridHelper(30, 10, 0x38bdf8, 0x475569);
gridHelper.position.y = 0.02;
roadGroup.add(gridHelper);

// Obstacles
let obstacles = [];
const lanes = [-5, 0, 5]; // Left, Center, Right lanes
const colors = [0xf43f5e, 0xa855f7, 0xfbbf24, 0x10b981];

function spawnObstacle() {
    const lane = lanes[Math.floor(Math.random() * lanes.length)];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    const obs = createCarModel(color);
    obs.position.set(lane, 0, player.position.z - 200 - Math.random() * 50);
    obs.rotation.y = Math.PI; // Face the player
    
    // Add custom property to track if scored
    obs.userData = { passed: false };
    
    scene.add(obs);
    obstacles.push(obs);
}

function startGame() {
    gameState = 'PLAYING';
    score = 0;
    speed = baseSpeed;
    frameCount = 0;
    
    // Reset Player
    player.position.set(0, 0, 0);
    
    // Clear Obstacles
    obstacles.forEach(obs => scene.remove(obs));
    obstacles = [];
    
    // Reset UI
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    hud.classList.remove('hidden');
    scoreElement.innerText = score;
    
    if (!animationId) {
        animate();
    }
}

function gameOver() {
    gameState = 'GAMEOVER';
    hud.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
    finalScoreElement.innerText = score;
}

function animate() {
    animationId = requestAnimationFrame(animate);
    
    if (gameState === 'PLAYING') {
        frameCount++;
        
        // Move Player Forward
        player.position.z -= speed;
        
        // Move camera to follow player smoothly
        camera.position.x = player.position.x * 0.5; // Slight drift
        camera.position.y = player.position.y + cameraOffset.y;
        camera.position.z = player.position.z + cameraOffset.z;
        camera.lookAt(player.position.x, player.position.y, player.position.z - 10);
        
        // Move Light with player
        dirLight.position.z = player.position.z + 20;
        
        // Player Steering
        const steerSpeed = 0.3;
        if (keys.ArrowLeft || keys.a || keys.A) {
            player.position.x -= steerSpeed;
            // Slight roll for effect
            player.rotation.z = Math.min(player.rotation.z + 0.05, 0.2); 
        } else if (keys.ArrowRight || keys.d || keys.D) {
            player.position.x += steerSpeed;
            player.rotation.z = Math.max(player.rotation.z - 0.05, -0.2);
        } else {
            // Return roll to 0
            player.rotation.z *= 0.8;
        }
        
        // Clamp player to road
        if (player.position.x < -10) player.position.x = -10;
        if (player.position.x > 10) player.position.x = 10;
        
        // Animate road grid (move it forward infinitely)
        gridHelper.position.z = player.position.z - (player.position.z % 3);
        roadPlane.position.z = player.position.z;
        
        // Spawn Obstacles
        let spawnRate = Math.max(30, 80 - Math.floor(score / 2));
        if (frameCount % spawnRate === 0) {
            spawnObstacle();
        }
        
        // Update Player Box for collision
        playerBox.setFromObject(player);
        
        // Update Obstacles
        for (let i = obstacles.length - 1; i >= 0; i--) {
            let obs = obstacles[i];
            
            // Obstacles move towards player slightly faster than stationary
            obs.position.z += 0.5;
            
            // Check Collision
            obsBox.setFromObject(obs);
            // Shrink boxes slightly to be forgiving
            obsBox.expandByScalar(-0.2);
            playerBox.expandByScalar(-0.2);
            
            if (playerBox.intersectsBox(obsBox)) {
                gameOver();
            }
            
            // Score tracking
            if (!obs.userData.passed && obs.position.z > player.position.z) {
                obs.userData.passed = true;
                score++;
                scoreElement.innerText = score;
                
                if (score % 5 === 0) {
                    speed += 0.05; // Increase speed
                }
            }
            
            // Remove passed obstacles
            if (obs.position.z > player.position.z + 20) {
                scene.remove(obs);
                obstacles.splice(i, 1);
            }
        }
    } else if (gameState === 'GAMEOVER') {
        // Slow down camera to show crash
        camera.position.z += 0.2;
        camera.lookAt(player.position);
    }
    
    // Render scene
    renderer.render(scene, camera);
}

// Initial draw
renderer.render(scene, camera);
animate(); // Start idle animation before game starts
