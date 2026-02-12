import * as THREE from 'three';
import { Scene1 } from './scene1.js';
import { Scene2 } from './scene2.js';

class SceneManager {
    constructor() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.querySelector('#scene'),
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.scenes = {};
        this.activeScene = null;

        this.createTabMenu();
        this.createOverlay();

        this.scenes.scene1 = new Scene1(this.renderer);
        this.scenes.scene2 = new Scene2(this.renderer);

        // Disable all controls initially; switchScene will enable the active one
        Object.values(this.scenes).forEach(s => {
            if (s.controls) s.controls.enabled = false;
        });

        this.switchScene('scene1');

        window.addEventListener('resize', () => this.onWindowResize(), false);

        this.animate();
    }

    createTabMenu() {
        const nav = document.createElement('nav');
        nav.id = 'tab-menu';

        const tabs = [
            { id: 'scene1', label: 'I. The Erasure' },
            { id: 'scene2', label: 'II. Fahrenheit' }
        ];

        tabs.forEach(tab => {
            const btn = document.createElement('button');
            btn.className = 'tab-btn';
            btn.dataset.scene = tab.id;
            btn.textContent = tab.label;
            btn.addEventListener('click', () => this.switchScene(tab.id));
            nav.appendChild(btn);
        });

        document.body.appendChild(nav);
        this.tabNav = nav;
    }

    createOverlay() {
        const titleElement = document.createElement('div');
        titleElement.id = 'scene-overlay';

        const subtitleText = document.createElement('p');
        subtitleText.textContent = '16th Street NW, Washington DC';
        subtitleText.style.margin = '0 0 5px 0';
        subtitleText.style.fontSize = '14px';

        const dateText = document.createElement('p');
        dateText.textContent = 'March 13, 2025';
        dateText.style.margin = '0';
        dateText.style.fontSize = '12px';
        dateText.style.fontStyle = 'italic';
        dateText.style.color = '#aaaaaa';

        titleElement.appendChild(subtitleText);
        titleElement.appendChild(dateText);
        document.body.appendChild(titleElement);
    }

    switchScene(sceneId) {
        // Disable controls on previous scene
        if (this.activeScene && this.activeScene.controls) {
            this.activeScene.controls.enabled = false;
        }

        this.activeScene = this.scenes[sceneId];

        // Enable controls on new scene
        if (this.activeScene && this.activeScene.controls) {
            this.activeScene.controls.enabled = true;
        }

        // Update tab styling
        const buttons = this.tabNav.querySelectorAll('.tab-btn');
        buttons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.scene === sceneId);
        });
    }

    onWindowResize() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        if (this.activeScene) {
            this.activeScene.onWindowResize();
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        if (this.activeScene) {
            this.activeScene.update();
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new SceneManager();
});
