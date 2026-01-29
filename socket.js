export class SocketClient {
    constructor() {
        // Automatically connect to the host that served the page
        // If served from GitHub Pages, we expect an 'ip' param for the local server
        const params = new URLSearchParams(window.location.search);
        const localIp = params.get('ip');
        const host = localIp || window.location.hostname;

        this.url = `ws://${host}:8080`;
        this.socket = null;
        this.connected = false;
        this.connect();
    }

    connect() {
        try {
            this.socket = new WebSocket(this.url);

            this.socket.onopen = () => {
                console.log('Connected to macOS server');
                this.connected = true;
            };

            this.socket.onclose = () => {
                this.connected = false;
                setTimeout(() => this.connect(), 2000); // Reconnect loop
            };

            this.socket.onerror = (err) => {
                console.error('WebSocket error:', err);
            };
        } catch (e) {
            console.error('Connection failed:', e);
        }
    }

    send(data) {
        if (this.connected && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(data));
        }
    }
}
