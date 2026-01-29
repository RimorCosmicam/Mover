/**
 * Mover macOS Companion Server
 * Translates WebSocket deltas from your iPhone into macOS system events.
 * 
 * Requirements:
 * 1. Node.js installed
 * 2. npm install ws robotjs
 * 
 * Note: Terminal/iTerm will require "Accessibility" permissions in 
 * System Settings > Privacy & Security > Accessibility.
 */

const WebSocket = require('ws');
const robot = require('robotjs');
const express = require('express');
const qrcode = require('qrcode-terminal');
const os = require('os');
const path = require('path');

const app = express();
const port = 3000;
const wsPort = 8080;

// Serve static files
app.use(express.static(__dirname));

function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const localIp = getLocalIp();
const url = `http://${localIp}:${port}`;

app.listen(port, () => {
    console.clear();
    console.log('-------------------------------------------');
    console.log('  MOVER: TETHERED INPUT SERVER');
    console.log('-------------------------------------------');
    console.log(`\n1. Scan this QR code with your iPhone:`);
    qrcode.generate(url, { small: true });
    console.log(`\n2. Or open: ${url}`);
    console.log(`\nStatus: Listening for connections...`);
});

const wss = new WebSocket.Server({ port: wsPort });

console.log('Mover Server started on ws://localhost:8080');
console.log('Ensure your iPhone is on the same Wi-Fi and connecting to this Mac\'s IP.');

wss.on('connection', (ws) => {
    console.log('iPhone connected!');

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            switch (data.type) {
                case 'move':
                    const mouse = robot.getMousePos();
                    robot.moveMouse(mouse.x + data.dx, mouse.y + data.dy);
                    break;

                case 'scroll':
                    // robotjs scroll is (x, y)
                    // We use dy for vertical, dx for horizontal
                    robot.scrollMouse(data.dx, data.dy);
                    break;

                case 'click':
                    robot.mouseClick();
                    break;

                case 'zoom':
                    if (data.direction === 'in') {
                        robot.keyTap('=', 'command');
                    } else if (data.direction === 'out') {
                        robot.keyTap('-', 'command');
                    }
                    break;
            }
        } catch (e) {
            console.error('Error parsing message:', e);
        }
    });

    ws.on('close', () => console.log('iPhone disconnected.'));
});
