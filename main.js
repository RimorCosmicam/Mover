import { Scene } from './scene.js';
import { InputHandler } from './input.js';
import { SocketClient } from './socket.js';
import { loadSettings, saveSettings } from './settings.js';

class App {
    constructor() {
        this.settings = loadSettings();
        this.scene = new Scene(document.getElementById('canvas'));
        this.socket = new SocketClient();

        // Pairing Handshake Overlays
        const createOverlay = (id, text, description) => {
            let div = document.createElement('div');
            div.id = id;
            div.style = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.85); backdrop-filter: blur(40px) saturate(180%);
        display: flex; align-items: center; justify-content: center;
        color: white; font-family: -apple-system, sans-serif; z-index: 10000;
        text-align: center; padding: 40px; box-sizing: border-box;
        transition: opacity 0.4s ease;
    `;
            div.innerHTML = `
        <div style="transform: translateY(-20px)">
            <h1 style="font-size: 24px; margin-bottom: 12px; font-weight: 600;">${text}</h1>
            <p style="opacity: 0.5; font-size: 15px; line-height: 1.4;">${description}</p>
        </div>
    `;
            document.body.appendChild(div);
            return div;
        };

        const pendingOverlay = createOverlay('pending-overlay', 'Waiting for Approval', 'Please check Mover on your Mac to allow this connection.');

        this.socket.onApproved = () => {
            pendingOverlay.style.opacity = '0';
            setTimeout(() => {
                pendingOverlay.style.display = 'none';
                if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
            }, 400);
        };

        this.socket.onDenied = () => {
            pendingOverlay.innerHTML = `
        <div>
            <h1 style="color: #ff453a; font-size: 24px; margin-bottom: 12px;">Access Denied</h1>
            <p style="opacity: 0.5;">The Mac refused the connection request.</p>
            <button onclick="location.reload()" style="margin-top: 24px; padding: 12px 24px; border-radius: 100px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; font-weight: 600;">Retry</button>
        </div>
    `;
        };

        this.input = new InputHandler(this.scene.canvas, (gesture) => this.handleGesture(gesture));

        this.initUI();
        this.applySettings();

        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    initUI() {
        const actionBtn = document.getElementById('action-button');
        const hudPanel = document.getElementById('hud-panel');
        const settingsToggle = document.getElementById('settings-toggle');
        const zoomControls = document.getElementById('zoom-controls');
        const zoomIn = document.getElementById('zoom-in');
        const zoomOut = document.getElementById('zoom-out');

        // Action Button: Tap for Click, Hold for Clutch
        actionBtn.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            this.input.setClutchMode(true);
            this.pressStartTime = Date.now();
        });

        actionBtn.addEventListener('pointerup', (e) => {
            e.preventDefault();
            this.input.setClutchMode(false);
            const duration = Date.now() - this.pressStartTime;
            if (duration < 300) {
                this.socket.send({ type: 'click' });
            }
        });

        // HUD Toggle
        settingsToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            hudPanel.classList.toggle('visible');
        });

        // Zoom Buttons
        zoomIn.addEventListener('click', () => this.socket.send({ type: 'zoom', direction: 'in' }));
        zoomOut.addEventListener('click', () => this.socket.send({ type: 'zoom', direction: 'out' }));

        // Close HUD on outside tap
        document.addEventListener('pointerdown', (e) => {
            if (hudPanel.classList.contains('visible') &&
                !hudPanel.contains(e.target) &&
                !settingsToggle.contains(e.target)) {
                hudPanel.classList.remove('visible');
            }
        });

        // Settings Controls
        const gridToggle = document.getElementById('grid-toggle');
        const gridDensity = document.getElementById('grid-density');
        const shaderIntensity = document.getElementById('shader-intensity');
        const axisMode = document.getElementById('axis-mode');
        const sensitivity = document.getElementById('sensitivity');
        const themeSelector = document.getElementById('theme-selector');
        const zoomToggle = document.getElementById('zoom-toggle');

        const update = () => {
            this.settings.gridEnabled = gridToggle.checked;
            this.settings.gridDensity = parseFloat(gridDensity.value);
            this.settings.shaderIntensity = parseFloat(shaderIntensity.value);
            this.settings.axisMode = axisMode.value;
            this.settings.sensitivity = parseFloat(sensitivity.value);
            this.settings.theme = themeSelector.value;
            this.settings.showZoomButtons = zoomToggle.checked;

            this.applySettings();
            saveSettings(this.settings);
        };

        [gridToggle, gridDensity, shaderIntensity, axisMode, sensitivity, themeSelector, zoomToggle].forEach(el => {
            el.addEventListener('input', update);
        });

        // Set initial values
        gridToggle.checked = this.settings.gridEnabled;
        gridDensity.value = this.settings.gridDensity;
        shaderIntensity.value = this.settings.shaderIntensity;
        axisMode.value = this.settings.axisMode;
        sensitivity.value = this.settings.sensitivity;
        themeSelector.value = this.settings.theme;
        zoomToggle.checked = this.settings.showZoomButtons;
    }

    applySettings() {
        this.scene.uniforms.uGridEnabled.value = this.settings.gridEnabled ? 1 : 0;
        this.scene.uniforms.uGridDensity.value = this.settings.gridDensity;

        // Apply Zoom control visibility
        document.getElementById('zoom-controls').classList.toggle('visible', this.settings.showZoomButtons);

        // Apply theme colors
        const themes = {
            modern: { primary: '#9ac4ff', secondary: '#334466' },
            emerald: { primary: '#a0ffd0', secondary: '#206040' },
            sunset: { primary: '#ffca90', secondary: '#804020' },
            midnight: { primary: '#d0d0ff', secondary: '#101030' }
        };
        const colors = themes[this.settings.theme] || themes.modern;
        this.scene.setThemeColors(colors.primary, colors.secondary);
    }

    handleGesture(gesture) {
        if (gesture.type === 'end') {
            this.scene.updateTouch(0.5, 0.5, 0, 0, 0);
            return;
        }

        // Apply sensitivity to deltas
        const sens = this.settings.sensitivity / 50;
        let dx = gesture.dx * sens;
        let dy = gesture.dy * sens;

        // Apply Axis constraint
        if (this.settings.axisMode === 'y' && gesture.type === 'scroll') {
            dx = 0;
        }

        // Send to socket
        if (gesture.type === 'scroll') {
            this.socket.send({ type: 'scroll', dx, dy });
        } else if (this.pointers.size === 1 && gesture.type === 'move') {
            this.socket.send({ type: 'move', dx, dy });
        }

        // Update Shader Visuals
        const intensity = (this.settings.shaderIntensity / 100) * 0.2;
        this.scene.updateTouch(gesture.x, gesture.y, intensity, gesture.vx || 0, gesture.vy || 0);
    }

    animate(time) {
        this.scene.render(time);
        requestAnimationFrame(this.animate);
    }
}

new App();

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js');
}
