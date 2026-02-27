// Replacement for Electron's contextBridge API

const API_BASE = 'http://localhost:8080/api';
let ws: WebSocket | null = null;

function getWs(): WebSocket {
    if (ws && ws.readyState === WebSocket.OPEN) return ws;
    ws = new WebSocket('ws://localhost:8080/ws/pty');
    return ws;
}

const reqMap = new Map<string, (data: any) => void>();

getWs().addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    if (data.reqId && reqMap.has(data.reqId)) {
        reqMap.get(data.reqId)!(data);
        reqMap.delete(data.reqId);
    }
});

async function apiFetch(endpoint: string, body?: any) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
}

export const webApi = {
    // File System
    fs: {
        read: (path: string) => apiFetch('/fs/read', { path }).then(r => r.content),
        write: (path: string, content: string) => apiFetch('/fs/write', { path, content }),
        exists: (path: string) => apiFetch('/fs/exists', { path }).then(r => r.exists),
        listDir: (path: string) => apiFetch('/fs/list-dir', { path }).then(r => r.items),
        // Mocks for now, since we're in a web browser
        pickDirectory: async () => {
            const path = prompt('Enter a directory path (sandbox):', '/app');
            if (path) return path;
            return null;
        },
        pickFile: async () => null,
    },

    // Config
    config: {
        getSettings: (scope: string, projectDir?: string) => apiFetch('/config/get-settings', { scope, projectDir }).then(r => r.settings),
        saveSettings: (scope: string, data: any, projectDir?: string) => apiFetch('/config/save-settings', { scope, data, projectDir }),
        getMcpServers: (scope: string, projectDir?: string) => apiFetch('/config/get-mcp-servers', { scope, projectDir }).then(r => r.servers),
        // ... add others as needed
    },

    // PTY via WebSocket
    pty: {
        spawn: (options: { cwd?: string; model?: string; args?: string[]; shell?: boolean }) => {
            return new Promise((resolve, reject) => {
                const reqId = Math.random().toString(36).substring(7);
                reqMap.set(reqId, (response) => {
                    if (response.type === 'spawn_error') reject(new Error(response.error));
                    else resolve({ id: response.id, pid: response.pid });
                });
                getWs().send(JSON.stringify({ type: 'spawn', options, reqId }));
            });
        },
        write: (id: string, data: string) => {
            getWs().send(JSON.stringify({ type: 'write', id, data }));
        },
        resize: (id: string, cols: number, rows: number) => {
            getWs().send(JSON.stringify({ type: 'resize', id, cols, rows }));
        },
        kill: (id: string) => {
            getWs().send(JSON.stringify({ type: 'kill', id }));
        },
        listSessions: () => {
            return new Promise((resolve) => {
                const reqId = Math.random().toString(36).substring(7);
                reqMap.set(reqId, (response) => resolve(response.sessions));
                getWs().send(JSON.stringify({ type: 'list-sessions', reqId }));
            });
        },
        onData: (callback: (payload: { id: string; data: string }) => void) => {
            const handler = (event: MessageEvent) => {
                const data = JSON.parse(event.data);
                if (data.type === 'data') callback(data);
            };
            getWs().addEventListener('message', handler);
            return () => { getWs().removeEventListener('message', handler); };
        },
        onExit: (callback: (payload: { id: string; exitCode: number; signal: number }) => void) => {
            const handler = (event: MessageEvent) => {
                const data = JSON.parse(event.data);
                if (data.type === 'exit') callback(data);
            };
            getWs().addEventListener('message', handler);
            return () => { getWs().removeEventListener('message', handler); };
        },
    },

    // Stubs for missing APIs
    cli: {
        check: async () => ({ installed: true }),
        listSessions: async () => [],
    },
    memory: {
        list: async () => [],
    },
    window: {
        minimize: () => { },
        maximize: () => { },
        close: () => { },
    }
};

// Expose globally so components using `window.api` keep working
(window as any).api = webApi;
