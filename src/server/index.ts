import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { attachPtyWebSocket } from './websocket-pty';
import { fsRouter } from './fs-router';
import { configRouter } from './config-router';
import { authenticateToken } from './cognito-auth';
import { join } from 'path';

const app = express();
app.use(cors());
app.use(express.json());

// Apply Cognito Auth Middleware (skips if env vars are missing for local sandbox)
app.use('/api', authenticateToken);

// API Routes
app.use('/api/fs', fsRouter);
app.use('/api/config', configRouter);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Serve frontend static files
app.use(express.static(join(__dirname, '../')));

app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
        res.status(404).json({ error: 'Not Found' });
    } else {
        res.sendFile(join(__dirname, '../index.html'));
    }
});

const server = createServer(app);

// Attach WebSocket for PTY and other real-time events
attachPtyWebSocket(server);

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
