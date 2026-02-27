import express from 'express';
import { readFileSync, writeFileSync, existsSync, readdirSync, rmSync, statSync } from 'fs';
import { join, isAbsolute } from 'path';
import { homedir } from 'os';

export const fsRouter = express.Router();

const HOME = homedir();

function validatePath(p: string): boolean {
    // Very basic validation, since this is an intended sandbox tool
    // we allow reading/writing anywhere the process has access to for now,
    // but ideally we'd scope this to a specific workspace directory.
    return isAbsolute(p);
}

fsRouter.post('/read', (req, res) => {
    const { path } = req.body;
    if (!validatePath(path)) return res.status(400).json({ error: 'Invalid path' });
    try {
        const content = readFileSync(path, 'utf-8');
        res.json({ content });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

fsRouter.post('/write', (req, res) => {
    const { path, content } = req.body;
    if (!validatePath(path)) return res.status(400).json({ error: 'Invalid path' });
    try {
        writeFileSync(path, content, 'utf-8');
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

fsRouter.post('/exists', (req, res) => {
    const { path } = req.body;
    if (!validatePath(path)) return res.status(400).json({ error: 'Invalid path' });
    try {
        const exists = existsSync(path);
        res.json({ exists });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

fsRouter.post('/list-dir', (req, res) => {
    const { path } = req.body;
    if (!validatePath(path)) return res.status(400).json({ error: 'Invalid path' });
    try {
        const items = readdirSync(path).map(name => {
            const fullPath = join(path, name);
            let isDirectory = false;
            try {
                isDirectory = statSync(fullPath).isDirectory();
            } catch (e) {
                // ignore errors reading stats
            }
            return { name, isDirectory };
        });
        res.json({ items });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});
