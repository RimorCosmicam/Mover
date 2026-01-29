import { app, BrowserWindow, screen, Menu, dialog, nativeImage, ipcMain } from "electron";
import liquidGlass from "electron-liquid-glass";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer } from 'ws';
import robot from 'robotjs';
import express from 'express';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow;
let actualWsPort = 8080;
let actualHttpPort = 3000;

let pendingConnection = null;
let activeConnection = null;

function startServer() {
    return new Promise((resolve) => {
        const serverApp = express();
        serverApp.use(express.static(__dirname));

        const httpServer = serverApp.listen(actualHttpPort, () => {
            actualHttpPort = httpServer.address().port;
            console.log(`HTTP Server running on port ${actualHttpPort}`);
            startWs();
        });

        httpServer.on('error', (e) => {
            if (e.code === 'EADDRINUSE') {
                httpServer.listen(0);
            }
        });

        function startWs() {
            const wss = new WebSocketServer({ port: actualWsPort });

            wss.on('listening', () => {
                actualWsPort = wss.address().port;
                console.log(`WebSocket Server running on port ${actualWsPort}`);
                resolve({ http: actualHttpPort, ws: actualWsPort });
            });

            wss.on('error', (e) => {
                if (e.code === 'EADDRINUSE') {
                    actualWsPort = 0;
                    startWs();
                }
            });

            wss.on('connection', (ws) => {
                // If there's already an active or pending connection, reject new ones for now
                if (activeConnection || pendingConnection) {
                    ws.send(JSON.stringify({ type: 'rejected', reason: 'busy' }));
                    ws.close();
                    return;
                }

                pendingConnection = ws;
                // Notify the manager UI to show the approval prompt
                if (mainWindow) {
                    mainWindow.webContents.send('connection-request');
                }

                ws.on('message', (message) => {
                    if (ws !== activeConnection) return; // Only process approved messages

                    try {
                        const data = JSON.parse(message);
                        switch (data.type) {
                            case 'move':
                                const mouse = robot.getMousePos();
                                robot.moveMouse(mouse.x + data.dx, mouse.y + data.dy);
                                break;
                            case 'scroll':
                                robot.scrollMouse(data.dx, data.dy);
                                break;
                            case 'click':
                                robot.mouseClick();
                                break;
                            case 'zoom':
                                if (data.direction === 'in') robot.keyTap('=', 'command');
                                else if (data.direction === 'out') robot.keyTap('-', 'command');
                                break;
                        }
                    } catch (e) { }
                });

                ws.on('close', () => {
                    if (ws === activeConnection) activeConnection = null;
                    if (ws === pendingConnection) {
                        pendingConnection = null;
                        if (mainWindow) mainWindow.webContents.send('connection-cancelled');
                    }
                });
            });
        }
    });
}

// IPC Handlers for approval
ipcMain.on('approve-connection', () => {
    if (pendingConnection) {
        activeConnection = pendingConnection;
        pendingConnection = null;
        activeConnection.send(JSON.stringify({ type: 'approved' }));
    }
});

ipcMain.on('deny-connection', () => {
    if (pendingConnection) {
        pendingConnection.send(JSON.stringify({ type: 'denied' }));
        pendingConnection.close();
        pendingConnection = null;
    }
});

function createMenu() {
    const template = [
        {
            label: app.name,
            submenu: [
                {
                    label: 'About Mover',
                    click: () => {
                        dialog.showMessageBox({
                            type: 'info',
                            title: 'About Mover',
                            message: 'Mover',
                            detail: 'Created by RimorCosmicam\nVisuals powered by Electron Liquid Glass',
                            icon: nativeImage.createFromPath(path.join(__dirname, 'icons', 'Icon-iOS-Default-1024x1024@1x.png')).resize({ width: 64, height: 64 })
                        });
                    }
                },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideOthers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        },
        {
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                { role: 'zoom' },
                { type: 'separator' },
                { role: 'front' }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
    createMenu();
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    mainWindow = new BrowserWindow({
        width: 360,
        height: 480,
        transparent: true,
        frame: false,
        resizable: false,
        icon: path.join(__dirname, 'icons', 'Icon-iOS-Default-1024x1024@1x.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.setWindowButtonVisibility(true);

    startServer().then((ports) => {
        mainWindow.loadURL(`file://${path.join(__dirname, 'manager.html')}?httpPort=${ports.http}&wsPort=${ports.ws}`);
    });

    mainWindow.webContents.once("did-finish-load", () => {
        const handle = mainWindow.getNativeWindowHandle();
        const glassId = liquidGlass.addView(handle, {
            cornerRadius: 24,
            tintColor: "#00000005"
        });
        liquidGlass.unstable_setVariant(glassId, 2);
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});
