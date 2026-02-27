import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import * as pty from 'node-pty';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync, readdirSync } from 'fs';
import { execSync } from 'child_process';

interface PtySession {
    id: string;
    ptyProcess: pty.IPty;
    model: string;
    cwd: string;
    startTime: number;
}

const sessions = new Map<string, PtySession>();
let counter = 0;

const ALLOWED_MODELS = [
    'bedrock/anthropic.claude-3-opus-20240229-v1:0',
    'bedrock/anthropic.claude-3-5-sonnet-20241022-v2:0',
    'bedrock/anthropic.claude-3-5-haiku-20241022-v1:0',
];

function shellEscape(arg: string): string {
    if (/^[a-zA-Z0-9._\-/=]+$/.test(arg)) return arg;
    return "'" + arg.replace(/'/g, "'\\''") + "'";
}

// Cached login shell PATH
let _cachedLoginPath: string | null = null;
function getLoginShellPath(): string {
    if (_cachedLoginPath !== null) return _cachedLoginPath;
    try {
        const shell = process.env.SHELL || '/bin/zsh';
        const result = execSync(`${shell} -ilc 'echo $PATH'`, {
            encoding: 'utf-8',
            timeout: 5000,
        }).trim();
        if (result) {
            _cachedLoginPath = result;
            return result;
        }
    } catch { /* ignore */ }
    _cachedLoginPath = '';
    return '';
}

function buildUserPath(): string {
    const home = homedir();
    const extraPaths = [
        join(home, '.npm-global', 'bin'),
        join(home, '.local', 'bin'),
        join(home, '.bun', 'bin'),
        '/usr/local/bin',
        '/opt/homebrew/bin',
        join(home, '.cargo', 'bin'),
    ];

    const nvmDir = join(home, '.nvm', 'versions', 'node');
    if (existsSync(nvmDir)) {
        try {
            const versions = readdirSync(nvmDir);
            if (versions.length > 0) {
                const latest = versions.sort().reverse()[0];
                extraPaths.push(join(nvmDir, latest, 'bin'));
            }
        } catch { /* ignore */ }
    }

    const loginPath = getLoginShellPath();
    const systemPath = process.env.PATH || '/usr/bin:/bin';
    return [...extraPaths, loginPath, systemPath].filter(Boolean).join(':');
}

function getClaudePath(): string {
    const home = homedir();
    const candidates = [
        join(home, '.npm-global', 'bin', 'claude'),
        '/usr/local/bin/claude',
        join(home, '.local', 'bin', 'claude'),
        join(home, '.bun', 'bin', 'claude'),
        '/opt/homebrew/bin/claude',
    ];

    for (const c of candidates) {
        if (existsSync(c)) return c;
    }

    try {
        const richPath = buildUserPath();
        return execSync('which claude', {
            encoding: 'utf-8',
            env: { ...process.env, PATH: richPath },
        }).trim();
    } catch { /* ignore */ }

    return 'claude';
}

export function attachPtyWebSocket(server: Server) {
    const wss = new WebSocketServer({ server, path: '/ws/pty' });

    wss.on('connection', (ws: WebSocket) => {
        // To allow broadcasting to frontend instances for data and exit
        const send = (msg: any) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(msg));
            }
        };

        ws.on('message', (message: Buffer | string) => {
            let payload;
            try {
                payload = JSON.parse(message.toString());
            } catch (e) {
                return;
            }

            if (payload.type === 'spawn') {
                const { options, reqId } = payload;
                const claudePath = getClaudePath();
                const id = `pty-${++counter}-${Date.now()}`;
                const cwd = options.cwd || homedir();

                const env = {
                    ...process.env,
                    PATH: buildUserPath(),
                    TERM: 'xterm-256color',
                    COLORTERM: 'truecolor',
                } as Record<string, string>;

                const shell = process.env.SHELL || '/bin/bash'; // Better default for containers
                let shellArgs: string[];

                if (options.shell) {
                    shellArgs = ['-l'];
                } else {
                    const claudeArgs: string[] = [claudePath];
                    if (options.model) {
                        if (!ALLOWED_MODELS.includes(options.model)) {
                            send({ type: 'spawn_error', reqId, error: `Invalid model: "${options.model}"` });
                            return;
                        }
                        claudeArgs.push('--model', options.model);
                    }
                    if (options.args) {
                        claudeArgs.push(...options.args);
                    }
                    const claudeCmd = claudeArgs.map(shellEscape).join(' ');
                    shellArgs = ['-l', '-c', claudeCmd];
                }

                try {
                    const ptyProcess = pty.spawn(shell, shellArgs, {
                        name: 'xterm-256color',
                        cols: 80,
                        rows: 30,
                        cwd,
                        env,
                    });

                    const session: PtySession = {
                        id,
                        ptyProcess,
                        model: options.model || 'default',
                        cwd,
                        startTime: Date.now(),
                    };
                    sessions.set(id, session);

                    ptyProcess.onData((data: string) => {
                        // Broadcast data to all connections for this session
                        wss.clients.forEach((client: WebSocket) => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({ type: 'data', id, data }));
                            }
                        });
                    });

                    ptyProcess.onExit(({ exitCode, signal }: { exitCode: number; signal?: number }) => {
                        wss.clients.forEach((client: WebSocket) => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({ type: 'exit', id, exitCode, signal }));
                            }
                        });
                        sessions.delete(id);
                    });

                    send({ type: 'spawn_success', reqId, id, pid: ptyProcess.pid });
                } catch (e: any) {
                    send({ type: 'spawn_error', reqId, error: e.message });
                }
            } else if (payload.type === 'write') {
                const session = sessions.get(payload.id);
                if (session) {
                    session.ptyProcess.write(payload.data);
                }
            } else if (payload.type === 'resize') {
                const session = sessions.get(payload.id);
                if (session) {
                    try {
                        session.ptyProcess.resize(payload.cols, payload.rows);
                    } catch { /* ignore resize errors */ }
                }
            } else if (payload.type === 'kill') {
                const session = sessions.get(payload.id);
                if (session) {
                    session.ptyProcess.kill();
                    sessions.delete(payload.id);
                }
            } else if (payload.type === 'list-sessions') {
                const list = Array.from(sessions.values()).map(s => ({
                    id: s.id,
                    pid: s.ptyProcess.pid,
                    model: s.model,
                    cwd: s.cwd,
                    startTime: s.startTime,
                    active: true,
                }));
                send({ type: 'list-sessions_success', reqId: payload.reqId, sessions: list });
            }
        });
    });

    process.on('exit', () => {
        for (const [, session] of sessions) {
            try { session.ptyProcess.kill(); } catch { /* ignore */ }
        }
        sessions.clear();
    });
}
