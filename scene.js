import * as THREE from 'three';
import { vertexShader, fragmentShader } from './shader.js';

export class Scene {
    constructor(canvas) {
        this.canvas = canvas;
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
        this.camera.position.z = 5;
        this.scene = new THREE.Scene();

        this.uniforms = {
            uTime: { value: 0 },
            uTouch: { value: new THREE.Vector2(0.5, 0.5) },
            uIntensity: { value: 0.0 },
            uGridDensity: { value: 40.0 },
            uGridEnabled: { value: 1 },
            uVelocity: { value: new THREE.Vector2(0, 0) },
            uColorPrimary: { value: new THREE.Color(0.6, 0.8, 1.0) },
            uColorSecondary: { value: new THREE.Color(0.2, 0.25, 0.3) }
        };

        const geometry = new THREE.PlaneGeometry(2, 2, 64, 64);
        const material = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: this.uniforms,
            transparent: true
        });

        this.plane = new THREE.Mesh(geometry, material);
        this.scene.add(this.plane);

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.renderer.setSize(width, height);
        this.camera.updateProjectionMatrix();
    }

    render(time) {
        this.uniforms.uTime.value = time * 0.001;
        this.renderer.render(this.scene, this.camera);
    }

    updateTouch(x, y, intensity, vx, vy) {
        this.uniforms.uTouch.value.set(x, y);
        this.uniforms.uIntensity.value = intensity;
        this.uniforms.uVelocity.value.set(vx, vy);
    }

    setThemeColors(primary, secondary) {
        this.uniforms.uColorPrimary.value.set(primary);
        this.uniforms.uColorSecondary.value.set(secondary);
    }
}
