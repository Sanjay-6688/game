import * as THREE from 'three';

// UI Elements
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const hud = document.getElementById('hud');
const scoreElement = document.getElementById('score');
const finalScoreElement = document.getElementById('final-score');
const speedElement = document.getElementById('speed'); // New

// Game State
let gameState = 'START';
let score = 0;
let speed = 0; 
const maxSpeed = 1.8;
const acceleration = 0.015;
const braking = 0.04;
const friction = 0.005;
let frameCount = 0;
let animationId;

// Input
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    ArrowDown: false,
    a: false,
    d: false,
    A: false,
    D: false,
    w: false,
    W: false,
    s: false,
    S: false
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

// Daytime sky color
const skyColor = 0x87CEEB;
scene.background = new THREE.Color(skyColor);
scene.fog = new THREE.Fog(skyColor, 20, 200);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
const cameraOffset = new THREE.Vector3(0, 3.5, 8);

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
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
hemiLight.position.set(0, 200, 0);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(50, 100, 50);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 250;
const d = 50;
dirLight.shadow.camera.left = -d;
dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d;
dirLight.shadow.camera.bottom = -d;
scene.add(dirLight);

// Helper function to create a realistic car model
function createCarModel(colorHex) {
    const car = new THREE.Group();
    car.userData = { wheels: [], passed: false };
    
    // Lower Chassis
    const chassisGeo = new THREE.BoxGeometry(2.1, 0.6, 4.8);
    const chassisMat = new THREE.MeshStandardMaterial({ 
        color: colorHex, 
        roughness: 0.2,
        metalness: 0.6
    });
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    chassis.position.y = 0.6;
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    car.add(chassis);
    
    // Cabin
    const cabinGeo = new THREE.BoxGeometry(1.6, 0.6, 2.2);
    const cabinMat = new THREE.MeshStandardMaterial({ 
        color: 0x111111, // Dark glossy windows
        roughness: 0.1,
        metalness: 0.8
    });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.y = 1.2;
    cabin.position.z = -0.5;
    cabin.castShadow = true;
    car.add(cabin);

    // Spoiler
    const spoilerPillarGeo = new THREE.BoxGeometry(0.1, 0.4, 0.1);
    const spoilerMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4 });
    const pillarL = new THREE.Mesh(spoilerPillarGeo, spoilerMat);
    pillarL.position.set(-0.8, 1.1, 2.2);
    car.add(pillarL);
    const pillarR = new THREE.Mesh(spoilerPillarGeo, spoilerMat);
    pillarR.position.set(0.8, 1.1, 2.2);
    car.add(pillarR);
    
    const spoilerTopGeo = new THREE.BoxGeometry(2.2, 0.1, 0.4);
    const spoilerTop = new THREE.Mesh(spoilerTopGeo, spoilerMat);
    spoilerTop.position.set(0, 1.3, 2.3);
    car.add(spoilerTop);

    // Headlights
    const hLightGeo = new THREE.BoxGeometry(0.5, 0.15, 0.1);
    const hLightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.0 });
    const hLightL = new THREE.Mesh(hLightGeo, hLightMat);
    hLightL.position.set(-0.7, 0.6, -2.41);
    car.add(hLightL);
    
    const hLightR = new THREE.Mesh(hLightGeo, hLightMat);
    hLightR.position.set(0.7, 0.6, -2.41);
    car.add(hLightR);

    // Taillights
    const tLightGeo = new THREE.BoxGeometry(0.6, 0.15, 0.1);
    const tLightMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.4 });
    const tLightL = new THREE.Mesh(tLightGeo, tLightMat);
    tLightL.position.set(-0.7, 0.6, 2.41);
    tLightL.name = "brakeLightL";
    car.add(tLightL);

    const tLightR = new THREE.Mesh(tLightGeo, tLightMat);
    tLightR.position.set(0.7, 0.6, 2.41);
    tLightR.name = "brakeLightR";
    car.add(tLightR);
    
    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.4, 32);
    wheelGeo.rotateZ(Math.PI / 2);
    
    // Rim detail
    const rimGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.42, 8);
    rimGeo.rotateZ(Math.PI / 2);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.3, metalness: 0.8 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9, metalness: 0.1 });
    
    const wheelPositions = [
        [-1.15, 0.45, 1.5],
        [1.15, 0.45, 1.5],
        [-1.15, 0.45, -1.4],
        [1.15, 0.45, -1.4]
    ];
    
    wheelPositions.forEach(p => {
        const wheelGroup = new THREE.Group();
        
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheelGroup.add(wheel);
        
        const rim = new THREE.Mesh(rimGeo, rimMat);
        wheelGroup.add(rim);
        
        wheelGroup.position.set(p[0], p[1], p[2]);
        wheelGroup.traverse((child) => {
            if (child.isMesh) child.castShadow = true;
        });
        
        car.add(wheelGroup);
        car.userData.wheels.push(wheelGroup);
    });

    return car;
}

// Player Setup
const player = createCarModel(0x1d4ed8); // Dark Blue
scene.add(player);

// Collision Boxes
const playerBox = new THREE.Box3();
const obsBox = new THREE.Box3();

// Environment / Road
const roadGroup = new THREE.Group();
scene.add(roadGroup);

// Main Asphalt Road
const roadGeo = new THREE.PlaneGeometry(24, 2000);
const roadMat = new THREE.MeshStandardMaterial({ 
    color: 0x333333,
    roughness: 0.8,
    metalness: 0.1
});
const roadPlane = new THREE.Mesh(roadGeo, roadMat);
roadPlane.rotation.x = -Math.PI / 2;
roadPlane.receiveShadow = true;
roadGroup.add(roadPlane);

// Grass on sides
const grassGeo = new THREE.PlaneGeometry(2000, 2000);
const grassMat = new THREE.MeshStandardMaterial({
    color: 0x4ade80,
    roughness: 1.0,
    metalness: 0.0
});
const grassPlane = new THREE.Mesh(grassGeo, grassMat);
grassPlane.rotation.x = -Math.PI / 2;
grassPlane.position.y = -0.1;
grassPlane.receiveShadow = true;
roadGroup.add(grassPlane);

// Lane Dividers
const dashCanvas = document.createElement('canvas');
dashCanvas.width = 64;
dashCanvas.height = 256;
const dashCtx = dashCanvas.getContext('2d');
dashCtx.fillStyle = '#333333';
dashCtx.fillRect(0, 0, 64, 256);
dashCtx.fillStyle = '#ffffff';
dashCtx.fillRect(24, 0, 16, 128);

const dashTexture = new THREE.CanvasTexture(dashCanvas);
dashTexture.wrapS = THREE.RepeatWrapping;
dashTexture.wrapT = THREE.RepeatWrapping;
dashTexture.repeat.set(1, 200); 

const lineGeo = new THREE.PlaneGeometry(0.5, 2000);
const lineMat = new THREE.MeshBasicMaterial({ map: dashTexture, transparent: true });

const line1 = new THREE.Mesh(lineGeo, lineMat);
line1.rotation.x = -Math.PI / 2;
line1.position.set(-4, 0.02, 0);
roadGroup.add(line1);

const line2 = new THREE.Mesh(lineGeo, lineMat);
line2.rotation.x = -Math.PI / 2;
line2.position.set(4, 0.02, 0);
roadGroup.add(line2);

// Obstacles
let obstacles = [];
const lanes = [-8, 0, 8];
const carColors = [0xb91c1c, 0x047857, 0xd97706, 0x475569, 0xf3f4f6];

function spawnObstacle() {
    const lane = lanes[Math.floor(Math.random() * lanes.length)];
    const color = carColors[Math.floor(Math.random() * carColors.length)];
    const obs = createCarModel(color);
    
    obs.userData.speed = 0.4 + Math.random() * 0.4; // absolute speed
    
    // Ensure it spawns at a safe distance depending on player speed
    if (speed < obs.userData.speed) {
        obs.position.set(lane, 0, player.position.z + 200);
    } else {
        obs.position.set(lane, 0, player.position.z - 300);
    }
    
    scene.add(obs);
    obstacles.push(obs);
}

function startGame() {
    gameState = 'PLAYING';
    score = 0;
    speed = 0;
    frameCount = 0;
    
    player.position.set(0, 0, 0);
    player.rotation.set(0, 0, 0);
    
    obstacles.forEach(obs => scene.remove(obs));
    obstacles = [];
    
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    hud.classList.remove('hidden');
    scoreElement.innerText = score;
    speedElement.innerText = "0";
    
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

function updateBrakeLights(car, isBraking) {
    const tLightL = car.children.find(c => c.name === "brakeLightL");
    const tLightR = car.children.find(c => c.name === "brakeLightR");
    if (tLightL && tLightR) {
        const intensity = isBraking ? 1.0 : 0.4;
        tLightL.material.emissiveIntensity = intensity;
        tLightR.material.emissiveIntensity = intensity;
    }
}

function animate() {
    animationId = requestAnimationFrame(animate);
    
    if (gameState === 'PLAYING') {
        frameCount++;
        
        // --- Speed Control ---
        let isBraking = false;
        if (keys.ArrowUp || keys.w || keys.W) {
            speed += acceleration;
        } else if (keys.ArrowDown || keys.s || keys.S) {
            speed -= braking;
            isBraking = true;
        } else {
            if (speed > 0) {
                speed -= friction;
                if (speed < 0) speed = 0;
            } else if (speed < 0) {
                speed += friction;
                if (speed > 0) speed = 0;
            }
        }
        
        if (speed > maxSpeed) speed = maxSpeed;
        if (speed < -0.3) speed = -0.3; // Allow slight reverse
        
        updateBrakeLights(player, isBraking);
        
        // --- Wheel Rotation ---
        player.userData.wheels.forEach(w => {
            w.rotation.x += speed * 0.5; // Rotate wheels based on speed
        });

        // --- HUD Update ---
        let displaySpeed = Math.abs(Math.floor((speed / maxSpeed) * 220));
        speedElement.innerText = displaySpeed;

        // --- Player Movement ---
        player.position.z -= speed;
        
        // --- Camera Movement ---
        camera.position.x = player.position.x * 0.3; 
        camera.position.y = player.position.y + cameraOffset.y - (Math.abs(speed) * 0.2); 
        camera.position.z = player.position.z + cameraOffset.z + (speed * 1.5); 
        
        // Camera FOV expands at higher speeds
        camera.fov = 70 + (speed * 8);
        camera.updateProjectionMatrix();

        camera.lookAt(player.position.x, player.position.y + 1, player.position.z - 10 - (speed * 5));
        
        // Move Lights
        hemiLight.position.z = player.position.z;
        dirLight.position.z = player.position.z + 50;
        dirLight.target.position.set(player.position.x, 0, player.position.z);
        dirLight.target.updateMatrixWorld();
        
        // --- Steering ---
        let steerEffectiveness = Math.min(Math.abs(speed) / 0.5, 1.0);
        if (steerEffectiveness < 0.1) steerEffectiveness = 0; // Can't steer if very slow
        
        // Reverse steering if going backward
        let steerDir = speed >= 0 ? 1 : -1;
        
        const steerSpeed = 0.15 * steerEffectiveness;
        const maxRoll = 0.05 * steerEffectiveness;
        
        if (keys.ArrowLeft || keys.a || keys.A) {
            player.position.x -= steerSpeed * steerDir;
            player.rotation.z = Math.min(player.rotation.z + 0.01, maxRoll); 
            player.rotation.y = Math.min(player.rotation.y + 0.01, 0.05);
        } else if (keys.ArrowRight || keys.d || keys.D) {
            player.position.x += steerSpeed * steerDir;
            player.rotation.z = Math.max(player.rotation.z - 0.01, -maxRoll);
            player.rotation.y = Math.max(player.rotation.y - 0.01, -0.05);
        } else {
            player.rotation.z *= 0.8;
            player.rotation.y *= 0.8;
        }
        
        if (player.position.x < -10) player.position.x = -10;
        if (player.position.x > 10) player.position.x = 10;
        
        // Move road texture
        dashTexture.offset.y -= speed * 0.05;
        
        roadPlane.position.z = player.position.z;
        grassPlane.position.z = player.position.z;
        line1.position.z = player.position.z;
        line2.position.z = player.position.z;
        
        // --- Spawning Obstacles ---
        let spawnRate = Math.max(40, 100 - Math.floor(score / 2));
        if (frameCount % spawnRate === 0) {
            spawnObstacle();
        }
        
        playerBox.setFromObject(player);
        playerBox.expandByScalar(-0.2); // Slightly smaller for forgiving gameplay
        
        for (let i = obstacles.length - 1; i >= 0; i--) {
            let obs = obstacles[i];
            
            obs.position.z -= obs.userData.speed; 
            
            // Animate obstacle wheels
            obs.userData.wheels.forEach(w => {
                w.rotation.x += obs.userData.speed * 0.5;
            });
            
            obsBox.setFromObject(obs);
            obsBox.expandByScalar(-0.2);
            
            if (playerBox.intersectsBox(obsBox)) {
                gameOver();
            }
            
            // Score tracking
            if (obs.position.z > player.position.z + 20) {
                if (!obs.userData.passed) {
                    obs.userData.passed = true;
                    score++;
                    scoreElement.innerText = score;
                }
                scene.remove(obs);
                obstacles.splice(i, 1);
            } else if (obs.position.z < player.position.z - 400) {
                scene.remove(obs);
                obstacles.splice(i, 1);
            }
        }
    } else if (gameState === 'GAMEOVER') {
        if (speed > 0) speed -= 0.05;
        if (speed < 0) speed = 0;
        player.position.z -= speed;
        
        camera.position.z += Math.max(speed * 0.5, 0.1);
        camera.lookAt(player.position);
    }
    
    renderer.render(scene, camera);
}

renderer.render(scene, camera);
animate();
