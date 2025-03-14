import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

class BLMPlazaScene {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.querySelector('#scene'),
            antialias: true
        });
        
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
            Array(6).fill().map(() => ({damage: 0, healing: false, lingerTime: 0})),  // First word (6 chars including space)
            Array(5).fill().map(() => ({damage: 0, healing: false, lingerTime: 0})),  // Second word (5 chars including space)
            Array(7).fill().map(() => ({damage: 0, healing: false, lingerTime: 0}))   // Third word (7 chars including space)
        ];
        
        this.healingRate = 0.4; // Slower healing
        this.damageRate = 0.8;
        this.lingerDuration = 3.0; // How long letters stay fully damaged before healing
        this.wordPositions = [-150, 0, 150];  // Fixed word center positions
        
        this.init();
        this.createScene();
        this.animate();
    }

    init() {
        // Setup renderer
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Set grey-pink sky background
        this.scene.background = new THREE.Color(0xD3B8BF); // Grey-pink color
        
        // Remove fog for infinite ground effect
        // const groundColor = 0x777777;
        // this.scene.fog = new THREE.Fog(0x87CEEB, 500, 2000);

        // Setup camera with position rotated 180 degrees from previous position
        this.camera.position.set(300, 200, 0);  // Rotated from (-300, 200, 0)
        this.camera.lookAt(-70, 0, 0);  // Rotated from (100, 0, 0)

        // Setup controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2.1;

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize(), false);
    }

    createCharacter() {
        // Create simple fat orange humanoid
        const body = new THREE.Group();
        
        // Wider torso
        const torso = new THREE.Mesh(
            new THREE.BoxGeometry(4, 3, 3), // Wider and deeper
            new THREE.MeshStandardMaterial({ color: 0xFF6600 })
        );
        body.add(torso);

        // Add belly
        const belly = new THREE.Mesh(
            new THREE.SphereGeometry(2.2, 12, 12),
            new THREE.MeshStandardMaterial({ color: 0xFF6600 })
        );
        belly.position.y = -0.5;
        belly.position.z = 0.5;
        body.add(belly);

        // Slightly larger head
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(1, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0xFF6600 })
        );
        head.position.y = 2.5;
        body.add(head);

        // Shorter, wider positioned arms
        [-1, 1].forEach(side => {
            const arm = new THREE.Mesh(
                new THREE.BoxGeometry(0.9, 2.2, 0.9),
                new THREE.MeshStandardMaterial({ color: 0xFF6600 })
            );
            arm.position.set(side * 2.5, 0.3, 0); // Further out to sides
            body.add(arm);
        });

        // Shorter, wider positioned legs
        [-1, 1].forEach(side => {
            const leg = new THREE.Mesh(
                new THREE.BoxGeometry(0.9, 2, 0.9),
                new THREE.MeshStandardMaterial({ color: 0xFF6600 })
            );
            leg.position.set(side * 1.2, -2.5, 0); // Wider stance
            body.add(leg);
        });

        // Add character properties
        body.userData = {
            speed: 0.5 + Math.random() * 0.5,
            targetWord: Math.floor(Math.random() * 3),
            targetLetter: 0,
            phase: Math.random() * Math.PI * 2
        };

        body.scale.set(2, 2, 2);
        body.position.y = 10;
        body.castShadow = true;
        
        // Random direction - stays fixed
        const randomDirection = Math.random();
        if (randomDirection < 0.25) {
            body.rotation.y = 0; // Face forward
        } else if (randomDirection < 0.5) {
            body.rotation.y = Math.PI; // Face backward
        } else if (randomDirection < 0.75) {
            body.rotation.y = Math.PI / 2; // Face right
        } else {
            body.rotation.y = -Math.PI / 2; // Face left
        }

        return body;
    }

    createStreetTexture() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 2048;
        canvas.height = 512;

        // Store canvas context for updating
        this.textureCanvas = canvas;
        this.textureContext = ctx;

        this.updateStreetTexture();
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 1);
        
        // Store texture for updating
        this.streetTexture = texture;
        
        return texture;
    }

    updateStreetTexture() {
        const ctx = this.textureContext;
        const canvas = this.textureCanvas;

        // Fill background
        ctx.fillStyle = '#333333';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Add yellow text with damage effect
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 160px Arial'; // Back to original size
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        // Get current active words based on the activeWords indexes
        const words = this.wordGroups.map((group, i) => group[this.activeWords[i]]);
        
        const wordWidths = words.map(word => ctx.measureText(word).width);
        const letterWidths = words.map(word => 
            [...word].map(letter => ctx.measureText(letter).width)
        );
        const sidePadding = 150; // Original padding
        const spacing = 150; // Original spacing
        const totalWidth = wordWidths.reduce((a, b) => a + b, 0) + (spacing * (words.length - 1));
        const startX = sidePadding + ((canvas.width - totalWidth - (sidePadding * 2)) / 2);

        // Reset letter positions array
        this.letterPositions = [];
        
        let currentX = startX;
        words.forEach((word, wordIndex) => {
            const wordLetterPositions = [];
            [...word].forEach((letter, letterIndex) => {
                // Store letter position for targeting
                wordLetterPositions.push(currentX + letterWidths[wordIndex][letterIndex] / 2);
                
                const letterState = this.textDamage[wordIndex][letterIndex];
                // Always draw letter with appropriate alpha
                ctx.globalAlpha = Math.max(0, 1 - letterState.damage);
                
                // Apply vertical scaling for taller text
                ctx.save();
                ctx.translate(currentX, canvas.height / 2);
                ctx.scale(1, 1.5); // Scale vertically by 1.5x without changing width
                ctx.translate(-currentX, -canvas.height / 2);
                ctx.fillText(letter, currentX, canvas.height / 2);
                ctx.restore();
                
                currentX += letterWidths[wordIndex][letterIndex];
            });
            this.letterPositions.push(wordLetterPositions);
            currentX += spacing;
        });
        ctx.globalAlpha = 1;

        // Removed crosswalk lines

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
        
        // Add address and date overlay
        const titleElement = document.createElement('div');
        titleElement.style.position = 'absolute';
        titleElement.style.top = '20px';
        titleElement.style.left = '20px';
        titleElement.style.padding = '15px';
        titleElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'; // Darker background
        titleElement.style.color = 'white';
        titleElement.style.fontFamily = 'Arial, sans-serif';
        titleElement.style.borderRadius = '5px';
        titleElement.style.pointerEvents = 'none'; // Don't block clicks
        
        // Address
        const subtitleText = document.createElement('p');
        subtitleText.textContent = '16th Street NW, Washington DC';
        subtitleText.style.margin = '0 0 5px 0';
        subtitleText.style.fontSize = '14px';
        
        // Date
        const dateText = document.createElement('p');
        dateText.textContent = 'March 13, 2025';
        dateText.style.margin = '0';
        dateText.style.fontSize = '12px';
        dateText.style.fontStyle = 'italic';
        dateText.style.color = '#aaaaaa'; // Slightly grayer text for date
        
        titleElement.appendChild(subtitleText);
        titleElement.appendChild(dateText);
        document.body.appendChild(titleElement);

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

        // Ground plane has been removed

        // Create street with texture
        const streetTexture = this.createStreetTexture();
        const streetGeometry = new THREE.PlaneGeometry(400, 100);  // Extended street width
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
        const sidewalkGeometry = new THREE.PlaneGeometry(400, 20);  // Match street width
        const sidewalkMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x999999,
            roughness: 0.8
        });

        // Left sidewalk
        const leftSidewalk = new THREE.Mesh(sidewalkGeometry, sidewalkMaterial);
        leftSidewalk.rotation.x = -Math.PI / 2;
        leftSidewalk.position.z = -60;
        leftSidewalk.position.y = 0.1;
        leftSidewalk.receiveShadow = true;
        this.scene.add(leftSidewalk);

        // Right sidewalk
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

        // Add initial characters - increased from 9 to 12
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
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    updateCharacters(deltaTime) {
        // Force characters to pick new targets periodically
        const forceNewTargetTime = 7; // Seconds before forcing a new target
        
        this.characters.forEach(character => {
            const data = character.userData;
            
            // Initialize target time if not exists
            if (data.targetTime === undefined) {
                data.targetTime = 0;
            }
            
            // Get target word center position
            const targetX = this.wordPositions[data.targetWord];
            
            // Move towards target word
            const dx = targetX - character.position.x;
            character.position.x += Math.sign(dx) * data.speed;
            
            // Add some random wobble to z-axis movement
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

            // Bobbing motion
            data.phase += deltaTime * 5;
            character.position.y = 10 + Math.sin(data.phase) * 2;

            // Add target time
            data.targetTime += deltaTime;
            
            // Force new target periodically to prevent stalling
            if (data.targetTime > forceNewTargetTime) {
                data.targetTime = 0;
                this.pickNewTarget(character, true); // Force new word
                return;
            }

            // Damage text when close
            if (Math.abs(dx) < 20) {
                const letterState = this.textDamage[data.targetWord][data.targetLetter];
                // Only damage if not already fully damaged and not healing
                if (letterState && !letterState.healing && letterState.damage < 1) {
                    letterState.damage += this.damageRate * deltaTime;
                    
                    // If letter is fully damaged, set linger timer and pick a new target
                    if (letterState.damage >= 1) {
                        letterState.damage = 1; // Ensure exactly 1
                        letterState.lingerTime = 0; // Start lingering
                        this.pickNewTarget(character);
                    }
                }
            }
        });

        // Check all words for full damage on every frame
        for (let wordIndex = 0; wordIndex < this.textDamage.length; wordIndex++) {
            this.checkWordFullyDamaged(wordIndex);
        }

        // Update lingering and healing
        this.textDamage.forEach(word => {
            word.forEach(letterState => {
                if (letterState.damage === 1 && !letterState.healing) {
                    // Count linger time before starting healing
                    letterState.lingerTime += deltaTime;
                    if (letterState.lingerTime >= this.lingerDuration) {
                        letterState.healing = true;
                    }
                }
                
                if (letterState.healing) {
                    letterState.damage -= this.healingRate * deltaTime;
                    // If fully healed, reset healing flag
                    if (letterState.damage <= 0) {
                        letterState.damage = 0;
                        letterState.healing = false;
                        letterState.lingerTime = 0;
                    }
                }
            });
        });

        // Update texture if there's any damage or healing
        if (this.textDamage.some(word => word.some(letterState => letterState.damage > 0))) {
            this.updateStreetTexture();
        }
    }

    pickNewTarget(character, forceNewWord = false) {
        const data = character.userData;
        
        // Reset target time when getting a new target
        data.targetTime = 0;
        
        // Build a set of letters that are already being targeted by other characters
        const targetsInUse = new Map(); // wordIndex -> Set of letterIndices
        
        this.characters.forEach(otherChar => {
            if (otherChar !== character) { // Skip current character
                const otherData = otherChar.userData;
                if (!targetsInUse.has(otherData.targetWord)) {
                    targetsInUse.set(otherData.targetWord, new Set());
                }
                targetsInUse.get(otherData.targetWord).add(otherData.targetLetter);
            }
        });
        
        // Force a new word with explicit request or with 30% probability
        if (forceNewWord || Math.random() < 0.3) {
            const currentWordIndex = data.targetWord;
            let newWordIndex;
            
            // Use a weighted selection based on word length to balance difficulty
            // Longer words should have a higher probability of being selected
            const groupSizes = [6, 5, 7]; // Sizes for group 1, 2, and 3
            const totalSize = groupSizes.reduce((a, b) => a + b, 0); // Sum of all lengths
            const weights = groupSizes.map(size => size / totalSize); // Normalize to proportions
            
            // Weighted random selection of word group
            const rand = Math.random();
            let cumulativeWeight = 0;
            
            for (let i = 0; i < weights.length; i++) {
                cumulativeWeight += weights[i];
                if (rand < cumulativeWeight && i !== currentWordIndex) {
                    newWordIndex = i;
                    break;
                }
            }
            
            // If we didn't find a new word or we got the same word, pick randomly but differently
            if (newWordIndex === undefined || newWordIndex === currentWordIndex) {
                do {
                    newWordIndex = Math.floor(Math.random() * 3);
                } while (newWordIndex === currentWordIndex);
            }
            
            data.targetWord = newWordIndex;
            
            // Get letters already being targeted in this word
            const targetedLetters = targetsInUse.get(newWordIndex) || new Set();
            
            // Try to find an undamaged letter in the new word that's not already targeted
            const newWord = this.textDamage[newWordIndex];
            const untargetedLetters = newWord
                .map((letterState, index) => ({ letterState, index }))
                .filter(({ letterState, index }) => 
                    !letterState.healing && 
                    letterState.damage < 1 && 
                    !targetedLetters.has(index));
            
            // If there are untargeted letters available, choose one of those
            if (untargetedLetters.length > 0) {
                data.targetLetter = untargetedLetters[Math.floor(Math.random() * untargetedLetters.length)].index;
            } else {
                // Otherwise, fall back to any undamaged letter
                const anyUndamagedLetter = newWord
                    .map((letterState, index) => ({ letterState, index }))
                    .filter(({ letterState }) => !letterState.healing && letterState.damage < 1);
                    
                if (anyUndamagedLetter.length > 0) {
                    data.targetLetter = anyUndamagedLetter[Math.floor(Math.random() * anyUndamagedLetter.length)].index;
                } else {
                    data.targetLetter = 0; // Default to first letter if none available
                }
            }
            
            return;
        }
        
        // If we're still on the same word, try to find another damageable letter
        const currentWord = this.textDamage[data.targetWord];
        
        // Get letters already being targeted in this word
        const targetedLetters = targetsInUse.get(data.targetWord) || new Set();
        
        // Try to find untargeted letters in the same word
        const untargetedLetters = currentWord
            .map((letterState, index) => ({ letterState, index }))
            .filter(({ letterState, index }) => 
                !letterState.healing && 
                letterState.damage < 1 &&
                !targetedLetters.has(index));
        
        if (untargetedLetters.length > 0) {
            // Target an untargeted letter in the same word
            data.targetLetter = untargetedLetters[Math.floor(Math.random() * untargetedLetters.length)].index;
        } else {
            // If all damageable letters are already targeted, try any undamaged letter
            const damagableLetters = currentWord
                .map((letterState, index) => ({ letterState, index }))
                .filter(({ letterState }) => !letterState.healing && letterState.damage < 1);

            if (damagableLetters.length > 0) {
                // Target another letter in the same word
                data.targetLetter = damagableLetters[Math.floor(Math.random() * damagableLetters.length)].index;
            } else {
                // No damageable letters left in this word, must choose a new word
                // Use the same weighted selection as above
                const groupSizes = [6, 5, 7]; // Sizes for group 1, 2, and 3
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
                
                // If we didn't find a new word or got the same word, pick randomly but differently
                if (newWordIndex === undefined || newWordIndex === data.targetWord) {
                    do {
                        newWordIndex = Math.floor(Math.random() * 3);
                    } while (newWordIndex === data.targetWord);
                }
                
                data.targetWord = newWordIndex;
                
                // Get letters already being targeted in this new word
                const newTargetedLetters = targetsInUse.get(newWordIndex) || new Set();
                
                // Try to find an undamaged and untargeted letter in the new word
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
                    // Fall back to any undamaged letter
                    const availableLetters = newWord
                        .map((letterState, index) => ({ letterState, index }))
                        .filter(({ letterState }) => !letterState.healing && letterState.damage < 1);
                        
                    if (availableLetters.length > 0) {
                        data.targetLetter = availableLetters[Math.floor(Math.random() * availableLetters.length)].index;
                    } else {
                        data.targetLetter = 0; // Default to first letter if none available
                    }
                }
            }
        }
    }

    // New method to check if a word is fully damaged and switch it if so
    checkWordFullyDamaged(wordIndex) {
        const word = this.textDamage[wordIndex];
        
        // Check if all letters in the word are fully damaged (damage = 1)
        const isFullyDamaged = word.every(letterState => letterState.damage >= 1);
        
        if (isFullyDamaged) {
            // Get current word group and word
            const currentWordGroup = this.wordGroups[wordIndex];
            const currentWordIndex = this.activeWords[wordIndex];
            
            console.log(`Word ${wordIndex} "${currentWordGroup[currentWordIndex]}" fully damaged! Changing word...`);
            
            // Pick a new random word from the same group (different from current)
            let newWordIndex;
            
            if (currentWordGroup.length > 1) {
                // Only try to pick a different word if there are multiple options
                do {
                    newWordIndex = Math.floor(Math.random() * currentWordGroup.length);
                } while (newWordIndex === currentWordIndex);
            } else {
                // If there's only one word in the group, use it
                newWordIndex = 0;
            }
            
            console.log(`New word: "${currentWordGroup[newWordIndex]}" (index: ${newWordIndex})`);
            
            // Log the damage status of all letters before reset
            console.log("Letter damages before reset:", word.map(l => l.damage));
            
            // Update the active word
            this.activeWords[wordIndex] = newWordIndex;
            
            // Reset damage for all letters in the word using the correct array size for each group
            const groupSizes = [6, 5, 7]; // Sizes for group 1, 2, and 3
            this.textDamage[wordIndex] = Array(groupSizes[wordIndex]).fill().map(() => ({
                damage: 0, 
                healing: false, 
                lingerTime: 0
            }));
            
            // Force characters targeting this word to pick new targets
            this.characters.forEach(character => {
                if (character.userData.targetWord === wordIndex) {
                    this.pickNewTarget(character, true);
                }
            });
            
            // Force update street texture
            this.updateStreetTexture();
            
            // Add visual feedback - flash the street
            const originalColor = this.scene.background.clone();
            this.scene.background.set(0xFFFFFF); // Flash white
            
            // Return to original color after a short delay
            setTimeout(() => {
                this.scene.background.copy(originalColor);
            }, 200); // Slightly longer flash (200ms) for better visibility
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const deltaTime = this.clock.getDelta();
        
        this.updateCharacters(deltaTime);
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

// Create the scene when the page loads
window.addEventListener('DOMContentLoaded', () => {
    new BLMPlazaScene();
}); 