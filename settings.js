const STORAGE_KEY = 'mover_settings_v1';

const THEMES = {
    modern: { primary: '#9ac4ff', secondary: '#334466' },
    emerald: { primary: '#a0ffd0', secondary: '#206040' },
    sunset: { primary: '#ffca90', secondary: '#804020' },
    midnight: { primary: '#d0d0ff', secondary: '#101030' }
};

const DEFAULT_SETTINGS = {
    gridEnabled: true,
    gridDensity: 40,
    shaderIntensity: 50,
    axisMode: 'xy',
    sensitivity: 50,
    theme: 'modern',
    showZoomButtons: false
};

export function loadSettings() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
}

export function saveSettings(settings) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
