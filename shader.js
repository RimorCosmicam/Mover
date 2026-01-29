export const vertexShader = `
uniform float uTime;
uniform vec2 uTouch;
uniform float uIntensity;
varying vec2 vUv;
varying float vDeform;

void main() {
    vUv = uv;
    vec3 pos = position;
    
    float dist = distance(uv, uTouch);
    float deform = exp(-dist * 8.0) * uIntensity;
    pos.z -= deform;
    
    vDeform = deform;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

export const fragmentShader = `
uniform float uTime;
uniform vec2 uTouch;
uniform float uGridDensity;
uniform int uGridEnabled;
uniform vec2 uVelocity;
uniform vec3 uColorPrimary;
uniform vec3 uColorSecondary;
varying vec2 vUv;
varying float vDeform;

void main() {
    // Base dark background with a subtle vertical gradient
    vec3 color = mix(uColorSecondary * 0.1, vec3(0.01, 0.01, 0.02), vUv.y);
    
    if (uGridEnabled == 1) {
        vec2 gridUv = vUv * uGridDensity;
        vec2 grid = abs(fract(gridUv - 0.5) - 0.5) / fwidth(gridUv);
        float line = min(grid.x, grid.y);
        float gridAlpha = 1.0 - min(line, 1.0);
        
        // Grid highlight near touch
        float dist = distance(vUv, uTouch);
        float glow = exp(-dist * 5.0);
        
        vec3 gridColor = mix(uColorSecondary * 0.4, uColorPrimary, glow + vDeform * 2.0);
        color = mix(color, gridColor, gridAlpha * 0.5); // More visible grid
    }
    
    // Subtle Fresnel/Edge highlight
    float edge = 1.0 - vUv.y;
    color += uColorPrimary * 0.3 * pow(edge, 4.0) * 0.2;
    
    // Velocity based luminance
    float vel = length(uVelocity);
    color += uColorPrimary * vDeform * (1.0 + vel * 2.0);

    gl_FragColor = vec4(color, 1.0);
}
`;
