import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// Poems and prose fragments that appear on papers and are reborn from soot
const TEXTS = [
    "We hold these truths",
    "Congress shall make no law",
    "the right of the people",
    "shall not be infringed",
    "a more perfect union",
    "life liberty pursuit",
    "equal protection",
    "due process of law",
    "freedom of speech",
    "peaceably to assemble",
    "petition the government",
    "unreasonable searches",
    "cruel and unusual",
    "the right to vote",
    "all men are created equal",
    "we the people",
    "justice for all",
    "domestic tranquility",
    "common defence",
    "general welfare",
    "blessings of liberty",
    "secure these rights",
    "consent of the governed",
    "it was a pleasure to burn",
    "paper burns at 451",
    "there must be something in books",
    "we need not to be let alone",
    "stuff your eyes with wonder",
];

export class Scene2 {
    constructor(renderer) {
        this.renderer = renderer;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

        this.clock = new THREE.Clock();
        this.orangeMen = [];
        this.yellowMen = [];
        this.papers = [];        // Papers falling from windows / carried on street
        this.bonfires = [];
        this.sootParticles = [];
        this.rooftopPapers = []; // Clean papers on rooftops that receive soot text
        this.buildings = [];     // Store building configs for reference

        this.init();
        this.createScene();
    }

    init() {
        this.scene.background = new THREE.Color(0xD3B8BF);

        this.camera.position.set(300, 200, 0);
        this.camera.lookAt(-70, 0, 0);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2.1;
    }

    // Same chunky orange man as scene 1
    createOrangeMan() {
        const body = new THREE.Group();

        const torso = new THREE.Mesh(
            new THREE.BoxGeometry(4, 3, 3),
            new THREE.MeshStandardMaterial({ color: 0xFF6600 })
        );
        body.add(torso);

        const belly = new THREE.Mesh(
            new THREE.SphereGeometry(2.2, 12, 12),
            new THREE.MeshStandardMaterial({ color: 0xFF6600 })
        );
        belly.position.y = -0.5;
        belly.position.z = 0.5;
        body.add(belly);

        const head = new THREE.Mesh(
            new THREE.SphereGeometry(1, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0xFF6600 })
        );
        head.position.y = 2.5;
        body.add(head);

        [-1, 1].forEach(side => {
            const arm = new THREE.Mesh(
                new THREE.BoxGeometry(0.9, 2.2, 0.9),
                new THREE.MeshStandardMaterial({ color: 0xFF6600 })
            );
            arm.position.set(side * 2.5, 0.3, 0);
            body.add(arm);
        });

        [-1, 1].forEach(side => {
            const leg = new THREE.Mesh(
                new THREE.BoxGeometry(0.9, 2, 0.9),
                new THREE.MeshStandardMaterial({ color: 0xFF6600 })
            );
            leg.position.set(side * 1.2, -2.5, 0);
            body.add(leg);
        });

        body.scale.set(2, 2, 2);
        body.castShadow = true;

        return body;
    }

    // Slim yellow man - contrasts with chunky orange
    createYellowMan() {
        const body = new THREE.Group();

        // Slim torso
        const torso = new THREE.Mesh(
            new THREE.BoxGeometry(2, 4, 1.5),
            new THREE.MeshStandardMaterial({ color: 0xFFD700 })
        );
        body.add(torso);

        // Small head
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.8, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0xFFD700 })
        );
        head.position.y = 2.8;
        body.add(head);

        // Thin arms
        [-1, 1].forEach(side => {
            const arm = new THREE.Mesh(
                new THREE.BoxGeometry(0.5, 2.5, 0.5),
                new THREE.MeshStandardMaterial({ color: 0xFFD700 })
            );
            arm.position.set(side * 1.5, 0.3, 0);
            body.add(arm);
        });

        // Thin legs
        [-1, 1].forEach(side => {
            const leg = new THREE.Mesh(
                new THREE.BoxGeometry(0.5, 2.5, 0.5),
                new THREE.MeshStandardMaterial({ color: 0xFFD700 })
            );
            leg.position.set(side * 0.6, -3.2, 0);
            body.add(leg);
        });

        body.scale.set(1.8, 1.8, 1.8);
        body.castShadow = true;

        return body;
    }

    createPaperTexture(text) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 128;
        canvas.height = 64;

        // White paper background
        ctx.fillStyle = '#f5f0e8';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Black text
        ctx.fillStyle = '#111111';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Word wrap the text
        const words = text.split(' ');
        let lines = [];
        let currentLine = '';
        words.forEach(word => {
            const testLine = currentLine ? currentLine + ' ' + word : word;
            if (ctx.measureText(testLine).width > canvas.width - 10) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        });
        if (currentLine) lines.push(currentLine);

        const lineHeight = 14;
        const startY = canvas.height / 2 - (lines.length - 1) * lineHeight / 2;
        lines.forEach((line, i) => {
            ctx.fillText(line, canvas.width / 2, startY + i * lineHeight);
        });

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    createBlankPaperTexture() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 128;
        canvas.height = 64;

        ctx.fillStyle = '#f5f0e8';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const texture = new THREE.CanvasTexture(canvas);
        texture._canvas = canvas;
        texture._ctx = ctx;
        return texture;
    }

    createPaper(position, text, velocity) {
        const texture = this.createPaperTexture(text);
        const geometry = new THREE.PlaneGeometry(6, 4);
        const material = new THREE.MeshStandardMaterial({
            map: texture,
            side: THREE.DoubleSide,
            roughness: 0.9,
            metalness: 0.0
        });
        const paper = new THREE.Mesh(geometry, material);
        paper.position.copy(position);
        paper.castShadow = true;

        paper.userData = {
            velocity: velocity || new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                -1 - Math.random() * 0.5,
                (Math.random() - 0.5) * 2
            ),
            rotationSpeed: new THREE.Vector3(
                (Math.random() - 0.5) * 3,
                (Math.random() - 0.5) * 3,
                (Math.random() - 0.5) * 3
            ),
            state: 'falling', // falling, onGround, carried, burning
            groundTime: 0,
            text: text,
            burnProgress: 0
        };

        this.scene.add(paper);
        this.papers.push(paper);
        return paper;
    }

    createBuilding(width, height, depth, position) {
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            roughness: 0.7,
            metalness: 0.2
        });
        const building = new THREE.Mesh(geometry, material);
        building.position.set(position.x, height / 2, position.z);
        building.castShadow = true;
        building.receiveShadow = true;

        // Add window details
        const windowMat = new THREE.MeshStandardMaterial({
            color: 0x445566,
            roughness: 0.3,
            metalness: 0.5
        });

        const floors = Math.floor(height / 20);
        const windowsPerFloor = Math.floor(width / 18);

        for (let floor = 0; floor < floors; floor++) {
            for (let w = 0; w < windowsPerFloor; w++) {
                const windowMesh = new THREE.Mesh(
                    new THREE.PlaneGeometry(6, 8),
                    windowMat
                );
                const xOffset = (w - (windowsPerFloor - 1) / 2) * 18;
                const yOffset = -height / 2 + 15 + floor * 20;
                // Place on the street-facing side
                const zDir = position.z < 0 ? 1 : -1;
                windowMesh.position.set(xOffset, yOffset, zDir * (depth / 2 + 0.1));
                building.add(windowMesh);
            }
        }

        // Add roof entrance (small box on top for yellow men)
        const roofEntrance = new THREE.Mesh(
            new THREE.BoxGeometry(8, 6, 8),
            new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.8 })
        );
        roofEntrance.position.y = height / 2 + 3;
        building.add(roofEntrance);

        return building;
    }

    createBonfire(position) {
        const group = new THREE.Group();
        group.position.copy(position);

        // Fire base (logs)
        for (let i = 0; i < 4; i++) {
            const log = new THREE.Mesh(
                new THREE.CylinderGeometry(0.8, 1, 8, 6),
                new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.9 })
            );
            log.rotation.z = Math.PI / 2;
            log.rotation.y = (i / 4) * Math.PI;
            log.position.y = 1.5;
            group.add(log);
        }

        // Glowing embers at base
        const embers = new THREE.Mesh(
            new THREE.SphereGeometry(3, 8, 8),
            new THREE.MeshStandardMaterial({
                color: 0xff4400,
                emissive: 0xff2200,
                emissiveIntensity: 0.8,
                roughness: 1.0,
                transparent: true,
                opacity: 0.7
            })
        );
        embers.position.y = 2;
        group.add(embers);

        // Point light for fire glow
        const fireLight = new THREE.PointLight(0xff6600, 2, 60);
        fireLight.position.y = 6;
        group.add(fireLight);

        group.userData = {
            fireParticles: [],
            particleTimer: 0
        };

        this.scene.add(group);
        this.bonfires.push(group);
        return group;
    }

    createScene() {
        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
        directionalLight.position.set(100, 200, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.far = 1000;
        directionalLight.shadow.camera.left = -500;
        directionalLight.shadow.camera.right = 500;
        directionalLight.shadow.camera.top = 500;
        directionalLight.shadow.camera.bottom = -500;
        this.scene.add(directionalLight);

        // Street - plain dark tarmac, no text
        const streetGeometry = new THREE.PlaneGeometry(400, 100);
        const streetMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.8,
            metalness: 0.2
        });
        const street = new THREE.Mesh(streetGeometry, streetMaterial);
        street.rotation.x = -Math.PI / 2;
        street.receiveShadow = true;
        this.scene.add(street);

        // Sidewalks
        const sidewalkGeometry = new THREE.PlaneGeometry(400, 20);
        const sidewalkMaterial = new THREE.MeshStandardMaterial({
            color: 0x999999,
            roughness: 0.8
        });

        const leftSidewalk = new THREE.Mesh(sidewalkGeometry, sidewalkMaterial);
        leftSidewalk.rotation.x = -Math.PI / 2;
        leftSidewalk.position.z = -60;
        leftSidewalk.position.y = 0.1;
        leftSidewalk.receiveShadow = true;
        this.scene.add(leftSidewalk);

        const rightSidewalk = new THREE.Mesh(sidewalkGeometry, sidewalkMaterial);
        rightSidewalk.rotation.x = -Math.PI / 2;
        rightSidewalk.position.z = 60;
        rightSidewalk.position.y = 0.1;
        rightSidewalk.receiveShadow = true;
        this.scene.add(rightSidewalk);

        // Buildings with variations (different sizes/heights from scene 1)
        const buildingConfigs = [
            { width: 70, height: 110, depth: 60, position: { x: -120, z: -100 } },
            { width: 80, height: 90, depth: 55, position: { x: 0, z: -105 } },
            { width: 65, height: 130, depth: 60, position: { x: 110, z: -100 } },
            { width: 75, height: 100, depth: 60, position: { x: -110, z: 100 } },
            { width: 85, height: 120, depth: 55, position: { x: 10, z: 105 } },
            { width: 70, height: 95, depth: 60, position: { x: 120, z: 100 } }
        ];

        this.buildingData = buildingConfigs;

        buildingConfigs.forEach(config => {
            const building = this.createBuilding(config.width, config.height, config.depth, config.position);
            this.scene.add(building);
            this.buildings.push(building);
        });

        // Place rooftop papers on each building
        buildingConfigs.forEach((config, i) => {
            const roofY = config.height + 0.5;
            const numPapers = 3 + Math.floor(Math.random() * 3);
            for (let p = 0; p < numPapers; p++) {
                const texture = this.createBlankPaperTexture();
                const paperGeo = new THREE.PlaneGeometry(8, 5);
                const paperMat = new THREE.MeshStandardMaterial({
                    map: texture,
                    side: THREE.DoubleSide,
                    roughness: 0.9
                });
                const paper = new THREE.Mesh(paperGeo, paperMat);
                paper.rotation.x = -Math.PI / 2;
                paper.position.set(
                    config.position.x + (Math.random() - 0.5) * config.width * 0.5,
                    roofY,
                    config.position.z + (Math.random() - 0.5) * config.depth * 0.3
                );

                paper.userData = {
                    buildingIndex: i,
                    sootAccumulated: 0,
                    sootThreshold: 0.6 + Math.random() * 0.4, // When paper is "full" of new text
                    textIndex: Math.floor(Math.random() * TEXTS.length),
                    collected: false
                };

                this.scene.add(paper);
                this.rooftopPapers.push(paper);
            }
        });

        // Place bonfires along the street
        const bonfirePositions = [
            new THREE.Vector3(-140, 0, 0),
            new THREE.Vector3(-60, 0, 15),
            new THREE.Vector3(20, 0, -15),
            new THREE.Vector3(100, 0, 5),
            new THREE.Vector3(160, 0, -10)
        ];
        bonfirePositions.forEach(pos => this.createBonfire(pos));

        // Create orange men with various roles
        this.spawnOrangeMen();

        // Create yellow men on rooftops
        this.spawnYellowMen();
    }

    spawnOrangeMen() {
        // 6 orange men that enter buildings and throw papers
        for (let i = 0; i < 6; i++) {
            const man = this.createOrangeMan();
            const buildingIdx = i % this.buildingData.length;
            const config = this.buildingData[buildingIdx];
            man.position.set(
                config.position.x + (Math.random() - 0.5) * 30,
                10,
                Math.sign(config.position.z) * 50
            );
            man.userData = {
                role: 'building',
                state: 'walkToBuilding',
                targetBuilding: buildingIdx,
                speed: 0.4 + Math.random() * 0.3,
                phase: Math.random() * Math.PI * 2,
                insideTimer: 0,
                insideDuration: 3 + Math.random() * 6,
                carryingPapers: false
            };
            this.orangeMen.push(man);
            this.scene.add(man);
        }

        // 4 orange men that collect papers from ground and bring to fire
        for (let i = 0; i < 4; i++) {
            const man = this.createOrangeMan();
            man.position.set(
                (Math.random() - 0.5) * 250,
                10,
                (Math.random() - 0.5) * 40
            );
            man.userData = {
                role: 'collector',
                state: 'wandering',
                speed: 0.5 + Math.random() * 0.4,
                phase: Math.random() * Math.PI * 2,
                targetPaper: null,
                targetBonfire: null,
                carryingPaper: null,
                wanderTarget: new THREE.Vector3(
                    (Math.random() - 0.5) * 250,
                    10,
                    (Math.random() - 0.5) * 40
                )
            };
            this.orangeMen.push(man);
            this.scene.add(man);
        }
    }

    spawnYellowMen() {
        // One yellow man per building on the rooftop
        this.buildingData.forEach((config, i) => {
            const man = this.createYellowMan();
            man.position.set(
                config.position.x + (Math.random() - 0.5) * 20,
                config.height + 4,
                config.position.z
            );
            man.userData = {
                buildingIndex: i,
                state: 'patrolling',
                speed: 0.3 + Math.random() * 0.2,
                phase: Math.random() * Math.PI * 2,
                targetPaper: null,
                patrolX: config.position.x,
                patrolRange: config.width * 0.4,
                direction: 1
            };
            this.yellowMen.push(man);
            this.scene.add(man);
        });
    }

    throwPaperFromWindow(buildingIndex) {
        const config = this.buildingData[buildingIndex];
        const floors = Math.floor(config.height / 20);
        const floor = Math.floor(Math.random() * floors);
        const yPos = 15 + floor * 20;
        const zDir = config.position.z < 0 ? 1 : -1;

        const pos = new THREE.Vector3(
            config.position.x + (Math.random() - 0.5) * config.width * 0.4,
            yPos,
            config.position.z + zDir * (config.depth / 2 + 2)
        );

        const vel = new THREE.Vector3(
            (Math.random() - 0.5) * 1.5,
            0.5 + Math.random() * 0.5,
            zDir * (1 + Math.random() * 1.5)
        );

        const text = TEXTS[Math.floor(Math.random() * TEXTS.length)];
        this.createPaper(pos, text, vel);
    }

    updateOrangeMen(deltaTime) {
        this.orangeMen.forEach(man => {
            const data = man.userData;
            data.phase += deltaTime * 5;

            if (data.role === 'building') {
                this.updateBuildingMan(man, deltaTime);
            } else if (data.role === 'collector') {
                this.updateCollectorMan(man, deltaTime);
            }

            // Bobbing motion (when visible)
            if (man.visible) {
                man.position.y = 10 + Math.sin(data.phase) * 1.5;
            }
        });
    }

    updateBuildingMan(man, deltaTime) {
        const data = man.userData;
        const config = this.buildingData[data.targetBuilding];
        const buildingX = config.position.x;
        const buildingSideZ = Math.sign(config.position.z) * 70;

        switch (data.state) {
            case 'walkToBuilding': {
                // Walk toward the building entrance
                const dx = buildingX - man.position.x;
                const dz = buildingSideZ - man.position.z;
                const dist = Math.sqrt(dx * dx + dz * dz);

                if (dist > 3) {
                    man.position.x += (dx / dist) * data.speed;
                    man.position.z += (dz / dist) * data.speed;
                    // Face walking direction
                    man.rotation.y = Math.atan2(dx, dz);
                } else {
                    // Entered building
                    man.visible = false;
                    data.state = 'insideBuilding';
                    data.insideTimer = 0;
                    data.insideDuration = 3 + Math.random() * 6;
                }
                break;
            }
            case 'insideBuilding': {
                data.insideTimer += deltaTime;
                // Throw papers from windows while inside
                if (Math.random() < 0.015) {
                    this.throwPaperFromWindow(data.targetBuilding);
                }
                if (data.insideTimer >= data.insideDuration) {
                    // Come out, potentially carrying papers
                    man.visible = true;
                    man.position.x = buildingX + (Math.random() - 0.5) * 10;
                    man.position.z = buildingSideZ;
                    data.carryingPapers = Math.random() < 0.6;

                    if (data.carryingPapers) {
                        data.state = 'carryToBonfire';
                        // Pick nearest bonfire
                        let nearest = 0;
                        let nearDist = Infinity;
                        this.bonfires.forEach((fire, idx) => {
                            const d = man.position.distanceTo(fire.position);
                            if (d < nearDist) {
                                nearDist = d;
                                nearest = idx;
                            }
                        });
                        data.targetBonfireIdx = nearest;

                        // Create visual paper stack the man is carrying
                        if (!data.paperStack) {
                            const stack = new THREE.Mesh(
                                new THREE.BoxGeometry(3, 2, 2),
                                new THREE.MeshStandardMaterial({ color: 0xf5f0e8 })
                            );
                            stack.position.y = 3;
                            stack.position.z = 1.5;
                            man.add(stack);
                            data.paperStack = stack;
                        }
                        data.paperStack.visible = true;
                    } else {
                        data.state = 'walkToBuilding';
                        // Pick a new random building
                        data.targetBuilding = Math.floor(Math.random() * this.buildingData.length);
                    }
                }
                break;
            }
            case 'carryToBonfire': {
                const firePos = this.bonfires[data.targetBonfireIdx].position;
                const dx = firePos.x - man.position.x;
                const dz = firePos.z - man.position.z;
                const dist = Math.sqrt(dx * dx + dz * dz);

                if (dist > 5) {
                    man.position.x += (dx / dist) * data.speed;
                    man.position.z += (dz / dist) * data.speed;
                    man.rotation.y = Math.atan2(dx, dz);
                } else {
                    // Throw papers into fire
                    if (data.paperStack) data.paperStack.visible = false;
                    data.carryingPapers = false;
                    data.state = 'walkToBuilding';
                    data.targetBuilding = Math.floor(Math.random() * this.buildingData.length);

                    // Spawn some soot from this fire
                    this.spawnSoot(firePos, 5 + Math.floor(Math.random() * 5));
                }
                break;
            }
        }
    }

    updateCollectorMan(man, deltaTime) {
        const data = man.userData;

        switch (data.state) {
            case 'wandering': {
                // Look for papers on the ground
                const groundPaper = this.papers.find(p =>
                    p.userData.state === 'onGround' &&
                    !p.userData.claimed
                );

                if (groundPaper) {
                    groundPaper.userData.claimed = true;
                    data.targetPaper = groundPaper;
                    data.state = 'goToPaper';
                } else {
                    // Wander randomly
                    const dx = data.wanderTarget.x - man.position.x;
                    const dz = data.wanderTarget.z - man.position.z;
                    const dist = Math.sqrt(dx * dx + dz * dz);

                    if (dist > 3) {
                        man.position.x += (dx / dist) * data.speed * 0.5;
                        man.position.z += (dz / dist) * data.speed * 0.5;
                        man.rotation.y = Math.atan2(dx, dz);
                    } else {
                        data.wanderTarget = new THREE.Vector3(
                            (Math.random() - 0.5) * 250,
                            10,
                            (Math.random() - 0.5) * 40
                        );
                    }
                }
                break;
            }
            case 'goToPaper': {
                if (!data.targetPaper || !data.targetPaper.parent) {
                    data.state = 'wandering';
                    break;
                }
                const paperPos = data.targetPaper.position;
                const dx = paperPos.x - man.position.x;
                const dz = paperPos.z - man.position.z;
                const dist = Math.sqrt(dx * dx + dz * dz);

                if (dist > 4) {
                    man.position.x += (dx / dist) * data.speed;
                    man.position.z += (dz / dist) * data.speed;
                    man.rotation.y = Math.atan2(dx, dz);
                } else {
                    // Pick up paper
                    data.carryingPaper = data.targetPaper;
                    data.targetPaper.userData.state = 'carried';
                    data.targetPaper = null;

                    // Find nearest bonfire
                    let nearest = 0;
                    let nearDist = Infinity;
                    this.bonfires.forEach((fire, idx) => {
                        const d = man.position.distanceTo(fire.position);
                        if (d < nearDist) {
                            nearDist = d;
                            nearest = idx;
                        }
                    });
                    data.targetBonfire = nearest;
                    data.state = 'bringToFire';
                }
                break;
            }
            case 'bringToFire': {
                if (!data.carryingPaper || !data.carryingPaper.parent) {
                    data.state = 'wandering';
                    break;
                }
                const firePos = this.bonfires[data.targetBonfire].position;
                const dx = firePos.x - man.position.x;
                const dz = firePos.z - man.position.z;
                const dist = Math.sqrt(dx * dx + dz * dz);

                // Paper follows the man
                data.carryingPaper.position.set(
                    man.position.x,
                    man.position.y + 4,
                    man.position.z
                );

                if (dist > 5) {
                    man.position.x += (dx / dist) * data.speed;
                    man.position.z += (dz / dist) * data.speed;
                    man.rotation.y = Math.atan2(dx, dz);
                } else {
                    // Throw paper in fire
                    const paper = data.carryingPaper;
                    paper.userData.state = 'burning';
                    paper.userData.burnProgress = 0;
                    data.carryingPaper = null;
                    data.state = 'wandering';
                    data.wanderTarget = new THREE.Vector3(
                        (Math.random() - 0.5) * 250,
                        10,
                        (Math.random() - 0.5) * 40
                    );

                    // Spawn soot
                    this.spawnSoot(firePos, 3 + Math.floor(Math.random() * 3));
                }
                break;
            }
        }
    }

    updatePapers(deltaTime) {
        const toRemove = [];

        this.papers.forEach((paper, idx) => {
            const data = paper.userData;

            switch (data.state) {
                case 'falling': {
                    // Apply gravity and wind
                    data.velocity.y -= 2.0 * deltaTime;
                    // Air resistance to make paper flutter
                    data.velocity.x += (Math.random() - 0.5) * 2 * deltaTime;
                    data.velocity.z += (Math.random() - 0.5) * 2 * deltaTime;

                    paper.position.x += data.velocity.x;
                    paper.position.y += data.velocity.y;
                    paper.position.z += data.velocity.z;

                    // Tumbling rotation
                    paper.rotation.x += data.rotationSpeed.x * deltaTime;
                    paper.rotation.y += data.rotationSpeed.y * deltaTime;
                    paper.rotation.z += data.rotationSpeed.z * deltaTime;

                    // Hit ground
                    if (paper.position.y <= 1) {
                        paper.position.y = 1;
                        data.state = 'onGround';
                        data.groundTime = 0;
                        paper.rotation.x = -Math.PI / 2;
                        paper.rotation.z = Math.random() * Math.PI;
                    }
                    break;
                }
                case 'onGround': {
                    data.groundTime += deltaTime;
                    // Papers stay on ground until collected - auto-remove after 30s
                    if (data.groundTime > 30) {
                        toRemove.push(idx);
                    }
                    break;
                }
                case 'carried': {
                    // Position managed by collector man
                    break;
                }
                case 'burning': {
                    data.burnProgress += deltaTime * 0.8;
                    // Shrink and darken
                    const scale = Math.max(0, 1 - data.burnProgress);
                    paper.scale.set(scale, scale, scale);
                    paper.material.color.lerp(new THREE.Color(0x111111), deltaTime * 2);
                    paper.material.opacity = scale;
                    paper.material.transparent = true;

                    if (data.burnProgress >= 1) {
                        toRemove.push(idx);
                    }
                    break;
                }
            }
        });

        // Remove burned/expired papers (reverse order to keep indices valid)
        toRemove.sort((a, b) => b - a).forEach(idx => {
            const paper = this.papers[idx];
            this.scene.remove(paper);
            paper.geometry.dispose();
            paper.material.dispose();
            this.papers.splice(idx, 1);
        });
    }

    spawnSoot(firePosition, count) {
        for (let i = 0; i < count; i++) {
            const particle = new THREE.Mesh(
                new THREE.SphereGeometry(0.3 + Math.random() * 0.4, 4, 4),
                new THREE.MeshStandardMaterial({
                    color: 0x111111,
                    roughness: 1.0,
                    metalness: 0.0
                })
            );
            particle.position.set(
                firePosition.x + (Math.random() - 0.5) * 4,
                firePosition.y + 3 + Math.random() * 3,
                firePosition.z + (Math.random() - 0.5) * 4
            );

            // Pick a random building rooftop as destination
            const targetBldg = Math.floor(Math.random() * this.buildingData.length);
            const bConfig = this.buildingData[targetBldg];

            particle.userData = {
                state: 'rising',
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.5,
                    2 + Math.random() * 2,
                    (Math.random() - 0.5) * 0.5
                ),
                targetX: bConfig.position.x + (Math.random() - 0.5) * bConfig.width * 0.4,
                targetY: bConfig.height + 1,
                targetZ: bConfig.position.z + (Math.random() - 0.5) * bConfig.depth * 0.3,
                targetBuilding: targetBldg,
                riseHeight: bConfig.height + 30 + Math.random() * 30,
                driftPhase: Math.random() * Math.PI * 2
            };

            this.scene.add(particle);
            this.sootParticles.push(particle);
        }
    }

    updateSoot(deltaTime) {
        const toRemove = [];

        this.sootParticles.forEach((particle, idx) => {
            const data = particle.userData;
            data.driftPhase += deltaTime;

            switch (data.state) {
                case 'rising': {
                    // Rise up
                    particle.position.y += data.velocity.y * deltaTime * 8;
                    particle.position.x += Math.sin(data.driftPhase) * 0.3 * deltaTime;
                    particle.position.z += Math.cos(data.driftPhase * 0.7) * 0.3 * deltaTime;

                    if (particle.position.y >= data.riseHeight) {
                        data.state = 'drifting';
                    }
                    break;
                }
                case 'drifting': {
                    // Drift toward target rooftop
                    const dx = data.targetX - particle.position.x;
                    const dy = data.targetY - particle.position.y;
                    const dz = data.targetZ - particle.position.z;
                    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                    if (dist > 2) {
                        const speed = 15;
                        particle.position.x += (dx / dist) * speed * deltaTime;
                        particle.position.y += (dy / dist) * speed * deltaTime;
                        particle.position.z += (dz / dist) * speed * deltaTime;
                        // Add some organic drift
                        particle.position.x += Math.sin(data.driftPhase * 2) * 0.2 * deltaTime;
                    } else {
                        data.state = 'landed';
                        // Apply soot to a random rooftop paper on this building
                        this.applySootToPaper(data.targetBuilding);
                        toRemove.push(idx);
                    }
                    break;
                }
            }
        });

        toRemove.sort((a, b) => b - a).forEach(idx => {
            const p = this.sootParticles[idx];
            this.scene.remove(p);
            p.geometry.dispose();
            p.material.dispose();
            this.sootParticles.splice(idx, 1);
        });
    }

    applySootToPaper(buildingIndex) {
        // Find uncollected rooftop papers on this building
        const candidates = this.rooftopPapers.filter(p =>
            p.userData.buildingIndex === buildingIndex &&
            !p.userData.collected
        );

        if (candidates.length === 0) return;

        const paper = candidates[Math.floor(Math.random() * candidates.length)];
        paper.userData.sootAccumulated += 0.15;

        // Update paper texture to show emerging text
        const progress = Math.min(1, paper.userData.sootAccumulated / paper.userData.sootThreshold);
        const ctx = paper.material.map._ctx;
        const canvas = paper.material.map._canvas;

        // Redraw paper
        ctx.fillStyle = '#f5f0e8';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw text with opacity based on soot progress
        const text = TEXTS[paper.userData.textIndex];
        ctx.fillStyle = `rgba(17, 17, 17, ${progress})`;
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const words = text.split(' ');
        let lines = [];
        let currentLine = '';
        words.forEach(word => {
            const testLine = currentLine ? currentLine + ' ' + word : word;
            if (ctx.measureText(testLine).width > canvas.width - 10) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        });
        if (currentLine) lines.push(currentLine);

        const lineHeight = 14;
        const startY = canvas.height / 2 - (lines.length - 1) * lineHeight / 2;
        lines.forEach((line, i) => {
            ctx.fillText(line, canvas.width / 2, startY + i * lineHeight);
        });

        // Add some scattered soot dots for effect
        const dotCount = Math.floor(progress * 40);
        ctx.fillStyle = 'rgba(30, 30, 30, 0.3)';
        for (let d = 0; d < dotCount; d++) {
            const dotX = Math.random() * canvas.width;
            const dotY = Math.random() * canvas.height;
            ctx.beginPath();
            ctx.arc(dotX, dotY, 0.5 + Math.random(), 0, Math.PI * 2);
            ctx.fill();
        }

        paper.material.map.needsUpdate = true;

        // If paper is full of text, mark as ready for collection
        if (paper.userData.sootAccumulated >= paper.userData.sootThreshold) {
            paper.userData.readyForCollection = true;
        }
    }

    updateYellowMen(deltaTime) {
        this.yellowMen.forEach(man => {
            const data = man.userData;
            data.phase += deltaTime * 4;
            const config = this.buildingData[data.buildingIndex];
            const roofY = config.height + 4;

            // Bobbing
            man.position.y = roofY + Math.sin(data.phase) * 0.8;

            switch (data.state) {
                case 'patrolling': {
                    // Walk back and forth on rooftop
                    man.position.x += data.direction * data.speed;

                    if (man.position.x > data.patrolX + data.patrolRange) {
                        data.direction = -1;
                        man.rotation.y = Math.PI;
                    } else if (man.position.x < data.patrolX - data.patrolRange) {
                        data.direction = 1;
                        man.rotation.y = 0;
                    }

                    // Check for completed papers
                    const readyPaper = this.rooftopPapers.find(p =>
                        p.userData.buildingIndex === data.buildingIndex &&
                        p.userData.readyForCollection &&
                        !p.userData.collected
                    );

                    if (readyPaper) {
                        data.targetPaper = readyPaper;
                        data.state = 'goToPaper';
                    }
                    break;
                }
                case 'goToPaper': {
                    if (!data.targetPaper || data.targetPaper.userData.collected) {
                        data.state = 'patrolling';
                        break;
                    }

                    const dx = data.targetPaper.position.x - man.position.x;
                    const dz = data.targetPaper.position.z - man.position.z;
                    const dist = Math.sqrt(dx * dx + dz * dz);

                    if (dist > 2) {
                        man.position.x += (dx / dist) * data.speed * 1.5;
                        man.position.z += (dz / dist) * data.speed * 1.5;
                        man.rotation.y = Math.atan2(dx, dz);
                    } else {
                        // Pick up paper
                        data.targetPaper.userData.collected = true;
                        data.state = 'carryToEntrance';
                        data.carriedPaper = data.targetPaper;
                    }
                    break;
                }
                case 'carryToEntrance': {
                    // Walk to roof entrance (center of building)
                    const entranceX = config.position.x;
                    const entranceZ = config.position.z;
                    const dx = entranceX - man.position.x;
                    const dz = entranceZ - man.position.z;
                    const dist = Math.sqrt(dx * dx + dz * dz);

                    // Paper follows yellow man
                    if (data.carriedPaper) {
                        data.carriedPaper.position.set(
                            man.position.x,
                            man.position.y + 2,
                            man.position.z
                        );
                        data.carriedPaper.rotation.x = 0;
                        data.carriedPaper.rotation.z = 0;
                    }

                    if (dist > 3) {
                        man.position.x += (dx / dist) * data.speed * 1.5;
                        man.position.z += (dz / dist) * data.speed * 1.5;
                        man.rotation.y = Math.atan2(dx, dz);
                    } else {
                        // "Enter" building through roof
                        if (data.carriedPaper) {
                            this.scene.remove(data.carriedPaper);
                            const pIdx = this.rooftopPapers.indexOf(data.carriedPaper);
                            if (pIdx >= 0) this.rooftopPapers.splice(pIdx, 1);
                            data.carriedPaper = null;
                        }

                        // Spawn a new blank paper on this rooftop
                        this.spawnNewRooftopPaper(data.buildingIndex);

                        data.state = 'patrolling';
                        man.position.z = config.position.z;
                    }
                    break;
                }
            }
        });
    }

    spawnNewRooftopPaper(buildingIndex) {
        const config = this.buildingData[buildingIndex];
        const roofY = config.height + 0.5;
        const texture = this.createBlankPaperTexture();
        const paperGeo = new THREE.PlaneGeometry(8, 5);
        const paperMat = new THREE.MeshStandardMaterial({
            map: texture,
            side: THREE.DoubleSide,
            roughness: 0.9
        });
        const paper = new THREE.Mesh(paperGeo, paperMat);
        paper.rotation.x = -Math.PI / 2;
        paper.position.set(
            config.position.x + (Math.random() - 0.5) * config.width * 0.5,
            roofY,
            config.position.z + (Math.random() - 0.5) * config.depth * 0.3
        );
        paper.userData = {
            buildingIndex: buildingIndex,
            sootAccumulated: 0,
            sootThreshold: 0.6 + Math.random() * 0.4,
            textIndex: Math.floor(Math.random() * TEXTS.length),
            collected: false
        };

        this.scene.add(paper);
        this.rooftopPapers.push(paper);
    }

    updateBonfires(deltaTime) {
        this.bonfires.forEach(bonfire => {
            const data = bonfire.userData;
            data.particleTimer += deltaTime;

            // Flicker the fire light
            const light = bonfire.children.find(c => c instanceof THREE.PointLight);
            if (light) {
                light.intensity = 1.5 + Math.sin(data.particleTimer * 10) * 0.5 + Math.random() * 0.3;
            }

            // Spawn fire particles
            if (data.particleTimer > 0.1) {
                data.particleTimer = 0;

                const particle = new THREE.Mesh(
                    new THREE.SphereGeometry(0.3 + Math.random() * 0.5, 4, 4),
                    new THREE.MeshStandardMaterial({
                        color: Math.random() > 0.5 ? 0xff4400 : 0xff8800,
                        emissive: 0xff2200,
                        emissiveIntensity: 0.5,
                        transparent: true,
                        opacity: 0.8
                    })
                );
                particle.position.set(
                    (Math.random() - 0.5) * 3,
                    2 + Math.random() * 2,
                    (Math.random() - 0.5) * 3
                );
                particle.userData = {
                    velocity: new THREE.Vector3(
                        (Math.random() - 0.5) * 0.5,
                        2 + Math.random() * 2,
                        (Math.random() - 0.5) * 0.5
                    ),
                    life: 0,
                    maxLife: 0.5 + Math.random() * 0.8
                };
                bonfire.add(particle);
                data.fireParticles.push(particle);
            }

            // Update fire particles
            const toRemove = [];
            data.fireParticles.forEach((p, idx) => {
                p.userData.life += deltaTime;
                p.position.x += p.userData.velocity.x * deltaTime;
                p.position.y += p.userData.velocity.y * deltaTime;
                p.position.z += p.userData.velocity.z * deltaTime;

                const lifeRatio = p.userData.life / p.userData.maxLife;
                p.material.opacity = Math.max(0, 1 - lifeRatio);
                p.scale.setScalar(1 - lifeRatio * 0.5);

                if (p.userData.life >= p.userData.maxLife) {
                    toRemove.push(idx);
                }
            });

            toRemove.sort((a, b) => b - a).forEach(idx => {
                const p = data.fireParticles[idx];
                bonfire.remove(p);
                p.geometry.dispose();
                p.material.dispose();
                data.fireParticles.splice(idx, 1);
            });
        });

        // Periodically spawn soot from active bonfires
        if (Math.random() < 0.02) {
            const randomFire = this.bonfires[Math.floor(Math.random() * this.bonfires.length)];
            this.spawnSoot(randomFire.position, 2 + Math.floor(Math.random() * 3));
        }
    }

    update() {
        const deltaTime = this.clock.getDelta();

        this.updateOrangeMen(deltaTime);
        this.updatePapers(deltaTime);
        this.updateYellowMen(deltaTime);
        this.updateBonfires(deltaTime);
        this.updateSoot(deltaTime);

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    }

    dispose() {
        this.controls.dispose();
        // Clean up all meshes
        this.papers.forEach(p => {
            this.scene.remove(p);
            p.geometry.dispose();
            p.material.dispose();
        });
        this.sootParticles.forEach(p => {
            this.scene.remove(p);
            p.geometry.dispose();
            p.material.dispose();
        });
    }
}
