export class InputHandler {
    constructor(canvas, onGesture) {
        this.canvas = canvas;
        this.onGesture = onGesture;
        this.pointers = new Map();
        this.lastPinchDistance = 0;
        this.clutchMode = false;

        this.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e), { passive: false });
        window.addEventListener('pointermove', (e) => this.onPointerMove(e), { passive: false });
        window.addEventListener('pointerup', (e) => this.onPointerUp(e));
        window.addEventListener('pointercancel', (e) => this.onPointerUp(e));
    }

    onPointerDown(e) {
        e.preventDefault();
        this.pointers.set(e.pointerId, e);
        if (this.pointers.size === 2) {
            this.lastPinchDistance = this.getPinchDistance();
        }
    }

    onPointerMove(e) {
        if (!this.pointers.has(e.pointerId)) return;
        e.preventDefault();

        const prevPointer = this.pointers.get(e.pointerId);
        const dx = e.clientX - prevPointer.clientX;
        const dy = e.clientY - prevPointer.clientY;

        this.pointers.set(e.pointerId, e);

        if (this.pointers.size === 1) {
            const type = this.clutchMode ? 'move' : 'scroll';
            this.onGesture({
                type,
                dx,
                dy,
                x: e.clientX / window.innerWidth,
                y: 1.0 - (e.clientY / window.innerHeight),
                vx: dx / 16,
                vy: -dy / 16
            });
        }
    }

    onPointerUp(e) {
        this.pointers.delete(e.pointerId);
        if (this.pointers.size < 2) {
            this.lastPinchDistance = 0;
        }

        // When pointers are released, send a reset/stop gesture if needed
        if (this.pointers.size === 0) {
            this.onGesture({ type: 'end' });
        }
    }

    getPointerArray() {
        return Array.from(this.pointers.values());
    }

    setClutchMode(enabled) {
        this.clutchMode = enabled;
    }
}
