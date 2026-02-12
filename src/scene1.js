import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export class Scene1 {
    constructor(renderer) {
        this.renderer = renderer;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

        this.clock = new THREE.Clock();
        this.characters = [];
        this.letterPositions = [];

        // Word groups for switching when fully damaged
        this.wordGroups = [
            ["BLACK ", "WORDS ", "SHIT  "],  // Group 1
            ["LIVES", "DONT ", "WILL "],   // Group 2
            [" MATTER", "SHATTER", " HAPPEN"]  // Group 3
        ];

        // Current active words (initially the first word from each group)
        this.activeWords = [0, 0, 0]; // Indexes into wordGroups

        // Create unique objects for each letter with lingering timer
        this.textDamage = [
            Array(6).fill().map(() => ({damage: 0, healing: false, lingerTime: 0})),
            Array(5).fill().map(() => ({damage: 0, healing: false, lingerTime: 0})),
            Array(7).fill().map(() => ({damage: 0, healing: false, lingerTime: 0}))
        ];

        this.healingRate = 0.4;
        this.damageRate = 0.8;
        this.lingerDuration = 3.0;
        this.wordPositions = [-150, 0, 150];

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

    createCharacter() {
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

        body.userData = {
            speed: 0.5 + Math.random() * 0.5,
            targetWord: Math.floor(Math.random() * 3),
            targetLetter: 0,
            phase: Math.random() * Math.PI * 2
        };

        body.scale.set(2, 2, 2);
        body.position.y = 10;
        body.castShadow = true;

        const randomDirection = Math.random();
        if (randomDirection < 0.25) {
            body.rotation.y = 0;
        } else if (randomDirection < 0.5) {
            body.rotation.y = Math.PI;
        } else if (randomDirection < 0.75) {
            body.rotation.y = Math.PI / 2;
        } else {
            body.rotation.y = -Math.PI / 2;
        }

        return body;
    }

    createStreetTexture() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 2048;
        canvas.height = 512;

        this.textureCanvas = canvas;
        this.textureContext = ctx;

        this.updateStreetTexture();

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 1);

        this.streetTexture = texture;

        return texture;
    }

    updateStreetTexture() {
        const ctx = this.textureContext;
        const canvas = this.textureCanvas;

        ctx.fillStyle = '#333333';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 160px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        const words = this.wordGroups.map((group, i) => group[this.activeWords[i]]);

        const wordWidths = words.map(word => ctx.measureText(word).width);
        const letterWidths = words.map(word =>
            [...word].map(letter => ctx.measureText(letter).width)
        );
        const sidePadding = 150;
        const spacing = 150;
        const totalWidth = wordWidths.reduce((a, b) => a + b, 0) + (spacing * (words.length - 1));
        const startX = sidePadding + ((canvas.width - totalWidth - (sidePadding * 2)) / 2);

        this.letterPositions = [];

        let currentX = startX;
        words.forEach((word, wordIndex) => {
            const wordLetterPositions = [];
            [...word].forEach((letter, letterIndex) => {
                wordLetterPositions.push(currentX + letterWidths[wordIndex][letterIndex] / 2);

                const letterState = this.textDamage[wordIndex][letterIndex];
                ctx.globalAlpha = Math.max(0, 1 - letterState.damage);

                ctx.save();
                ctx.translate(currentX, canvas.height / 2);
                ctx.scale(1, 1.5);
                ctx.translate(-currentX, -canvas.height / 2);
                ctx.fillText(letter, currentX, canvas.height / 2);
                ctx.restore();

                currentX += letterWidths[wordIndex][letterIndex];
            });
            this.letterPositions.push(wordLetterPositions);
            currentX += spacing;
        });
        ctx.globalAlpha = 1;

        if (this.streetTexture) {
            this.streetTexture.needsUpdate = true;
        }
    }

    createBuilding(width, height, depth, position) {
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            roughness: 0.7,
            metalness: 0.2
        });
        const building = new THREE.Mesh(geometry, material);
        building.position.set(position.x, height/2, position.z);
        building.castShadow = true;
        building.receiveShadow = true;
        return building;
    }

    createScene() {
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        // Add directional light (sunlight)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
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

        // Create street with texture
        const streetTexture = this.createStreetTexture();
        const streetGeometry = new THREE.PlaneGeometry(400, 100);
        const streetMaterial = new THREE.MeshStandardMaterial({
            map: streetTexture,
            roughness: 0.8,
            metalness: 0.2
        });
        const street = new THREE.Mesh(streetGeometry, streetMaterial);
        street.rotation.x = -Math.PI / 2;
        street.receiveShadow = true;
        this.scene.add(street);

        // Add sidewalks
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

        // Add buildings
        const buildingConfigs = [
            { width: 80, height: 100, depth: 60, position: { x: -100, z: -100 } },
            { width: 70, height: 120, depth: 60, position: { x: 0, z: -100 } },
            { width: 90, height: 80, depth: 60, position: { x: 100, z: -100 } },
            { width: 85, height: 110, depth: 60, position: { x: -100, z: 100 } },
            { width: 75, height: 90, depth: 60, position: { x: 0, z: 100 } },
            { width: 80, height: 130, depth: 60, position: { x: 100, z: 100 } }
        ];

        buildingConfigs.forEach(config => {
            const building = this.createBuilding(config.width, config.height, config.depth, config.position);
            this.scene.add(building);
        });

        // Add characters
        for (let i = 0; i < 12; i++) {
            const character = this.createCharacter();
            character.position.x = (Math.random() - 0.5) * 300;
            character.position.z = (Math.random() - 0.5) * 80;
            this.characters.push(character);
            this.scene.add(character);
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    }

    update() {
        const deltaTime = this.clock.getDelta();
        this.updateCharacters(deltaTime);
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    updateCharacters(deltaTime) {
        const forceNewTargetTime = 7;

        this.characters.forEach(character => {
            const data = character.userData;

            if (data.targetTime === undefined) {
                data.targetTime = 0;
            }

            const targetX = this.wordPositions[data.targetWord];

            const dx = targetX - character.position.x;
            character.position.x += Math.sign(dx) * data.speed;

            if (!data.wobbleDirection) {
                data.wobbleDirection = Math.random() > 0.5 ? 1 : -1;
                data.wobbleTime = 0;
            }

            data.wobbleTime += deltaTime;
            if (data.wobbleTime > 2) {
                data.wobbleDirection *= -1;
                data.wobbleTime = 0;
            }

            character.position.z += data.wobbleDirection * 0.2 * Math.sin(data.phase);

            data.phase += deltaTime * 5;
            character.position.y = 10 + Math.sin(data.phase) * 2;

            data.targetTime += deltaTime;

            if (data.targetTime > forceNewTargetTime) {
                data.targetTime = 0;
                this.pickNewTarget(character, true);
                return;
            }

            if (Math.abs(dx) < 20) {
                const letterState = this.textDamage[data.targetWord][data.targetLetter];
                if (letterState && !letterState.healing && letterState.damage < 1) {
                    letterState.damage += this.damageRate * deltaTime;

                    if (letterState.damage >= 1) {
                        letterState.damage = 1;
                        letterState.lingerTime = 0;
                        this.pickNewTarget(character);
                    }
                }
            }
        });

        for (let wordIndex = 0; wordIndex < this.textDamage.length; wordIndex++) {
            this.checkWordFullyDamaged(wordIndex);
        }

        this.textDamage.forEach(word => {
            word.forEach(letterState => {
                if (letterState.damage === 1 && !letterState.healing) {
                    letterState.lingerTime += deltaTime;
                    if (letterState.lingerTime >= this.lingerDuration) {
                        letterState.healing = true;
                    }
                }

                if (letterState.healing) {
                    letterState.damage -= this.healingRate * deltaTime;
                    if (letterState.damage <= 0) {
                        letterState.damage = 0;
                        letterState.healing = false;
                        letterState.lingerTime = 0;
                    }
                }
            });
        });

        if (this.textDamage.some(word => word.some(letterState => letterState.damage > 0))) {
            this.updateStreetTexture();
        }
    }

    pickNewTarget(character, forceNewWord = false) {
        const data = character.userData;
        data.targetTime = 0;

        const targetsInUse = new Map();

        this.characters.forEach(otherChar => {
            if (otherChar !== character) {
                const otherData = otherChar.userData;
                if (!targetsInUse.has(otherData.targetWord)) {
                    targetsInUse.set(otherData.targetWord, new Set());
                }
                targetsInUse.get(otherData.targetWord).add(otherData.targetLetter);
            }
        });

        if (forceNewWord || Math.random() < 0.3) {
            const currentWordIndex = data.targetWord;
            let newWordIndex;

            const groupSizes = [6, 5, 7];
            const totalSize = groupSizes.reduce((a, b) => a + b, 0);
            const weights = groupSizes.map(size => size / totalSize);

            const rand = Math.random();
            let cumulativeWeight = 0;

            for (let i = 0; i < weights.length; i++) {
                cumulativeWeight += weights[i];
                if (rand < cumulativeWeight && i !== currentWordIndex) {
                    newWordIndex = i;
                    break;
                }
            }

            if (newWordIndex === undefined || newWordIndex === currentWordIndex) {
                do {
                    newWordIndex = Math.floor(Math.random() * 3);
                } while (newWordIndex === currentWordIndex);
            }

            data.targetWord = newWordIndex;

            const targetedLetters = targetsInUse.get(newWordIndex) || new Set();

            const newWord = this.textDamage[newWordIndex];
            const untargetedLetters = newWord
                .map((letterState, index) => ({ letterState, index }))
                .filter(({ letterState, index }) =>
                    !letterState.healing &&
                    letterState.damage < 1 &&
                    !targetedLetters.has(index));

            if (untargetedLetters.length > 0) {
                data.targetLetter = untargetedLetters[Math.floor(Math.random() * untargetedLetters.length)].index;
            } else {
                const anyUndamagedLetter = newWord
                    .map((letterState, index) => ({ letterState, index }))
                    .filter(({ letterState }) => !letterState.healing && letterState.damage < 1);

                if (anyUndamagedLetter.length > 0) {
                    data.targetLetter = anyUndamagedLetter[Math.floor(Math.random() * anyUndamagedLetter.length)].index;
                } else {
                    data.targetLetter = 0;
                }
            }

            return;
        }

        const currentWord = this.textDamage[data.targetWord];

        const targetedLetters = targetsInUse.get(data.targetWord) || new Set();

        const untargetedLetters = currentWord
            .map((letterState, index) => ({ letterState, index }))
            .filter(({ letterState, index }) =>
                !letterState.healing &&
                letterState.damage < 1 &&
                !targetedLetters.has(index));

        if (untargetedLetters.length > 0) {
            data.targetLetter = untargetedLetters[Math.floor(Math.random() * untargetedLetters.length)].index;
        } else {
            const damagableLetters = currentWord
                .map((letterState, index) => ({ letterState, index }))
                .filter(({ letterState }) => !letterState.healing && letterState.damage < 1);

            if (damagableLetters.length > 0) {
                data.targetLetter = damagableLetters[Math.floor(Math.random() * damagableLetters.length)].index;
            } else {
                const groupSizes = [6, 5, 7];
                const totalSize = groupSizes.reduce((a, b) => a + b, 0);
                const weights = groupSizes.map(size => size / totalSize);

                let newWordIndex;
                const rand = Math.random();
                let cumulativeWeight = 0;

                for (let i = 0; i < weights.length; i++) {
                    cumulativeWeight += weights[i];
                    if (rand < cumulativeWeight && i !== data.targetWord) {
                        newWordIndex = i;
                        break;
                    }
                }

                if (newWordIndex === undefined || newWordIndex === data.targetWord) {
                    do {
                        newWordIndex = Math.floor(Math.random() * 3);
                    } while (newWordIndex === data.targetWord);
                }

                data.targetWord = newWordIndex;

                const newTargetedLetters = targetsInUse.get(newWordIndex) || new Set();

                const newWord = this.textDamage[newWordIndex];
                const newUntargetedLetters = newWord
                    .map((letterState, index) => ({ letterState, index }))
                    .filter(({ letterState, index }) =>
                        !letterState.healing &&
                        letterState.damage < 1 &&
                        !newTargetedLetters.has(index));

                if (newUntargetedLetters.length > 0) {
                    data.targetLetter = newUntargetedLetters[Math.floor(Math.random() * newUntargetedLetters.length)].index;
                } else {
                    const availableLetters = newWord
                        .map((letterState, index) => ({ letterState, index }))
                        .filter(({ letterState }) => !letterState.healing && letterState.damage < 1);

                    if (availableLetters.length > 0) {
                        data.targetLetter = availableLetters[Math.floor(Math.random() * availableLetters.length)].index;
                    } else {
                        data.targetLetter = 0;
                    }
                }
            }
        }
    }

    checkWordFullyDamaged(wordIndex) {
        const word = this.textDamage[wordIndex];

        const isFullyDamaged = word.every(letterState => letterState.damage >= 1);

        if (isFullyDamaged) {
            const currentWordGroup = this.wordGroups[wordIndex];
            const currentWordIndex = this.activeWords[wordIndex];

            let newWordIndex;

            if (currentWordGroup.length > 1) {
                do {
                    newWordIndex = Math.floor(Math.random() * currentWordGroup.length);
                } while (newWordIndex === currentWordIndex);
            } else {
                newWordIndex = 0;
            }

            this.activeWords[wordIndex] = newWordIndex;

            const groupSizes = [6, 5, 7];
            this.textDamage[wordIndex] = Array(groupSizes[wordIndex]).fill().map(() => ({
                damage: 0,
                healing: false,
                lingerTime: 0
            }));

            this.characters.forEach(character => {
                if (character.userData.targetWord === wordIndex) {
                    this.pickNewTarget(character, true);
                }
            });

            this.updateStreetTexture();

            const originalColor = this.scene.background.clone();
            this.scene.background.set(0xFFFFFF);

            setTimeout(() => {
                this.scene.background.copy(originalColor);
            }, 200);
        }
    }

    dispose() {
        this.controls.dispose();
    }
}
